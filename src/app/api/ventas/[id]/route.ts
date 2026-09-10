import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET: Obtener detalle completo de una venta
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'AUDITOR', 'ALMACENISTA']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { id } = await params;

    const venta = await prisma.venta.findUnique({
      where: { id },
      include: {
        cliente: true,
        almacen: true,
        detalles: {
          include: { producto: true },
        },
      },
    });

    if (!venta) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    if (user.rol !== 'SUPERADMIN' && venta.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json(venta);
  } catch (error: any) {
    console.error('Error fetching venta:', error);
    return NextResponse.json({ error: 'Error al consultar venta' }, { status: 500 });
  }
}

// PUT: Modificar observaciones o condición de pago de una venta
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { id } = await params;
    const body = await req.json();
    const { observaciones, tipoPago } = body;

    const ventaExistente = await prisma.venta.findUnique({
      where: { id },
      include: { cliente: true },
    });

    if (!ventaExistente) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    if (user.rol !== 'SUPERADMIN' && ventaExistente.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const updated = await prisma.venta.update({
      where: { id },
      data: {
        observaciones: observaciones !== undefined ? (observaciones?.trim() || null) : ventaExistente.observaciones,
        tipoPago: tipoPago || ventaExistente.tipoPago,
      },
    });

    // Registrar en auditoría
    await prisma.registroAuditoria.create({
      data: {
        tenantId: ventaExistente.tenantId,
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        modulo: 'VENTAS',
        accion: 'MODIFICACION',
        detalles: `Modificación en venta ${ventaExistente.folio}: ${observaciones ? 'observaciones actualizadas' : ''} ${tipoPago ? `tipo de pago: ${tipoPago}` : ''}`,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating venta:', error);
    return NextResponse.json({ error: 'Error al actualizar venta' }, { status: 500 });
  }
}

// DELETE: Cancelar / Eliminar una venta con reversión de inventario y CxC
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { id } = await params;

    const venta = await prisma.venta.findUnique({
      where: { id },
      include: {
        cliente: true,
        detalles: true,
      },
    });

    if (!venta) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    if (user.rol !== 'SUPERADMIN' && venta.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Transacción atómica para revertir existencias, kárdex, CxC y borrar la venta
    await prisma.$transaction(async (tx) => {
      // 1. Revertir existencias de cada artículo al almacén y asentar contrarrecibo en Kárdex
      for (const det of venta.detalles) {
        const existencia = await tx.existencia.findUnique({
          where: {
            almacenId_productoId: {
              almacenId: venta.almacenId,
              productoId: det.productoId,
            },
          },
        });

        const stockPrevio = existencia?.cantidad || 0;
        const nuevoStock = stockPrevio + det.cantidad;

        if (existencia) {
          await tx.existencia.update({
            where: { id: existencia.id },
            data: { cantidad: nuevoStock },
          });
        }

        // Registrar devolución/cancelación en Kárdex
        await tx.movimientoKardex.create({
          data: {
            tenantId: venta.tenantId,
            almacenId: venta.almacenId,
            productoId: det.productoId,
            tipoMovimiento: 'ENTRADA_CANCELACION_VENTA',
            cantidad: det.cantidad,
            costoUnitario: det.costoUnitario,
            saldoResultante: nuevoStock,
            folioReferencia: venta.folio,
            motivo: `Cancelación / Eliminación de venta ${venta.folio}`,
          },
        });
      }

      // 2. Si tenía CxC asociada, disminuir saldo del cliente y eliminar la cuenta por cobrar
      if (venta.cxcId) {
        const cxc = await tx.cuentaPorCobrar.findUnique({
          where: { id: venta.cxcId },
        });

        if (cxc) {
          const cliente = await tx.cliente.findUnique({
            where: { id: venta.clienteId },
          });

          if (cliente) {
            const nuevoSaldoCliente = Math.max(0, cliente.saldoActual - cxc.saldoPendiente);
            await tx.cliente.update({
              where: { id: venta.clienteId },
              data: {
                saldoActual: nuevoSaldoCliente,
                estadoCredito: nuevoSaldoCliente < cliente.limiteCredito && cliente.estadoCredito === 'BLOQUEADO' ? 'ACTIVO' : cliente.estadoCredito,
              },
            });
          }

          await tx.cuentaPorCobrar.delete({
            where: { id: venta.cxcId },
          });
        }
      }

      // 3. Eliminar la venta (cascade borra detalles)
      await tx.venta.delete({
        where: { id: venta.id },
      });

      // 4. Bitácora de Auditoría
      await tx.registroAuditoria.create({
        data: {
          tenantId: venta.tenantId,
          usuarioId: user.id,
          usuarioNombre: user.nombre,
          modulo: 'VENTAS',
          accion: 'CANCELACION',
          detalles: `Eliminación y reversión total de la venta ${venta.folio} de ${venta.cliente?.razonSocial || 'Cliente'} por $${venta.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}. Stock reintegrado al almacén.`,
        },
      });
    });

    return NextResponse.json({ success: true, message: `Venta ${venta.folio} eliminada y existencias reintegradas.` });
  } catch (error: any) {
    console.error('Error deleting venta:', error);
    return NextResponse.json({ error: error.message || 'Error al eliminar la venta' }, { status: 500 });
  }
}
