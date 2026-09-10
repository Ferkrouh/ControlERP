import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { fiscalService, FacturaRequest } from '@/lib/fiscal-adapter';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { id } = await params;

    const venta = await prisma.venta.findUnique({
      where: { id },
      include: {
        cliente: true,
        tenant: true,
        detalles: {
          include: { producto: true },
        },
      },
    });

    if (!venta) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    if (user.rol !== 'SUPERADMIN' && venta.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'No autorizado para facturar esta venta' }, { status: 403 });
    }

    if (venta.estadoFiscal === 'TIMBRADA') {
      return NextResponse.json({
        error: 'Esta venta ya se encuentra timbrada fiscalmente ante el SAT.',
        uuid: venta.uuidFiscal,
      }, { status: 400 });
    }

    // 1. Armar estructura para el Adaptador Fiscal
    const facturaPayload: FacturaRequest = {
      folioInterno: venta.folio,
      fechaEmision: new Date(),
      formaPago: venta.tipoPago === 'CREDITO' ? '99' : '03', // 99 Por definir o 03 Transferencia
      metodoPago: venta.tipoPago === 'CREDITO' ? 'PPD' : 'PUE',
      moneda: 'MXN',
      tipoComprobante: 'I',
      subtotal: venta.subtotal,
      impuestos: venta.impuestos,
      total: venta.total,
      emisor: {
        rfc: venta.tenant.identificacionFiscal,
        razonSocial: venta.tenant.razonSocial,
        regimenFiscal: venta.tenant.regimenFiscal || '601',
        codigoPostal: venta.tenant.codigoPostal || '64000',
      },
      receptor: {
        rfc: venta.cliente.rfc || 'XAXX010101000',
        razonSocial: venta.cliente.razonSocial,
        regimenFiscal: venta.cliente.regimenFiscal || '612',
        codigoPostal: venta.cliente.codigoPostal || '64000',
        usoCfdi: venta.cliente.usoCfdi || 'G01',
      },
      conceptos: venta.detalles.map((d) => ({
        claveProdServ: d.producto.claveSat || '01010101',
        claveUnidad: d.producto.claveUnidadSat || 'H87',
        unidad: d.producto.unidadMedida,
        descripcion: d.producto.nombre,
        cantidad: d.cantidad,
        valorUnitario: d.precioUnitario,
        importe: d.subtotal,
        objetoImp: d.producto.objetoImp || '02',
        tasaIva: 0.16,
        importeIva: Math.round(d.subtotal * 0.16 * 100) / 100,
      })),
    };

    // 2. Timbrado a través del adaptador desacoplado
    const resultadoPac = await fiscalService.timbrar(facturaPayload);

    if (!resultadoPac.success) {
      return NextResponse.json({
        error: `Rechazo del SAT / PAC: ${resultadoPac.error}`,
      }, { status: 422 });
    }

    // 3. Persistir UUID y estampa fiscal en base de datos
    const ventaActualizada = await prisma.$transaction(async (tx) => {
      const vta = await tx.venta.update({
        where: { id },
        data: {
          estadoFiscal: 'TIMBRADA',
          uuidFiscal: resultadoPac.uuid,
          fechaTimbrado: resultadoPac.fechaTimbrado,
          selloDigitalSat: resultadoPac.selloSat,
          xmlSat: resultadoPac.xmlTimbrado,
        },
      });

      await tx.registroAuditoria.create({
        data: {
          tenantId: venta.tenantId,
          usuarioId: user.id,
          usuarioNombre: user.nombre,
          modulo: 'VENTAS',
          accion: 'TIMBRADO_CFDI',
          detalles: `Comprobante CFDI 4.0 timbrado exitosamente para la venta ${venta.folio}. UUID SAT: ${resultadoPac.uuid}`,
        },
      });

      return vta;
    });

    return NextResponse.json({
      success: true,
      mensaje: 'Comprobante fiscal timbrado exitosamente ante el SAT.',
      uuid: resultadoPac.uuid,
      fechaTimbrado: resultadoPac.fechaTimbrado,
      xml: resultadoPac.xmlTimbrado,
      venta: ventaActualizada,
    });
  } catch (error: any) {
    console.error('Error al timbrar venta:', error);
    return NextResponse.json({ error: error.message || 'Error al timbrar factura' }, { status: 500 });
  }
}
