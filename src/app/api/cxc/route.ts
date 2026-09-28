import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { entradaCargo, registrarCargo } from '@/lib/cobranza';
import { errorCobranza } from '@/lib/cobranza-http';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Almacenistas no tienen acceso a CxC
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

    const cxcList = await prisma.cuentaPorCobrar.findMany({
      where,
      include: {
        cliente: true,
        pagos: {
          orderBy: { fecha: 'desc' },
        },
      },
      orderBy: { fechaVencimiento: 'asc' },
    });

    return NextResponse.json(cxcList);
  } catch (error) {
    console.error('Error fetching CxC:', error);
    return NextResponse.json({ error: 'Error al obtener CxC' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;
    const body = entradaCargo.parse(await req.json().catch(() => null));
    const { resultado, repetida } = await registrarCargo(body, req.headers.get('Idempotency-Key') ?? '', auth.user);
    return NextResponse.json(resultado, { status: repetida ? 200 : 201, headers: { 'Idempotency-Replayed': String(repetida) } });
  } catch (error) { return errorCobranza(error); }
}
