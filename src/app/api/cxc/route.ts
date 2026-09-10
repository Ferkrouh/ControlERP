import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Almacenistas no tienen acceso a CxC
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

    const cxcList = await prisma.cuentaPorCobrar.findMany({
      where,
      include: {
        cliente: true,
        pagos: {
          orderBy: { fecha: 'desc' },
        },
      },
      orderBy: { fechaVencimiento: 'asc' },
    });

    return NextResponse.json(cxcList);
  } catch (error) {
    console.error('Error fetching CxC:', error);
    return NextResponse.json({ error: 'Error al obtener CxC' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();
    const { clienteId, montoTotal, diasCredito } = body;

    const targetTenantId = user.rol === 'SUPERADMIN' ? (body.tenantId || user.tenantId) : user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    // Obtener cliente y verificar que pertenezca al mismo tenant
    const cliente = await prisma.cliente.findFirst({
      where: { id: clienteId, tenantId: targetTenantId },
    });
    const tenant = await prisma.tenant.findUnique({ where: { id: targetTenantId } });

    if (!cliente || !tenant) {
      return NextResponse.json({ error: 'Cliente o negocio no encontrado o no pertenece a su empresa' }, { status: 404 });
    }

    // Validación de Límite de Crédito
    const nuevoSaldo = cliente.saldoActual + Number(montoTotal);
    if (tenant.moduloCredito && nuevoSaldo > cliente.limiteCredito) {
      if (tenant.politicaBloqueoCredito === 'ESTRICTO') {
        return NextResponse.json({ 
          error: `Crédito excedido: El límite es $${cliente.limiteCredito.toLocaleString()} y con este cargo el saldo alcanzaría $${nuevoSaldo.toLocaleString()}. Operación bloqueada.`,
          bloqueado: true,
        }, { status: 400 });
      }
    }

    const count = await prisma.cuentaPorCobrar.count({ where: { tenantId: targetTenantId } });
    const folio = `FAC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const fechaEmision = new Date();
    const dias = diasCredito !== undefined ? Number(diasCredito) : cliente.diasCredito;
    const fechaVencimiento = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

    // Transacción atómica para evitar descuadre entre CxC y Cliente
    const cxc = await prisma.$transaction(async (tx) => {
      const nuevaCxc = await tx.cuentaPorCobrar.create({
        data: {
          tenantId: targetTenantId,
          clienteId,
          folio,
          montoTotal: Number(montoTotal),
          saldoPendiente: Number(montoTotal),
          fechaEmision,
          fechaVencimiento,
          estado: 'PENDIENTE',
        },
      });

      await tx.cliente.update({
        where: { id: clienteId },
        data: {
          saldoActual: nuevoSaldo,
          estadoCredito: nuevoSaldo >= cliente.limiteCredito ? 'BLOQUEADO' : cliente.estadoCredito,
        },
      });

      return nuevaCxc;
    });

    return NextResponse.json(cxc, { status: 201 });
  } catch (error) {
    console.error('Error creating CxC:', error);
    return NextResponse.json({ error: 'Error al generar CxC' }, { status: 500 });
  }
}
