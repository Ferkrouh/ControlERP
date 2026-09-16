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

    const inicio = new Date(`${anio}-${mes}-01T00:00:00.000Z`);
    const fin = new Date(inicio);
    fin.setMonth(fin.getMonth() + 1);

    // Cobros reales (PagoCxC) en el periodo
    const pagos = await prisma.pagoCxC.findMany({
      where: {
        ...(effectiveTenantId ? { cxc: { tenantId: effectiveTenantId } } : {}),
        fecha: { gte: inicio, lt: fin },
      },
      orderBy: { fecha: 'asc' },
      include: {
        cxc: { include: { cliente: true } },
      },
    });

    // Ventas de contado en el periodo
    const ventasContado = await prisma.venta.findMany({
      where: {
        ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}),
        tipoPago: 'CONTADO',
        estado: 'COMPLETADA',
        fecha: { gte: inicio, lt: fin },
      },
      include: { cliente: true },
      orderBy: { fecha: 'asc' },
    });

    // Agrupar por día
    interface DiaData {
      fecha: string;
      cobros: number;
      contado: number;
      total: number;
    }
    const diasMap: Record<string, DiaData> = {};

    pagos.forEach((p) => {
      const dia = p.fecha.toISOString().slice(0, 10);
      if (!diasMap[dia]) diasMap[dia] = { fecha: dia, cobros: 0, contado: 0, total: 0 };
      diasMap[dia].cobros += p.monto;
      diasMap[dia].total += p.monto;
    });

    ventasContado.forEach((v) => {
      const dia = v.fecha.toISOString().slice(0, 10);
      if (!diasMap[dia]) diasMap[dia] = { fecha: dia, cobros: 0, contado: 0, total: 0 };
      diasMap[dia].contado += v.total;
      diasMap[dia].total += v.total;
    });

    const dias = Object.values(diasMap).sort((a, b) => a.fecha.localeCompare(b.fecha));

    const totalCobros = pagos.reduce((s, p) => s + p.monto, 0);
    const totalContado = ventasContado.reduce((s, v) => s + v.total, 0);

    // Detalle por cliente cobrado
    const porCliente: Record<string, { razonSocial: string; monto: number }> = {};
    pagos.forEach((p) => {
      const rs = p.cxc.cliente.razonSocial;
      porCliente[rs] = { razonSocial: rs, monto: (porCliente[rs]?.monto || 0) + p.monto };
    });

    return NextResponse.json({
      mes,
      anio,
      dias,
      porCliente: Object.values(porCliente).sort((a, b) => b.monto - a.monto),
      totales: {
        cobros: totalCobros,
        contado: totalContado,
        total: totalCobros + totalContado,
      },
    });
  } catch (error) {
    console.error('Error ingresos-recaudacion:', error);
    return NextResponse.json({ error: 'Error al calcular ingresos y recaudación' }, { status: 500 });
  }
}
