import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'AUDITOR', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);
    const tenantParam = searchParams.get('tenantId');
    const mes = searchParams.get('mes') || String(new Date().getMonth() + 1).padStart(2, '0');
    const anio = searchParams.get('anio') || String(new Date().getFullYear());
    const effectiveTenantId = user.rol === 'SUPERADMIN' ? (tenantParam || undefined) : user.tenantId;

    if (!effectiveTenantId && user.rol !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const whereTenant = effectiveTenantId ? { tenantId: effectiveTenantId } : {};

    // Periodo del mes seleccionado
    const inicio = new Date(`${anio}-${mes}-01T00:00:00.000Z`);
    const fin = new Date(inicio);
    fin.setMonth(fin.getMonth() + 1);

    // Solo se requieren los campos que forman las filas de la balanza.
    const cxcList = await prisma.cuentaPorCobrar.findMany({
      where: { ...whereTenant, estado: { not: 'CANCELADA' } },
      select: {
        id: true,
        clienteId: true,
        montoTotal: true,
        saldoPendiente: true,
        cliente: {
          select: { razonSocial: true, codigo: true },
        },
      },
    });

    // Pagos cobrados en el periodo
    const pagosCxC = await prisma.pagoCxC.findMany({
      where: {
        ...(effectiveTenantId ? { cxc: { tenantId: effectiveTenantId } } : {}),
        fecha: { gte: inicio, lt: fin },
      },
      select: { cxcId: true, monto: true },
    });

    // Construir mapa de pagos por cxcId
    const pagosPorCxC: Record<string, number> = {};
    pagosCxC.forEach((p) => {
      pagosPorCxC[p.cxcId] = (pagosPorCxC[p.cxcId] || 0) + p.monto;
    });

    // Agrupar por cliente
    const porCliente: Record<string, {
      clienteId: string;
      razonSocial: string;
      codigo: string;
      saldoInicial: number;
      cargos: number;
      abonos: number;
      saldoFinal: number;
      cuentas: number;
    }> = {};

    cxcList.forEach((cxc) => {
      const cId = cxc.clienteId;
      if (!porCliente[cId]) {
        porCliente[cId] = {
          clienteId: cId,
          razonSocial: cxc.cliente.razonSocial,
          codigo: cxc.cliente.codigo,
          saldoInicial: 0,
          cargos: cxc.montoTotal,
          abonos: 0,
          saldoFinal: cxc.saldoPendiente,
          cuentas: 0,
        };
      } else {
        porCliente[cId].cargos += cxc.montoTotal;
        porCliente[cId].saldoFinal += cxc.saldoPendiente;
      }
      porCliente[cId].cuentas += 1;
      porCliente[cId].abonos += pagosPorCxC[cxc.id] || 0;
    });

    const rows = Object.values(porCliente).sort((a, b) => b.saldoFinal - a.saldoFinal);

    const totalCargos = rows.reduce((s, r) => s + r.cargos, 0);
    const totalAbonos = rows.reduce((s, r) => s + r.abonos, 0);
    const totalSaldoFinal = rows.reduce((s, r) => s + r.saldoFinal, 0);

    return NextResponse.json({
      mes,
      anio,
      rows,
      totales: { totalCargos, totalAbonos, totalSaldoFinal },
    });
  } catch (error) {
    console.error('Error balanza-cxc:', error);
    return NextResponse.json({ error: 'Error al generar balanza de CxC' }, { status: 500 });
  }
}
