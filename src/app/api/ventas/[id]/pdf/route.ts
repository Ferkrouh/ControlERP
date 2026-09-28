import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { generateFacturaPdf } from '@/lib/pdf-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { id } = await params;

    const venta = await prisma.venta.findUnique({
      where: { id },
      include: {
        cliente: true,
        almacen: true,
        detalles: {
          include: {
            producto: true,
          },
        },
        tenant: true,
      },
    });

    if (!venta) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    if (user.rol !== 'SUPERADMIN' && venta.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'No autorizado para acceder a este documento' }, { status: 403 });
    }

    if (venta.estado !== 'COMPLETADA') {
      return NextResponse.json({ error: 'La venta está cancelada. Consulte su historial y motivo de cancelación.' }, { status: 409 });
    }

    const pdfBuffer = await generateFacturaPdf(venta, venta.tenant);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Remision-${venta.folio}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Error generating Factura PDF:', error);
    return NextResponse.json({ error: 'Error al generar PDF de Factura' }, { status: 500 });
  }
}
