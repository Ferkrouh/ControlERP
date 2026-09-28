import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    return NextResponse.json({
      error: 'La exportación XML del SAT está deshabilitada durante el piloto hasta validar datos fiscales, formato y obligaciones aplicables.',
    }, { status: 409 });
  } catch (error: any) {
    console.error('Error exporting SAT XML:', error);
    return NextResponse.json({ error: 'Error al exportar XML del SAT' }, { status: 500 });
  }
}
