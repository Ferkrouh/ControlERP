import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { generarLayoutDispersionBancaria } from '@/lib/payroll-engine';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { id: periodoId } = await params;

    const targetTenantId = user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const csv = await generarLayoutDispersionBancaria(periodoId, targetTenantId);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Dispersion_Nomina_${periodoId}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Error generando dispersión bancaria:', error);
    return NextResponse.json({ error: 'Error al generar layout de dispersión' }, { status: 500 });
  }
}
