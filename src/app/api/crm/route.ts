import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;
    const { user: session } = auth;

    const { searchParams } = new URL(request.url);
    const tenantId = session.rol === 'SUPERADMIN' ? searchParams.get('tenantId') || session.tenantId : session.tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const etapa = searchParams.get('etapa');
    const whereCondition: any = { tenantId };
    if (etapa) {
      whereCondition.etapa = etapa;
    }

    const oportunidades = await prisma.oportunidadCRM.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(oportunidades);
  } catch (error) {
    console.error('Error al listar oportunidades CRM:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;
    const { user: session } = auth;

    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant no válido' }, { status: 400 });
    }

    const body = await request.json();
    const {
      nombre,
      contactoNombre,
      contactoEmail,
      contactoTelefono,
      etapa = 'PROSPECCION',
      valorEstimado = 0,
      probabilidadPct = 20,
      fechaCierrePrev,
      origen = 'DIRECTO',
      usuarioAsignado,
      notas,
    } = body;

    if (!nombre || !contactoNombre) {
      return NextResponse.json({ error: 'Título del trato y contacto son obligatorios' }, { status: 400 });
    }

    const nuevaOportunidad = await prisma.oportunidadCRM.create({
      data: {
        tenantId,
        nombre: nombre.trim(),
        contactoNombre: contactoNombre.trim(),
        contactoEmail,
        contactoTelefono,
        etapa,
        valorEstimado: Number(valorEstimado) || 0,
        probabilidadPct: Number(probabilidadPct) || 20,
        fechaCierrePrev: fechaCierrePrev ? new Date(fechaCierrePrev) : null,
        origen,
        usuarioAsignado: usuarioAsignado || session.nombre,
        notas,
      },
    });

    await prisma.registroAuditoria.create({
      data: {
        tenantId,
        usuarioId: session.id,
        usuarioNombre: session.nombre,
        modulo: 'CRM',
        accion: 'CREAR',
        detalles: `Creó oportunidad en CRM: '${nuevaOportunidad.nombre}' por valor $${nuevaOportunidad.valorEstimado}`,
      },
    });

    return NextResponse.json(nuevaOportunidad, { status: 201 });
  } catch (error) {
    console.error('Error al crear oportunidad CRM:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;
    const { user: session } = auth;

    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant no válido' }, { status: 400 });
    }

    const body = await request.json();
    const { id, etapa, motivoPerdida, probabilidadPct } = body;

    if (!id || !etapa) {
      return NextResponse.json({ error: 'ID y etapa son requeridos' }, { status: 400 });
    }

    const dataToUpdate: any = { etapa };
    if (motivoPerdida !== undefined) dataToUpdate.motivoPerdida = motivoPerdida;
    if (probabilidadPct !== undefined) dataToUpdate.probabilidadPct = Number(probabilidadPct);
    if (etapa === 'GANADA') dataToUpdate.probabilidadPct = 100;
    if (etapa === 'PERDIDA') dataToUpdate.probabilidadPct = 0;

    const actualizada = await prisma.oportunidadCRM.updateMany({
      where: { id, tenantId },
      data: dataToUpdate,
    });

    if (actualizada.count === 0) {
      return NextResponse.json({ error: 'Oportunidad no encontrada' }, { status: 404 });
    }
    const oportunidadActualizada = await prisma.oportunidadCRM.findFirst({ where: { id, tenantId } });

    await prisma.registroAuditoria.create({
      data: {
        tenantId,
        usuarioId: session.id,
        usuarioNombre: session.nombre,
        modulo: 'CRM',
        accion: 'EDITAR',
        detalles: `Movió oportunidad '${oportunidadActualizada?.nombre || id}' a etapa ${etapa}`,
      },
    });

    return NextResponse.json(oportunidadActualizada);
  } catch (error) {
    console.error('Error al mover etapa CRM:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
