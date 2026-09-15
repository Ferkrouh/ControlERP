import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Almacenistas no tienen acceso a cartera de clientes y crédito
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    // Si es Superadmin, puede filtrar opcionalmente por tenantId; para el resto, forzamos estrictamente su tenantId de sesión
    const { searchParams } = new URL(req.url);
    const tenantParam = searchParams.get('tenantId');
    const effectiveTenantId = user.rol === 'SUPERADMIN' ? (tenantParam || undefined) : user.tenantId;

    if (!effectiveTenantId && user.rol !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Tenant no especificado para este usuario' }, { status: 400 });
    }

    const where = effectiveTenantId ? { tenantId: effectiveTenantId } : {};

    const clientes = await prisma.cliente.findMany({
      where,
      include: {
        cxc: {
          where: { estado: { in: ['PENDIENTE', 'PARCIAL', 'VENCIDA'] } },
          orderBy: { fechaVencimiento: 'asc' },
        },
      },
      orderBy: { razonSocial: 'asc' },
    });

    return NextResponse.json(clientes);
  } catch (error) {
    console.error('Error fetching clientes:', error);
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
  }
}

import { computeAuditHash, classifyAuditRisk, GENESIS_AUDIT_HASH } from '@/lib/audit-crypt';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    // Auditores y Almacenistas no pueden dar de alta clientes
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();

    const targetTenantId = user.rol === 'SUPERADMIN' ? (body.tenantId || user.tenantId) : user.tenantId;

    if (!targetTenantId || !body.razonSocial) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const count = await prisma.cliente.count({ where: { tenantId: targetTenantId } });
    const codigo = `CLI-${String(count + 1).padStart(3, '0')}`;

    const cliente = await prisma.cliente.create({
      data: {
        tenantId: targetTenantId,
        codigo,
        razonSocial: body.razonSocial,
        rfc: body.rfc,
        email: body.email,
        telefono: body.telefono,
        direccion: body.direccion,
        diasCredito: Number(body.diasCredito || 0),
        limiteCredito: Number(body.limiteCredito || 0),
        saldoActual: 0,
        estadoCredito: 'ACTIVO',
        regimenFiscal: body.regimenFiscal || '612',
        usoCfdi: body.usoCfdi || 'G01',
        codigoPostal: body.codigoPostal || '64000',
      },
    });

    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    console.error('Error creating cliente:', error);
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'ID de cliente requerido' }, { status: 400 });
    }

    const clientePrevio = await prisma.cliente.findUnique({
      where: { id: body.id },
    });

    if (!clientePrevio) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Aislamiento tenant estricto
    if (user.rol !== 'SUPERADMIN' && clientePrevio.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Acceso no autorizado a este cliente' }, { status: 403 });
    }

    const updateData: any = {};
    if (body.razonSocial !== undefined) updateData.razonSocial = body.razonSocial;
    if (body.rfc !== undefined) updateData.rfc = body.rfc;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.telefono !== undefined) updateData.telefono = body.telefono;
    if (body.direccion !== undefined) updateData.direccion = body.direccion;
    if (body.diasCredito !== undefined) updateData.diasCredito = Number(body.diasCredito);
    if (body.limiteCredito !== undefined) updateData.limiteCredito = Number(body.limiteCredito);
    if (body.estadoCredito !== undefined) updateData.estadoCredito = body.estadoCredito;
    if (body.regimenFiscal !== undefined) updateData.regimenFiscal = body.regimenFiscal;
    if (body.usoCfdi !== undefined) updateData.usoCfdi = body.usoCfdi;
    if (body.codigoPostal !== undefined) updateData.codigoPostal = body.codigoPostal;

    const clienteActualizado = await prisma.cliente.update({
      where: { id: body.id },
      data: updateData,
    });

    // Registrar auditoría si hubo cambio en límite de crédito, días o estado
    const cambioLimite = body.limiteCredito !== undefined && Number(body.limiteCredito) !== clientePrevio.limiteCredito;
    const cambioEstado = body.estadoCredito !== undefined && body.estadoCredito !== clientePrevio.estadoCredito;
    const cambioDias = body.diasCredito !== undefined && Number(body.diasCredito) !== clientePrevio.diasCredito;

    if (cambioLimite || cambioEstado || cambioDias) {
      const detalles = `Ajuste en política crediticia de ${clientePrevio.razonSocial} (${clientePrevio.codigo}): ` +
        [
          cambioLimite ? `Límite: $${clientePrevio.limiteCredito} -> $${Number(body.limiteCredito)}` : '',
          cambioEstado ? `Estado: ${clientePrevio.estadoCredito} -> ${body.estadoCredito}` : '',
          cambioDias ? `Plazo: ${clientePrevio.diasCredito}d -> ${Number(body.diasCredito)}d` : '',
        ].filter(Boolean).join(' | ');

      const ultimoRegistro = await prisma.registroAuditoria.findFirst({
        where: { tenantId: clientePrevio.tenantId },
        orderBy: { fecha: 'desc' },
      });
      const hashPrevio = ultimoRegistro?.hashEvento || GENESIS_AUDIT_HASH;
      const auditId = crypto.randomUUID();
      const fechaNow = new Date();
      const hashEvento = computeAuditHash(hashPrevio, {
        id: auditId,
        tenantId: clientePrevio.tenantId,
        fecha: fechaNow,
        modulo: 'CREDITO',
        accion: 'EDITAR',
        detalles,
        usuarioId: user.id,
      });

      await prisma.registroAuditoria.create({
        data: {
          id: auditId,
          tenantId: clientePrevio.tenantId,
          usuarioId: user.id,
          usuarioNombre: user.nombre || user.email || 'Operador',
          modulo: 'CREDITO',
          accion: 'EDITAR',
          nivelRiesgo: classifyAuditRisk('CREDITO', 'EDITAR', detalles),
          detalles,
          hashPrevio,
          hashEvento,
          metadataJson: JSON.stringify({
            clienteId: clientePrevio.id,
            codigo: clientePrevio.codigo,
            anterior: {
              limiteCredito: clientePrevio.limiteCredito,
              estadoCredito: clientePrevio.estadoCredito,
              diasCredito: clientePrevio.diasCredito,
            },
            nuevo: {
              limiteCredito: body.limiteCredito !== undefined ? Number(body.limiteCredito) : clientePrevio.limiteCredito,
              estadoCredito: body.estadoCredito !== undefined ? body.estadoCredito : clientePrevio.estadoCredito,
              diasCredito: body.diasCredito !== undefined ? Number(body.diasCredito) : clientePrevio.diasCredito,
            }
          }),
        },
      });
    }

    return NextResponse.json(clienteActualizado);
  } catch (error) {
    console.error('Error updating cliente:', error);
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 });
  }
}

