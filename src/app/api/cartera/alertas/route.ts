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

    const tenant = effectiveTenantId ? await prisma.tenant.findUnique({ where: { id: effectiveTenantId } }) : null;
    const diasAlerta = tenant?.alertaVencimientoDias ?? 5;
    const diasGracia = tenant?.diasGraciaCredito ?? 0;

    const hoy = new Date();
    // Fecha umbral para "Por Vencer" (hoy + diasAlerta)
    const fechaUmbralAlerta = new Date(hoy.getTime() + diasAlerta * 24 * 60 * 60 * 1000);

    const where = effectiveTenantId ? { tenantId: effectiveTenantId } : {};

    // 1. Obtener CxC pendientes
    const cxcList = await prisma.cuentaPorCobrar.findMany({
      where: {
        ...where,
        saldoPendiente: { gt: 0 },
      },
      include: {
        cliente: true,
      },
      orderBy: { fechaVencimiento: 'asc' },
    });

    // 2. Obtener CxP pendientes
    const cxpList = await prisma.cuentaPorPagar.findMany({
      where: {
        ...where,
        saldoPendiente: { gt: 0 },
      },
      include: {
        proveedor: true,
      },
      orderBy: { fechaVencimiento: 'asc' },
    });

    // Clasificar CxC
    const cxcVencidas = [];
    const cxcPorVencer = [];
    let montoTotalVencidoCxC = 0;
    let montoTotalPorVencerCxC = 0;

    for (const cxc of cxcList) {
      const vtoDate = new Date(cxc.fechaVencimiento);
      // Fecha límite considerando días de gracia
      const fechaLimiteGracia = new Date(vtoDate.getTime() + diasGracia * 24 * 60 * 60 * 1000);
      const diffMs = vtoDate.getTime() - hoy.getTime();
      const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (hoy > fechaLimiteGracia) {
        const diasVencido = Math.floor((hoy.getTime() - fechaLimiteGracia.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        cxcVencidas.push({
          id: cxc.id,
          folio: cxc.folio,
          tipo: 'CxC',
          entidad: cxc.cliente.razonSocial,
          entidadCodigo: cxc.cliente.codigo,
          montoTotal: cxc.montoTotal,
          saldoPendiente: cxc.saldoPendiente,
          fechaVencimiento: cxc.fechaVencimiento,
          diasVencido,
          estadoCreditoCliente: cxc.cliente.estadoCredito,
          urgencia: diasVencido > 15 ? 'CRITICA' : 'ALTA',
        });
        montoTotalVencidoCxC += cxc.saldoPendiente;
      } else if (vtoDate <= fechaUmbralAlerta && hoy <= vtoDate) {
        cxcPorVencer.push({
          id: cxc.id,
          folio: cxc.folio,
          tipo: 'CxC',
          entidad: cxc.cliente.razonSocial,
          entidadCodigo: cxc.cliente.codigo,
          montoTotal: cxc.montoTotal,
          saldoPendiente: cxc.saldoPendiente,
          fechaVencimiento: cxc.fechaVencimiento,
          diasRestantes,
          urgencia: diasRestantes <= 2 ? 'ALTA' : 'MEDIA',
        });
        montoTotalPorVencerCxC += cxc.saldoPendiente;
      }
    }

    // Clasificar CxP
    const cxpVencidas = [];
    const cxpPorVencer = [];
    let montoTotalVencidoCxP = 0;
    let montoTotalPorVencerCxP = 0;

    for (const cxp of cxpList) {
      const vtoDate = new Date(cxp.fechaVencimiento);
      const diffMs = vtoDate.getTime() - hoy.getTime();
      const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (hoy > vtoDate) {
        const diasVencido = Math.floor((hoy.getTime() - vtoDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        cxpVencidas.push({
          id: cxp.id,
          folio: cxp.folioFactura,
          tipo: 'CxP',
          entidad: cxp.proveedor.razonSocial,
          entidadCodigo: cxp.proveedor.codigo,
          montoTotal: cxp.montoTotal,
          saldoPendiente: cxp.saldoPendiente,
          fechaVencimiento: cxp.fechaVencimiento,
          diasVencido,
          urgencia: diasVencido > 10 ? 'CRITICA' : 'ALTA',
        });
        montoTotalVencidoCxP += cxp.saldoPendiente;
      } else if (vtoDate <= fechaUmbralAlerta && hoy <= vtoDate) {
        cxpPorVencer.push({
          id: cxp.id,
          folio: cxp.folioFactura,
          tipo: 'CxP',
          entidad: cxp.proveedor.razonSocial,
          entidadCodigo: cxp.proveedor.codigo,
          montoTotal: cxp.montoTotal,
          saldoPendiente: cxp.saldoPendiente,
          fechaVencimiento: cxp.fechaVencimiento,
          diasRestantes,
          urgencia: diasRestantes <= 2 ? 'ALTA' : 'MEDIA',
        });
        montoTotalPorVencerCxP += cxp.saldoPendiente;
      }
    }

    const totalAlertas = cxcVencidas.length + cxcPorVencer.length + cxpVencidas.length + cxpPorVencer.length;
    const tieneCriticas = cxcVencidas.length > 0 || cxpVencidas.length > 0;

    return NextResponse.json({
      configuracion: {
        diasAlertaVencimiento: diasAlerta,
        diasGraciaCredito: diasGracia,
        politicaBloqueo: tenant?.politicaBloqueoCredito || 'ESTRICTO',
      },
      resumen: {
        totalAlertas,
        tieneCriticas,
        cxc: {
          totalVencidas: cxcVencidas.length,
          montoVencido: montoTotalVencidoCxC,
          totalPorVencer: cxcPorVencer.length,
          montoPorVencer: montoTotalPorVencerCxC,
        },
        cxp: {
          totalVencidas: cxpVencidas.length,
          montoVencido: montoTotalVencidoCxP,
          totalPorVencer: cxpPorVencer.length,
          montoPorVencer: montoTotalPorVencerCxP,
        },
      },
      alertas: {
        cxcVencidas,
        cxcPorVencer,
        cxpVencidas,
        cxpPorVencer,
      },
    });
  } catch (error: any) {
    console.error('Error fetching alertas de cartera:', error);
    return NextResponse.json({ error: 'Error al consultar alertas de cartera vencida' }, { status: 500 });
  }
}
