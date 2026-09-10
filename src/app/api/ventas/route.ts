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

    const ventas = await prisma.venta.findMany({
      where,
      include: {
        cliente: true,
        almacen: true,
        detalles: {
          include: { producto: true },
        },
      },
      orderBy: { fecha: 'desc' },
      take: 50,
    });

    return NextResponse.json(ventas);
  } catch (error) {
    console.error('Error fetching ventas:', error);
    return NextResponse.json({ error: 'Error al obtener historial de ventas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Almacenistas y Auditores no pueden emitir ventas comerciales
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();
    const { clienteId, almacenId, tipoPago, items, observaciones } = body;

    const targetTenantId = user.rol === 'SUPERADMIN' ? (body.tenantId || user.tenantId) : user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    if (!clienteId || !almacenId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Datos de venta incompletos. Debe seleccionar cliente, almacén y al menos un artículo.' }, { status: 400 });
    }

    // 1. Validar cliente y tenant
    const cliente = await prisma.cliente.findFirst({
      where: { id: clienteId, tenantId: targetTenantId },
    });
    const tenant = await prisma.tenant.findUnique({ where: { id: targetTenantId } });

    if (!cliente || !tenant) {
      return NextResponse.json({ error: 'Cliente o negocio no válido' }, { status: 404 });
    }

    // 2. Calcular montos de la venta
    let subtotal = 0;
    for (const item of items) {
      const cant = Number(item.cantidad);
      const precio = Number(item.precioUnitario);
      if (cant <= 0 || precio < 0) {
        return NextResponse.json({ error: 'Cantidad o precio unitario inválido en artículos' }, { status: 400 });
      }
      subtotal += cant * precio;
    }
    const impuestos = Math.round(subtotal * 0.16 * 100) / 100; // IVA 16% estándar
    const total = subtotal + impuestos;

    // 3. Validación de crédito si la venta es a crédito
    const esCredito = tipoPago === 'CREDITO';
    if (esCredito) {
      if (cliente.estadoCredito === 'BLOQUEADO') {
        return NextResponse.json({
          error: `Venta rechazada: El cliente ${cliente.razonSocial} tiene su crédito bloqueado por mora.`,
          bloqueado: true,
        }, { status: 400 });
      }

      const nuevoSaldo = cliente.saldoActual + total;
      if (tenant.moduloCredito && nuevoSaldo > cliente.limiteCredito) {
        if (tenant.politicaBloqueoCredito === 'ESTRICTO') {
          return NextResponse.json({
            error: `Límite de crédito excedido: El límite es $${cliente.limiteCredito.toLocaleString('es-MX')} y el saldo con esta venta alcanzaría $${nuevoSaldo.toLocaleString('es-MX')}.`,
            bloqueado: true,
          }, { status: 400 });
        }
      }
    }

    const count = await prisma.venta.count({ where: { tenantId: targetTenantId } });
    const folioVenta = `VTA-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // 4. Transacción Atómica Integral
    const ventaGenerada = await prisma.$transaction(async (tx) => {
      let cxcGeneradaId: string | null = null;

      // Si es a crédito, generar la Cuenta Por Cobrar y actualizar saldo del cliente
      if (esCredito) {
        const cxcCount = await tx.cuentaPorCobrar.count({ where: { tenantId: targetTenantId } });
        const folioCxC = `FAC-${new Date().getFullYear()}-${String(cxcCount + 1).padStart(4, '0')}`;
        const fechaVencimiento = new Date(Date.now() + (cliente.diasCredito || 30) * 24 * 60 * 60 * 1000);

        const nuevaCxc = await tx.cuentaPorCobrar.create({
          data: {
            tenantId: targetTenantId,
            clienteId,
            folio: folioCxC,
            montoTotal: total,
            saldoPendiente: total,
            fechaEmision: new Date(),
            fechaVencimiento,
            estado: 'PENDIENTE',
          },
        });
        cxcGeneradaId = nuevaCxc.id;

        const nuevoSaldo = cliente.saldoActual + total;
        await tx.cliente.update({
          where: { id: clienteId },
          data: {
            saldoActual: nuevoSaldo,
            estadoCredito: nuevoSaldo >= cliente.limiteCredito ? 'BLOQUEADO' : cliente.estadoCredito,
          },
        });
      }

      // Crear Cabecera de Venta
      const nuevaVenta = await tx.venta.create({
        data: {
          tenantId: targetTenantId,
          clienteId,
          almacenId,
          folio: folioVenta,
          tipoPago: esCredito ? 'CREDITO' : 'CONTADO',
          subtotal,
          impuestos,
          total,
          estado: 'COMPLETADA',
          cxcId: cxcGeneradaId,
          usuarioId: user.id,
          usuarioNombre: user.nombre,
          observaciones: observaciones ? observaciones.trim() : null,
        },
      });

      // Procesar cada detalle, validar stock, descontar y asentar en Kárdex
      for (const item of items) {
        const { productoId, cantidad, precioUnitario } = item;
        const cantNumber = Number(cantidad);
        const precioNumber = Number(precioUnitario);

        const producto = await tx.producto.findFirst({
          where: { id: productoId, tenantId: targetTenantId },
        });

        if (!producto) {
          throw new Error(`Producto ${productoId} no encontrado.`);
        }

        const existencia = await tx.existencia.findUnique({
          where: {
            almacenId_productoId: {
              almacenId,
              productoId,
            },
          },
        });

        const disponible = existencia?.cantidad || 0;
        if (disponible < cantNumber) {
          throw new Error(`Stock insuficiente para "${producto.nombre}". Disponible: ${disponible} ${producto.unidadMedida}, Solicitado: ${cantNumber}`);
        }

        const nuevoStock = disponible - cantNumber;

        // Descontar existencia
        await tx.existencia.update({
          where: { id: existencia!.id },
          data: { cantidad: nuevoStock },
        });

        // Crear detalle de venta
        await tx.ventaDetalle.create({
          data: {
            ventaId: nuevaVenta.id,
            productoId,
            cantidad: cantNumber,
            precioUnitario: precioNumber,
            costoUnitario: producto.costoPromedio,
            subtotal: cantNumber * precioNumber,
          },
        });

        // Asentar salida en Kárdex
        await tx.movimientoKardex.create({
          data: {
            tenantId: targetTenantId,
            almacenId,
            productoId,
            tipoMovimiento: 'SALIDA_VENTA',
            cantidad: cantNumber,
            costoUnitario: producto.costoPromedio,
            saldoResultante: nuevoStock,
            folioReferencia: folioVenta,
            motivo: `Venta a ${cliente.razonSocial} (${esCredito ? 'Crédito' : 'Contado'})`,
          },
        });
      }

      // Bitácora de Auditoría
      await tx.registroAuditoria.create({
        data: {
          tenantId: targetTenantId,
          usuarioId: user.id,
          usuarioNombre: user.nombre,
          modulo: 'VENTAS',
          accion: 'VENTA',
          detalles: `Venta ${folioVenta} emitida a ${cliente.razonSocial} por $${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} (${esCredito ? 'Crédito' : 'Contado'}).`,
        },
      });

      return nuevaVenta;
    });

    return NextResponse.json(ventaGenerada, { status: 201 });
  } catch (error: any) {
    console.error('Error in /api/ventas:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar venta comercial' }, { status: 500 });
  }
}
