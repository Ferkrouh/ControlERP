import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { generateEstadoCuentaPdf } from '@/lib/pdf-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { id } = await params;

    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        tenant: true,
        cxc: {
          orderBy: { fechaEmision: 'desc' },
        },
      },
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    if (user.rol !== 'SUPERADMIN' && cliente.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'No autorizado para acceder a este cliente' }, { status: 403 });
    }

    const pdfBuffer = await generateEstadoCuentaPdf(cliente, cliente.tenant);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="EstadoCuenta-${cliente.codigo}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating Estado de Cuenta PDF:', error);
    return NextResponse.json({ error: 'Error al generar Estado de Cuenta PDF' }, { status: 500 });
  }
}
