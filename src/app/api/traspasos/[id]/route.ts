import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auditores no pueden ejecutar traspasos físicos (solo lectura)
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'ALMACENISTA']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { id } = await params;
    const { accion, recepciones } = await req.json(); // accion: 'despachar' | 'recibir'

    const traspaso = await prisma.traspaso.findUnique({
      where: { id },
      include: {
        items: { include: { producto: true } },
      },
    });

    if (!traspaso) {
      return NextResponse.json({ error: 'Traspaso no encontrado' }, { status: 404 });
    }

    if (user.rol !== 'SUPERADMIN' && traspaso.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'No autorizado para operar en este traspaso' }, { status: 403 });
    }

    // ACCION 1: DESPACHAR
    if (accion === 'despachar') {
      if (traspaso.estado !== 'SOLICITADO') {
        return NextResponse.json({ error: 'El traspaso no está en estado SOLICITADO' }, { status: 400 });
      }

      // Ejecución Atómica con prisma.$transaction
      const updated = await prisma.$transaction(async (tx) => {
        for (const item of traspaso.items) {
          const existenciaOrigen = await tx.existencia.findFirst({
            where: {
              almacenId: traspaso.almacenOrigenId,
              productoId: item.productoId,
            },
          });

          const disponible = existenciaOrigen?.cantidad || 0;
          if (disponible < item.cantidadEnviada) {
            throw new Error(`Stock insuficiente en origen para ${item.producto.nombre}. Disponible: ${disponible}, Solicitado: ${item.cantidadEnviada}`);
          }

          // Descontar de origen
          await tx.existencia.update({
            where: { id: existenciaOrigen!.id },
            data: { cantidad: disponible - item.cantidadEnviada },
          });

          // Registrar Kárdex salida
          await tx.movimientoKardex.create({
            data: {
              tenantId: traspaso.tenantId,
              almacenId: traspaso.almacenOrigenId,
              productoId: item.productoId,
              tipoMovimiento: 'TRASPASO_SALIDA',
              cantidad: item.cantidadEnviada,
              costoUnitario: item.producto.costoPromedio,
              saldoResultante: disponible - item.cantidadEnviada,
              folioReferencia: traspaso.folio,
              motivo: `Salida por traspaso despachado por ${user.nombre}`,
            },
          });
        }

        return await tx.traspaso.update({
          where: { id },
          data: {
            estado: 'DESPACHADO',
            fechaEnvio: new Date(),
          },
        });
      });

      return NextResponse.json({ success: true, traspaso: updated });
    }

    // ACCION 2: RECIBIR Y CONFIRMAR FÍSICO
    if (accion === 'recibir') {
      if (traspaso.estado !== 'DESPACHADO') {
        return NextResponse.json({ error: 'El traspaso debe estar DESPACHADO para poder recibirlo' }, { status: 400 });
      }

      const updated = await prisma.$transaction(async (tx) => {
        for (const item of traspaso.items) {
          const cantidadRecibida = recepciones && recepciones[item.id] !== undefined
            ? Number(recepciones[item.id])
            : item.cantidadEnviada;

          await tx.traspasoItem.update({
            where: { id: item.id },
            data: { cantidadRecibida },
          });

          // Sumar al almacén de destino
          let existenciaDestino = await tx.existencia.findFirst({
            where: {
              almacenId: traspaso.almacenDestinoId,
              productoId: item.productoId,
            },
          });

          let nuevoSaldo = cantidadRecibida;
          if (existenciaDestino) {
            nuevoSaldo = existenciaDestino.cantidad + cantidadRecibida;
            await tx.existencia.update({
              where: { id: existenciaDestino.id },
              data: { cantidad: nuevoSaldo },
            });
          } else {
            await tx.existencia.create({
              data: {
                almacenId: traspaso.almacenDestinoId,
                productoId: item.productoId,
                cantidad: cantidadRecibida,
              },
            });
          }

          // Registrar Kárdex entrada
          await tx.movimientoKardex.create({
            data: {
              tenantId: traspaso.tenantId,
              almacenId: traspaso.almacenDestinoId,
              productoId: item.productoId,
              tipoMovimiento: 'TRASPASO_ENTRADA',
              cantidad: cantidadRecibida,
              costoUnitario: item.producto.costoPromedio,
              saldoResultante: nuevoSaldo,
              folioReferencia: traspaso.folio,
              motivo: `Entrada y confirmación física recibida por ${user.nombre}`,
            },
          });
        }

        return await tx.traspaso.update({
          where: { id },
          data: {
            estado: 'RECIBIDO',
            fechaRecepcion: new Date(),
          },
        });
      });

      return NextResponse.json({ success: true, traspaso: updated });
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating traspaso:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar traspaso' }, { status: 500 });
  }
}
