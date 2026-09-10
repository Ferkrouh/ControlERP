import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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

    const actualizada = await prisma.oportunidadCRM.update({
      where: { id },
      data: dataToUpdate,
    });

    await prisma.registroAuditoria.create({
      data: {
        tenantId,
        usuarioId: session.id,
        usuarioNombre: session.nombre,
        modulo: 'CRM',
        accion: 'EDITAR',
        detalles: `Movió oportunidad '${actualizada.nombre}' a etapa ${etapa}`,
      },
    });

    return NextResponse.json(actualizada);
  } catch (error) {
    console.error('Error al mover etapa CRM:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
