import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { generateTicketPosPdf } from '@/lib/pdf-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'ALMACENISTA', 'AUDITOR']);
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
      return NextResponse.json({ error: 'Venta / Ticket no encontrado' }, { status: 404 });
    }

    if (user.rol !== 'SUPERADMIN' && venta.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'No autorizado para acceder a este ticket' }, { status: 403 });
    }

    const pdfBuffer = await generateTicketPosPdf(venta, venta.tenant);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Ticket-${venta.folio}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating Ticket POS PDF:', error);
    return NextResponse.json({ error: 'Error al generar PDF de Ticket' }, { status: 500 });
  }
}
