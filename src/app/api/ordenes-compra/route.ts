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

    const ordenes = await prisma.ordenCompra.findMany({
      where,
      include: {
        proveedor: true,
        almacenDestino: true,
        items: {
          include: { producto: true },
        },
      },
      orderBy: { fecha: 'desc' },
      take: 50,
    });

    if (user.rol === 'ALMACENISTA') {
      const sinCostos = ordenes.map(({ subtotal: _subtotal, impuestos: _impuestos, total: _total, items, ...orden }) => ({
        ...orden,
        items: items.map(({ costoUnitario: _costoUnitario, subtotal: _itemSubtotal, producto, ...item }) => {
          const { costoPromedio: _costoPromedio, ...productoVisible } = producto;
          return { ...item, producto: productoVisible };
        }),
      }));
      return NextResponse.json(sinCostos);
    }

    return NextResponse.json(ordenes);
  } catch (error: any) {
    console.error('Error fetching ordenes de compra:', error);
    return NextResponse.json({ error: 'Error al consultar órdenes de compra' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();
    const { proveedorId, almacenDestinoId, items, observaciones, fechaEsperada } = body;

    const targetTenantId = user.rol === 'SUPERADMIN' ? (body.tenantId || user.tenantId) : user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    if (!proveedorId || !almacenDestinoId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Debe seleccionar proveedor, almacén destino y al menos un artículo.' }, { status: 400 });
    }

    // 1. Validar proveedor y almacén
    const proveedor = await prisma.proveedor.findFirst({
      where: { id: proveedorId, tenantId: targetTenantId },
    });
    if (!proveedor) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
    }

    const almacen = await prisma.almacen.findFirst({
      where: { id: almacenDestinoId, tenantId: targetTenantId },
    });
    if (!almacen) {
      return NextResponse.json({ error: 'Almacén destino no encontrado' }, { status: 404 });
    }

    // 2. Generar Folio OC-YYYY-XXXX
    const count = await prisma.ordenCompra.count({ where: { tenantId: targetTenantId } });
    const folio = `OC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // 3. Procesar partidas
    let subtotal = 0;
    const itemsData = [];

    for (const item of items) {
      const prod = await prisma.producto.findFirst({
        where: { id: item.productoId, tenantId: targetTenantId },
      });

      if (!prod) {
        return NextResponse.json({ error: `Producto no encontrado (ID: ${item.productoId})` }, { status: 404 });
      }

      const cantidad = Number(item.cantidad);
      const costoUnitario = Number(item.costoUnitario !== undefined ? item.costoUnitario : prod.costoPromedio);
      const itemSubtotal = cantidad * costoUnitario;

      subtotal += itemSubtotal;
      itemsData.push({
        productoId: prod.id,
        cantidadSolicitada: cantidad,
        cantidadRecibida: 0,
        costoUnitario,
        subtotal: itemSubtotal,
      });
    }

    const impuestos = Math.round(subtotal * 0.16 * 100) / 100;
    const total = subtotal + impuestos;

    // 4. Guardar Orden de Compra
    const ordenCompra = await prisma.ordenCompra.create({
      data: {
        tenantId: targetTenantId,
        proveedorId,
        almacenDestinoId,
        folio,
        subtotal,
        impuestos,
        total,
        estado: 'AUTORIZADA',
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        observaciones: observaciones ? observaciones.trim() : null,
        fechaEsperada: fechaEsperada ? new Date(fechaEsperada) : null,
        items: {
          create: itemsData,
        },
      },
      include: {
        proveedor: true,
        almacenDestino: true,
        items: {
          include: { producto: true },
        },
      },
    });

    // 5. Auditoría
    await prisma.registroAuditoria.create({
      data: {
        tenantId: targetTenantId,
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        modulo: 'COMPRAS',
        accion: 'CREAR',
        detalles: `Orden de Compra ${folio} autorizada para ${proveedor.razonSocial}. Importe: $${total.toFixed(2)} MXN`,
      },
    });

    return NextResponse.json(ordenCompra, { status: 201 });
  } catch (error: any) {
    console.error('Error creating orden de compra:', error);
    return NextResponse.json({ error: error.message || 'Error al emitir orden de compra' }, { status: 500 });
  }
}
