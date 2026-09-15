import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { ensureStandardChartOfAccounts } from '@/lib/accounting-engine';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);
    const tenantParam = searchParams.get('tenantId');
    const effectiveTenantId = user.rol === 'SUPERADMIN' ? (tenantParam || user.tenantId) : user.tenantId;

    if (!effectiveTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    await ensureStandardChartOfAccounts(effectiveTenantId);

    const cuentas = await prisma.cuentaContable.findMany({
      where: { tenantId: effectiveTenantId },
      orderBy: { codigo: 'asc' },
    });

    return NextResponse.json(cuentas);
  } catch (error: any) {
    console.error('Error fetching cuentas contables:', error);
    return NextResponse.json({ error: 'Error al consultar catálogo de cuentas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();
    const { codigo, nombre, tipo, naturaleza, nivel = 1, codigoAgrupadorSAT, saldoInicial = 0 } = body;

    const targetTenantId = user.rol === 'SUPERADMIN' ? (body.tenantId || user.tenantId) : user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    if (!codigo || !nombre || !tipo || !naturaleza || !codigoAgrupadorSAT) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const nuevaCuenta = await prisma.cuentaContable.create({
      data: {
        tenantId: targetTenantId,
        codigo,
        nombre,
        tipo,
        naturaleza,
        nivel: Number(nivel),
        codigoAgrupadorSAT,
        saldoInicial: Number(saldoInicial) || 0,
        saldoActual: Number(saldoInicial) || 0,
      },
    });

    return NextResponse.json(nuevaCuenta, { status: 201 });
  } catch (error: any) {
    console.error('Error creating cuenta contable:', error);
    return NextResponse.json({ error: error.message || 'Error al crear cuenta contable' }, { status: 500 });
  }
}
