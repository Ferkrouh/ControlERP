import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// R-09: Comisiones de Ventas
// Agrupa ventas por usuarioNombre y calcula comisión según comisionPct del usuario.
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

    // Ventas del período completadas
    const ventas = await prisma.venta.findMany({
      where: {
        ...whereTenant,
        estado: 'COMPLETADA',
        fecha: { gte: inicio, lt: fin },
      },
      select: {
        usuarioId: true,
        usuarioNombre: true,
        total: true,
      },
    });

    // Usuarios del tenant para obtener comisionPct
    const usuarios = await prisma.usuario.findMany({
      where: effectiveTenantId ? { tenantId: effectiveTenantId } : {},
      select: { id: true, nombre: true, comisionPct: true },
    });

    const comisionPorUsuario: Record<string, number> = {};
    usuarios.forEach((u) => {
      comisionPorUsuario[u.id] = u.comisionPct;
    });

    // Agrupar ventas por usuario
    interface VendedorRow {
      usuarioId: string;
      nombre: string;
      numVentas: number;
      totalVendido: number;
      comisionPct: number;
      comisionMXN: number;
    }

    const porVendedor: Record<string, VendedorRow> = {};

    ventas.forEach((v) => {
      if (!porVendedor[v.usuarioId]) {
        const pct = comisionPorUsuario[v.usuarioId] ?? 3.0;
        porVendedor[v.usuarioId] = {
          usuarioId: v.usuarioId,
          nombre: v.usuarioNombre,
          numVentas: 0,
          totalVendido: 0,
          comisionPct: pct,
          comisionMXN: 0,
        };
      }
      porVendedor[v.usuarioId].numVentas += 1;
      porVendedor[v.usuarioId].totalVendido += v.total;
    });

    const rows: VendedorRow[] = Object.values(porVendedor).map((r) => ({
      ...r,
      comisionMXN: r.totalVendido * (r.comisionPct / 100),
    })).sort((a, b) => b.totalVendido - a.totalVendido);

    const totalVendido = rows.reduce((s, r) => s + r.totalVendido, 0);
    const totalComision = rows.reduce((s, r) => s + r.comisionMXN, 0);

    return NextResponse.json({
      mes,
      anio,
      rows,
      totales: { totalVendido, totalComision, numVendedores: rows.length },
    });
  } catch (error) {
    console.error('Error comisiones:', error);
    return NextResponse.json({ error: 'Error al calcular comisiones' }, { status: 500 });
  }
}
