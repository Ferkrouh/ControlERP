import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Almacenistas no tienen acceso a proveedores ni condiciones de crédito de compra
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);
    const tenantParam = searchParams.get('tenantId');
    const effectiveTenantId = user.rol === 'SUPERADMIN' ? (tenantParam || undefined) : user.tenantId;

    if (!effectiveTenantId && user.rol !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const where = effectiveTenantId ? { tenantId: effectiveTenantId } : {};

    const proveedores = await prisma.proveedor.findMany({
      where,
      include: {
        cxp: {
          where: { estado: { in: ['PENDIENTE', 'PARCIAL', 'VENCIDA'] } },
        },
      },
      orderBy: { razonSocial: 'asc' },
    });

    return NextResponse.json(proveedores);
  } catch (error) {
    console.error('Error fetching proveedores:', error);
    return NextResponse.json({ error: 'Error al obtener proveedores' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();

    const targetTenantId = user.rol === 'SUPERADMIN' ? (body.tenantId || user.tenantId) : user.tenantId;
    if (!targetTenantId || !body.razonSocial) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const count = await prisma.proveedor.count({ where: { tenantId: targetTenantId } });
    const codigo = `PRV-${String(count + 1).padStart(3, '0')}`;

    const proveedor = await prisma.proveedor.create({
      data: {
        tenantId: targetTenantId,
        codigo,
        razonSocial: body.razonSocial.trim(),
        rfc: body.rfc ? body.rfc.toUpperCase().trim() : null,
        contacto: body.contacto,
        telefono: body.telefono,
        email: body.email,
        diasCredito: Number(body.diasCredito || 0),
        saldoPendiente: 0,
      },
    });

    return NextResponse.json(proveedor, { status: 201 });
  } catch (error) {
    console.error('Error creating proveedor:', error);
    return NextResponse.json({ error: 'Error al crear proveedor' }, { status: 500 });
  }
}
