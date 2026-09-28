import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['SUPERADMIN','ADMIN','ENCARGADO']);
  if (auth.errorResponse) return auth.errorResponse;
  return NextResponse.json({ error: 'Envío de REP fiscal deshabilitado durante el piloto sin PAC' }, { status: 409 });
}
