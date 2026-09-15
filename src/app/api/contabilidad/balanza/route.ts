import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { obtenerBalanzaComprobacion } from '@/lib/accounting-engine';

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

    const balanza = await obtenerBalanzaComprobacion(effectiveTenantId);
    return NextResponse.json(balanza);
  } catch (error: any) {
    console.error('Error fetching balanza:', error);
    return NextResponse.json({ error: 'Error al calcular balanza de comprobación' }, { status: 500 });
  }
}
