import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { generarReciboInterno } from '@/lib/recibo-cobranza';

// Se conserva la URL histórica; el piloto entrega exclusivamente recibos internos.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;
    const { id } = await params; const pagoId = new URL(req.url).searchParams.get('pagoId');
    const scope = auth.user.rol === 'SUPERADMIN' ? {} : { tenantId: auth.user.tenantId ?? '' };
    let cxc = await prisma.cuentaPorCobrar.findFirst({ where: { id, ...scope },
      include: { cliente: true, tenant: true, pagos: { orderBy: [{ fecha: 'desc' }, { id: 'desc' }] } } });
    let pago = cxc?.pagos.find(p => !pagoId || p.id === pagoId);
    if (!cxc) {
      const p = await prisma.pagoCxC.findFirst({ where: { id, cxc: scope }, select: { cxcId: true } });
      if (p) {
        cxc = await prisma.cuentaPorCobrar.findFirst({ where: { id: p.cxcId, ...scope },
          include: { cliente: true, tenant: true, pagos: { orderBy: [{ fecha: 'desc' }, { id: 'desc' }] } } });
        pago = cxc?.pagos.find(p => p.id === id && (!pagoId || p.id === pagoId));
      }
    }
    if (!cxc || !pago || cxc.cliente.tenantId !== cxc.tenantId) return NextResponse.json({ error: 'Recibo no encontrado' }, { status: 404 });
    // Los saldos capturados al confirmar el pago no se reconstruyen con fechas ambiguas.
    const solicitudes = await prisma.solicitudCobranza.findMany({ where: { tenantId: cxc.tenantId,
      respuestaJson: { contains: `"id":"${pago.id}"` } }, select: { respuestaJson: true } });
    const respuesta = solicitudes.map(s => JSON.parse(s.respuestaJson)).find(r => r.pago?.id === pago!.id);
    const pdf = generarReciboInterno({ pago, folio: cxc.folio, cliente: cxc.cliente.razonSocial,
      empresa: cxc.tenant.razonSocial, color: cxc.tenant.colorPrimario, saldoActual: cxc.saldoPendiente,
      saldos: respuesta ? { saldoAnterior: respuesta.saldoAnterior, nuevoSaldoPendiente: respuesta.nuevoSaldoPendiente } : undefined });
    return new NextResponse(pdf as unknown as BodyInit, { headers: { 'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Recibo-Abono-${pago.id}.pdf"`,
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) {
    console.error('Error al generar recibo interno:', error);
    return NextResponse.json({ error: 'No se pudo generar el recibo interno' }, { status: 500 });
  }
}
