import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { generateCartaPortePdf } from '@/lib/pdf-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'ALMACENISTA', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { id } = await params;

    const traspaso = await prisma.traspaso.findUnique({
      where: { id },
      include: {
        tenant: true,
        items: {
          include: {
            producto: true,
          },
        },
      },
    });

    if (!traspaso) {
      return NextResponse.json({ error: 'Traspaso no encontrado' }, { status: 404 });
    }

    if (user.rol !== 'SUPERADMIN' && traspaso.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'No autorizado para acceder a este traspaso' }, { status: 403 });
    }

    // Resolver nombres de almacenes origen y destino
    const [almacenOrigen, almacenDestino] = await Promise.all([
      prisma.almacen.findUnique({ where: { id: traspaso.almacenOrigenId } }),
      prisma.almacen.findUnique({ where: { id: traspaso.almacenDestinoId } }),
    ]);

    const traspasoCompleto = {
      ...traspaso,
      almacenOrigen,
      almacenDestino,
    };

    const pdfBuffer = await generateCartaPortePdf(traspasoCompleto, traspaso.tenant);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="CartaPorte-${traspaso.folio}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating Carta Porte PDF:', error);
    return NextResponse.json({ error: 'Error al generar PDF de Carta Porte' }, { status: 500 });
  }
}
