import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sendFacturaEmail } from '@/lib/email-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { id: ventaId } = await params;
    const body = await req.json();
    const { destinatarios, asunto, mensajePersonalizado, adjuntarPdf = true, adjuntarXml = true } = body;

    if (!destinatarios || !Array.isArray(destinatarios) || destinatarios.length === 0) {
      return NextResponse.json(
        { error: 'Debe proporcionar al menos un correo de destinatario válido.' },
        { status: 400 }
      );
    }

    const venta = await prisma.venta.findUnique({
      where: { id: ventaId },
      include: {
        cliente: true,
        almacen: true,
        detalles: {
          include: { producto: true },
        },
      },
    });

    if (!venta) {
      return NextResponse.json({ error: 'Venta / Comprobante no encontrado' }, { status: 404 });
    }

    // Aislamiento por Tenant
    if (auth.user.rol !== 'SUPERADMIN' && venta.tenantId !== auth.user.tenantId) {
      return NextResponse.json({ error: 'Acceso denegado a esta venta' }, { status: 403 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: venta.tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant emisor no encontrado' }, { status: 404 });
    }

    const result = await sendFacturaEmail({
      venta,
      tenant,
      destinatarios,
      asunto,
      mensajePersonalizado,
      adjuntarPdf,
      adjuntarXml,
    });

    return NextResponse.json({
      success: true,
      message: `Comprobante fiscal enviado exitosamente a ${destinatarios.join(', ')}`,
      result,
    });
  } catch (error: any) {
    console.error('Error al enviar factura por correo:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al enviar comprobante por correo electrónico' },
      { status: 500 }
    );
  }
}
