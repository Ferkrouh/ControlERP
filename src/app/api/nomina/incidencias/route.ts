import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);
    const empleadoId = searchParams.get('empleadoId');
    const targetTenantId = user.tenantId;

    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const where: any = { tenantId: targetTenantId };
    if (empleadoId) where.empleadoId = empleadoId;

    const incidencias = await prisma.incidenciaNomina.findMany({
      where,
      include: { empleado: true },
      orderBy: { fecha: 'desc' },
    });

    return NextResponse.json(incidencias);
  } catch (error: any) {
    console.error('Error fetching incidencias:', error);
    return NextResponse.json({ error: 'Error al consultar incidencias' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();
    const { empleadoId, fecha, tipo, horas = 0, justificada = false, observaciones } = body;

    const targetTenantId = user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    if (!empleadoId || !fecha || !tipo) {
      return NextResponse.json({ error: 'Empleado, fecha y tipo de incidencia son requeridos' }, { status: 400 });
    }

    const incidencia = await prisma.incidenciaNomina.create({
      data: {
        tenantId: targetTenantId,
        empleadoId,
        fecha: new Date(fecha),
        tipo,
        horas: Number(horas) || 0,
        justificada: Boolean(justificada),
        observaciones,
      },
    });

    return NextResponse.json(incidencia, { status: 201 });
  } catch (error: any) {
    console.error('Error creating incidencia:', error);
    return NextResponse.json({ error: error.message || 'Error al registrar incidencia' }, { status: 500 });
  }
}
