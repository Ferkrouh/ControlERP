import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { z } from 'zod';
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

    const traspasos = await prisma.traspaso.findMany({
      where,
      include: {
        items: {
          include: { producto: true },
        },
      },
      orderBy: { fechaSolicitud: 'desc' },
    });

    const almacenes = await prisma.almacen.findMany({
      where: effectiveTenantId ? { tenantId: effectiveTenantId } : {},
    });
    const mapAlm = new Map(almacenes.map((a) => [a.id, a.nombre]));

    const result = traspasos.map((t) => ({
      ...t,
      items: t.items.map(it => {
        if (user.rol !== 'ALMACENISTA') return it;
        const { costoPromedio: _costo, ...producto } = it.producto;
        return { ...it, producto };
      }),
      almacenOrigenNombre: mapAlm.get(t.almacenOrigenId) || 'Almacén Origen',
      almacenDestinoNombre: mapAlm.get(t.almacenDestinoId) || 'Almacén Destino',
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching traspasos:', error);
    return NextResponse.json({ error: 'Error al obtener traspasos' }, { status: 500 });
  }
}

const solicitud = z.object({
  tenantId: z.string().min(1).optional(),
  almacenOrigenId: z.string().min(1), almacenDestinoId: z.string().min(1),
  observaciones: z.string().max(2000).optional(),
  requiereCartaPorte: z.boolean().optional(),
  items: z.array(z.object({ productoId: z.string().min(1),
    cantidadEnviada: z.number().finite().positive() })).min(1).max(500),
});

export async function POST(req: NextRequest) {
  let auditActor: { id: string; email: string; tenantId: string | null } | null = null;
  let auditTenantId: string | null = null;
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;
    auditActor = auth.user;
    const parsed = solicitud.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Almacenes, partidas o cantidades inválidas' }, { status: 400 });
    const body = parsed.data;
    const targetTenantId = auth.user.rol === 'SUPERADMIN' ? (body.tenantId || auth.user.tenantId) : auth.user.tenantId;
    auditTenantId = targetTenantId;
    if (!targetTenantId) return NextResponse.json({ error: 'Seleccione una empresa' }, { status: 400 });
    if (body.requiereCartaPorte) return NextResponse.json({ error: 'Carta Porte no está habilitada: el piloto no cuenta con PAC real' }, { status: 409 });
    const ids = body.items.map(it => it.productoId);
    if (body.almacenOrigenId === body.almacenDestinoId || new Set(ids).size !== ids.length) {
      return NextResponse.json({ error: 'Seleccione almacenes distintos y una sola partida por producto' }, { status: 400 });
    }
    const traspaso = await prisma.$transaction(async tx => {
      const almacenes = await tx.almacen.count({ where: { tenantId: targetTenantId,
        id: { in: [body.almacenOrigenId, body.almacenDestinoId] } } });
      const productos = await tx.producto.count({ where: { tenantId: targetTenantId, id: { in: ids } } });
      if (almacenes !== 2 || productos !== ids.length) return null;
      const creado = await tx.traspaso.create({ data: {
        tenantId: targetTenantId, folio: `TRASP-${new Date().getFullYear()}-${randomUUID()}`,
        almacenOrigenId: body.almacenOrigenId, almacenDestinoId: body.almacenDestinoId,
        observaciones: body.observaciones?.trim() || null,
        items: { create: body.items },
      }, include: { items: { include: { producto: true } } } });
      await tx.registroAuditoria.create({ data: { tenantId: targetTenantId, usuarioId: auth.user.id,
        usuarioNombre: auth.user.nombre, modulo: 'TRASPASOS', accion: 'SOLICITAR',
        detalles: `${creado.folio}: ${body.items.length} partidas solicitadas` } });
      return creado;
    });
    if (!traspaso) return NextResponse.json({ error: 'Almacenes o productos ajenos a su empresa' }, { status: 400 });
    return NextResponse.json(traspaso, { status: 201 });
  } catch (error) {
    const correlationId = await auditOperationalFailure(req, auditActor, { categoria: 'TRASPASOS', accion: 'SOLICITUD_FALLIDA', status: 500, tenantId: auditTenantId });
    console.error('Error al solicitar traspaso:', error);
    return attachCorrelationId(NextResponse.json({ error: 'Error al solicitar traspaso', correlationId }, { status: 500 }), correlationId);
  }
}
