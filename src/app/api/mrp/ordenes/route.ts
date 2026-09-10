import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = session.rol === 'SUPERADMIN' ? searchParams.get('tenantId') || session.tenantId : session.tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const ordenes = await prisma.ordenProduccion.findMany({
      where: { tenantId },
      include: {
        producto: true,
        almacenOrigen: true,
        almacenDestino: true,
        listaMateriales: {
          include: {
            insumos: {
              include: { producto: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(ordenes);
  } catch (error) {
    console.error('Error al listar órdenes de producción:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant no válido' }, { status: 400 });
    }

    const body = await request.json();
    const {
      listaMaterialesId,
      almacenOrigenId,
      almacenDestinoId,
      cantidadPlan,
      costoManoObra = 0,
      observaciones,
    } = body;

    if (!listaMaterialesId || !almacenOrigenId || !almacenDestinoId || !cantidadPlan || cantidadPlan <= 0) {
      return NextResponse.json(
        { error: 'BOM, almacén de origen, almacén de destino y cantidad válida son requeridos' },
        { status: 400 }
      );
    }

    const bom = await prisma.listaMateriales.findUnique({
      where: { id: listaMaterialesId },
      include: { insumos: { include: { producto: true } } },
    });

    if (!bom || bom.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Lista de materiales no encontrada' }, { status: 404 });
    }

    // Generar folio consecutivo OP-YYYY-XXXX
    const year = new Date().getFullYear();
    const countTotal = await prisma.ordenProduccion.count({ where: { tenantId } });
    const folio = `OP-${year}-${String(countTotal + 1).padStart(4, '0')}`;

    // Calcular costo estimado de insumos proporcional a cantidadPlan
    const factor = Number(cantidadPlan) / (bom.cantidadBase || 1);
    let costoTotalInsumos = 0;
    for (const insumo of bom.insumos) {
      const cantReq = insumo.cantidadRequerida * factor * (1 + insumo.mermaEsperadaPct / 100);
      costoTotalInsumos += cantReq * (insumo.producto.costoPromedio || 0);
    }

    const costoTotal = costoTotalInsumos + Number(costoManoObra || 0);

    const nuevaOrden = await prisma.ordenProduccion.create({
      data: {
        tenantId,
        folio,
        listaMaterialesId,
        productoId: bom.productoId,
        almacenOrigenId,
        almacenDestinoId,
        cantidadPlan: Number(cantidadPlan),
        costoTotalInsumos,
        costoManoObra: Number(costoManoObra || 0),
        costoTotal,
        estado: 'PLANIFICADA',
        usuarioId: session.id,
        usuarioNombre: session.nombre,
        observaciones,
      },
      include: {
        producto: true,
        almacenOrigen: true,
        almacenDestino: true,
        listaMateriales: true,
      },
    });

    await prisma.registroAuditoria.create({
      data: {
        tenantId,
        usuarioId: session.id,
        usuarioNombre: session.nombre,
        modulo: 'MRP_PRODUCCION',
        accion: 'CREAR',
        detalles: `Creó Orden de Producción ${folio} para fabricar ${cantidadPlan} pzas de ${bom.productoId}`,
      },
    });

    return NextResponse.json(nuevaOrden, { status: 201 });
  } catch (error) {
    console.error('Error al crear orden de producción:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
