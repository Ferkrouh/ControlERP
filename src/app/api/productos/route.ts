import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'ALMACENISTA', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);
    const tenantParam = searchParams.get('tenantId');
    const effectiveTenantId = user.rol === 'SUPERADMIN' ? (tenantParam || undefined) : user.tenantId;

    if (!effectiveTenantId && user.rol !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const where = effectiveTenantId ? { tenantId: effectiveTenantId } : {};

    const productos = await prisma.producto.findMany({
      where,
      include: {
        existencias: {
          include: { almacen: true },
        },
        movimientos: {
          take: 10,
          orderBy: { fecha: 'desc' },
        },
      },
      orderBy: { sku: 'asc' },
    });

    // Si el rol es ALMACENISTA, ofuscar información financiera (costos y precios de compra)
    const result = productos.map((p) => {
      if (user.rol === 'ALMACENISTA') {
        return {
          ...p,
          costoPromedio: 0,
          movimientos: p.movimientos.map((m) => ({ ...m, costoUnitario: 0 })),
        };
      }
      return p;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching productos:', error);
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Almacenistas y Auditores no pueden crear nuevos artículos en catálogo
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();

    const targetTenantId = user.rol === 'SUPERADMIN' ? (body.tenantId || user.tenantId) : user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    if (!body.sku || !body.nombre) {
      return NextResponse.json({ error: 'SKU y nombre del producto son obligatorios' }, { status: 400 });
    }

    const nuevoProducto = await prisma.$transaction(async (tx) => {
      const producto = await tx.producto.create({
        data: {
          tenantId: targetTenantId,
          sku: body.sku.toUpperCase().trim(),
          codigoBarras: body.codigoBarras ? String(body.codigoBarras).trim() : null,
          nombre: body.nombre.trim(),
          categoria: body.categoria || 'General',
          unidadMedida: body.unidadMedida || 'PZA',
          costoPromedio: Number(body.costoPromedio || 0),
          precioVenta: Number(body.precioVenta || 0),
          stockMinimo: Number(body.stockMinimo || 0),
          stockMaximo: Number(body.stockMaximo || 0),
          claveSat: body.claveSat ? String(body.claveSat).trim() : '01010101',
          claveUnidadSat: body.claveUnidadSat ? String(body.claveUnidadSat).trim() : 'H87',
          objetoImp: body.objetoImp || '02',
        },
      });

      // Si se especificó un almacén para inicializar existencia
      if (body.almacenId && Number(body.stockInicial) > 0) {
        // Validar que el almacén pertenezca al tenant
        const alm = await tx.almacen.findFirst({
          where: { id: body.almacenId, tenantId: targetTenantId },
        });

        if (alm) {
          await tx.existencia.create({
            data: {
              almacenId: body.almacenId,
              productoId: producto.id,
              cantidad: Number(body.stockInicial),
            },
          });

          await tx.movimientoKardex.create({
            data: {
              tenantId: targetTenantId,
              almacenId: body.almacenId,
              productoId: producto.id,
              tipoMovimiento: 'ENTRADA_COMPRA',
              cantidad: Number(body.stockInicial),
              costoUnitario: Number(body.costoPromedio || 0),
              saldoResultante: Number(body.stockInicial),
              folioReferencia: 'INI-001',
              motivo: `Inventario inicial registrado por ${user.nombre}`,
            },
          });
        }
      }

      return producto;
    });

    return NextResponse.json(nuevoProducto, { status: 201 });
  } catch (error) {
    console.error('Error creating producto:', error);
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
  }
}
