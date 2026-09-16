import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// R-10: Cumplimiento de Cuotas de Ventas
// Meta mensual vs. ventas reales por usuario. Porcentaje de cumplimiento.
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

    // Usuarios con meta configurada
    const usuarios = await prisma.usuario.findMany({
      where: effectiveTenantId
        ? { tenantId: effectiveTenantId, activo: true, rol: { in: ['ENCARGADO', 'ADMIN'] } }
        : { activo: true },
      select: { id: true, nombre: true, metaVentasMensual: true, rol: true },
    });

    // Ventas del período por usuarioId
    const ventas = await prisma.venta.findMany({
      where: {
        ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}),
        estado: 'COMPLETADA',
        fecha: { gte: inicio, lt: fin },
      },
      select: { usuarioId: true, total: true },
    });

    const ventasPorUsuario: Record<string, number> = {};
    ventas.forEach((v) => {
      ventasPorUsuario[v.usuarioId] = (ventasPorUsuario[v.usuarioId] || 0) + v.total;
    });

    interface CuotaRow {
      usuarioId: string;
      nombre: string;
      rol: string;
      meta: number;
      real: number;
      cumplimientoPct: number;
      estado: 'CUMPLIDA' | 'EN_PROCESO' | 'BAJO' | 'SIN_META';
    }

    const rows: CuotaRow[] = usuarios.map((u) => {
      const real = ventasPorUsuario[u.id] || 0;
      const meta = u.metaVentasMensual;
      const pct = meta > 0 ? (real / meta) * 100 : 0;
      let estado: CuotaRow['estado'];
      if (meta === 0) estado = 'SIN_META';
      else if (pct >= 100) estado = 'CUMPLIDA';
      else if (pct >= 60) estado = 'EN_PROCESO';
      else estado = 'BAJO';

      return {
        usuarioId: u.id,
        nombre: u.nombre,
        rol: u.rol,
        meta,
        real,
        cumplimientoPct: pct,
        estado,
      };
    }).sort((a, b) => b.cumplimientoPct - a.cumplimientoPct);

    const metaTotal = rows.reduce((s, r) => s + r.meta, 0);
    const realTotal = rows.reduce((s, r) => s + r.real, 0);
    const cumplimientoGlobal = metaTotal > 0 ? (realTotal / metaTotal) * 100 : 0;
    const cumplidas = rows.filter((r) => r.estado === 'CUMPLIDA').length;

    return NextResponse.json({
      mes,
      anio,
      rows,
      kpis: {
        metaTotal,
        realTotal,
        cumplimientoGlobal,
        cumplidas,
        enProceso: rows.filter((r) => r.estado === 'EN_PROCESO').length,
        bajo: rows.filter((r) => r.estado === 'BAJO').length,
        sinMeta: rows.filter((r) => r.estado === 'SIN_META').length,
      },
    });
  } catch (error) {
    console.error('Error cumplimiento-cuotas:', error);
    return NextResponse.json({ error: 'Error al calcular cumplimiento de cuotas' }, { status: 500 });
  }
}
