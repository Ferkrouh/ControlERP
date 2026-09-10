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

    const traspasos = await prisma.traspaso.findMany({
      where,
      include: {
        items: {
          include: { producto: true },
        },
      },
      orderBy: { fechaSolicitud: 'desc' },
    });

    const almacenes = await prisma.almacen.findMany({
      where: effectiveTenantId ? { tenantId: effectiveTenantId } : {},
    });
    const mapAlm = new Map(almacenes.map((a) => [a.id, a.nombre]));

    const result = traspasos.map((t) => ({
      ...t,
      almacenOrigenNombre: mapAlm.get(t.almacenOrigenId) || 'Almacén Origen',
      almacenDestinoNombre: mapAlm.get(t.almacenDestinoId) || 'Almacén Destino',
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching traspasos:', error);
    return NextResponse.json({ error: 'Error al obtener traspasos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();
    const { almacenOrigenId, almacenDestinoId, items, observaciones } = body;

    const targetTenantId = user.rol === 'SUPERADMIN' ? (body.tenantId || user.tenantId) : user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    if (almacenOrigenId === almacenDestinoId) {
      return NextResponse.json({ error: 'El almacén de origen y destino no pueden ser el mismo' }, { status: 400 });
    }

    // Validar que ambos almacenes pertenezcan al tenant
    const almacenes = await prisma.almacen.findMany({
      where: {
        id: { in: [almacenOrigenId, almacenDestinoId] },
        tenantId: targetTenantId,
      },
    });

    if (almacenes.length !== 2) {
      return NextResponse.json({ error: 'Almacenes no válidos o no pertenecen a su empresa' }, { status: 400 });
    }

    const count = await prisma.traspaso.count({ where: { tenantId: targetTenantId } });
    const folio = `TRASP-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const traspaso = await prisma.traspaso.create({
      data: {
        tenantId: targetTenantId,
        folio,
        almacenOrigenId,
        almacenDestinoId,
        estado: 'SOLICITADO',
        observaciones,
        items: {
          create: items.map((it: any) => ({
            productoId: it.productoId,
            cantidadEnviada: Number(it.cantidadEnviada),
          })),
        },
      },
      include: {
        items: { include: { producto: true } },
      },
    });

    return NextResponse.json(traspaso, { status: 201 });
  } catch (error) {
    console.error('Error creating traspaso:', error);
    return NextResponse.json({ error: 'Error al solicitar traspaso' }, { status: 500 });
  }
}
