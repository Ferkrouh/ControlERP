import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { operarTraspaso, TraspasoError } from '@/lib/traspasos';
import { z } from 'zod';
import { attachCorrelationId, auditOperationalFailure } from '@/lib/platform-audit';

const entrada = z.object({ accion: z.enum(['despachar', 'recibir']),
  recepciones: z.record(z.string(), z.number().finite().nonnegative()).optional() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let auditActor: { id: string; email: string; tenantId: string | null } | null = null;
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ALMACENISTA']);
    if (auth.errorResponse) return auth.errorResponse;
    auditActor = auth.user;
    const parsed = entrada.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Acción o cantidades de recepción inválidas' }, { status: 400 });
    const { id } = await params;
    const traspaso = await operarTraspaso(id, parsed.data.accion, parsed.data.recepciones, auth.user);
    return NextResponse.json({ success: true, traspaso });
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    const conflict = code === 'P2034' || code === 'P1008' || code === 'P2028' || code === 'P2002';
    const status = error instanceof TraspasoError ? error.status : conflict ? 409 : 500;
    const correlationId = await auditOperationalFailure(req, auditActor, { categoria: 'TRASPASOS', accion: 'OPERACION_FALLIDA', status });
    if (status >= 500) console.error('Error al operar traspaso:', error);
    const response = error instanceof TraspasoError
      ? NextResponse.json({ error: error.message }, { status })
      : conflict
        ? NextResponse.json({ error: 'Operación concurrente; actualice el listado y revise las cantidades antes de reintentar' }, { status })
        : NextResponse.json({ error: 'Error al procesar traspaso', correlationId }, { status });
    return attachCorrelationId(response, correlationId);
  }
}
