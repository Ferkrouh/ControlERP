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
    const mesParam = searchParams.get('mes');
    const anioParam = searchParams.get('anio');

    const effectiveTenantId = user.rol === 'SUPERADMIN' ? (tenantParam || undefined) : user.tenantId;

    if (!effectiveTenantId && user.rol !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const whereTenant = effectiveTenantId ? { tenantId: effectiveTenantId } : {};

    // Construcción del rango de fechas si se especifica mes y año
    let dateFilter: any = undefined;
    let fechaCorte = new Date();

    if (mesParam && anioParam) {
      const m = parseInt(mesParam);
      const a = parseInt(anioParam);
      const inicioMes = new Date(a, m - 1, 1, 0, 0, 0, 0);
      const finMes = new Date(a, m, 0, 23, 59, 59, 999);
      dateFilter = {
        gte: inicioMes,
        lte: finMes,
      };
      fechaCorte = finMes;
    }

    // Consultas compactas en paralelo: el resumen solo necesita valores y conteos.
    const [
      cxcList,
      cxpResumen,
      existencias,
      ventasMes,
      comprasMes,
      pagosCobrados,
      pagosEmitidos,
      ajustesMes,
    ] = await Promise.all([
      // CxC (Cuentas activas con saldo o emitidas hasta la fecha de corte)
      prisma.cuentaPorCobrar.findMany({
        where: {
          ...whereTenant,
          estado: { not: 'CANCELADA' },
          ...(dateFilter ? { fechaEmision: { lte: fechaCorte } } : {}),
        },
        select: { saldoPendiente: true, fechaVencimiento: true },
      }),
      // CxP (Cuentas activas con saldo o emitidas hasta la fecha de corte)
      prisma.cuentaPorPagar.aggregate({
        where: {
          ...whereTenant,
          ...(dateFilter ? { fechaEmision: { lte: fechaCorte } } : {}),
        },
        _sum: { saldoPendiente: true },
        _count: { _all: true },
      }),
      // Stock y Valuación
      prisma.existencia.findMany({
        where: effectiveTenantId ? { producto: { tenantId: effectiveTenantId } } : {},
        select: {
          cantidad: true,
          producto: { select: { costoPromedio: true } },
          almacen: { select: { nombre: true } },
        },
      }),
      // Ventas en el período seleccionado
      prisma.venta.aggregate({
        where: {
          ...whereTenant,
          estado: 'COMPLETADA',
          ...(dateFilter ? { fecha: dateFilter } : {}),
        },
        _sum: { total: true },
        _count: { _all: true },
      }),
      // Compras en el período seleccionado
      prisma.compra.aggregate({
        where: {
          ...whereTenant,
          ...(dateFilter ? { fecha: dateFilter } : {}),
        },
        _sum: { total: true },
        _count: { _all: true },
      }),
      // Cobranza CxC en el período seleccionado
      prisma.pagoCxC.aggregate({
        where: {
          ...(effectiveTenantId ? { cxc: { tenantId: effectiveTenantId } } : {}),
          ...(dateFilter ? { fecha: dateFilter } : {}),
        },
        _sum: { monto: true },
      }),
      // Pagos CxP en el período seleccionado
      prisma.pagoCxP.aggregate({
        where: {
          ...(effectiveTenantId ? { cxp: { tenantId: effectiveTenantId } } : {}),
          ...(dateFilter ? { fecha: dateFilter } : {}),
        },
        _sum: { monto: true },
      }),
      // Ajustes en el período seleccionado
      prisma.ajusteInventario.count({
        where: {
          ...whereTenant,
          ...(dateFilter ? { fecha: dateFilter } : {}),
        },
      }),
    ]);

    // Análisis de CxC y Antigüedad de saldos relativo a la fecha de corte del período
    let totalPorCobrar = 0;
    let totalVencido = 0;
    const antiguedad = {
      vigente: 0,
      dias1a30: 0,
      dias31a60: 0,
      dias61a90: 0,
      mas90: 0,
    };

    cxcList.forEach((c) => {
      totalPorCobrar += c.saldoPendiente;
      const vencimiento = new Date(c.fechaVencimiento);
      const diffDias = Math.floor((fechaCorte.getTime() - vencimiento.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDias > 0 && c.saldoPendiente > 0) {
        totalVencido += c.saldoPendiente;
        if (diffDias <= 30) antiguedad.dias1a30 += c.saldoPendiente;
        else if (diffDias <= 60) antiguedad.dias31a60 += c.saldoPendiente;
        else if (diffDias <= 90) antiguedad.dias61a90 += c.saldoPendiente;
        else antiguedad.mas90 += c.saldoPendiente;
      } else if (c.saldoPendiente > 0) {
        antiguedad.vigente += c.saldoPendiente;
      }
    });

    // Total de CxP: conserva el comportamiento previo, que incluye todas las cuentas.
    const totalPorPagar = cxpResumen._sum.saldoPendiente || 0;

    // Valuación de inventario global y por almacén (CFF Art. 28)
    let valuacionTotal = 0;
    const valuacionPorAlmacen: Record<string, { total: number; piezas: number }> = {};

    existencias.forEach((e) => {
      const valor = e.cantidad * e.producto.costoPromedio;
      valuacionTotal += valor;
      const almNombre = e.almacen.nombre;
      if (!valuacionPorAlmacen[almNombre]) {
        valuacionPorAlmacen[almNombre] = { total: 0, piezas: 0 };
      }
      valuacionPorAlmacen[almNombre].total += valor;
      valuacionPorAlmacen[almNombre].piezas += e.cantidad;
    });

    // Totales comerciales en el período
    const totalVendido = ventasMes._sum.total || 0;
    const totalComprado = comprasMes._sum.total || 0;
    const cobranzaMesTotal = pagosCobrados._sum.monto || 0;
    const pagosProveedoresMesTotal = pagosEmitidos._sum.monto || 0;

    return NextResponse.json({
      periodo: {
        mes: mesParam,
        anio: anioParam,
      },
      // Balance Financiero
      totalPorCobrar,
      totalVencido,
      antiguedad,
      totalPorPagar,
      valuacionTotal,
      valuacionPorAlmacen,
      // Resumen Comercial
      totalVendido,
      totalComprado,
      cobranzaMes: cobranzaMesTotal,
      pagosProveedoresMes: pagosProveedoresMesTotal,
      ventasCount: ventasMes._count._all,
      comprasCount: comprasMes._count._all,
      ajustesCount: ajustesMes,
      cxcCount: cxcList.length,
      cxpCount: cxpResumen._count._all,
    });
  } catch (error) {
    console.error('Error in monthly reports:', error);
    return NextResponse.json({ error: 'Error al generar reporte mensual' }, { status: 500 });
  }
}
