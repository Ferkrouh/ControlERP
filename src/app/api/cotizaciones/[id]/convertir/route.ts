import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { id: cotizacionId } = await params;
    const body = await req.json();
    const { almacenId, tipoPago = 'CONTADO' } = body;

    const targetTenantId = user.tenantId;

    // 1. Buscar cotización con sus detalles
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
      include: {
        cliente: true,
        detalles: {
          include: { producto: true },
        },
      },
    });

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    if (user.rol !== 'SUPERADMIN' && cotizacion.tenantId !== targetTenantId) {
      return NextResponse.json({ error: 'No autorizado para operar en este negocio' }, { status: 403 });
    }

    if (cotizacion.estado === 'CONVERTIDA') {
      return NextResponse.json({ error: 'Esta cotización ya fue convertida a venta previamente.' }, { status: 400 });
    }

    if (!almacenId) {
      return NextResponse.json({ error: 'Debe especificar el almacén de despacho para convertir a venta.' }, { status: 400 });
    }

    const tenantId = cotizacion.tenantId;

    // 2. Validar almacén
    const almacen = await prisma.almacen.findFirst({
      where: { id: almacenId, tenantId },
    });
    if (!almacen) {
      return NextResponse.json({ error: 'Almacén de despacho no válido' }, { status: 404 });
    }

    const cliente = cotizacion.cliente;
    const totalVenta = cotizacion.total;

    // 3. Validar crédito si el tipo de pago es CREDITO
    if (tipoPago === 'CREDITO') {
      if (cliente.estadoCredito === 'BLOQUEADO') {
        return NextResponse.json({ error: 'Operación denegada: El cliente se encuentra BLOQUEADO por mora o riesgo crediticio.' }, { status: 403 });
      }

      const nuevoSaldo = cliente.saldoActual + totalVenta;
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

      if (nuevoSaldo > cliente.limiteCredito) {
        if (tenant?.politicaBloqueoCredito === 'ESTRICTO') {
          return NextResponse.json({
            error: `Operación cancelada por Política Estricta: La venta ($${totalVenta.toFixed(2)}) supera el límite de crédito disponible. Crédito restante: $${Math.max(0, cliente.limiteCredito - cliente.saldoActual).toFixed(2)}`,
          }, { status: 403 });
        }
      }
    }

    // 4. Validar existencias físicas en el almacén de despacho
    for (const d of cotizacion.detalles) {
      const existencia = await prisma.existencia.findUnique({
        where: {
          almacenId_productoId: {
            almacenId,
            productoId: d.productoId,
          },
        },
      });

      const stockActual = existencia ? existencia.cantidad : 0;
      if (stockActual < d.cantidad) {
        return NextResponse.json({
          error: `Stock insuficiente en almacén "${almacen.nombre}" para el producto "${d.producto.nombre}" (${d.producto.sku}). Requerido: ${d.cantidad}, Disponible: ${stockActual}.`,
        }, { status: 400 });
      }
    }

    // 5. Transacción atómica: Crear Venta, Descontar Stock, Kárdex, CxC y marcar cotización como CONVERTIDA
    const resultado = await prisma.$transaction(async (tx) => {
      const countVentas = await tx.venta.count({ where: { tenantId } });
      const folioVenta = `VTA-${new Date().getFullYear()}-${String(countVentas + 1).padStart(4, '0')}`;

      // Crear la Venta
      const nuevaVenta = await tx.venta.create({
        data: {
          tenantId,
          clienteId: cliente.id,
          almacenId,
          folio: folioVenta,
          tipoPago,
          subtotal: cotizacion.subtotal,
          impuestos: cotizacion.impuestos,
          total: totalVenta,
          estado: 'COMPLETADA',
          usuarioId: user.id,
          usuarioNombre: user.nombre,
          observaciones: `Convertido automáticamente desde Cotización ${cotizacion.folio}. ${cotizacion.observaciones || ''}`.trim(),
          detalles: {
            create: cotizacion.detalles.map((d) => ({
              productoId: d.productoId,
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
              costoUnitario: d.producto.costoPromedio,
              subtotal: d.subtotal,
            })),
          },
        },
      });

      // Descontar inventario y registrar Kárdex
      for (const d of cotizacion.detalles) {
        const existenciaActual = await tx.existencia.findUnique({
          where: {
            almacenId_productoId: {
              almacenId,
              productoId: d.productoId,
            },
          },
        });

        const nuevoStock = (existenciaActual ? existenciaActual.cantidad : 0) - d.cantidad;

        await tx.existencia.update({
          where: { id: existenciaActual!.id },
          data: { cantidad: nuevoStock },
        });

        await tx.movimientoKardex.create({
          data: {
            tenantId,
            almacenId,
            productoId: d.productoId,
            tipoMovimiento: 'SALIDA_VENTA',
            cantidad: d.cantidad,
            costoUnitario: d.producto.costoPromedio,
            saldoResultante: nuevoStock,
            folioReferencia: folioVenta,
            motivo: `Despacho por venta ${folioVenta} (Cotización ${cotizacion.folio})`,
          },
        });
      }

      // Si fue a crédito, crear CxC y actualizar saldo del cliente
      if (tipoPago === 'CREDITO') {
        const dias = cliente.diasCredito || 30;
        const fechaVencimiento = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

        const nuevaCxC = await tx.cuentaPorCobrar.create({
          data: {
            tenantId,
            clienteId: cliente.id,
            folio: `F-${folioVenta}`,
            montoTotal: totalVenta,
            saldoPendiente: totalVenta,
            fechaVencimiento,
            estado: 'PENDIENTE',
          },
        });

        await tx.venta.update({
          where: { id: nuevaVenta.id },
          data: { cxcId: nuevaCxC.id },
        });

        await tx.cliente.update({
          where: { id: cliente.id },
          data: { saldoActual: { increment: totalVenta } },
        });
      }

      // Marcar cotización como convertida
      await tx.cotizacion.update({
        where: { id: cotizacion.id },
        data: {
          estado: 'CONVERTIDA',
          ventaIdGenerada: nuevaVenta.id,
        },
      });

      // Registro de Auditoría
      await tx.registroAuditoria.create({
        data: {
          tenantId,
          usuarioId: user.id,
          usuarioNombre: user.nombre,
          modulo: 'COTIZACIONES',
          accion: 'VENTA',
          detalles: `Cotización ${cotizacion.folio} convertida exitosamente a Venta ${folioVenta} por $${totalVenta.toFixed(2)} MXN`,
        },
      });

      return { venta: nuevaVenta, folioVenta };
    });

    return NextResponse.json({
      message: `¡Cotización convertida a Venta ${resultado.folioVenta} con éxito!`,
      venta: resultado.venta,
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error al convertir cotización a venta:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar la conversión a venta' }, { status: 500 });
  }
}
