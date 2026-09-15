import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { timbrarPeriodoNomina } from '@/lib/payroll-engine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { id: periodoId } = await params;

    const targetTenantId = user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const periodoTimbrado = await timbrarPeriodoNomina(periodoId, targetTenantId);
    return NextResponse.json(periodoTimbrado);
  } catch (error: any) {
    console.error('Error timbrando nómina:', error);
    return NextResponse.json({ error: error.message || 'Error al timbrar nómina' }, { status: 500 });
  }
}
