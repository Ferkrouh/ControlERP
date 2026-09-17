import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);

    const mes = searchParams.get('mes'); // ej: '09'
    const anio = searchParams.get('anio'); // ej: '2026'
    const almacenId = searchParams.get('almacenId');
    const usuarioId = searchParams.get('usuarioId');
    const estado = searchParams.get('estado'); // 'TODOS', 'ABIERTO', 'CERRADO'

    const targetTenantId = user.tenantId;
    if (!targetTenantId && user.rol !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Tenant requerido' }, { status: 400 });
    }

    // Construir filtro de fecha
    const where: any = {};
    if (targetTenantId) {
      where.tenantId = targetTenantId;
    }

    if (almacenId && almacenId !== 'TODOS') {
      where.almacenId = almacenId;
    }

    if (usuarioId && usuarioId !== 'TODOS') {
      where.usuarioId = usuarioId;
    }

    if (estado && estado !== 'TODOS') {
      where.estado = estado;
    }

    if (mes && anio) {
      const startOfMonth = new Date(parseInt(anio), parseInt(mes) - 1, 1, 0, 0, 0);
      const endOfMonth = new Date(parseInt(anio), parseInt(mes), 0, 23, 59, 59, 999);
      where.fechaApertura = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    // Consultar turnos de caja
    const turnos = await prisma.turnoCajaPOS.findMany({
      where,
      orderBy: { fechaApertura: 'desc' },
    });

    // Obtener catálogo de almacenes para enriquecer la respuesta
    const almacenes = await prisma.almacen.findMany({
      where: targetTenantId ? { tenantId: targetTenantId } : {},
      select: { id: true, nombre: true, codigo: true },
    });

    const almacenMap = new Map(almacenes.map(a => [a.id, a]));

    // Calcular KPIs agregados
    let totalApertura = 0;
    let totalVentas = 0;
    let totalEfectivo = 0;
    let totalTarjeta = 0;
    let totalTransfer = 0;
    let totalEntregadoCierre = 0;
    let totalDiferenciaNeta = 0;
    let turnosAbiertosCount = 0;
    let turnosCerradosCount = 0;
    let cortesConFaltante = 0;
    let cortesConSobrante = 0;
    let cortesCuadrados = 0;

    const cajerosSet = new Set<string>();

    const cortesDetallados = turnos.map((t) => {
      const alm = almacenMap.get(t.almacenId);
      cajerosSet.add(t.usuarioNombre);

      totalApertura += t.montoApertura || 0;
      totalVentas += t.totalVentas || 0;
      totalEfectivo += t.totalEfectivo || 0;
      totalTarjeta += t.totalTarjeta || 0;
      totalTransfer += t.totalTransfer || 0;

      if (t.estado === 'ABIERTO') {
        turnosAbiertosCount++;
      } else {
        turnosCerradosCount++;
        totalEntregadoCierre += t.montoCierre || 0;
        const dif = t.diferencia || 0;
        totalDiferenciaNeta += dif;

        if (Math.abs(dif) < 0.01) {
          cortesCuadrados++;
        } else if (dif < 0) {
          cortesConFaltante++;
        } else {
          cortesConSobrante++;
        }
      }

      // Efectivo esperado en caja = Fondo Apertura + Ventas Efectivo
      const efectivoEsperado = (t.montoApertura || 0) + (t.totalEfectivo || 0);

      return {
        id: t.id,
        almacenId: t.almacenId,
        almacenNombre: alm ? alm.nombre : 'Almacén Principal',
        almacenCodigo: alm ? alm.codigo : 'ALM',
        usuarioId: t.usuarioId,
        usuarioNombre: t.usuarioNombre,
        estado: t.estado,
        montoApertura: t.montoApertura,
        montoCierre: t.montoCierre,
        totalVentas: t.totalVentas,
        totalEfectivo: t.totalEfectivo,
        totalTarjeta: t.totalTarjeta,
        totalTransfer: t.totalTransfer,
        efectivoEsperado,
        diferencia: t.diferencia || 0,
        notasApertura: t.notasApertura,
        notasCierre: t.notasCierre,
        fechaApertura: t.fechaApertura,
        fechaCierre: t.fechaCierre,
      };
    });

    return NextResponse.json({
      resumen: {
        totalCortes: turnos.length,
        turnosAbiertosCount,
        turnosCerradosCount,
        totalApertura,
        totalVentas,
        totalEfectivo,
        totalTarjeta,
        totalTransfer,
        totalEntregadoCierre,
        totalDiferenciaNeta,
        cortesConFaltante,
        cortesConSobrante,
        cortesCuadrados,
      },
      cortes: cortesDetallados,
      catalogoAlmacenes: almacenes,
      catalogoCajeros: Array.from(cajerosSet),
    });
  } catch (error: any) {
    console.error('Error al generar reporte de cortes de caja:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener reporte de cortes de caja' },
      { status: 500 }
    );
  }
}
