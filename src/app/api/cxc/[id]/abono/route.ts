import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { entradaAbono, registrarAbono } from '@/lib/cobranza';
import { errorCobranza } from '@/lib/cobranza-http';
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;
    const { id } = await params;
    const body = entradaAbono.parse(await req.json().catch(() => null));
    const { resultado, repetida } = await registrarAbono(id, body, req.headers.get('Idempotency-Key') ?? '', auth.user);
    return NextResponse.json(resultado, { headers: { 'Idempotency-Replayed': String(repetida) } });
  } catch (error) { return errorCobranza(error); }
}
