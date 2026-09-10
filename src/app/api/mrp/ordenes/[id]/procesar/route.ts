import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant no válido' }, { status: 400 });
    }

    const { id } = await params;
    const body = await request.json();
    const { accion, cantidadReal, costoManoObra } = body;

    const orden = await prisma.ordenProduccion.findUnique({
      where: { id },
      include: {
        producto: true,
        almacenOrigen: true,
        almacenDestino: true,
        listaMateriales: {
          include: {
            insumos: {
              include: { producto: true },
            },
          },
        },
      },
    });

    if (!orden || orden.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Orden de producción no encontrada' }, { status: 404 });
    }

    // ACCION 1: INICIAR (PLANIFICADA -> EN_PROCESO)
    if (accion === 'INICIAR') {
      if (orden.estado !== 'PLANIFICADA') {
        return NextResponse.json({ error: 'Solo órdenes en estado PLANIFICADA pueden iniciarse' }, { status: 400 });
      }

      const actualizada = await prisma.ordenProduccion.update({
        where: { id },
        data: {
          estado: 'EN_PROCESO',
          fechaInicio: new Date(),
        },
      });

      await prisma.registroAuditoria.create({
        data: {
          tenantId,
          usuarioId: session.id,
          usuarioNombre: session.nombre,
          modulo: 'MRP_PRODUCCION',
          accion: 'EDITAR',
          detalles: `Inició proceso de manufactura de orden ${orden.folio}`,
        },
      });

      return NextResponse.json(actualizada);
    }

    // ACCION 2: FINALIZAR (EN_PROCESO -> FINALIZADA: Consumir insumos y dar entrada al PT)
    if (accion === 'FINALIZAR') {
      if (orden.estado !== 'EN_PROCESO' && orden.estado !== 'PLANIFICADA') {
        return NextResponse.json({ error: 'La orden debe estar EN PROCESO o PLANIFICADA para finalizarse' }, { status: 400 });
      }

      const cantProducida = Number(cantidadReal) || orden.cantidadPlan;
      if (cantProducida <= 0) {
        return NextResponse.json({ error: 'La cantidad real producida debe ser mayor a 0' }, { status: 400 });
      }

      const bom = orden.listaMateriales;
      const factor = cantProducida / (bom.cantidadBase || 1);

      // 1. Validar existencias de todos los insumos en el almacén de origen
      for (const insumo of bom.insumos) {
        const cantRequerida = insumo.cantidadRequerida * factor * (1 + insumo.mermaEsperadaPct / 100);
        const exist = await prisma.existencia.findUnique({
          where: {
            almacenId_productoId: {
              almacenId: orden.almacenOrigenId,
              productoId: insumo.productoId,
            },
          },
        });

        if (!exist || exist.cantidad < cantRequerida) {
          return NextResponse.json(
            {
              error: `Stock insuficiente para el insumo '${insumo.producto.nombre}'. Requerido: ${cantRequerida}, Disponible: ${exist?.cantidad || 0}`,
            },
            { status: 400 }
          );
        }
      }

      // 2. Transacción de ejecución de MRP:
      // Descontar materias primas -> Generar MovimientoKardex SALIDA_PRODUCCION
      // Incrementar producto terminado -> Generar MovimientoKardex ENTRADA_PRODUCCION
      // Actualizar OrdenProduccion -> FINALIZADA
      let costoRealInsumos = 0;

      const resultado = await prisma.$transaction(async (tx) => {
        // A) Descontar insumos
        for (const insumo of bom.insumos) {
          const cantConsumida = insumo.cantidadRequerida * factor * (1 + insumo.mermaEsperadaPct / 100);
          const costoInsumoUnit = insumo.producto.costoPromedio || 0;
          costoRealInsumos += cantConsumida * costoInsumoUnit;

          const existenciaInsumo = await tx.existencia.update({
            where: {
              almacenId_productoId: {
                almacenId: orden.almacenOrigenId,
                productoId: insumo.productoId,
              },
            },
            data: {
              cantidad: { decrement: cantConsumida },
            },
          });

          await tx.movimientoKardex.create({
            data: {
              tenantId,
              almacenId: orden.almacenOrigenId,
              productoId: insumo.productoId,
              tipoMovimiento: 'CONSUMO_PRODUCCION',
              cantidad: cantConsumida,
              costoUnitario: costoInsumoUnit,
              saldoResultante: existenciaInsumo.cantidad,
              folioReferencia: orden.folio,
              motivo: `Consumo de insumos para fabricar orden ${orden.folio}`,
            },
          });
        }

        // B) Costo Mano de Obra y Costo Total del lote terminado
        const moFinal = Number(costoManoObra !== undefined ? costoManoObra : orden.costoManoObra);
        const costoTotalFinal = costoRealInsumos + moFinal;
        const nuevoCostoUnitarioPT = cantProducida > 0 ? costoTotalFinal / cantProducida : 0;

        // C) Entrada de producto terminado en almacén destino
        const existPTActual = await tx.existencia.findUnique({
          where: {
            almacenId_productoId: {
              almacenId: orden.almacenDestinoId,
              productoId: orden.productoId,
            },
          },
        });

        const stockAnteriorPT = existPTActual?.cantidad || 0;
        const existPT = await tx.existencia.upsert({
          where: {
            almacenId_productoId: {
              almacenId: orden.almacenDestinoId,
              productoId: orden.productoId,
            },
          },
          update: {
            cantidad: { increment: cantProducida },
          },
          create: {
            almacenId: orden.almacenDestinoId,
            productoId: orden.productoId,
            cantidad: cantProducida,
          },
        });

        // Actualizar costo promedio ponderado del Producto Terminado
        const prodPT = await tx.producto.findUnique({ where: { id: orden.productoId } });
        const costoPromAnterior = prodPT?.costoPromedio || 0;
        const stockTotalPonderado = stockAnteriorPT + cantProducida;
        const nuevoCostoPromPonderado =
          stockTotalPonderado > 0
            ? (stockAnteriorPT * costoPromAnterior + cantProducida * nuevoCostoUnitarioPT) / stockTotalPonderado
            : nuevoCostoUnitarioPT;

        await tx.producto.update({
          where: { id: orden.productoId },
          data: {
            costoPromedio: Number(nuevoCostoPromPonderado.toFixed(4)),
          },
        });

        // Registrar Kárdex de entrada de Producto Terminado
        await tx.movimientoKardex.create({
          data: {
            tenantId,
            almacenId: orden.almacenDestinoId,
            productoId: orden.productoId,
            tipoMovimiento: 'ENTRADA_PRODUCCION',
            cantidad: cantProducida,
            costoUnitario: nuevoCostoUnitarioPT,
            saldoResultante: existPT.cantidad,
            folioReferencia: orden.folio,
            motivo: `Lote terminado y ensamblado en orden ${orden.folio}`,
          },
        });

        // D) Cerrar la orden de producción
        const ordenCerrada = await tx.ordenProduccion.update({
          where: { id },
          data: {
            estado: 'FINALIZADA',
            cantidadReal: cantProducida,
            costoTotalInsumos: costoRealInsumos,
            costoManoObra: moFinal,
            costoTotal: costoTotalFinal,
            fechaFin: new Date(),
          },
        });

        return ordenCerrada;
      });

      await prisma.registroAuditoria.create({
        data: {
          tenantId,
          usuarioId: session.id,
          usuarioNombre: session.nombre,
          modulo: 'MRP_PRODUCCION',
          accion: 'AUTORIZAR',
          detalles: `Finalizó producción de ${cantProducida} pzas de la orden ${orden.folio}. Costo total: $${resultado.costoTotal.toFixed(2)}`,
        },
      });

      return NextResponse.json(resultado);
    }

    // ACCION 3: CANCELAR
    if (accion === 'CANCELAR') {
      if (orden.estado === 'FINALIZADA') {
        return NextResponse.json({ error: 'Una orden ya finalizada no puede ser cancelada' }, { status: 400 });
      }

      const cancelada = await prisma.ordenProduccion.update({
        where: { id },
        data: { estado: 'CANCELADA' },
      });

      await prisma.registroAuditoria.create({
        data: {
          tenantId,
          usuarioId: session.id,
          usuarioNombre: session.nombre,
          modulo: 'MRP_PRODUCCION',
          accion: 'ELIMINAR',
          detalles: `Canceló orden de producción ${orden.folio}`,
        },
      });

      return NextResponse.json(cancelada);
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
  } catch (error) {
    console.error('Error al procesar orden de producción:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
