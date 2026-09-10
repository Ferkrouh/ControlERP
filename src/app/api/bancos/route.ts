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

    const where = effectiveTenantId ? { tenantId: effectiveTenantId } : {};

    const cuentas = await prisma.cuentaBancaria.findMany({
      where,
      include: {
        _count: { select: { movimientos: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(cuentas);
  } catch (error) {
    console.error('Error fetching cuentas bancarias:', error);
    return NextResponse.json({ error: 'Error al consultar cuentas bancarias' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();
    const { banco, nombreCuenta, numeroCuenta, clabe, moneda = 'MXN', saldoInicial = 0 } = body;

    const targetTenantId = user.rol === 'SUPERADMIN' ? (body.tenantId || user.tenantId) : user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    if (!banco || !nombreCuenta) {
      return NextResponse.json({ error: 'Banco y nombre de la cuenta son requeridos' }, { status: 400 });
    }

    const saldoInitNum = Number(saldoInicial) || 0;

    const nuevaCuenta = await prisma.$transaction(async (tx) => {
      const cuenta = await tx.cuentaBancaria.create({
        data: {
          tenantId: targetTenantId,
          banco,
          nombreCuenta: nombreCuenta.trim(),
          numeroCuenta: numeroCuenta?.trim() || null,
          clabe: clabe?.trim() || null,
          moneda,
          saldoActual: saldoInitNum,
        },
      });

      if (saldoInitNum > 0) {
        await tx.movimientoBancario.create({
          data: {
            tenantId: targetTenantId,
            cuentaBancariaId: cuenta.id,
            tipo: 'INGRESO',
            monto: saldoInitNum,
            saldoResultante: saldoInitNum,
            concepto: 'Saldo inicial de apertura de cuenta bancaria',
            categoria: 'OPERATIVO',
            conciliado: true,
            fechaConciliacion: new Date(),
          },
        });
      }

      await tx.registroAuditoria.create({
        data: {
          tenantId: targetTenantId,
          usuarioId: user.id,
          usuarioNombre: user.nombre,
          modulo: 'TESORERIA',
          accion: 'CREAR',
          detalles: `Apertura de cuenta bancaria "${cuenta.nombreCuenta}" en ${banco} con saldo inicial $${saldoInitNum.toFixed(2)}`,
        },
      });

      return cuenta;
    });

    return NextResponse.json(nuevaCuenta, { status: 201 });
  } catch (error: any) {
    console.error('Error creating cuenta bancaria:', error);
    return NextResponse.json({ error: error.message || 'Error al crear cuenta bancaria' }, { status: 500 });
  }
}
