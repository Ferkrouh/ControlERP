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
    const body = await req.json();
    const { monto, metodo, referencia, timbrarRep = false } = body;

    const cxc = await prisma.cuentaPorCobrar.findUnique({
      where: { id },
      include: { 
        cliente: true,
        tenant: true,
      },
    });

    if (!cxc) {
      return NextResponse.json({ error: 'Documento CxC no encontrado' }, { status: 404 });
    }

    // Aislamiento multitenant: no permitir aplicar abonos en CxC de otra empresa
    if (user.rol !== 'SUPERADMIN' && cxc.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'No autorizado para operar en este documento' }, { status: 403 });
    }

    const abonoMonto = Number(monto);
    if (abonoMonto <= 0 || abonoMonto > cxc.saldoPendiente) {
      return NextResponse.json({ error: 'Monto de abono inválido' }, { status: 400 });
    }

    const saldoAnterior = cxc.saldoPendiente;
    const nuevoSaldoPendiente = Math.max(0, cxc.saldoPendiente - abonoMonto);
    const nuevoEstado = nuevoSaldoPendiente === 0 ? 'PAGADA' : 'PARCIAL';
    const nuevoSaldoCliente = Math.max(0, cxc.cliente.saldoActual - abonoMonto);
    const nuevoEstadoCredito = nuevoSaldoCliente < cxc.cliente.limiteCredito ? 'ACTIVO' : cxc.cliente.estadoCredito;

    // Obtener la venta asociada a este folio CxC si existe para vincular UUID origen
    const ventaOrigen = await prisma.venta.findFirst({
      where: {
        tenantId: cxc.tenantId,
        cxcId: cxc.id,
      },
    });

    // 1. Timbrar Complemento de Pago REP 2.0 si se solicitó
    let repFiscalData: any = null;
    if (timbrarRep) {
      const { fiscalService } = await import('@/lib/fiscal-adapter');
      const repRes = await fiscalService.timbrarPagoREP({
        folioInterno: `PAGO-${cxc.folio}`,
        fechaPago: new Date(),
        formaDePagoP: metodo === 'EFECTIVO' ? '01' : (metodo === 'TARJETA' ? '04' : '03'),
        monedaP: 'MXN',
        monto: abonoMonto,
        emisor: {
          rfc: cxc.tenant.identificacionFiscal,
          razonSocial: cxc.tenant.razonSocial,
          regimenFiscal: cxc.tenant.regimenFiscal || '601',
          codigoPostal: cxc.tenant.codigoPostal || '64000',
        },
        receptor: {
          rfc: cxc.cliente.rfc || 'XAXX010101000',
          razonSocial: cxc.cliente.razonSocial,
          regimenFiscal: cxc.cliente.regimenFiscal || '612',
          codigoPostal: cxc.cliente.codigoPostal || '64000',
          usoCfdi: 'CP01',
        },
        documentosRelacionados: [{
          idDocumento: ventaOrigen?.uuidFiscal || 'UUID-NO-TIMBRADO',
          folio: cxc.folio,
          monedaDr: 'MXN',
          numParcialidad: 1,
          importeSaldoAnt: saldoAnterior,
          importePagado: abonoMonto,
          importeSaldoInsoluto: nuevoSaldoPendiente,
          objetoImpDr: '02',
        }],
      });

      if (repRes.success) {
        repFiscalData = {
          requiereRep: true,
          estadoFiscalRep: 'TIMBRADO',
          uuidRep: repRes.uuid,
          fechaTimbradoRep: repRes.fechaTimbrado,
          xmlRep: repRes.xmlTimbrado,
        };
      }
    }

    // Transacción atómica garantizada
    const { pago } = await prisma.$transaction(async (tx) => {
      // 1. Registrar pago con estampa REP 2.0 si aplica
      const nuevoPago = await tx.pagoCxC.create({
        data: {
          cxcId: id,
          monto: abonoMonto,
          metodo: metodo || 'TRANSFERENCIA',
          referencia: referencia || 'Abono en ventanilla',
          ...(repFiscalData || {}),
        },
      });

      // 2. Actualizar CxC
      await tx.cuentaPorCobrar.update({
        where: { id },
        data: {
          saldoPendiente: nuevoSaldoPendiente,
          estado: nuevoEstado,
        },
      });

      // 3. Actualizar Saldo Actual del Cliente
      await tx.cliente.update({
        where: { id: cxc.clienteId },
        data: {
          saldoActual: nuevoSaldoCliente,
          estadoCredito: nuevoEstadoCredito,
        },
      });

      // 4. Bitácora de Auditoría con identidad real del usuario de sesión
      await tx.registroAuditoria.create({
        data: {
          tenantId: cxc.tenantId,
          usuarioId: user.id,
          usuarioNombre: user.nombre,
          modulo: 'CXC',
          accion: 'ABONO',
          detalles: `Abono de $${abonoMonto.toLocaleString('es-MX', { minimumFractionDigits: 2 })} aplicado a documento ${cxc.folio} del cliente ${cxc.cliente.razonSocial}.${repFiscalData ? ` [REP 2.0 TIMBRADO: ${repFiscalData.uuidRep}]` : ''} Saldo pendiente: $${nuevoSaldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        },
      });

      return { pago: nuevoPago };
    });

    return NextResponse.json({ success: true, pago, nuevoSaldoPendiente, repTimbrado: !!repFiscalData });
  } catch (error) {
    console.error('Error registering abono:', error);
    return NextResponse.json({ error: 'Error al registrar abono' }, { status: 500 });
  }
}
