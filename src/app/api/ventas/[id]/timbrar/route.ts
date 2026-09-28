import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// El piloto no dispone de PAC ni timbrado real. No se emiten CFDI simulados.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
  if (auth.errorResponse) return auth.errorResponse;
  return NextResponse.json({ error: 'Timbrado fiscal deshabilitado hasta integrar y validar un PAC real' }, { status: 409 });
}
