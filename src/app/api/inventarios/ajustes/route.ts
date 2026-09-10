import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'ALMACENISTA', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);
    const tenantParam = searchParams.get('tenantId');
    const effectiveTenantId = user.rol === 'SUPERADMIN' ? (tenantParam || undefined) : user.tenantId;

    if (!effectiveTenantId && user.rol !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const where = effectiveTenantId ? { tenantId: effectiveTenantId } : {};

    const ajustes = await prisma.ajusteInventario.findMany({
      where,
      include: {
        almacen: true,
        items: {
          include: { producto: true },
        },
      },
      orderBy: { fecha: 'desc' },
      take: 50,
    });

    return NextResponse.json(ajustes);
  } catch (error) {
    console.error('Error fetching ajustes:', error);
    return NextResponse.json({ error: 'Error al obtener historial de ajustes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Almacenistas, Encargados y Admins pueden registrar ajustes (Auditores solo lectura)
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'ALMACENISTA']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();
    const { almacenId, tipo, motivo, observaciones, items } = body;

    const targetTenantId = user.rol === 'SUPERADMIN' ? (body.tenantId || user.tenantId) : user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    if (!almacenId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Datos de ajuste incompletos. Debe seleccionar almacén y al menos un artículo.' }, { status: 400 });
    }

    // Validar que el almacén pertenezca al tenant
    const almacen = await prisma.almacen.findFirst({
      where: { id: almacenId, tenantId: targetTenantId },
    });
    if (!almacen) {
      return NextResponse.json({ error: 'Almacén no encontrado o no pertenece a su empresa' }, { status: 404 });
    }

    const count = await prisma.ajusteInventario.count({ where: { tenantId: targetTenantId } });
    const folio = `AJU-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Transacción atómica garantizada
    const nuevoAjuste = await prisma.$transaction(async (tx) => {
      const cabeceraAjuste = await tx.ajusteInventario.create({
        data: {
          tenantId: targetTenantId,
          almacenId,
          folio,
          tipo: tipo || 'CONTEO_FISICO',
          motivo: motivo || 'CONTEO_FISICO',
          observaciones: observaciones ? observaciones.trim() : null,
          usuarioId: user.id,
          usuarioNombre: user.nombre,
        },
      });

      for (const item of items) {
        const { productoId, cantidadNueva } = item;
        const nuevoStock = Number(cantidadNueva);

        if (nuevoStock < 0) {
          throw new Error(`La cantidad en existencia no puede ser negativa para el producto seleccionado.`);
        }

        const producto = await tx.producto.findFirst({
          where: { id: productoId, tenantId: targetTenantId },
        });

        if (!producto) {
          throw new Error(`Producto con ID ${productoId} no encontrado en su catálogo.`);
        }

        // Obtener o crear existencia en ese almacén
        let existencia = await tx.existencia.findUnique({
          where: {
            almacenId_productoId: {
              almacenId,
              productoId,
            },
          },
        });

        const stockAnterior = existencia ? existencia.cantidad : 0;
        const diferencia = nuevoStock - stockAnterior;

        if (existencia) {
          await tx.existencia.update({
            where: { id: existencia.id },
            data: { cantidad: nuevoStock },
          });
        } else {
          await tx.existencia.create({
            data: {
              almacenId,
              productoId,
              cantidad: nuevoStock,
            },
          });
        }

        // Crear item de ajuste
        await tx.ajusteInventarioItem.create({
          data: {
            ajusteId: cabeceraAjuste.id,
            productoId,
            cantidadAnterior: stockAnterior,
            cantidadAjustada: diferencia,
            cantidadNueva: nuevoStock,
            costoUnitario: producto.costoPromedio,
          },
        });

        // Determinar tipo de movimiento para el Kárdex
        const tipoKardex = motivo === 'MERMA' || motivo === 'MERMA_CADUCIDAD' || motivo === 'DAÑO_TRANSPORTE'
          ? 'MERMA'
          : 'AJUSTE_INVENTARIO';

        await tx.movimientoKardex.create({
          data: {
            tenantId: targetTenantId,
            almacenId,
            productoId,
            tipoMovimiento: tipoKardex,
            cantidad: Math.abs(diferencia),
            costoUnitario: producto.costoPromedio,
            saldoResultante: nuevoStock,
            folioReferencia: folio,
            motivo: `Ajuste (${motivo}): ${observaciones || 'Conteo físico verificado por ' + user.nombre}`,
          },
        });
      }

      // Registro de Auditoría
      await tx.registroAuditoria.create({
        data: {
          tenantId: targetTenantId,
          usuarioId: user.id,
          usuarioNombre: user.nombre,
          modulo: 'INVENTARIOS',
          accion: 'AJUSTE_STOCK',
          detalles: `Ajuste ${folio} aplicado en ${almacen.nombre}. Motivo: ${motivo}. Artículos ajustados: ${items.length}`,
        },
      });

      return cabeceraAjuste;
    });

    return NextResponse.json(nuevoAjuste, { status: 201 });
  } catch (error: any) {
    console.error('Error creating ajuste de inventario:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar ajuste de inventario' }, { status: 500 });
  }
}
