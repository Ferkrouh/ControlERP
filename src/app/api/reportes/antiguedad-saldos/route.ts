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
    
    let fechaCorte = new Date();
    if (mesParam && anioParam) {
      fechaCorte = new Date(parseInt(anioParam), parseInt(mesParam), 0, 23, 59, 59, 999);
    }

    const cxcList = await prisma.cuentaPorCobrar.findMany({
      where: { 
        ...whereTenant, 
        saldoPendiente: { gt: 0 },
        fechaEmision: { lte: fechaCorte }
      },
      include: { cliente: true },
      orderBy: { fechaVencimiento: 'asc' },
    });

    interface ClienteBucket {
      clienteId: string;
      razonSocial: string;
      codigo: string;
      vigente: number;
      dias1a30: number;
      dias31a60: number;
      dias61a90: number;
      mas90: number;
      total: number;
      cuentas: number;
    }

    const porCliente: Record<string, ClienteBucket> = {};

    let totVigente = 0, tot1a30 = 0, tot31a60 = 0, tot61a90 = 0, totMas90 = 0;

    cxcList.forEach((c) => {
      const cId = c.clienteId;
      if (!porCliente[cId]) {
        porCliente[cId] = {
          clienteId: cId,
          razonSocial: c.cliente.razonSocial,
          codigo: c.cliente.codigo,
          vigente: 0, dias1a30: 0, dias31a60: 0, dias61a90: 0, mas90: 0, total: 0, cuentas: 0,
        };
      }

      const venc = new Date(c.fechaVencimiento);
      const diff = Math.floor((fechaCorte.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
      const saldo = c.saldoPendiente;

      porCliente[cId].total += saldo;
      porCliente[cId].cuentas += 1;

      if (diff <= 0) {
        porCliente[cId].vigente += saldo;
        totVigente += saldo;
      } else if (diff <= 30) {
        porCliente[cId].dias1a30 += saldo;
        tot1a30 += saldo;
      } else if (diff <= 60) {
        porCliente[cId].dias31a60 += saldo;
        tot31a60 += saldo;
      } else if (diff <= 90) {
        porCliente[cId].dias61a90 += saldo;
        tot61a90 += saldo;
      } else {
        porCliente[cId].mas90 += saldo;
        totMas90 += saldo;
      }
    });

    const rows = Object.values(porCliente).sort((a, b) => b.total - a.total);
    const totalGeneral = rows.reduce((s, r) => s + r.total, 0);

    return NextResponse.json({
      periodo: {
        mes: mesParam,
        anio: anioParam,
      },
      rows,
      totales: {
        vigente: totVigente,
        dias1a30: tot1a30,
        dias31a60: tot31a60,
        dias61a90: tot61a90,
        mas90: totMas90,
        total: totalGeneral,
      },
    });
  } catch (error) {
    console.error('Error antiguedad-saldos:', error);
    return NextResponse.json({ error: 'Error al calcular antigüedad de saldos' }, { status: 500 });
  }
}
