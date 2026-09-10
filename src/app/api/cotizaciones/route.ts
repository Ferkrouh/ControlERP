import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);
    const tenantParam = searchParams.get('tenantId');
    const effectiveTenantId = user.rol === 'SUPERADMIN' ? (tenantParam || undefined) : user.tenantId;

    if (!effectiveTenantId && user.rol !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const where = effectiveTenantId ? { tenantId: effectiveTenantId } : {};

    const cotizaciones = await prisma.cotizacion.findMany({
      where,
      include: {
        cliente: true,
        detalles: {
          include: { producto: true },
        },
      },
      orderBy: { fecha: 'desc' },
      take: 50,
    });

    return NextResponse.json(cotizaciones);
  } catch (error) {
    console.error('Error fetching cotizaciones:', error);
    return NextResponse.json({ error: 'Error al consultar cotizaciones' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();
    const { clienteId, vigenciaDias = 15, items, observaciones, condicionesPago } = body;

    const targetTenantId = user.rol === 'SUPERADMIN' ? (body.tenantId || user.tenantId) : user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    if (!clienteId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Debe seleccionar un cliente y al menos un artículo para la cotización.' }, { status: 400 });
    }

    // 1. Validar existencia del cliente en el tenant
    const cliente = await prisma.cliente.findFirst({
      where: { id: clienteId, tenantId: targetTenantId },
    });
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado en este negocio' }, { status: 404 });
    }

    // 2. Calcular vigencia y vencimiento
    const dias = Number(vigenciaDias) || 15;
    const fechaVencimiento = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

    // 3. Generar Folio consecutivo COT-YYYY-XXXX
    const count = await prisma.cotizacion.count({ where: { tenantId: targetTenantId } });
    const folio = `COT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // 4. Calcular importes
    let subtotal = 0;
    const detallesData = [];

    for (const item of items) {
      const prod = await prisma.producto.findFirst({
        where: { id: item.productoId, tenantId: targetTenantId },
      });

      if (!prod) {
        return NextResponse.json({ error: `Producto no encontrado (ID: ${item.productoId})` }, { status: 404 });
      }

      const cantidad = Number(item.cantidad);
      const precioUnitario = Number(item.precioUnitario !== undefined ? item.precioUnitario : prod.precioVenta);
      const descuento = Number(item.descuento || 0);
      const itemSubtotal = Math.max(0, cantidad * precioUnitario - descuento);

      subtotal += itemSubtotal;
      detallesData.push({
        productoId: prod.id,
        cantidad,
        precioUnitario,
        descuento,
        subtotal: itemSubtotal,
      });
    }

    const impuestos = Math.round(subtotal * 0.16 * 100) / 100;
    const total = subtotal + impuestos;

    // 5. Guardar cotización en base de datos
    const cotizacion = await prisma.cotizacion.create({
      data: {
        tenantId: targetTenantId,
        clienteId,
        folio,
        vigenciaDias: dias,
        fechaVencimiento,
        subtotal,
        impuestos,
        total,
        estado: 'BORRADOR',
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        observaciones: observaciones ? observaciones.trim() : null,
        condicionesPago: condicionesPago || 'Contado / Sujeto a disponibilidad de inventario',
        detalles: {
          create: detallesData,
        },
      },
      include: {
        cliente: true,
        detalles: {
          include: { producto: true },
        },
      },
    });

    // 6. Registro de Auditoría
    await prisma.registroAuditoria.create({
      data: {
        tenantId: targetTenantId,
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        modulo: 'COTIZACIONES',
        accion: 'CREAR',
        detalles: `Cotización ${folio} creada para ${cliente.razonSocial}. Importe: $${total.toFixed(2)} MXN`,
      },
    });

    return NextResponse.json(cotizacion, { status: 201 });
  } catch (error: any) {
    console.error('Error creating cotizacion:', error);
    return NextResponse.json({ error: error.message || 'Error al emitir cotización' }, { status: 500 });
  }
}
