import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { previsualizarAjuste, confirmarAjuste, entradaPrevisualizacion, entradaConfirmacion } from '@/lib/ajustes-inventario';
import { VentaError } from '@/lib/ventas';
import { ZodError } from 'zod';
import { requireAuth } from '@/lib/auth';
import { attachCorrelationId, auditOperationalFailure } from '@/lib/platform-audit';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'ALMACENISTA', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);
    const tenantParam = searchParams.get('tenantId');
    const effectiveTenantId = user.rol === 'SUPERADMIN' ? (tenantParam || undefined) : user.tenantId;

    if (!effectiveTenantId && user.rol !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const where = effectiveTenantId ? { tenantId: effectiveTenantId } : {};

    const ajustes = await prisma.ajusteInventario.findMany({
      where,
      include: {
        almacen: true,
        items: {
          include: { producto: true },
        },
      },
      orderBy: { fecha: 'desc' },
      take: 50,
    });

    if (user.rol === 'ALMACENISTA') {
      const sinCostos = ajustes.map(({ items, ...ajuste }) => ({
        ...ajuste,
        items: items.map(({ costoUnitario: _costoUnitario, producto, ...item }) => {
          const { costoPromedio: _costoPromedio, ...productoVisible } = producto;
          return { ...item, producto: productoVisible };
        }),
      }));
      return NextResponse.json(sinCostos);
    }

    return NextResponse.json(ajustes);
  } catch (error) {
    console.error('Error fetching ajustes:', error);
    return NextResponse.json({ error: 'Error al obtener historial de ajustes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let auditActor: { id: string; email: string; tenantId: string | null } | null = null;
  try {
    const auth = await requireAuth(req, ['SUPERADMIN','ADMIN','ALMACENISTA']);
    if (auth.errorResponse) return auth.errorResponse;
    auditActor = auth.user;
    const body = await req.json().catch(() => null);
    if (body?.accion === 'PREVISUALIZAR') return NextResponse.json(await previsualizarAjuste(entradaPrevisualizacion.parse(body), auth.user));
    if (body?.accion === 'CONFIRMAR') {
      const result = await confirmarAjuste(entradaConfirmacion.parse(body).token, req.headers.get('Idempotency-Key') ?? '', auth.user);
      return NextResponse.json(result.ajuste, { status: result.repetida ? 200 : 201,
        headers: { 'Idempotency-Replayed': String(result.repetida) } });
    }
    return NextResponse.json({ error: 'Indique PREVISUALIZAR o CONFIRMAR' }, { status: 400 });
  } catch (error) {
    const status = error instanceof VentaError ? error.status : error instanceof ZodError ? 400 : 500;
    const correlationId = await auditOperationalFailure(req, auditActor, { categoria: 'INVENTARIO', accion: 'AJUSTE_FALLIDO', status });
    if (status >= 500) console.error('Error de ajuste:', error);
    const response = error instanceof VentaError
      ? NextResponse.json({ error: error.message }, { status })
      : error instanceof ZodError
        ? NextResponse.json({ error: 'Revise tipo, motivo, cantidades y partidas del ajuste' }, { status })
        : NextResponse.json({ error: 'Resultado desconocido; reintente la misma confirmación', correlationId }, { status });
    return attachCorrelationId(response, correlationId);
  }
}
