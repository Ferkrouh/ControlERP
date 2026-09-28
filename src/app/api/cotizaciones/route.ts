import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { conVersion, crearCotizacion, nuevaCotizacion } from '@/lib/cotizaciones';
import { errorCotizacion } from '@/lib/cotizaciones-http';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);
    const tenantParam = searchParams.get('tenantId');
    const effectiveTenantId = user.rol === 'SUPERADMIN' ? (tenantParam || undefined) : user.tenantId;

    if (!effectiveTenantId && user.rol !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const where = effectiveTenantId ? { tenantId: effectiveTenantId } : {};

    const cotizaciones = await prisma.cotizacion.findMany({
      where,
      include: {
        cliente: true,
        detalles: {
          include: { producto: true },
        },
      },
      orderBy: { fecha: 'desc' },
      take: 50,
    });

    return NextResponse.json(cotizaciones.map(conVersion));
  } catch (error) {
    console.error('Error fetching cotizaciones:', error);
    return NextResponse.json({ error: 'Error al consultar cotizaciones' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;
    const body = nuevaCotizacion.parse(await req.json().catch(() => null));
    return NextResponse.json(await crearCotizacion(body, auth.user), { status: 201 });
  } catch (error) { return errorCotizacion(error); }
}
