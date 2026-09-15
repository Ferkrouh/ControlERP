import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { registrarPoliza } from '@/lib/accounting-engine';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);
    const tenantParam = searchParams.get('tenantId');
    const tipo = searchParams.get('tipo');
    const effectiveTenantId = user.rol === 'SUPERADMIN' ? (tenantParam || user.tenantId) : user.tenantId;

    if (!effectiveTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const where: any = { tenantId: effectiveTenantId };
    if (tipo && ['INGRESO', 'EGRESO', 'DIARIO'].includes(tipo)) {
      where.tipo = tipo;
    }

    const polizas = await prisma.polizaContable.findMany({
      where,
      include: {
        partidas: {
          include: { cuenta: true },
        },
      },
      orderBy: { fecha: 'desc' },
      take: 100,
    });

    return NextResponse.json(polizas);
  } catch (error: any) {
    console.error('Error fetching polizas:', error);
    return NextResponse.json({ error: 'Error al consultar pólizas contables' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();
    const { tipo, concepto, fecha, partidas } = body;

    const targetTenantId = user.rol === 'SUPERADMIN' ? (body.tenantId || user.tenantId) : user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    if (!tipo || !concepto || !Array.isArray(partidas) || partidas.length === 0) {
      return NextResponse.json({ error: 'Datos incompletos para la póliza' }, { status: 400 });
    }

    const poliza = await registrarPoliza({
      tenantId: targetTenantId,
      tipo,
      concepto,
      fecha: fecha ? new Date(fecha) : new Date(),
      origenModulo: 'MANUAL',
      usuarioId: user.id,
      usuarioNombre: user.nombre,
      partidas,
    });

    return NextResponse.json(poliza, { status: 201 });
  } catch (error: any) {
    console.error('Error creating poliza:', error);
    return NextResponse.json({ error: error.message || 'Error al registrar póliza' }, { status: 400 });
  }
}
