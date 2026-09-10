import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { id } = await params;
    const { monto, metodo, referencia } = await req.json();

    const cxp = await prisma.cuentaPorPagar.findUnique({
      where: { id },
      include: { proveedor: true },
    });

    if (!cxp) {
      return NextResponse.json({ error: 'Documento CxP no encontrado' }, { status: 404 });
    }

    if (user.rol !== 'SUPERADMIN' && cxp.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'No autorizado para operar en este documento' }, { status: 403 });
    }

    const pagoMonto = Number(monto);
    if (pagoMonto <= 0 || pagoMonto > cxp.saldoPendiente) {
      return NextResponse.json({ error: 'Monto de pago a proveedor inválido' }, { status: 400 });
    }

    const nuevoSaldoPendiente = Math.max(0, cxp.saldoPendiente - pagoMonto);
    const nuevoEstado = nuevoSaldoPendiente === 0 ? 'PAGADA' : 'PARCIAL';

    const { pago } = await prisma.$transaction(async (tx) => {
      const nuevoPago = await tx.pagoCxP.create({
        data: {
          cxpId: id,
          monto: pagoMonto,
          metodo: metodo || 'TRANSFERENCIA',
          referencia: referencia || 'Liquidación bancaria',
        },
      });

      await tx.cuentaPorPagar.update({
        where: { id },
        data: {
          saldoPendiente: nuevoSaldoPendiente,
          estado: nuevoEstado,
        },
      });

      await tx.proveedor.update({
        where: { id: cxp.proveedorId },
        data: {
          saldoPendiente: Math.max(0, cxp.proveedor.saldoPendiente - pagoMonto),
        },
      });

      await tx.registroAuditoria.create({
        data: {
          tenantId: cxp.tenantId,
          usuarioId: user.id,
          usuarioNombre: user.nombre,
          modulo: 'CXP',
          accion: 'PAGO_PROVEEDOR',
          detalles: `Pago de $${pagoMonto.toLocaleString('es-MX', { minimumFractionDigits: 2 })} aplicado a factura ${cxp.folioFactura} de ${cxp.proveedor.razonSocial}. Saldo restante: $${nuevoSaldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        },
      });

      return { pago: nuevoPago };
    });

    return NextResponse.json({ success: true, pago, nuevoSaldoPendiente });
  } catch (error) {
    console.error('Error registering CxP pago:', error);
    return NextResponse.json({ error: 'Error al registrar pago CxP' }, { status: 500 });
  }
}
