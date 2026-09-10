import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { id } = await params;
    const body = await req.json();

    const almacenExistente = await prisma.almacen.findUnique({
      where: { id },
    });

    if (!almacenExistente) {
      return NextResponse.json({ error: 'Almacén no encontrado' }, { status: 404 });
    }

    if (user.rol !== 'SUPERADMIN' && almacenExistente.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'No autorizado para modificar este almacén' }, { status: 403 });
    }

    if (!body.nombre || !body.nombre.trim()) {
      return NextResponse.json({ error: 'El nombre del almacén es obligatorio' }, { status: 400 });
    }

    // Si se marca como principal, desmarcar los demás del mismo tenant
    if (body.esPrincipal) {
      await prisma.almacen.updateMany({
        where: { tenantId: almacenExistente.tenantId, id: { not: id } },
        data: { esPrincipal: false },
      });
    }

    const updated = await prisma.almacen.update({
      where: { id },
      data: {
        nombre: body.nombre.trim(),
        ubicacion: body.ubicacion !== undefined ? (body.ubicacion?.trim() || null) : almacenExistente.ubicacion,
        esPrincipal: Boolean(body.esPrincipal),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating almacen:', error);
    return NextResponse.json({ error: 'Error al actualizar almacén' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { id } = await params;

    const almacen = await prisma.almacen.findUnique({
      where: { id },
      include: {
        existencias: { where: { cantidad: { gt: 0 } } },
        ventas: { take: 1 },
        compras: { take: 1 },
      },
    });

    if (!almacen) {
      return NextResponse.json({ error: 'Almacén no encontrado' }, { status: 404 });
    }

    if (user.rol !== 'SUPERADMIN' && almacen.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Validar si tiene stock positivo
    if (almacen.existencias.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar un almacén con existencias positivas de artículos.' },
        { status: 400 }
      );
    }

    await prisma.almacen.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Almacén eliminado' });
  } catch (error) {
    console.error('Error deleting almacen:', error);
    return NextResponse.json({ error: 'Error al eliminar almacén' }, { status: 500 });
  }
}
