import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// R-04: Conciliación de Facturas
// Cruza oportunidades GANADAS del CRM con las ventas registradas del mismo cliente
// en el periodo, y su estado de cobro en CxC.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'AUDITOR']);
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

    // Oportunidades GANADAS
    const ganadas = await prisma.oportunidadCRM.findMany({
      where: {
        ...whereTenant,
        etapa: 'GANADA',
        updatedAt: { gte: inicio, lt: fin },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Ventas del periodo para cruzar
    const ventas = await prisma.venta.findMany({
      where: {
        ...whereTenant,
        estado: 'COMPLETADA',
        fecha: { gte: inicio, lt: fin },
      },
      include: {
        cliente: true,
        detalles: false,
      },
    });

    // CxC pendientes del periodo
    const cxcList = await prisma.cuentaPorCobrar.findMany({
      where: {
        ...whereTenant,
        estado: { not: 'CANCELADA' },
        fechaEmision: { gte: inicio, lt: fin },
      },
      include: { cliente: true },
    });

    // Mapa de ventas por clienteId
    const ventasPorCliente: Record<string, { totalVendido: number; folios: string[] }> = {};
    ventas.forEach((v) => {
      if (!ventasPorCliente[v.clienteId]) {
        ventasPorCliente[v.clienteId] = { totalVendido: 0, folios: [] };
      }
      ventasPorCliente[v.clienteId].totalVendido += v.total;
      ventasPorCliente[v.clienteId].folios.push(v.folio);
    });

    // Mapa de CxC por clienteId
    const cxcPorCliente: Record<string, { saldoPendiente: number; estado: string }> = {};
    cxcList.forEach((c) => {
      if (!cxcPorCliente[c.clienteId]) {
        cxcPorCliente[c.clienteId] = { saldoPendiente: 0, estado: c.estado };
      }
      cxcPorCliente[c.clienteId].saldoPendiente += c.saldoPendiente;
    });

    // Construir filas de conciliación
    const rows = ganadas.map((op) => {
      // Intentar empatar por usuarioAsignado o nombre similar (no hay FK directo a clienteId)
      // Se busca por nombre de oportunidad que contenga algún folio de venta
      const ventaData = Object.entries(ventasPorCliente).find(([, v]) =>
        v.folios.some((f) => op.nombre.includes(f))
      );

      // Fallback: buscar ventas del período sin filtrar por oportunidad
      // La conciliación muestra oportunidades ganadas vs. ventas del mes
      return {
        oportunidadId: op.id,
        nombre: op.nombre,
        contacto: op.contactoNombre,
        valorEstimado: op.valorEstimado,
        asesor: op.usuarioAsignado || '—',
        fechaCierre: op.updatedAt.toISOString().slice(0, 10),
        // Venta conciliada (si existe match directo)
        ventaConciliada: ventaData ? { totalVendido: ventaData[1].totalVendido, folios: ventaData[1].folios } : null,
        estado: ventaData ? 'CONCILIADA' : 'SIN_VENTA',
      };
    });

    // Métricas
    const totalOportunidades = ganadas.reduce((s, o) => s + o.valorEstimado, 0);
    const totalVentasMes = ventas.reduce((s, v) => s + v.total, 0);
    const totalCxCPendiente = cxcList.reduce((s, c) => s + c.saldoPendiente, 0);
    const conciliadas = rows.filter((r) => r.estado === 'CONCILIADA').length;

    return NextResponse.json({
      mes,
      anio,
      rows,
      totales: {
        oportunidades: ganadas.length,
        valorEstimado: totalOportunidades,
        ventasMes: totalVentasMes,
        cxcPendiente: totalCxCPendiente,
        conciliadas,
        sinVenta: rows.length - conciliadas,
      },
    });
  } catch (error) {
    console.error('Error conciliacion-facturas:', error);
    return NextResponse.json({ error: 'Error al generar conciliación de facturas' }, { status: 500 });
  }
}
