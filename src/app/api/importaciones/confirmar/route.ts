import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { requireAuth } from '@/lib/auth';
import { confirmarImportacion } from '@/lib/importaciones';
import { VentaError } from '@/lib/ventas';
import { writePlatformAudit } from '@/lib/platform-audit';

const entrada = z.object({ loteId: z.string().uuid(), hashArchivo: z.string().regex(/^[a-f0-9]{64}$/) });
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN','SUPERADMIN']);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const { loteId, hashArchivo } = entrada.parse(await req.json());
    const result = await confirmarImportacion(loteId, hashArchivo, auth.user);
    return NextResponse.json(result.resultado, { status: result.repetida ? 200 : 201,
      headers: { 'Idempotency-Replayed': String(result.repetida) } });
  } catch (e) {
    await writePlatformAudit({
      tenantId: auth.user.tenantId,
      usuarioId: auth.user.id,
      usuarioEmail: auth.user.email,
      categoria: 'IMPORTACIONES',
      accion: 'CONFIRMACION_FALLIDA',
      resultado: e instanceof VentaError && e.status < 500 || e instanceof ZodError ? 'DENEGADO' : 'ERROR',
      detalles: 'No se pudo confirmar un lote de importación',
      metadata: { status: e instanceof VentaError ? e.status : e instanceof ZodError ? 400 : 500 },
    });
    if (e instanceof VentaError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof ZodError) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
    console.error('Confirmación de importación:', e);
    return NextResponse.json({ error: 'Resultado desconocido; reintente el mismo lote' }, { status: 500 });
  }
}
