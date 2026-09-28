import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z, ZodError } from 'zod';
import { randomUUID } from 'crypto';

const entrada = z.object({ tenantId: z.string().optional(), codigo: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/).optional(),
  razonSocial: z.string().trim().min(1).max(200), rfc: z.string().trim().max(13).nullish(), contacto: z.string().trim().max(120).nullish(),
  telefono: z.string().trim().max(60).nullish(), email: z.union([z.email().max(200), z.literal('')]).nullish(),
  diasCredito: z.number().int().nonnegative().max(3650).optional() });

export async function GET(req: NextRequest) {
  try {
    // Almacenistas no tienen acceso a proveedores ni condiciones de crédito de compra
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

    const proveedores = await prisma.proveedor.findMany({
      where,
      include: {
        cxp: {
          where: { estado: { in: ['PENDIENTE', 'PARCIAL', 'VENCIDA'] } },
        },
      },
      orderBy: { razonSocial: 'asc' },
    });

    return NextResponse.json(proveedores);
  } catch (error) {
    console.error('Error fetching proveedores:', error);
    return NextResponse.json({ error: 'Error al obtener proveedores' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = entrada.parse(await req.json());

    const targetTenantId = user.rol === 'SUPERADMIN' ? (body.tenantId || user.tenantId) : user.tenantId;
    if (!targetTenantId || !body.razonSocial) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const proveedor = await prisma.$transaction(async tx => {
      const creado = await tx.proveedor.create({
      data: {
        tenantId: targetTenantId,
        codigo: body.codigo?.toUpperCase() || `PRV-${randomUUID().slice(0,8).toUpperCase()}`,
        razonSocial: body.razonSocial.trim(),
        rfc: body.rfc ? body.rfc.toUpperCase().trim() : null,
        contacto: body.contacto,
        telefono: body.telefono,
        email: body.email,
        diasCredito: body.diasCredito ?? 0,
        saldoPendiente: 0,
      },
      });
      await tx.registroAuditoria.create({data:{tenantId:targetTenantId,usuarioId:user.id,usuarioNombre:user.nombre,
        modulo:'PROVEEDORES',accion:'CREAR',detalles:`Proveedor ${creado.codigo} creado`,metadataJson:JSON.stringify({proveedorId:creado.id,codigo:creado.codigo})}});
      return creado;
    });

    return NextResponse.json(proveedor, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Proveedor inválido: revise código, datos de contacto y días de crédito' }, { status: 400 });
    if ((error as {code?:string}).code === 'P2002') return NextResponse.json({ error: 'Código de proveedor duplicado en la empresa' }, { status: 409 });
    console.error('Error creating proveedor:', error);
    return NextResponse.json({ error: 'Error al crear proveedor' }, { status: 500 });
  }
}
