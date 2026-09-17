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

    // Consultas agregadas simultáneas filtradas por período
    const [
      cxcList,
      cxpList,
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
          ...(dateFilter ? { fechaEmision: { lte: fechaCorte } } : {}),
        },
        include: { cliente: true },
      }),
      // CxP (Cuentas activas con saldo o emitidas hasta la fecha de corte)
      prisma.cuentaPorPagar.findMany({
        where: {
          ...whereTenant,
          ...(dateFilter ? { fechaEmision: { lte: fechaCorte } } : {}),
        },
        include: { proveedor: true },
      }),
      // Stock y Valuación
      prisma.existencia.findMany({
        where: effectiveTenantId ? { producto: { tenantId: effectiveTenantId } } : {},
        include: { producto: true, almacen: true },
      }),
      // Ventas en el período seleccionado
      prisma.venta.findMany({
        where: {
          ...whereTenant,
          ...(dateFilter ? { fecha: dateFilter } : {}),
        },
        include: { cliente: true },
      }),
      // Compras en el período seleccionado
      prisma.compra.findMany({
        where: {
          ...whereTenant,
          ...(dateFilter ? { fecha: dateFilter } : {}),
        },
        include: { proveedor: true },
      }),
      // Cobranza CxC en el período seleccionado
      prisma.pagoCxC.findMany({
        where: {
          ...(effectiveTenantId ? { cxc: { tenantId: effectiveTenantId } } : {}),
          ...(dateFilter ? { fecha: dateFilter } : {}),
        },
      }),
      // Pagos CxP en el período seleccionado
      prisma.pagoCxP.findMany({
        where: {
          ...(effectiveTenantId ? { cxp: { tenantId: effectiveTenantId } } : {}),
          ...(dateFilter ? { fecha: dateFilter } : {}),
        },
      }),
      // Ajustes en el período seleccionado
      prisma.ajusteInventario.findMany({
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

    // Análisis de CxP
    let totalPorPagar = 0;
    cxpList.forEach((p) => {
      totalPorPagar += p.saldoPendiente;
    });

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
    const totalVendido = ventasMes.reduce((acc, v) => acc + v.total, 0);
    const totalComprado = comprasMes.reduce((acc, c) => acc + c.total, 0);
    const cobranzaMesTotal = pagosCobrados.reduce((acc, p) => acc + p.monto, 0);
    const pagosProveedoresMesTotal = pagosEmitidos.reduce((acc, p) => acc + p.monto, 0);

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
      ventasCount: ventasMes.length,
      comprasCount: comprasMes.length,
      ajustesCount: ajustesMes.length,
      cxcCount: cxcList.length,
      cxpCount: cxpList.length,
    });
  } catch (error) {
    console.error('Error in monthly reports:', error);
    return NextResponse.json({ error: 'Error al generar reporte mensual' }, { status: 500 });
  }
}
