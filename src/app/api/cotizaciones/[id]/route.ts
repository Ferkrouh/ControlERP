import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { conVersion, editarCotizacion, modificarCotizacion, eliminarCotizacion, versionDocumento } from '@/lib/cotizaciones';
import { errorCotizacion } from '@/lib/cotizaciones-http';

type Context = { params: Promise<{ id: string }> };
export async function GET(req: NextRequest, { params }: Context) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;
    const { id } = await params;
    const c = await prisma.cotizacion.findFirst({ where: { id,
      ...(auth.user.rol === 'SUPERADMIN' ? {} : { tenantId: auth.user.tenantId ?? '' }) },
      include: { cliente: true, detalles: { include: { producto: true } } } });
    if (!c) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    return NextResponse.json(conVersion(c), { headers: { ETag: `"${conVersion(c).version}"` } });
  } catch (error) { return errorCotizacion(error); }
}
export async function PUT(req: NextRequest, { params }: Context) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;
    const { id } = await params;
    const body = editarCotizacion.parse(await req.json().catch(() => null));
    const cotizacion = await modificarCotizacion(id, body, auth.user);
    return NextResponse.json({ success: true, message: `Cotización ${cotizacion.folio} actualizada`, cotizacion });
  } catch (error) { return errorCotizacion(error); }
}
export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;
    const { id } = await params;
    const version = versionDocumento.parse(req.headers.get('If-Match')?.replace(/^"|"$/g, ''));
    await eliminarCotizacion(id, version, auth.user);
    return NextResponse.json({ success: true, message: 'Cotización eliminada' });
  } catch (error) { return errorCotizacion(error); }
}
