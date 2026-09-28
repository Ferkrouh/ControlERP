import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// R-11: Notas de Crédito y Devoluciones
// Ventas canceladas con cliente, importe y motivo (observaciones).
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

    const whereTenant = effectiveTenantId ? { tenantId: effectiveTenantId } : {};

    // Ventas canceladas del período
    const canceladas = await prisma.venta.findMany({
      where: {
        ...whereTenant,
        estado: 'CANCELADA',
        canceladaEn: { gte: inicio, lt: fin },
      },
      include: { cliente: { select: { razonSocial: true, codigo: true } } },
      orderBy: { canceladaEn: 'desc' },
    });

    // CxC ajustadas (saldo cero en ventas a crédito canceladas)
    // Se incluye referencia a cxcId si existía
    const rows = canceladas.map((v) => ({
      ventaId: v.id,
      folio: v.folio,
      fecha: (v.canceladaEn || v.fecha).toISOString().slice(0, 10),
      fechaVenta: v.fecha.toISOString().slice(0, 10),
      cliente: v.cliente.razonSocial,
      clienteCodigo: v.cliente.codigo,
      importe: v.total,
      tipoPago: v.tipoPago,
      cxcId: v.cxcId || null,
      estadoFiscal: v.estadoFiscal,
      uuidFiscal: v.uuidFiscal || null,
      motivo: v.motivoCancelacion || 'Sin motivo registrado',
      capturadoPor: v.usuarioNombre,
      canceladaPorId: v.canceladaPorId,
    }));

    // Agrupación por cliente
    const porCliente: Record<string, { razonSocial: string; total: number; count: number }> = {};
    canceladas.forEach((v) => {
      const rs = v.cliente.razonSocial;
      if (!porCliente[rs]) porCliente[rs] = { razonSocial: rs, total: 0, count: 0 };
      porCliente[rs].total += v.total;
      porCliente[rs].count += 1;
    });

    const totalCancelado = canceladas.reduce((s, v) => s + v.total, 0);
    const timbradas = canceladas.filter((v) => v.estadoFiscal === 'TIMBRADA').length;

    return NextResponse.json({
      mes,
      anio,
      rows,
      porCliente: Object.values(porCliente).sort((a, b) => b.total - a.total),
      kpis: {
        totalCancelaciones: rows.length,
        totalCancelado,
        timbradas,
        sinTimbre: rows.length - timbradas,
      },
    });
  } catch (error) {
    console.error('Error notas-credito:', error);
    return NextResponse.json({ error: 'Error al calcular notas de crédito' }, { status: 500 });
  }
}
