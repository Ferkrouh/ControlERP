import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'ALMACENISTA', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);
    const tenantParam = searchParams.get('tenantId');
    const effectiveTenantId = user.rol === 'SUPERADMIN' ? (tenantParam || undefined) : user.tenantId;

    if (!effectiveTenantId && user.rol !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const where = effectiveTenantId ? { tenantId: effectiveTenantId } : {};

    const almacenes = await prisma.almacen.findMany({
      where,
      include: {
        existencias: {
          include: { producto: true },
        },
      },
      orderBy: { codigo: 'asc' },
    });

    return NextResponse.json(almacenes);
  } catch (error) {
    console.error('Error fetching almacenes:', error);
    return NextResponse.json({ error: 'Error al obtener almacenes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Solo Admin o Superadmin pueden crear almacenes
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();

    const targetTenantId = user.rol === 'SUPERADMIN' ? (body.tenantId || user.tenantId) : user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    if (!body.nombre) {
      return NextResponse.json({ error: 'El nombre del almacén es obligatorio' }, { status: 400 });
    }

    const count = await prisma.almacen.count({ where: { tenantId: targetTenantId } });
    const codigo = `ALM-${String(count + 1).padStart(2, '0')}`;

    const almacen = await prisma.almacen.create({
      data: {
        tenantId: targetTenantId,
        codigo,
        nombre: body.nombre.trim(),
        ubicacion: body.ubicacion ? body.ubicacion.trim() : null,
        esPrincipal: Boolean(body.esPrincipal),
      },
    });

    return NextResponse.json(almacen, { status: 201 });
  } catch (error) {
    console.error('Error creating almacen:', error);
    return NextResponse.json({ error: 'Error al crear almacén' }, { status: 500 });
  }
}
