import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { cancelarVenta, editarObservacionesVenta, entradaCancelacion, entradaEdicionVenta } from '@/lib/cancelacion-venta';
import { VentaError } from '@/lib/ventas';
import { ZodError } from 'zod';
type Context = { params: Promise<{ id: string }> };
function errorVenta(error: unknown) {
  if (error instanceof VentaError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: 'Motivo u observaciones inválidos' }, { status: 400 });
  console.error('Error en venta:', error);
  return NextResponse.json({ error: 'No se pudo confirmar el resultado. Recargue e intente de nuevo.' }, { status: 500 });
}
export async function GET(req: NextRequest, { params }: Context) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN','ADMIN','ENCARGADO','AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;
    const { id } = await params;
    const venta = await prisma.venta.findFirst({ where: { id,
      ...(auth.user.rol === 'SUPERADMIN' ? {} : { tenantId: auth.user.tenantId ?? '' }) },
      include: { cliente: true, almacen: true, detalles: { include: { producto: true } } } });
    if (!venta) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    return NextResponse.json(venta);
  } catch (error) { return errorVenta(error); }
}
export async function PUT(req: NextRequest, { params }: Context) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN','ADMIN','ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;
    const { id } = await params; const data = entradaEdicionVenta.parse(await req.json().catch(() => null));
    if (data.observaciones === undefined) return NextResponse.json({ error: 'Indique observaciones para modificar' }, { status: 400 });
    return NextResponse.json(await editarObservacionesVenta(id, data.observaciones, data.tipoPago, auth.user));
  } catch (error) { return errorVenta(error); }
}
export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN','ADMIN']);
    if (auth.errorResponse) return auth.errorResponse;
    const { id } = await params; const { motivo } = entradaCancelacion.parse(await req.json().catch(() => null));
    const { venta, repetida } = await cancelarVenta(id, motivo, auth.user);
    return NextResponse.json({ success: true, message: repetida ? `Venta ${venta.folio} ya cancelada.` : `Venta ${venta.folio} cancelada; historial conservado.`, venta },
      { headers: { 'Idempotency-Replayed': String(repetida) } });
  } catch (error) { return errorVenta(error); }
}
