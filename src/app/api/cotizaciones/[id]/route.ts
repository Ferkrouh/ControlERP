import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET: Obtener detalle completo de una cotización
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { id } = await params;

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
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

    if (user.rol !== 'SUPERADMIN' && cotizacion.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json(cotizacion);
  } catch (error: any) {
    console.error('Error fetching cotizacion:', error);
    return NextResponse.json({ error: 'Error al consultar cotización' }, { status: 500 });
  }
}

// PUT: Modificar una cotización (partidas, vigencia, notas, condiciones o cliente)
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
    const { clienteId, vigenciaDias, observaciones, condicionesPago, items } = body;

    const cotizacionExistente = await prisma.cotizacion.findUnique({
      where: { id },
      include: { detalles: true },
    });

    if (!cotizacionExistente) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    if (user.rol !== 'SUPERADMIN' && cotizacionExistente.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (cotizacionExistente.estado === 'CONVERTIDA') {
      return NextResponse.json(
        { error: 'No se puede modificar una cotización que ya ha sido convertida a pedido de venta.' },
        { status: 400 }
      );
    }

    // Calcular vigencia y fecha de vencimiento
    const dias = vigenciaDias !== undefined ? Number(vigenciaDias) : cotizacionExistente.vigenciaDias;
    const fechaVencimiento = new Date(cotizacionExistente.fecha);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + dias);

    // Si se envían nuevas partidas, recalcular totales
    let subtotal = cotizacionExistente.subtotal;
    let impuestos = cotizacionExistente.impuestos;
    let total = cotizacionExistente.total;

    if (items && Array.isArray(items) && items.length > 0) {
      subtotal = items.reduce((acc: number, it: any) => {
        const cant = Number(it.cantidad || 1);
        const pu = Number(it.precioUnitario || 0);
        const desc = Number(it.descuento || 0);
        return acc + (cant * pu - desc);
      }, 0);

      impuestos = Math.round(subtotal * 0.16 * 100) / 100;
      total = subtotal + impuestos;
    }

    // Transacción atómica
    const cotizacionActualizada = await prisma.$transaction(async (tx) => {
      // Si se proporcionaron nuevas partidas, reemplazar las anteriores
      if (items && Array.isArray(items) && items.length > 0) {
        await tx.cotizacionDetalle.deleteMany({
          where: { cotizacionId: id },
        });

        await tx.cotizacionDetalle.createMany({
          data: items.map((it: any) => {
            const cant = Number(it.cantidad || 1);
            const pu = Number(it.precioUnitario || 0);
            const desc = Number(it.descuento || 0);
            const lineSubtotal = cant * pu - desc;

            return {
              cotizacionId: id,
              productoId: it.productoId,
              cantidad: cant,
              precioUnitario: pu,
              descuento: desc,
              subtotal: lineSubtotal,
            };
          }),
        });
      }

      return await tx.cotizacion.update({
        where: { id },
        data: {
          clienteId: clienteId || cotizacionExistente.clienteId,
          vigenciaDias: dias,
          fechaVencimiento,
          observaciones: observaciones !== undefined ? observaciones : cotizacionExistente.observaciones,
          condicionesPago: condicionesPago !== undefined ? condicionesPago : cotizacionExistente.condicionesPago,
          subtotal,
          impuestos,
          total,
        },
        include: {
          cliente: true,
          detalles: {
            include: { producto: true },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Cotización ${cotizacionActualizada.folio} actualizada exitosamente.`,
      cotizacion: cotizacionActualizada,
    });
  } catch (error: any) {
    console.error('Error al actualizar cotizacion:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al actualizar cotización' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar una cotización
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { id } = await params;

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
    });

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    if (user.rol !== 'SUPERADMIN' && cotizacion.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (cotizacion.estado === 'CONVERTIDA') {
      return NextResponse.json(
        { error: 'No se puede eliminar una cotización que ya fue convertida a venta y despachada en almacén.' },
        { status: 400 }
      );
    }

    // Eliminar partidas y cotización
    await prisma.$transaction(async (tx) => {
      await tx.cotizacionDetalle.deleteMany({
        where: { cotizacionId: id },
      });

      await tx.cotizacion.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Cotización ${cotizacion.folio} eliminada correctamente.`,
    });
  } catch (error: any) {
    console.error('Error al eliminar cotización:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al eliminar cotización' },
      { status: 500 }
    );
  }
}
