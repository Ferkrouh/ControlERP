import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { emitirVenta, entradaVenta, VentaError } from '@/lib/ventas';
import { attachCorrelationId, auditOperationalFailure } from '@/lib/platform-audit';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);
    const tenantParam = searchParams.get('tenantId');
    const effectiveTenantId = user.rol === 'SUPERADMIN' ? (tenantParam || undefined) : user.tenantId;

    if (!effectiveTenantId && user.rol !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const where = effectiveTenantId ? { tenantId: effectiveTenantId } : {};

    const ventas = await prisma.venta.findMany({
      where,
      include: {
        cliente: true,
        almacen: true,
        detalles: {
          include: { producto: true },
        },
      },
      orderBy: { fecha: 'desc' },
      take: 50,
    });

    return NextResponse.json(ventas);
  } catch (error) {
    console.error('Error fetching ventas:', error);
    return NextResponse.json({ error: 'Error al obtener historial de ventas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let auditActor: { id: string; email: string; tenantId: string | null } | null = null;
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;
    auditActor = auth.user;
    const parsed = entradaVenta.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Datos de venta inválidos: revise cantidades, precios y condición de pago', solicitudRechazada: true }, { status: 400 });
    const resultado = await emitirVenta(parsed.data, req.headers.get('Idempotency-Key') || '', auth.user);
    return NextResponse.json(resultado.venta, { status: resultado.repetida ? 200 : 201,
      headers: { 'Idempotency-Replayed': String(resultado.repetida) } });
  } catch (error) {
    const status = error instanceof VentaError ? error.status : 500;
    const correlationId = await auditOperationalFailure(req, auditActor, { categoria: 'VENTAS', accion: 'EMITIR_FALLIDA', status });
    if (status >= 500) console.error('Error al emitir venta:', error);
    const response = error instanceof VentaError
      ? NextResponse.json({ error: error.message, solicitudRechazada: !error.conservarSolicitud }, { status })
      : NextResponse.json({ error: 'No fue posible confirmar la venta; reintente con la misma solicitud', correlationId }, { status });
    return attachCorrelationId(response, correlationId);
  }
}
