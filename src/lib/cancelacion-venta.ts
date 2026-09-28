import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from './prisma';
import type { UserSession } from './types';
import { VentaError } from './ventas';

export const entradaCancelacion = z.object({ motivo: z.string().trim().min(10).max(500) });
export const entradaEdicionVenta = z.object({ observaciones: z.string().max(2000).nullable().optional(), tipoPago: z.enum(['CONTADO','CREDITO']).optional() });
const scope = (id: string, user: UserSession) => ({ id, ...(user.rol === 'SUPERADMIN' ? {} : { tenantId: user.tenantId ?? '' }) });
const centavos = (n: number) => {
  if (!Number.isFinite(n) || n < 0 || Math.abs(n * 100 - Math.round(n * 100)) > 1e-5) throw new VentaError('Saldos históricos inconsistentes; requieren revisión', 409);
  return Math.round(n * 100);
};
export async function cancelarVenta(id: string, motivo: string, user: UserSession) {
  if (!['SUPERADMIN','ADMIN'].includes(user.rol)) throw new VentaError('Sin permiso para cancelar ventas', 403);
  const scoped = scope(id,user);
  try {
    return await prisma.$transaction(async tx => {
      const actual = await tx.venta.findFirst({ where: scoped, include: { detalles: true } });
      if (!actual) throw new VentaError('Venta no encontrada', 404);
      if (actual.estado === 'CANCELADA') {
        if (actual.motivoCancelacion === motivo) return { venta: actual, repetida: true };
        throw new VentaError('Venta ya cancelada con otro motivo', 409);
      }
      if (actual.estado !== 'COMPLETADA') throw new VentaError('Estado de venta no admite cancelación', 409);
      if (actual.estadoFiscal === 'TIMBRADA' || actual.uuidFiscal || actual.xmlSat || actual.selloDigitalSat)
        throw new VentaError('Venta con documentos fiscales: requiere flujo de cancelación fiscal real', 409);
      if (actual.turnoCajaId || await tx.registroAuditoria.findFirst({ where: { tenantId: actual.tenantId, modulo: 'VENTAS', accion: 'VENTA', detalles: { contains: `${actual.folio}:` } } }).then(a => a?.detalles.includes(', turno ')))
        throw new VentaError('Venta POS: requiere reversa de caja explícita antes de cancelar', 409);
      const claim = await tx.venta.updateMany({ where: { ...scoped, estado: 'COMPLETADA' },
        data: { estado: 'CANCELADA', canceladaEn: new Date(), canceladaPorId: user.id, motivoCancelacion: motivo } });
      if (!claim.count) throw new VentaError('La venta ya cambió; actualice el historial', 409);
      const almacen = await tx.almacen.findFirst({ where: { id: actual.almacenId, tenantId: actual.tenantId } });
      if (!almacen) throw new VentaError('Almacén histórico no disponible para reversa', 409);
      if (actual.tipoPago === 'CREDITO') {
        if (!actual.cxcId) throw new VentaError('Venta a crédito sin CxC asociada; requiere revisión', 409);
        const locked = await tx.cuentaPorCobrar.updateMany({ where: { id: actual.cxcId, tenantId: actual.tenantId }, data: { id: actual.cxcId } });
        if (!locked.count) throw new VentaError('CxC de la venta no disponible', 409);
        const cxc = await tx.cuentaPorCobrar.findUniqueOrThrow({ where: { id: actual.cxcId }, include: { pagos: true } });
        if (cxc.clienteId !== actual.clienteId || cxc.pagos.length || centavos(cxc.saldoPendiente) !== centavos(cxc.montoTotal)
          || !['PENDIENTE','VENCIDA','PARCIAL','PAGADA'].includes(cxc.estado))
          throw new VentaError('La CxC tiene pagos o saldos modificados: requiere devolución/autorización específica', 409);
        const cliente = await tx.cliente.findFirst({ where: { id: actual.clienteId, tenantId: actual.tenantId } });
        if (!cliente || centavos(cliente.saldoActual) < centavos(cxc.montoTotal)) throw new VentaError('Saldo del cliente inconsistente; requiere conciliación', 409);
        const nuevo = (centavos(cliente.saldoActual) - centavos(cxc.montoTotal)) / 100;
        const changed = await tx.cliente.updateMany({ where: { id: cliente.id, tenantId: actual.tenantId,
          saldoActual: cliente.saldoActual }, data: { saldoActual: nuevo } });
        if (!changed.count) throw new VentaError('Saldo de cliente cambió; reintente cancelación', 409);
        await tx.cuentaPorCobrar.update({ where: { id: cxc.id }, data: { saldoPendiente: 0, estado: 'CANCELADA' } });
      } else if (actual.cxcId) throw new VentaError('Venta de contado con CxC asociada; requiere revisión', 409);
      for (const det of [...actual.detalles].sort((a,b) => a.productoId.localeCompare(b.productoId))) {
        if (!Number.isFinite(det.cantidad) || det.cantidad <= 0 || !Number.isFinite(det.costoUnitario) || det.costoUnitario < 0)
          throw new VentaError('Detalle histórico inválido; requiere revisión', 409);
        const producto = await tx.producto.findFirst({ where: { id: det.productoId, tenantId: actual.tenantId } });
        if (!producto) throw new VentaError('Producto histórico no disponible', 409);
        const existencia = await tx.existencia.upsert({ where: { almacenId_productoId: { almacenId: actual.almacenId, productoId: det.productoId } },
          create: { almacenId: actual.almacenId, productoId: det.productoId, cantidad: det.cantidad },
          update: { cantidad: { increment: det.cantidad } } });
        const saldo = new Prisma.Decimal(existencia.cantidad).toDecimalPlaces(6).toNumber();
        await tx.existencia.update({ where: { id: existencia.id }, data: { cantidad: saldo } });
        await tx.movimientoKardex.create({ data: { tenantId: actual.tenantId, almacenId: actual.almacenId, productoId: det.productoId,
          tipoMovimiento: 'ENTRADA_CANCELACION_VENTA', cantidad: det.cantidad, costoUnitario: det.costoUnitario,
          saldoResultante: saldo, folioReferencia: actual.folio, motivo: `Cancelación de ${actual.folio}: ${motivo}` } });
      }
      await tx.registroAuditoria.create({ data: { tenantId: actual.tenantId, usuarioId: user.id, usuarioNombre: user.nombre,
        modulo: 'VENTAS', accion: 'CANCELACION', detalles: `${actual.folio}: ${motivo}. Stock reintegrado; CxC ${actual.cxcId || 'no aplica'} conservada; total original ${actual.total.toFixed(2)}` } });
      const venta = await tx.venta.findUniqueOrThrow({ where: { id }, include: { detalles: true } });
      return { venta, repetida: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (['P2002','P2034','P1008','P2028'].includes((error as { code?: string }).code ?? '')) {
      const actual = await prisma.venta.findFirst({ where: scoped, include: { detalles: true } });
      if (actual?.estado === 'CANCELADA' && actual.motivoCancelacion === motivo) return { venta: actual, repetida: true };
      throw new VentaError('Operación concurrente: recargue y reintente la cancelación', 409);
    }
    throw error;
  }
}
export async function editarObservacionesVenta(id: string, observaciones: string | null, tipoPago: string | undefined, user: UserSession) {
  if (!['SUPERADMIN','ADMIN','ENCARGADO'].includes(user.rol)) throw new VentaError('Sin permiso para editar venta', 403);
  return prisma.$transaction(async tx => {
    const actual = await tx.venta.findFirst({ where: scope(id,user) });
    if (!actual) throw new VentaError('Venta no encontrada', 404);
    if (actual.estado !== 'COMPLETADA') throw new VentaError('Venta cancelada no admite edición', 409);
    if (tipoPago && tipoPago !== actual.tipoPago) throw new VentaError('La condición de pago de una venta emitida no se cambia directamente', 409);
    if (actual.estadoFiscal === 'TIMBRADA' || actual.uuidFiscal) throw new VentaError('Documento fiscal no admite esta edición', 409);
    const nuevo = observaciones?.trim() || null;
    const changed = await tx.venta.updateMany({ where: { ...scope(id,user), estado: 'COMPLETADA',
      observaciones: actual.observaciones }, data: { observaciones: nuevo } });
    if (!changed.count) throw new VentaError('La venta cambió; recargue antes de editar', 409);
    await tx.registroAuditoria.create({ data: { tenantId: actual.tenantId, usuarioId: user.id, usuarioNombre: user.nombre,
      modulo: 'VENTAS', accion: 'MODIFICACION', detalles: `${actual.folio}: observaciones modificadas, valor anterior ${JSON.stringify(actual.observaciones)}, nuevo ${JSON.stringify(nuevo)}` } });
    return tx.venta.findUniqueOrThrow({ where: { id } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
