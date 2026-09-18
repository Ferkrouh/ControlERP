import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { generateCotizacionPdf } from '@/lib/pdf-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'ALMACENISTA', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { id } = await params;

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: {
        cliente: true,
        detalles: {
          include: {
            producto: true,
          },
        },
        tenant: true,
      },
    });

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    if (user.rol !== 'SUPERADMIN' && cotizacion.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'No autorizado para acceder a esta cotización' }, { status: 403 });
    }

    const pdfBuffer = await generateCotizacionPdf(cotizacion, cotizacion.tenant);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Cotizacion-${cotizacion.folio}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating Cotización PDF:', error);
    return NextResponse.json({ error: 'Error al generar PDF de Cotización' }, { status: 500 });
  }
}
