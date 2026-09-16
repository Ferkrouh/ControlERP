import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// R-07 + R-08: Ventas por Producto / Categoría + Márgenes de Ganancia
// VentaDetalle contiene precioUnitario y costoUnitario registrados al momento de la venta.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);
    const tenantParam = searchParams.get('tenantId');
    const mes = searchParams.get('mes') || String(new Date().getMonth() + 1).padStart(2, '0');
    const anio = searchParams.get('anio') || String(new Date().getFullYear());
    const efectiveTenantId = user.rol === 'SUPERADMIN' ? (tenantParam || undefined) : user.tenantId;

    if (!efectiveTenantId && user.rol !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const inicio = new Date(`${anio}-${mes}-01T00:00:00.000Z`);
    const fin = new Date(inicio);
    fin.setMonth(fin.getMonth() + 1);

    // VentaDetalles del período, con venta y producto
    const detalles = await prisma.ventaDetalle.findMany({
      where: {
        venta: {
          ...(efectiveTenantId ? { tenantId: efectiveTenantId } : {}),
          estado: 'COMPLETADA',
          fecha: { gte: inicio, lt: fin },
        },
      },
      include: {
        producto: { select: { sku: true, nombre: true, categoria: true } },
        venta: { select: { fecha: true } },
      },
    });

    interface ProductoData {
      productoId: string;
      sku: string;
      nombre: string;
      categoria: string;
      unidades: number;
      ingresos: number;
      costo: number;
      margenBruto: number;
      margenPct: number;
    }

    const porProducto: Record<string, ProductoData> = {};
    const porCategoria: Record<string, { categoria: string; ingresos: number; costo: number; unidades: number }> = {};

    detalles.forEach((d) => {
      const pId = d.productoId;
      if (!porProducto[pId]) {
        porProducto[pId] = {
          productoId: pId,
          sku: d.producto.sku,
          nombre: d.producto.nombre,
          categoria: d.producto.categoria,
          unidades: 0,
          ingresos: 0,
          costo: 0,
          margenBruto: 0,
          margenPct: 0,
        };
      }
      porProducto[pId].unidades += d.cantidad;
      porProducto[pId].ingresos += d.subtotal;
      porProducto[pId].costo += d.costoUnitario * d.cantidad;

      const cat = d.producto.categoria;
      if (!porCategoria[cat]) porCategoria[cat] = { categoria: cat, ingresos: 0, costo: 0, unidades: 0 };
      porCategoria[cat].ingresos += d.subtotal;
      porCategoria[cat].costo += d.costoUnitario * d.cantidad;
      porCategoria[cat].unidades += d.cantidad;
    });

    // Calcular márgenes
    const rowsProducto: ProductoData[] = Object.values(porProducto).map((p) => {
      const margenBruto = p.ingresos - p.costo;
      const margenPct = p.ingresos > 0 ? (margenBruto / p.ingresos) * 100 : 0;
      return { ...p, margenBruto, margenPct };
    }).sort((a, b) => b.ingresos - a.ingresos);

    const rowsCategoria = Object.values(porCategoria).map((c) => ({
      ...c,
      margenBruto: c.ingresos - c.costo,
      margenPct: c.ingresos > 0 ? ((c.ingresos - c.costo) / c.ingresos) * 100 : 0,
    })).sort((a, b) => b.ingresos - a.ingresos);

    const totalIngresos = rowsProducto.reduce((s, p) => s + p.ingresos, 0);
    const totalCosto = rowsProducto.reduce((s, p) => s + p.costo, 0);
    const margenGlobal = totalIngresos > 0 ? ((totalIngresos - totalCosto) / totalIngresos) * 100 : 0;

    // Alertas: productos con margen < 10%
    const alertasMargen = rowsProducto.filter((p) => p.margenPct < 10 && p.ingresos > 0);

    return NextResponse.json({
      mes,
      anio,
      rowsProducto,
      rowsCategoria,
      alertasMargen,
      kpis: {
        totalProductosVendidos: rowsProducto.length,
        totalIngresos,
        totalCosto,
        margenBrutoTotal: totalIngresos - totalCosto,
        margenGlobalPct: margenGlobal,
      },
    });
  } catch (error) {
    console.error('Error ventas-producto:', error);
    return NextResponse.json({ error: 'Error al calcular ventas por producto' }, { status: 500 });
  }
}
