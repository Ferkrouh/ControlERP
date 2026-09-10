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

    const compras = await prisma.compra.findMany({
      where,
      include: {
        proveedor: true,
        almacen: true,
        detalles: {
          include: { producto: true },
        },
      },
      orderBy: { fecha: 'desc' },
      take: 50,
    });

    return NextResponse.json(compras);
  } catch (error) {
    console.error('Error fetching compras:', error);
    return NextResponse.json({ error: 'Error al obtener historial de compras' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();
    const { proveedorId, almacenId, folioFacturaProv, tipoPago, items, observaciones } = body;

    const targetTenantId = user.rol === 'SUPERADMIN' ? (body.tenantId || user.tenantId) : user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    if (!proveedorId || !almacenId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Datos de compra incompletos. Seleccione proveedor, almacén y al menos un artículo.' }, { status: 400 });
    }

    const proveedor = await prisma.proveedor.findFirst({
      where: { id: proveedorId, tenantId: targetTenantId },
    });
    if (!proveedor) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
    }

    let subtotal = 0;
    for (const item of items) {
      const cant = Number(item.cantidad);
      const costo = Number(item.costoUnitario);
      if (cant <= 0 || costo < 0) {
        return NextResponse.json({ error: 'Cantidad o costo unitario inválido en artículos' }, { status: 400 });
      }
      subtotal += cant * costo;
    }
    const impuestos = Math.round(subtotal * 0.16 * 100) / 100;
    const total = subtotal + impuestos;

    const esCredito = tipoPago === 'CREDITO';
    const count = await prisma.compra.count({ where: { tenantId: targetTenantId } });
    const folioCompra = `COM-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Transacción Atómica Integral
    const compraGenerada = await prisma.$transaction(async (tx) => {
      let cxpGeneradaId: string | null = null;

      // Si es a crédito, registrar la Cuenta por Pagar al proveedor
      if (esCredito) {
        const cxp = await tx.cuentaPorPagar.create({
          data: {
            tenantId: targetTenantId,
            proveedorId,
            folioFactura: folioFacturaProv || `FAC-${folioCompra}`,
            montoTotal: total,
            saldoPendiente: total,
            fechaEmision: new Date(),
            fechaVencimiento: new Date(Date.now() + (proveedor.diasCredito || 30) * 24 * 60 * 60 * 1000),
            estado: 'PENDIENTE',
          },
        });
        cxpGeneradaId = cxp.id;

        await tx.proveedor.update({
          where: { id: proveedorId },
          data: { saldoPendiente: proveedor.saldoPendiente + total },
        });
      }

      // Crear Cabecera de Compra
      const nuevaCompra = await tx.compra.create({
        data: {
          tenantId: targetTenantId,
          proveedorId,
          almacenId,
          folio: folioCompra,
          folioFacturaProv: folioFacturaProv ? folioFacturaProv.trim() : null,
          tipoPago: esCredito ? 'CREDITO' : 'CONTADO',
          subtotal,
          impuestos,
          total,
          estado: 'RECIBIDA',
          cxpId: cxpGeneradaId,
          usuarioId: user.id,
          usuarioNombre: user.nombre,
          observaciones: observaciones ? observaciones.trim() : null,
        },
      });

      // Procesar cada detalle, actualizar costo promedio ponderado, existencias y kárdex
      for (const item of items) {
        const { productoId, cantidad, costoUnitario } = item;
        const cantNumber = Number(cantidad);
        const costoNumber = Number(costoUnitario);

        const producto = await tx.producto.findFirst({
          where: { id: productoId, tenantId: targetTenantId },
          include: { existencias: true },
        });

        if (!producto) {
          throw new Error(`Producto ${productoId} no encontrado.`);
        }

        // 1. Recalcular Costo Promedio Ponderado del producto a nivel global del negocio
        const stockGlobalActual = producto.existencias.reduce((acc, e) => acc + e.cantidad, 0);
        const nuevoStockGlobal = stockGlobalActual + cantNumber;
        const nuevoCostoPromedio = nuevoStockGlobal > 0
          ? Math.round((((stockGlobalActual * producto.costoPromedio) + (cantNumber * costoNumber)) / nuevoStockGlobal) * 100) / 100
          : costoNumber;

        await tx.producto.update({
          where: { id: productoId },
          data: { costoPromedio: nuevoCostoPromedio },
        });

        // 2. Aumentar existencia en el almacén receptor
        let existencia = await tx.existencia.findUnique({
          where: {
            almacenId_productoId: {
              almacenId,
              productoId,
            },
          },
        });

        const stockAnteriorAlm = existencia ? existencia.cantidad : 0;
        const nuevoStockAlm = stockAnteriorAlm + cantNumber;

        if (existencia) {
          await tx.existencia.update({
            where: { id: existencia.id },
            data: { cantidad: nuevoStockAlm },
          });
        } else {
          await tx.existencia.create({
            data: {
              almacenId,
              productoId,
              cantidad: nuevoStockAlm,
            },
          });
        }

        // 3. Crear detalle de compra
        await tx.compraDetalle.create({
          data: {
            compraId: nuevaCompra.id,
            productoId,
            cantidad: cantNumber,
            costoUnitario: costoNumber,
            subtotal: cantNumber * costoNumber,
          },
        });

        // 4. Asentar entrada en Kárdex
        await tx.movimientoKardex.create({
          data: {
            tenantId: targetTenantId,
            almacenId,
            productoId,
            tipoMovimiento: 'ENTRADA_COMPRA',
            cantidad: cantNumber,
            costoUnitario: costoNumber,
            saldoResultante: nuevoStockAlm,
            folioReferencia: folioCompra,
            motivo: `Compra a ${proveedor.razonSocial} (Factura: ${folioFacturaProv || folioCompra})`,
          },
        });
      }

      // Bitácora de Auditoría
      await tx.registroAuditoria.create({
        data: {
          tenantId: targetTenantId,
          usuarioId: user.id,
          usuarioNombre: user.nombre,
          modulo: 'COMPRAS',
          accion: 'COMPRA',
          detalles: `Compra ${folioCompra} registrada de ${proveedor.razonSocial} por $${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}.`,
        },
      });

      return nuevaCompra;
    });

    return NextResponse.json(compraGenerada, { status: 201 });
  } catch (error: any) {
    console.error('Error in /api/compras:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar recepción de compra' }, { status: 500 });
  }
}
