import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z, ZodError } from 'zod';
import { randomUUID } from 'crypto';

const dinero = z.number().finite().nonnegative().max(1e9).refine(n => Math.abs(Math.round(n*100)-n*100)<1e-6);
const cantidad = z.number().finite().nonnegative().max(1e9);
const texto = z.string().trim().min(1).max(200);
const entrada = z.object({ tenantId: z.string().optional(), sku: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/),
  nombre: texto, codigoBarras: z.string().trim().max(120).nullish(), categoria: texto.optional(), unidadMedida: z.string().trim().min(1).max(20).optional(),
  costoPromedio: dinero.optional(), precioVenta: dinero.optional(), stockMinimo: cantidad.optional(), stockMaximo: cantidad.optional(),
  stockInicial: z.number().finite().refine(n => n === 0).optional(), claveSat: z.string().trim().max(12).optional(),
  claveUnidadSat: z.string().trim().max(8).optional(), objetoImp: z.string().trim().max(3).optional() });

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
    const body = entrada.parse(await req.json());

    const targetTenantId = user.rol === 'SUPERADMIN' ? (body.tenantId || user.tenantId) : user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
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
          costoPromedio: body.costoPromedio ?? 0,
          precioVenta: body.precioVenta ?? 0,
          stockMinimo: body.stockMinimo ?? 0,
          stockMaximo: body.stockMaximo ?? 0,
          claveSat: body.claveSat ? String(body.claveSat).trim() : '01010101',
          claveUnidadSat: body.claveUnidadSat ? String(body.claveUnidadSat).trim() : 'H87',
          objetoImp: body.objetoImp || '02',
        },
      });
      await tx.registroAuditoria.create({ data: { id: randomUUID(), tenantId: targetTenantId, usuarioId: user.id,
        usuarioNombre: user.nombre, modulo: 'PRODUCTOS', accion: 'CREAR', detalles: `Producto ${producto.sku} creado; stock inicial pendiente de corte`,
        metadataJson: JSON.stringify({ productoId: producto.id, sku: producto.sku, precioVenta: producto.precioVenta, costoPromedio: producto.costoPromedio }) } });
      return producto;
    });

    return NextResponse.json(nuevoProducto, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Producto inválido: revise SKU, montos, cantidades y stock inicial' }, { status: 400 });
    if ((error as {code?:string}).code === 'P2002') return NextResponse.json({ error: 'SKU duplicado en la empresa' }, { status: 409 });
    console.error('Error creating producto:', error);
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
  }
}
