import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { procesarPrenominaPeriodo } from '@/lib/payroll-engine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { id: periodoId } = await params;

    const targetTenantId = user.rol === 'SUPERADMIN' ? user.tenantId : user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const periodoActualizado = await procesarPrenominaPeriodo(periodoId, targetTenantId);
    return NextResponse.json(periodoActualizado);
  } catch (error: any) {
    console.error('Error calculando prenómina:', error);
    return NextResponse.json({ error: error.message || 'Error al calcular prenómina' }, { status: 500 });
  }
}
