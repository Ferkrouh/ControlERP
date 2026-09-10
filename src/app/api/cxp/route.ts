import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

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

    const cxpList = await prisma.cuentaPorPagar.findMany({
      where,
      include: {
        proveedor: true,
        pagos: {
          orderBy: { fecha: 'desc' },
        },
      },
      orderBy: { fechaVencimiento: 'asc' },
    });

    return NextResponse.json(cxpList);
  } catch (error) {
    console.error('Error fetching CxP:', error);
    return NextResponse.json({ error: 'Error al obtener CxP' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();
    const { proveedorId, folioFactura, montoTotal, diasCredito } = body;

    const targetTenantId = user.rol === 'SUPERADMIN' ? (body.tenantId || user.tenantId) : user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const proveedor = await prisma.proveedor.findFirst({
      where: { id: proveedorId, tenantId: targetTenantId },
    });

    if (!proveedor) {
      return NextResponse.json({ error: 'Proveedor no encontrado o no pertenece a su empresa' }, { status: 404 });
    }

    const dias = diasCredito !== undefined ? Number(diasCredito) : proveedor.diasCredito;
    const fechaVencimiento = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
    const monto = Number(montoTotal);

    const cxp = await prisma.$transaction(async (tx) => {
      const nuevaCxp = await tx.cuentaPorPagar.create({
        data: {
          tenantId: targetTenantId,
          proveedorId,
          folioFactura: folioFactura || `FAC-PROV-${Date.now().toString().slice(-4)}`,
          montoTotal: monto,
          saldoPendiente: monto,
          fechaEmision: new Date(),
          fechaVencimiento,
          estado: 'PENDIENTE',
        },
      });

      await tx.proveedor.update({
        where: { id: proveedorId },
        data: {
          saldoPendiente: proveedor.saldoPendiente + monto,
        },
      });

      return nuevaCxp;
    });

    return NextResponse.json(cxp, { status: 201 });
  } catch (error) {
    console.error('Error creating CxP:', error);
    return NextResponse.json({ error: 'Error al generar CxP' }, { status: 500 });
  }
}
