import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sendCotizacionEmail } from '@/lib/email-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { id: cotizacionId } = await params;
    const body = await req.json();
    const { destinatarios, asunto, mensajePersonalizado, adjuntarPdf = true } = body;

    if (!destinatarios || !Array.isArray(destinatarios) || destinatarios.length === 0) {
      return NextResponse.json(
        { error: 'Debe proporcionar al menos un correo de destinatario válido.' },
        { status: 400 }
      );
    }

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
      include: {
        cliente: true,
        detalles: {
          include: { producto: true },
        },
      },
    });

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    if (auth.user.rol !== 'SUPERADMIN' && cotizacion.tenantId !== auth.user.tenantId) {
      return NextResponse.json({ error: 'Acceso denegado a esta cotización' }, { status: 403 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: cotizacion.tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant emisor no encontrado' }, { status: 404 });
    }

    const result = await sendCotizacionEmail({
      cotizacion,
      tenant,
      destinatarios,
      asunto,
      mensajePersonalizado,
      adjuntarPdf,
    });

    return NextResponse.json({
      success: true,
      message: `Cotización comercial enviada exitosamente a ${destinatarios.join(', ')}`,
      result,
    });
  } catch (error: any) {
    console.error('Error al enviar cotización por correo:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al enviar cotización por correo electrónico' },
      { status: 500 }
    );
  }
}
