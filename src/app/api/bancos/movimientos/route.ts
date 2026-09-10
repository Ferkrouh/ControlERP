import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);
    const cuentaBancariaId = searchParams.get('cuentaBancariaId');
    const tenantParam = searchParams.get('tenantId');
    const effectiveTenantId = user.rol === 'SUPERADMIN' ? (tenantParam || undefined) : user.tenantId;

    if (!effectiveTenantId && user.rol !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const where: any = effectiveTenantId ? { tenantId: effectiveTenantId } : {};
    if (cuentaBancariaId) {
      where.cuentaBancariaId = cuentaBancariaId;
    }

    const movimientos = await prisma.movimientoBancario.findMany({
      where,
      include: {
        cuentaBancaria: true,
      },
      orderBy: { fecha: 'desc' },
      take: 100,
    });

    return NextResponse.json(movimientos);
  } catch (error) {
    console.error('Error fetching movimientos bancarios:', error);
    return NextResponse.json({ error: 'Error al consultar movimientos bancarios' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();
    const { cuentaBancariaId, tipo, monto, concepto, referencia, categoria = 'GASTO_OPERATIVO' } = body;

    const targetTenantId = user.rol === 'SUPERADMIN' ? (body.tenantId || user.tenantId) : user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    if (!cuentaBancariaId || !tipo || !monto || Number(monto) <= 0 || !concepto) {
      return NextResponse.json({ error: 'Cuenta, tipo (INGRESO/EGRESO), monto válido y concepto son requeridos' }, { status: 400 });
    }

    const cuenta = await prisma.cuentaBancaria.findFirst({
      where: { id: cuentaBancariaId, tenantId: targetTenantId },
    });

    if (!cuenta) {
      return NextResponse.json({ error: 'Cuenta bancaria no encontrada' }, { status: 404 });
    }

    const montoNum = Number(monto);
    if (tipo === 'EGRESO' && cuenta.saldoActual < montoNum) {
      return NextResponse.json({ error: `Saldo insuficiente en la cuenta. Saldo actual: $${cuenta.saldoActual.toFixed(2)}` }, { status: 400 });
    }

    const nuevoSaldo = tipo === 'INGRESO' ? cuenta.saldoActual + montoNum : cuenta.saldoActual - montoNum;

    const movimiento = await prisma.$transaction(async (tx) => {
      // 1. Crear movimiento bancario
      const mov = await tx.movimientoBancario.create({
        data: {
          tenantId: targetTenantId,
          cuentaBancariaId,
          tipo,
          monto: montoNum,
          saldoResultante: nuevoSaldo,
          concepto: concepto.trim(),
          referencia: referencia?.trim() || null,
          categoria,
          origenModulo: 'MANUAL',
          conciliado: false,
        },
      });

      // 2. Actualizar saldo actual de la cuenta bancaria
      await tx.cuentaBancaria.update({
        where: { id: cuentaBancariaId },
        data: { saldoActual: nuevoSaldo },
      });

      // 3. Auditoría
      await tx.registroAuditoria.create({
        data: {
          tenantId: targetTenantId,
          usuarioId: user.id,
          usuarioNombre: user.nombre,
          modulo: 'TESORERIA',
          accion: tipo === 'INGRESO' ? 'DEPOSITO' : 'DISPERSION',
          detalles: `${tipo} de $${montoNum.toFixed(2)} en cuenta "${cuenta.nombreCuenta}". Concepto: ${concepto}. Saldo resultante: $${nuevoSaldo.toFixed(2)}`,
        },
      });

      return mov;
    });

    return NextResponse.json(movimiento, { status: 201 });
  } catch (error: any) {
    console.error('Error creating movimiento bancario:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar movimiento bancario' }, { status: 500 });
  }
}

// Conciliación Bancaria (Marcar movimiento como cotejado con estado de cuenta)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();
    const { movimientoId, conciliado } = body;

    if (!movimientoId) {
      return NextResponse.json({ error: 'movimientoId es requerido' }, { status: 400 });
    }

    const mov = await prisma.movimientoBancario.findUnique({
      where: { id: movimientoId },
    });

    if (!mov) {
      return NextResponse.json({ error: 'Movimiento bancario no encontrado' }, { status: 404 });
    }

    if (user.rol !== 'SUPERADMIN' && mov.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'No autorizado para operar en este movimiento' }, { status: 403 });
    }

    const updated = await prisma.movimientoBancario.update({
      where: { id: movimientoId },
      data: {
        conciliado: !!conciliado,
        fechaConciliacion: conciliado ? new Date() : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating conciliacion bancaria:', error);
    return NextResponse.json({ error: 'Error al actualizar conciliación' }, { status: 500 });
  }
}
