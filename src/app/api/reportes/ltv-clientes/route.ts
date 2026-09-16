import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// R-06: Lifetime Value del Cliente (LTV)
// Ranking histórico de clientes por revenue total, ticket promedio y transacciones.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);
    const tenantParam = searchParams.get('tenantId');
    const effectiveTenantId = user.rol === 'SUPERADMIN' ? (tenantParam || undefined) : user.tenantId;

    if (!effectiveTenantId && user.rol !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const whereTenant = effectiveTenantId ? { tenantId: effectiveTenantId } : {};

    // Todas las ventas completadas con cliente
    const ventas = await prisma.venta.findMany({
      where: { ...whereTenant, estado: 'COMPLETADA' },
      include: { cliente: true },
    });

    // Cobros reales de CxC
    const cobros = await prisma.pagoCxC.findMany({
      where: effectiveTenantId ? { cxc: { tenantId: effectiveTenantId } } : {},
      include: { cxc: { select: { clienteId: true } } },
    });

    // Agrupar por cliente
    interface ClienteLTV {
      clienteId: string;
      razonSocial: string;
      codigo: string;
      totalVentas: number;
      totalCobrado: number;
      numTransacciones: number;
      ticketPromedio: number;
      primerCompra: string | null;
      ultimaCompra: string | null;
    }

    const porCliente: Record<string, ClienteLTV> = {};

    ventas.forEach((v) => {
      const cId = v.clienteId;
      if (!porCliente[cId]) {
        porCliente[cId] = {
          clienteId: cId,
          razonSocial: v.cliente.razonSocial,
          codigo: v.cliente.codigo,
          totalVentas: 0,
          totalCobrado: 0,
          numTransacciones: 0,
          ticketPromedio: 0,
          primerCompra: null,
          ultimaCompra: null,
        };
      }
      porCliente[cId].totalVentas += v.total;
      porCliente[cId].numTransacciones += 1;

      const fechaStr = v.fecha.toISOString().slice(0, 10);
      if (!porCliente[cId].primerCompra || fechaStr < porCliente[cId].primerCompra!) {
        porCliente[cId].primerCompra = fechaStr;
      }
      if (!porCliente[cId].ultimaCompra || fechaStr > porCliente[cId].ultimaCompra!) {
        porCliente[cId].ultimaCompra = fechaStr;
      }
    });

    cobros.forEach((p) => {
      const cId = p.cxc.clienteId;
      if (porCliente[cId]) porCliente[cId].totalCobrado += p.monto;
    });

    const rows: ClienteLTV[] = Object.values(porCliente).map((c) => ({
      ...c,
      ticketPromedio: c.numTransacciones > 0 ? c.totalVentas / c.numTransacciones : 0,
    })).sort((a, b) => b.totalVentas - a.totalVentas);

    const totalRevenue = rows.reduce((s, r) => s + r.totalVentas, 0);
    const ticketPromedioGlobal = rows.length > 0
      ? rows.reduce((s, r) => s + r.ticketPromedio, 0) / rows.length
      : 0;

    return NextResponse.json({
      rows,
      kpis: {
        totalClientes: rows.length,
        totalRevenue,
        ticketPromedioGlobal,
        top3Revenue: rows.slice(0, 3).map((r) => ({ razonSocial: r.razonSocial, total: r.totalVentas })),
      },
    });
  } catch (error) {
    console.error('Error ltv-clientes:', error);
    return NextResponse.json({ error: 'Error al calcular LTV de clientes' }, { status: 500 });
  }
}
