import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/**
 * Consulta detallada de un negocio individual para el Superadmin
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN']);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        usuarios: {
          select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        almacenes: true,
        _count: {
          select: {
            usuarios: true,
            almacenes: true,
            clientes: true,
            proveedores: true,
            productos: true,
            traspasos: true,
            ventas: true,
            compras: true,
            cxc: true,
            cxp: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error('Error fetching single tenant:', error);
    return NextResponse.json({ error: 'Error al consultar negocio' }, { status: 500 });
  }
}

/**
 * Modificación completa o parcial de un negocio por el Superadmin
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN']);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const body = await req.json();

    // Sanitización y parseo de tipos específicos
    const dataToUpdate: any = { ...body };

    if (dataToUpdate.fechaVencimientoPlan !== undefined) {
      dataToUpdate.fechaVencimientoPlan = dataToUpdate.fechaVencimientoPlan 
        ? new Date(dataToUpdate.fechaVencimientoPlan) 
        : null;
    }

    if (dataToUpdate.fechaInicioPlan !== undefined) {
      dataToUpdate.fechaInicioPlan = new Date(dataToUpdate.fechaInicioPlan);
    }

    if (dataToUpdate.limiteUsuarios !== undefined) {
      dataToUpdate.limiteUsuarios = parseInt(dataToUpdate.limiteUsuarios);
    }

    if (dataToUpdate.limiteAlmacenes !== undefined) {
      dataToUpdate.limiteAlmacenes = parseInt(dataToUpdate.limiteAlmacenes);
    }

    if (dataToUpdate.diasGraciaSuscripcion !== undefined) {
      dataToUpdate.diasGraciaSuscripcion = parseInt(dataToUpdate.diasGraciaSuscripcion);
    }

    if (dataToUpdate.diasGraciaCredito !== undefined) {
      dataToUpdate.diasGraciaCredito = parseInt(dataToUpdate.diasGraciaCredito);
    }

    if (dataToUpdate.alertaVencimientoDias !== undefined) {
      dataToUpdate.alertaVencimientoDias = parseInt(dataToUpdate.alertaVencimientoDias);
    }

    if (dataToUpdate.identificacionFiscal) {
      dataToUpdate.identificacionFiscal = dataToUpdate.identificacionFiscal.toUpperCase().trim();
    }

    // No permitir alterar campos de ID, relaciones directas ni datos temporales del formulario
    delete dataToUpdate.id;
    delete dataToUpdate.usuarios;
    delete dataToUpdate.almacenes;
    delete dataToUpdate._count;
    delete dataToUpdate.adminNombre;
    delete dataToUpdate.adminEmail;
    delete dataToUpdate.adminPassword;

    const updated = await prisma.tenant.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating tenant:', error);
    return NextResponse.json({ error: 'Error al actualizar negocio' }, { status: 500 });
  }
}

/**
 * Eliminación de un negocio por el Superadmin
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN']);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            ventas: true,
            compras: true,
            productos: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    // Si tiene ventas o compras históricas y no se forzó, prevenir pérdida de datos
    const tieneHistorialContable = (tenant._count.ventas > 0 || tenant._count.compras > 0);
    if (tieneHistorialContable && !force) {
      return NextResponse.json(
        {
          error: `Este negocio tiene ${tenant._count.ventas} ventas y ${tenant._count.compras} compras registradas. Se recomienda pausar o desactivar el negocio en lugar de eliminarlo para conservar la contabilidad. Para forzar la eliminación definitiva de todos sus datos, confirme con el parámetro de seguridad.`,
          requiresForce: true,
          conteos: tenant._count,
        },
        { status: 400 }
      );
    }

    // Eliminación en cascada gestionada
    await prisma.tenant.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `El negocio "${tenant.nombreComercial}" y todos sus registros asociados han sido eliminados permanentemente.`,
    });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return NextResponse.json({ error: 'Error al eliminar el negocio' }, { status: 500 });
  }
}
