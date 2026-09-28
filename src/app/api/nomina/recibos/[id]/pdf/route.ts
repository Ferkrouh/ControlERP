import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['SUPERADMIN','ADMIN','AUDITOR']);
  if (auth.errorResponse) return auth.errorResponse;
  return NextResponse.json({ error: 'Recibo fiscal de nómina deshabilitado durante el piloto sin PAC' }, { status: 409 });
}
