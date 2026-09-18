import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sendRepEmail } from '@/lib/email-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pagoId: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { id: cxcId, pagoId } = await params;
    const body = await req.json();
    const { destinatarios, asunto, mensajePersonalizado, adjuntarPdf = true } = body;

    if (!destinatarios || !Array.isArray(destinatarios) || destinatarios.length === 0) {
      return NextResponse.json(
        { error: 'Debe proporcionar al menos un correo de destinatario válido.' },
        { status: 400 }
      );
    }

    const cxc = await prisma.cuentaPorCobrar.findUnique({
      where: { id: cxcId },
      include: {
        cliente: true,
        pagos: true,
      },
    });

    if (!cxc) {
      return NextResponse.json({ error: 'Cuenta por cobrar no encontrada' }, { status: 404 });
    }

    if (auth.user.rol !== 'SUPERADMIN' && cxc.tenantId !== auth.user.tenantId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const pago = cxc.pagos.find((p) => p.id === pagoId);
    if (!pago) {
      return NextResponse.json({ error: 'Abono / Pago no encontrado' }, { status: 404 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: cxc.tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant emisor no encontrado' }, { status: 404 });
    }

    const result = await sendRepEmail({
      pago,
      cxc,
      tenant,
      destinatarios,
      asunto,
      mensajePersonalizado,
      adjuntarPdf,
    });

    return NextResponse.json({
      success: true,
      message: `Complemento de pago REP enviado exitosamente a ${destinatarios.join(', ')}`,
      result,
    });
  } catch (error: any) {
    console.error('Error al enviar REP por correo:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al enviar REP por correo' },
      { status: 500 }
    );
  }
}
