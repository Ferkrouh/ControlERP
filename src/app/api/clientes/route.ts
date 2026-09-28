import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z, ZodError } from 'zod';

const codigo = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/);
const dinero = z.number().finite().nonnegative().max(1e9).refine(n=>Math.abs(Math.round(n*100)-n*100)<1e-6);
const entradaCliente = z.object({ tenantId: z.string().optional(), codigo: codigo.optional(), razonSocial: z.string().trim().min(1).max(200),
  rfc: z.string().trim().max(13).nullish(), email: z.union([z.email().max(200), z.literal('')]).nullish(), telefono: z.string().trim().max(60).nullish(),
  direccion: z.string().trim().max(500).nullish(), diasCredito: z.number().int().nonnegative().max(3650).optional(),
  limiteCredito: dinero.optional(), regimenFiscal: z.string().trim().max(10).optional(), usoCfdi: z.string().trim().max(5).optional(),
  codigoPostal: z.string().trim().max(10).optional() });

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

import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    // Auditores y Almacenistas no pueden dar de alta clientes
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = entradaCliente.parse(await req.json());

    const targetTenantId = user.rol === 'SUPERADMIN' ? (body.tenantId || user.tenantId) : user.tenantId;

    if (!targetTenantId || !body.razonSocial) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    if (user.rol === 'ENCARGADO' && ((body.limiteCredito ?? 0)>0 || (body.diasCredito ?? 0)>0))
      return NextResponse.json({error:'Solo administración puede establecer crédito inicial'}, {status:403});

    const cliente = await prisma.$transaction(async tx => {
      const creado = await tx.cliente.create({
      data: {
        tenantId: targetTenantId,
        codigo: body.codigo?.toUpperCase() || `CLI-${crypto.randomUUID().slice(0,8).toUpperCase()}`,
        razonSocial: body.razonSocial,
        rfc: body.rfc,
        email: body.email,
        telefono: body.telefono,
        direccion: body.direccion,
        diasCredito: body.diasCredito ?? 0,
        limiteCredito: body.limiteCredito ?? 0,
        saldoActual: 0,
        estadoCredito: 'ACTIVO',
        regimenFiscal: body.regimenFiscal?.trim() || null,
        usoCfdi: body.usoCfdi?.trim() || null,
        codigoPostal: body.codigoPostal?.trim() || null,
      },
      });
      await tx.registroAuditoria.create({data:{tenantId:targetTenantId,usuarioId:user.id,usuarioNombre:user.nombre,
        modulo:'CLIENTES',accion:'CREAR',detalles:`Cliente ${creado.codigo} creado; límite ${creado.limiteCredito}`,
        metadataJson:JSON.stringify({clienteId:creado.id,codigo:creado.codigo,limiteCredito:creado.limiteCredito,diasCredito:creado.diasCredito})}});
      return creado;
    });

    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Cliente inválido: revise código, crédito y datos de contacto' }, { status: 400 });
    if ((error as {code?:string}).code === 'P2002') return NextResponse.json({ error: 'Código de cliente duplicado en la empresa' }, { status: 409 });
    console.error('Error creating cliente:', error);
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
  }
}

const entradaEdicionCliente = z.object({ id: z.string().min(1), razonSocial: z.string().trim().min(1).max(200).optional(),
  rfc: z.string().trim().max(13).nullish(), email: z.union([z.email().max(200), z.literal('')]).nullish(), telefono: z.string().trim().max(60).nullish(),
  direccion: z.string().trim().max(500).nullish(), diasCredito: z.number().int().nonnegative().max(3650).optional(),
  limiteCredito: dinero.optional(), estadoCredito: z.enum(['ACTIVO','BLOQUEADO','EN_REVISION','SUSPENDIDO']).optional(),
  regimenFiscal: z.string().trim().max(10).nullish(), usoCfdi: z.string().trim().max(5).nullish(),
  codigoPostal: z.string().trim().max(10).nullish() });

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN','ADMIN','ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;
    const { user } = auth;
    const body = entradaEdicionCliente.parse(await req.json());
    const { id, ...campos } = body;
    if (!Object.keys(campos).length) return NextResponse.json({error:'Indique al menos un campo'}, {status:400});
    if (user.rol === 'ENCARGADO' && (body.limiteCredito !== undefined || body.diasCredito !== undefined || body.estadoCredito !== undefined))
      return NextResponse.json({error:'Solo administración puede cambiar condiciones de crédito'}, {status:403});
    const result = await prisma.$transaction(async tx => {
      const previo = await tx.cliente.findFirst({where:{id,...(user.rol === 'SUPERADMIN'?{}:{tenantId:user.tenantId??''})}});
      if (!previo) return null;
      const actualizado = await tx.cliente.updateMany({where:{id,tenantId:previo.tenantId,
        limiteCredito:previo.limiteCredito,diasCredito:previo.diasCredito,estadoCredito:previo.estadoCredito},data:campos});
      if (!actualizado.count) return 'CONFLICTO' as const;
      const nuevo = await tx.cliente.findUniqueOrThrow({where:{id}});
      await tx.registroAuditoria.create({data:{tenantId:previo.tenantId,usuarioId:user.id,usuarioNombre:user.nombre,
        modulo:body.limiteCredito!==undefined||body.diasCredito!==undefined||body.estadoCredito!==undefined?'CREDITO':'CLIENTES',
        accion:'EDITAR',nivelRiesgo:body.limiteCredito!==undefined||body.estadoCredito!==undefined?'ADVERTENCIA':'NORMAL',
        detalles:`Cliente ${previo.codigo} actualizado`,metadataJson:JSON.stringify({clienteId:id,anterior:previo,nuevo:campos})}});
      return nuevo;
    });
    if (!result) return NextResponse.json({error:'Cliente no encontrado'}, {status:404});
    if (result === 'CONFLICTO') return NextResponse.json({error:'El crédito cambió; recargue y reintente'}, {status:409});
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({error:'Datos del cliente inválidos'}, {status:400});
    console.error('Error updating cliente:',error);
    return NextResponse.json({error:'No se pudo actualizar el cliente'}, {status:500});
  }
}
