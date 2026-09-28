import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'ALMACENISTA', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;
    const { user: session } = auth;

    const { searchParams } = new URL(request.url);
    const tenantId = session.rol === 'SUPERADMIN' ? searchParams.get('tenantId') || session.tenantId : session.tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const boms = await prisma.listaMateriales.findMany({
      where: { tenantId },
      include: {
        producto: true,
        insumos: {
          include: {
            producto: true,
          },
        },
        _count: {
          select: { ordenes: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(boms);
  } catch (error) {
    console.error('Error al listar BOMs:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['SUPERADMIN', 'ADMIN']);
    if (auth.errorResponse) return auth.errorResponse;
    const { user: session } = auth;

    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant no válido' }, { status: 400 });
    }

    const body = await request.json();
    const { codigo, nombre, productoId, cantidadBase = 1, notas, insumos } = body;

    if (!codigo || !nombre || !productoId || !Array.isArray(insumos) || insumos.length === 0) {
      return NextResponse.json(
        { error: 'Código, nombre, producto terminado e insumos son requeridos' },
        { status: 400 }
      );
    }

    const ids = [...new Set([productoId, ...insumos.map((item: any) => item.productoId)])];
    const productosTenant = await prisma.producto.findMany({ where: { id: { in: ids }, tenantId } });
    if (productosTenant.length !== ids.length) {
      return NextResponse.json({ error: 'Todos los productos deben pertenecer a su empresa' }, { status: 400 });
    }

    let costoEstimado = 0;
    for (const item of insumos) {
      const prodInsumo = productosTenant.find((producto) => producto.id === item.productoId);
      if (prodInsumo) {
        costoEstimado += (prodInsumo.costoPromedio || 0) * Number(item.cantidadRequerida);
      }
    }

    const nuevaBOM = await prisma.listaMateriales.create({
      data: {
        tenantId,
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        productoId,
        cantidadBase: Number(cantidadBase) || 1,
        costoEstimado,
        notas,
        insumos: {
          create: insumos.map((i: any) => ({
            productoId: i.productoId,
            cantidadRequerida: Number(i.cantidadRequerida),
            mermaEsperadaPct: Number(i.mermaEsperadaPct) || 0,
          })),
        },
      },
      include: {
        producto: true,
        insumos: {
          include: { producto: true },
        },
      },
    });

    await prisma.registroAuditoria.create({
      data: {
        tenantId,
        usuarioId: session.id,
        usuarioNombre: session.nombre,
        modulo: 'MRP_BOM',
        accion: 'CREAR',
        detalles: `Creó Lista de Materiales (BOM) ${nuevaBOM.codigo} para fabricar ${nuevaBOM.producto.nombre}`,
      },
    });

    return NextResponse.json(nuevaBOM, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear BOM:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una lista de materiales con ese código' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
