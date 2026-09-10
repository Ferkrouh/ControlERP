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
