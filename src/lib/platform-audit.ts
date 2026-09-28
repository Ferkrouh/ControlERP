import { prisma } from '@/lib/prisma';
import { randomUUID } from 'node:crypto';

type PlatformAuditEvent = {
  tenantId?: string | null;
  usuarioId?: string | null;
  usuarioEmail?: string | null;
  categoria: string;
  accion: string;
  resultado?: 'OK' | 'ERROR' | 'DENEGADO';
  detalles: string;
  correlationId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
};

type AuditActor = { id: string; email: string; tenantId: string | null };

function redactSensitiveValues(value: string): string {
  return value.replace(/(password|token|secret|authorization|csd|pacpassword)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]');
}

export async function writePlatformAudit(event: PlatformAuditEvent): Promise<void> {
  try {
    await prisma.registroPlataforma.create({
      data: {
        tenantId: event.tenantId || null,
        usuarioId: event.usuarioId || null,
        usuarioEmail: event.usuarioEmail || null,
        categoria: event.categoria.slice(0, 80),
        accion: event.accion.slice(0, 100),
        resultado: event.resultado || 'OK',
        detalles: redactSensitiveValues(event.detalles).slice(0, 1000),
        correlationId: event.correlationId || null,
        ipAddress: event.ipAddress || null,
        metadataJson: event.metadata ? redactSensitiveValues(JSON.stringify(event.metadata)).slice(0, 8000) : null,
      },
    });
  } catch (error) {
    // La auditoría no debe impedir el login; el error queda en el log operacional del servidor.
    console.error('No se pudo guardar evento de bitácora de plataforma:', error);
  }
}

export async function auditOperationalFailure(
  request: Request,
  actor: AuditActor | null,
  event: { categoria: string; accion: string; status: number; tenantId?: string | null }
): Promise<string> {
  const correlationId = randomUUID();
  const path = new URL(request.url).pathname.slice(0, 300);
  await writePlatformAudit({
    tenantId: event.tenantId ?? actor?.tenantId,
    usuarioId: actor?.id,
    usuarioEmail: actor?.email,
    categoria: event.categoria,
    accion: event.accion,
    resultado: event.status < 500 ? 'DENEGADO' : 'ERROR',
    detalles: 'Operación piloto rechazada o fallida; consultar referencia para seguimiento',
    correlationId,
    metadata: { status: event.status, method: request.method, path },
  });
  return correlationId;
}

export function attachCorrelationId<T extends Response>(response: T, correlationId: string): T {
  response.headers.set('X-Correlation-ID', correlationId);
  return response;
}
