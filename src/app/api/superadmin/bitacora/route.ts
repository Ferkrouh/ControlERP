import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writePlatformAudit } from '@/lib/platform-audit';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['SUPERADMIN']);
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(request.url);
  const parsedLimit = Number(searchParams.get('limit') || 100);
  const limit = Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 500) : 100;
  const categoria = searchParams.get('categoria');
  const resultado = searchParams.get('resultado');
  const tenantId = searchParams.get('tenantId');
  const platformWhere: { categoria?: string; resultado?: string; tenantId?: string } = {};
  const businessWhere: { modulo?: string; tenantId?: string } = {};
  if (categoria) {
    platformWhere.categoria = categoria;
    businessWhere.modulo = categoria;
  }
  if (resultado && ['OK', 'ERROR', 'DENEGADO'].includes(resultado)) platformWhere.resultado = resultado;
  if (tenantId) {
    platformWhere.tenantId = tenantId;
    businessWhere.tenantId = tenantId;
  }

  await writePlatformAudit({
    usuarioId: auth.user.id,
    usuarioEmail: auth.user.email,
    categoria: 'SEGURIDAD',
    accion: 'CONSULTAR_BITACORA_PLATAFORMA',
    detalles: 'Consulta de bitácora operacional de plataforma',
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
  });

  const [platformEvents, businessEvents] = await Promise.all([
    prisma.registroPlataforma.findMany({ where: platformWhere, orderBy: { fecha: 'desc' }, take: limit }),
    prisma.registroAuditoria.findMany({ where: businessWhere, orderBy: { fecha: 'desc' }, take: limit }),
  ]);

  const events = [
    ...platformEvents.map((event) => ({
      id: event.id,
      fecha: event.fecha,
      tenantId: event.tenantId,
      usuarioEmail: event.usuarioEmail,
      categoria: event.categoria,
      accion: event.accion,
      resultado: event.resultado,
      detalles: event.detalles,
      correlationId: event.correlationId,
      origen: 'PLATAFORMA',
    })),
    ...businessEvents.map((event) => ({
      id: event.id,
      fecha: event.fecha,
      tenantId: event.tenantId,
      usuarioEmail: event.usuarioNombre,
      categoria: event.modulo,
      accion: event.accion,
      resultado: 'OK',
      detalles: event.detalles,
      correlationId: null,
      origen: 'OPERACION',
    })),
  ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime()).slice(0, limit);

  return NextResponse.json({ events });
}
