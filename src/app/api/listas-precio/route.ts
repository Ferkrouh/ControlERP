import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
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

    const listas = await prisma.listaPrecio.findMany({
      where,
      include: {
        items: {
          include: { producto: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    return NextResponse.json(listas);
  } catch (error: any) {
    console.error('Error fetching listas de precios:', error);
    return NextResponse.json({ error: 'Error al consultar listas de precios' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();
    const { nombre, descripcion, porcentajeDescuento = 0, items } = body;

    const targetTenantId = user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre de la lista de precios es requerido' }, { status: 400 });
    }

    const nuevaLista = await prisma.listaPrecio.create({
      data: {
        tenantId: targetTenantId,
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        porcentajeDescuento: Number(porcentajeDescuento) || 0,
        activa: true,
        items: items && Array.isArray(items) ? {
          create: items.map((i: any) => ({
            productoId: i.productoId,
            precioFijo: i.precioFijo !== undefined ? Number(i.precioFijo) : null,
            descuento: i.descuento !== undefined ? Number(i.descuento) : null,
          })),
        } : undefined,
      },
      include: {
        items: {
          include: { producto: true },
        },
      },
    });

    // Auditoría
    await prisma.registroAuditoria.create({
      data: {
        tenantId: targetTenantId,
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        modulo: 'PRECIOS',
        accion: 'CREAR',
        detalles: `Lista de precios "${nombre}" creada con descuento base de ${porcentajeDescuento}%`,
      },
    });

    return NextResponse.json(nuevaLista, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear lista de precios:', error);
    return NextResponse.json({ error: error.message || 'Error al guardar lista de precios' }, { status: 500 });
  }
}
