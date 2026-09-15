import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { contabilizarNomina } from '@/lib/payroll-engine';

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

    const poliza = await contabilizarNomina(periodoId, targetTenantId, {
      id: user.id,
      nombre: user.nombre,
    });

    return NextResponse.json(poliza);
  } catch (error: any) {
    console.error('Error contabilizando nómina:', error);
    return NextResponse.json({ error: error.message || 'Error al contabilizar nómina' }, { status: 500 });
  }
}
