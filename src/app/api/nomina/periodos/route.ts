import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);
    const tenantParam = searchParams.get('tenantId');
    const effectiveTenantId = user.rol === 'SUPERADMIN' ? (tenantParam || user.tenantId) : user.tenantId;

    if (!effectiveTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const periodos = await prisma.periodoNomina.findMany({
      where: { tenantId: effectiveTenantId },
      include: {
        recibos: {
          include: { empleado: true },
        },
      },
      orderBy: { fechaInicio: 'desc' },
    });

    return NextResponse.json(periodos);
  } catch (error: any) {
    console.error('Error fetching periodos:', error);
    return NextResponse.json({ error: 'Error al consultar periodos de nómina' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();
    const { tipo = 'QUINCENAL', fechaInicio, fechaFin, fechaPago, diasPagados = 15 } = body;

    const targetTenantId = user.rol === 'SUPERADMIN' ? (body.tenantId || user.tenantId) : user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    if (!fechaInicio || !fechaFin || !fechaPago) {
      return NextResponse.json({ error: 'Fechas de inicio, fin y pago son obligatorias' }, { status: 400 });
    }

    const year = new Date(fechaInicio).getFullYear();
    const count = await prisma.periodoNomina.count({ where: { tenantId: targetTenantId } });
    const seq = (count + 1).toString().padStart(2, '0');
    const folio = `NOM-${year}-Q${seq}`;

    const periodo = await prisma.periodoNomina.create({
      data: {
        tenantId: targetTenantId,
        folio,
        tipo,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        fechaPago: new Date(fechaPago),
        diasPagados: Number(diasPagados) || 15,
        estado: 'BORRADOR',
      },
    });

    return NextResponse.json(periodo, { status: 201 });
  } catch (error: any) {
    console.error('Error creating periodo:', error);
    return NextResponse.json({ error: error.message || 'Error al crear periodo de nómina' }, { status: 500 });
  }
}
