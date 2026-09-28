import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { convertirCotizacion, entradaConversion } from '@/lib/cotizaciones';
import { errorCotizacion } from '@/lib/cotizaciones-http';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;
    const { id } = await params;
    const body = entradaConversion.parse(await req.json().catch(() => null));
    const resultado = await convertirCotizacion(id, body, auth.user);
    return NextResponse.json({ venta: resultado.venta,
      message: `Cotización convertida a venta ${resultado.venta.folio}. ${resultado.venta.advertenciaCredito || ''}` },
      { headers: { 'Idempotency-Replayed': String(resultado.repetida) } });
  } catch (error) { return errorCotizacion(error); }
}
