import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { generateRepPdf } from '@/lib/pdf-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const pagoIdParam = searchParams.get('pagoId');

    let pago: any = null;
    let cxc: any = null;

    // Buscar si el ID corresponde a una CuentaPorCobrar
    const cxcRecord = await prisma.cuentaPorCobrar.findUnique({
      where: { id },
      include: {
        cliente: true,
        tenant: true,
        pagos: {
          orderBy: { fecha: 'desc' },
        },
      },
    });

    if (cxcRecord) {
      cxc = cxcRecord;
      if (pagoIdParam) {
        pago = cxc.pagos.find((p: any) => p.id === pagoIdParam);
      } else {
        pago = cxc.pagos[0];
      }

      if (!pago) {
        return NextResponse.json({ error: 'No se encontraron pagos registrados para este documento' }, { status: 404 });
      }
    } else {
      // Buscar si el ID corresponde directamente a un PagoCxC
      const pagoRecord = await prisma.pagoCxC.findUnique({
        where: { id },
        include: {
          cxc: {
            include: {
              cliente: true,
              tenant: true,
            },
          },
        },
      });

      if (!pagoRecord) {
        return NextResponse.json({ error: 'Recibo de pago o documento no encontrado' }, { status: 404 });
      }

      pago = pagoRecord;
      cxc = pagoRecord.cxc;
    }

    if (user.rol !== 'SUPERADMIN' && cxc.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'No autorizado para acceder a este recibo de pago' }, { status: 403 });
    }

    // Obtener UUID fiscal de la venta original si existe
    const ventaOrigen = await prisma.venta.findFirst({
      where: {
        tenantId: cxc.tenantId,
        cxcId: cxc.id,
      },
    });

    const cxcData = {
      ...cxc,
      uuidFiscal: ventaOrigen?.uuidFiscal || 'E29F9882-9901-443B-9831-ABCD12345678',
    };

    const pdfBuffer = await generateRepPdf(pago, cxcData, cxc.tenant);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="ReciboPago-REP-${cxc.folio}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating REP PDF:', error);
    return NextResponse.json({ error: 'Error al generar Recibo de Pago REP PDF' }, { status: 500 });
  }
}
