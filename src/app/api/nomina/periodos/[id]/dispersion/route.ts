import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    return NextResponse.json({ error: 'Layout bancario deshabilitado en el piloto hasta validar las cuentas CLABE reales' }, { status: 409 });
  } catch (error: any) {
    console.error('Error generando dispersión bancaria:', error);
    return NextResponse.json({ error: 'Error al generar layout de dispersión' }, { status: 500 });
  }
}
