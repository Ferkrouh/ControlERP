import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { generateReciboNominaPdf } from '@/lib/pdf-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { id: reciboId } = await params;

    const recibo = await prisma.reciboNomina.findUnique({
      where: { id: reciboId },
      include: {
        empleado: true,
        periodo: true,
        tenant: true,
      },
    });

    if (!recibo) {
      return NextResponse.json({ error: 'Recibo no encontrado' }, { status: 404 });
    }

    if (user.rol !== 'SUPERADMIN' && recibo.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const pdfBuffer = await generateReciboNominaPdf({
      tenant: recibo.tenant,
      periodo: recibo.periodo,
      recibo,
      empleado: recibo.empleado,
    });

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Recibo_Nomina_${recibo.empleado.numeroEmpleado}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generando PDF de recibo de nómina:', error);
    return NextResponse.json({ error: 'Error al generar comprobante de nómina' }, { status: 500 });
  }
}
