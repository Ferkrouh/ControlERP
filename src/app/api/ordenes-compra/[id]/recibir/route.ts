import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const entradaRecepcion = z.object({
  folioFacturaProveedor: z.string().trim().max(100).optional().default(''),
  tipoPago: z.enum(['CREDITO', 'CONTADO']).default('CREDITO'),
  itemsRecibidos: z.array(z.object({
    productoId: z.string().min(1),
    cantidad: z.number().finite().positive(),
    numeroLote: z.string().trim().max(100).optional(),
    fechaCaducidad: z.string().date().optional(),
  }).strict()).min(1).max(500),
}).strict();

class RecepcionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'ALMACENISTA']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { id: ordenCompraId } = await params;
    const bodyResult = entradaRecepcion.safeParse(await req.json().catch(() => null));
    if (!bodyResult.success) {
      return NextResponse.json({ error: 'Revise folio, forma de pago, productos y cantidades de recepción.' }, { status: 400 });
    }
    const { folioFacturaProveedor, tipoPago, itemsRecibidos } = bodyResult.data;

    const targetTenantId = user.tenantId;

    // 1. Buscar Orden de Compra
    const oc = await prisma.ordenCompra.findUnique({
      where: { id: ordenCompraId },
      include: {
        proveedor: true,
        almacenDestino: true,
        items: {
          include: { producto: true },
        },
      },
    });

    if (!oc) {
      return NextResponse.json({ error: 'Orden de compra no encontrada' }, { status: 404 });
    }

    if (user.rol !== 'SUPERADMIN' && oc.tenantId !== targetTenantId) {
      return NextResponse.json({ error: 'No autorizado para operar en este negocio' }, { status: 403 });
    }

    if (user.rol === 'ALMACENISTA' && (!user.almacenAsignadoId || oc.almacenDestinoId !== user.almacenAsignadoId)) {
      return NextResponse.json({ error: 'No autorizado para recibir mercancía en este almacén.' }, { status: 403 });
    }

    if (!['AUTORIZADA', 'RECIBIDA_PARCIAL'].includes(oc.estado)) {
      return NextResponse.json({ error: 'La orden no está autorizada para recibir mercancía.' }, { status: 409 });
    }

    const ordenesItemIds = new Set<string>();
    const itemsPorProducto = new Map<string, (typeof oc.items)[number]>();
    for (const item of oc.items) {
      if (itemsPorProducto.has(item.productoId)) {
        return NextResponse.json({ error: 'La orden contiene productos duplicados; solicite su corrección antes de recibir.' }, { status: 409 });
      }
      itemsPorProducto.set(item.productoId, item);
      ordenesItemIds.add(item.id);
    }

    const productosSolicitados = new Set<string>();
    const recepciones = [] as Array<{
      productoId: string;
      cantidad: number;
      numeroLote?: string;
      fechaCaducidad?: string;
      itemOrdenId: string;
    }>;
    for (const itemRec of itemsRecibidos) {
      if (productosSolicitados.has(itemRec.productoId)) {
        return NextResponse.json({ error: 'No repita productos en la misma recepción.' }, { status: 400 });
      }
      productosSolicitados.add(itemRec.productoId);
      const ocItem = itemsPorProducto.get(itemRec.productoId);
      if (!ocItem || !ordenesItemIds.has(ocItem.id)) {
        return NextResponse.json({ error: 'La recepción contiene un producto que no pertenece a la orden.' }, { status: 400 });
      }
      const pendiente = Math.max(0, ocItem.cantidadSolicitada - ocItem.cantidadRecibida);
      if (itemRec.cantidad > pendiente) {
        return NextResponse.json({ error: `La cantidad recibida supera el pendiente autorizado para ${ocItem.producto.sku}.` }, { status: 400 });
      }
      recepciones.push({ ...itemRec, itemOrdenId: ocItem.id });
    }

    const tenantId = oc.tenantId;
    const almacenId = oc.almacenDestinoId;

    // 2. Ejecutar recepción física atómica con 3-Way Matching
    const resultado = await prisma.$transaction(async (tx) => {
      // The temporary state serializes concurrent receipts. It is only visible if this transaction commits.
      const ordenReclamada = await tx.ordenCompra.updateMany({
        where: { id: oc.id, tenantId: oc.tenantId, estado: { in: ['AUTORIZADA', 'RECIBIDA_PARCIAL'] } },
        data: { estado: 'EN_PROCESO_RECEPCION' },
      });
      if (ordenReclamada.count !== 1) {
        throw new RecepcionError('La orden cambió durante la recepción. Actualice e intente de nuevo.', 409);
      }

      let totalMontoRecibido = 0;
      const itemsCompraData = [];

      // Procesar cada partida recibida
      for (const itemRec of recepciones) {
        const { productoId, cantidad: cant, numeroLote, fechaCaducidad, itemOrdenId } = itemRec;
        const ocItem = oc.items.find((i) => i.id === itemOrdenId)!;

        const costoUnitario = ocItem.costoUnitario;
        const subtotalPartida = cant * costoUnitario;
        totalMontoRecibido += subtotalPartida;

        itemsCompraData.push({
          productoId,
          cantidad: cant,
          costoUnitario,
          subtotal: subtotalPartida,
        });

        // Actualizar cantidad recibida en la OC
        const partidaActualizada = await tx.ordenCompraItem.updateMany({
          where: {
            id: ocItem.id,
            ordenCompraId: oc.id,
            cantidadRecibida: { lte: ocItem.cantidadSolicitada - cant },
          },
          data: { cantidadRecibida: { increment: cant } },
        });
        if (partidaActualizada.count !== 1) {
          throw new RecepcionError('La cantidad pendiente cambió durante la recepción. Actualice la orden antes de continuar.', 409);
        }

        // Aumentar o crear existencia en almacén destino
        const ex = await tx.existencia.findUnique({
          where: {
            almacenId_productoId: {
              almacenId,
              productoId,
            },
          },
        });

        const nuevoStock = (ex ? ex.cantidad : 0) + cant;

        if (ex) {
          await tx.existencia.update({
            where: { id: ex.id },
            data: { cantidad: nuevoStock },
          });
        } else {
          await tx.existencia.create({
            data: {
              almacenId,
              productoId,
              cantidad: nuevoStock,
            },
          });
        }

        // Registrar Kárdex (Entrada por Compra ligada a OC)
        await tx.movimientoKardex.create({
          data: {
            tenantId,
            almacenId,
            productoId,
            tipoMovimiento: 'ENTRADA_COMPRA',
            cantidad: cant,
            costoUnitario,
            saldoResultante: nuevoStock,
            folioReferencia: oc.folio,
            motivo: `Recepción 3-Way Matching contra OC ${oc.folio}. Remisión/Factura: ${folioFacturaProveedor || 'S/N'}`,
          },
        });

        // Registrar Lote y Caducidad si fue provisto
        if (numeroLote && numeroLote.trim()) {
          const loteExistente = await tx.loteProducto.findUnique({
            where: {
              tenantId_productoId_numeroLote_almacenId: {
                tenantId,
                productoId,
                numeroLote: numeroLote.trim(),
                almacenId,
              },
            },
          });

          if (loteExistente) {
            await tx.loteProducto.update({
              where: { id: loteExistente.id },
              data: { cantidad: { increment: cant } },
            });
          } else {
            await tx.loteProducto.create({
              data: {
                tenantId,
                productoId,
                almacenId,
                numeroLote: numeroLote.trim(),
                fechaCaducidad: fechaCaducidad ? new Date(fechaCaducidad) : null,
                cantidad: cant,
              },
            });
          }
        }
      }

      if (itemsCompraData.length === 0) {
        throw new Error('Debe ingresar al menos una cantidad positiva recibida.');
      }

      const countCompras = await tx.compra.count({ where: { tenantId } });
      const folioCompra = `COM-${new Date().getFullYear()}-${String(countCompras + 1).padStart(4, '0')}`;
      const impuestosCompra = Math.round(totalMontoRecibido * 0.16 * 100) / 100;
      const totalCompra = totalMontoRecibido + impuestosCompra;

      // Crear registro formal de Compra
      const nuevaCompra = await tx.compra.create({
        data: {
          tenantId,
          proveedorId: oc.proveedorId,
          almacenId,
          folio: folioCompra,
          folioFacturaProv: folioFacturaProveedor || `OC-${oc.folio}`,
          tipoPago,
          subtotal: totalMontoRecibido,
          impuestos: impuestosCompra,
          total: totalCompra,
          estado: 'RECIBIDA',
          usuarioId: user.id,
          usuarioNombre: user.nombre,
          observaciones: `Recepción 3-Way Matching contra Orden de Compra ${oc.folio}`,
          detalles: {
            create: itemsCompraData,
          },
        },
      });

      // Si es a Crédito, crear la Cuenta por Pagar (CxP) con 3-Way Matching confirmado
      if (tipoPago === 'CREDITO') {
        const dias = oc.proveedor.diasCredito || 30;
        const fechaVencimiento = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

        const cxp = await tx.cuentaPorPagar.create({
          data: {
            tenantId,
            proveedorId: oc.proveedorId,
            folioFactura: folioFacturaProveedor || folioCompra,
            montoTotal: totalCompra,
            saldoPendiente: totalCompra,
            fechaVencimiento,
            estado: 'PENDIENTE',
          },
        });

        await tx.compra.update({
          where: { id: nuevaCompra.id },
          data: { cxpId: cxp.id },
        });

        await tx.proveedor.update({
          where: { id: oc.proveedorId },
          data: { saldoPendiente: { increment: totalCompra } },
        });
      }

      // Evaluar si la OC ya se surtió en su totalidad
      const updatedOcItems = await tx.ordenCompraItem.findMany({
        where: { ordenCompraId: oc.id },
      });

      const todosCompletos = updatedOcItems.every((i) => i.cantidadRecibida >= i.cantidadSolicitada);
      const nuevoEstadoOC = todosCompletos ? 'RECIBIDA_TOTAL' : 'RECIBIDA_PARCIAL';

      await tx.ordenCompra.update({
        where: { id: oc.id },
        data: { estado: nuevoEstadoOC },
      });

      // Auditoría
      await tx.registroAuditoria.create({
        data: {
          tenantId,
          usuarioId: user.id,
          usuarioNombre: user.nombre,
          modulo: 'COMPRAS',
          accion: 'AUTORIZAR',
          detalles: `Recepción 3-Way Matching efectuada para ${oc.folio}. Compra generada: ${folioCompra}. Monto: $${totalCompra.toFixed(2)} MXN`,
        },
      });

      return { folioCompra, totalCompra, nuevoEstadoOC };
    });

    return NextResponse.json({
      message: `¡Mercancía recibida en almacén exitosamente! Generado folio ${resultado.folioCompra}`,
      resultado,
    }, { status: 200 });
  } catch (error: any) {
    if (error instanceof RecepcionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error en recepción de OC:', error);
    return NextResponse.json({ error: 'No fue posible procesar la recepción. Consulte la bitácora con el folio de correlación.' }, { status: 500 });
  }
}
