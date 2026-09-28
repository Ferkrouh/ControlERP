import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from './prisma';
import type { UserSession } from './types';
import { calcularMontosVenta } from './montos-venta';

const identificador = z.string().min(1).max(128);
export const entradaVenta = z.object({
  tenantId: identificador.optional(), clienteId: identificador, almacenId: identificador,
  tipoPago: z.enum(['CONTADO', 'CREDITO']), observaciones: z.string().max(2000).default(''),
  items: z.array(z.object({ productoId: identificador,
    cantidad: z.number().finite().positive().max(1e6).refine(n => new Prisma.Decimal(n).decimalPlaces() <= 6),
    precioUnitario: z.number().finite().nonnegative().max(1e9).refine(n => new Prisma.Decimal(n).decimalPlaces() <= 2),
  })).min(1).max(500),
  pos: z.object({ turnoId: identificador, metodo: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA']),
    recibido: z.number().finite().nonnegative().max(1e12).refine(n => new Prisma.Decimal(n).decimalPlaces() <= 2),
  }).optional(),
});
export type EntradaVenta = z.infer<typeof entradaVenta>;
export class VentaError extends Error {
  constructor(message: string, public status = 400, public conservarSolicitud = false) { super(message); }
}
export function calcularMontos(items: EntradaVenta['items']) {
  try { return calcularMontosVenta(items); }
  catch { throw new VentaError('Los importes exceden el máximo permitido'); }
}

export async function emitirVenta(input: EntradaVenta, clave: string, user: UserSession) {
  if (!['SUPERADMIN', 'ADMIN', 'ENCARGADO'].includes(user.rol)) throw new VentaError('Sin permiso para emitir ventas', 403);
  const tenantId = user.rol === 'SUPERADMIN' ? (input.tenantId || user.tenantId) : user.tenantId;
  if (!tenantId) throw new VentaError('Seleccione una empresa');
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(clave)) throw new VentaError('Idempotency-Key requerido (16 a 128 caracteres)');
  const items = [...input.items].sort((a, b) => a.productoId.localeCompare(b.productoId));
  if (new Set(items.map(it => it.productoId)).size !== items.length) throw new VentaError('Unifique las partidas duplicadas del producto');
  const datos = { ...input, tenantId, items, observaciones: input.observaciones.trim() };
  const hash = createHash('sha256').update(JSON.stringify({ usuarioId: user.id, datos })).digest('hex');
  const whereKey = { tenantId_clave: { tenantId, clave } };
  const replay = (prev: { hashSolicitud: string; respuestaJson: string }) => {
    if (prev.hashSolicitud !== hash) throw new VentaError('La clave de solicitud ya se utilizó con otros datos', 409, true);
    return { venta: JSON.parse(prev.respuestaJson), repetida: true };
  };
  try {
    return await prisma.$transaction(async tx => {
      const previa = await tx.solicitudVenta.findUnique({ where: whereKey });
      if (previa) return replay(previa);
      // La reserva y el resultado se confirman juntos con la venta; nunca queda una solicitud incompleta.
      const solicitud = await tx.solicitudVenta.create({ data: { tenantId, clave, usuarioId: user.id,
        hashSolicitud: hash, respuestaJson: '' } });
      const respuesta = await crearVentaEnTransaccion(tx, datos, tenantId, user);
      await tx.solicitudVenta.update({ where: { id: solicitud.id }, data: { respuestaJson: JSON.stringify(respuesta) } });
      return { venta: respuesta, repetida: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (['P2002', 'P2034', 'P1008', 'P2028'].includes((error as { code?: string }).code || '')) {
      const previa = await prisma.solicitudVenta.findUnique({ where: whereKey });
      if (previa) return replay(previa);
      throw new VentaError('Operación concurrente: reintente con la misma clave de solicitud', 409, true);
    }
    throw error;
  }
}

// Solo para emisores internos que ya validaron las partidas y, en su caso, la propuesta comercial.
export async function crearVentaEnTransaccion(tx: Prisma.TransactionClient, input: EntradaVenta,
  tenantId: string, user: UserSession, importesAprobados?: ReturnType<typeof calcularMontos>) {
  const items = input.items;
  const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant?.activo || tenant.bloqueadoPorSuscripcion) throw new VentaError('Empresa inactiva o bloqueada', 403);
  const almacen = await tx.almacen.findFirst({ where: { id: input.almacenId, tenantId } });
  const cliente = await tx.cliente.findFirst({ where: { id: input.clienteId, tenantId } });
  if (!almacen || !cliente) throw new VentaError('Almacén o cliente ajeno a su empresa', 404);
  const productos = await tx.producto.findMany({ where: { tenantId, id: { in: items.map(it => it.productoId) } } });
  if (productos.length !== items.length) throw new VentaError('Producto no disponible en su empresa', 404);
  const montos = importesAprobados ?? calcularMontos(items);
  const esCredito = input.tipoPago === 'CREDITO';
  let cxcId: string | null = null;
  let advertenciaCredito: string | null = null;
  if (esCredito) {
    if (!tenant.moduloCredito || !tenant.moduloCxC) throw new VentaError('Crédito o cuentas por cobrar deshabilitados', 403);
    if (cliente.estadoCredito !== 'ACTIVO') throw new VentaError('El crédito del cliente no está activo', 409);
    if (![cliente.saldoActual, cliente.limiteCredito].every(n => Number.isFinite(n) && n >= 0)) throw new VentaError('Revise los saldos de crédito del cliente', 409);
    if (!Number.isInteger(cliente.diasCredito) || cliente.diasCredito < 0 || cliente.diasCredito > 3650) throw new VentaError('Revise los días de crédito del cliente', 409);
    const saldo = new Prisma.Decimal(cliente.saldoActual).add(montos.total).toDecimalPlaces(2).toNumber();
    if (tenant.politicaBloqueoCredito === 'ESTRICTO' && saldo > cliente.limiteCredito) throw new VentaError('Límite de crédito excedido', 409);
    if (saldo > cliente.limiteCredito) advertenciaCredito = 'La venta excede el límite de crédito y fue permitida por la política de advertencia.';
    const actualizado = await tx.cliente.updateMany({ where: { id: cliente.id, tenantId,
      saldoActual: cliente.saldoActual, estadoCredito: 'ACTIVO' }, data: { saldoActual: saldo } });
    if (!actualizado.count) throw new VentaError('El crédito cambió; actualice los datos antes de reintentar', 409);
    const cxc = await tx.cuentaPorCobrar.create({ data: { tenantId, clienteId: cliente.id,
      folio: `CXC-${new Date().getFullYear()}-${randomUUID()}`, montoTotal: montos.total, saldoPendiente: montos.total,
      estado: montos.total === 0 ? 'PAGADA' : 'PENDIENTE',
      fechaVencimiento: new Date(Date.now() + cliente.diasCredito * 86400000) } });
    cxcId = cxc.id;
  }
  if (input.pos) {
    if (!tenant.moduloPos || esCredito) throw new VentaError('Operación POS no habilitada', 403);
    if (input.pos.metodo === 'EFECTIVO' && input.pos.recibido < montos.total) throw new VentaError('Efectivo recibido insuficiente');
    const actualizado = await tx.turnoCajaPOS.updateMany({ where: { id: input.pos.turnoId, tenantId,
      almacenId: almacen.id, estado: 'ABIERTO', ...(user.rol === 'ENCARGADO' ? { usuarioId: user.id } : {}) },
      data: { estado: 'ABIERTO' } });
    if (!actualizado.count) throw new VentaError('Turno cerrado, ajeno o de otro almacén/cajero', 409);
    const caja = await tx.turnoCajaPOS.findUniqueOrThrow({ where: { id: input.pos.turnoId } });
    const sumar = (anterior: number, monto: number) => new Prisma.Decimal(anterior).add(monto).toDecimalPlaces(2).toNumber();
    await tx.turnoCajaPOS.update({ where: { id: caja.id }, data: {
      totalVentas: sumar(caja.totalVentas, montos.total),
      totalEfectivo: sumar(caja.totalEfectivo, input.pos.metodo === 'EFECTIVO' ? montos.total : 0),
      totalTarjeta: sumar(caja.totalTarjeta, input.pos.metodo === 'TARJETA' ? montos.total : 0),
      totalTransfer: sumar(caja.totalTransfer, input.pos.metodo === 'TRANSFERENCIA' ? montos.total : 0),
    } });
  }
  const venta = await tx.venta.create({ data: { tenantId, clienteId: cliente.id, almacenId: almacen.id,
    folio: `VTA-${new Date().getFullYear()}-${randomUUID()}`, tipoPago: input.tipoPago,
    subtotal: montos.subtotal, impuestos: montos.impuestos, total: montos.total, cxcId,
    turnoCajaId: input.pos?.turnoId || null,
    usuarioId: user.id, usuarioNombre: user.nombre, observaciones: input.observaciones.trim() || null } });
  for (const [index, item] of items.entries()) {
    const producto = productos.find(p => p.id === item.productoId)!;
    if (!Number.isFinite(producto.costoPromedio) || producto.costoPromedio < 0) throw new VentaError(`Revise el costo de ${producto.nombre}`, 409);
    const salida = await tx.existencia.updateMany({ where: { almacenId: almacen.id, productoId: item.productoId,
      cantidad: { gte: item.cantidad } }, data: { cantidad: { decrement: item.cantidad } } });
    if (!salida.count) throw new VentaError(`Stock insuficiente para ${producto.nombre}`, 409);
    const existencia = await tx.existencia.findUniqueOrThrow({ where: {
      almacenId_productoId: { almacenId: almacen.id, productoId: item.productoId } } });
    // Normalizar después del decremento mientras seguimos teniendo el bloqueo de la fila.
    const saldoStock = new Prisma.Decimal(existencia.cantidad).toDecimalPlaces(6).toNumber();
    await tx.existencia.update({ where: { id: existencia.id }, data: { cantidad: saldoStock } });
    await tx.ventaDetalle.create({ data: { ventaId: venta.id, productoId: item.productoId, cantidad: item.cantidad,
      precioUnitario: item.precioUnitario, costoUnitario: producto.costoPromedio, subtotal: montos.partidas[index] } });
    await tx.movimientoKardex.create({ data: { tenantId, almacenId: almacen.id, productoId: item.productoId,
      tipoMovimiento: 'SALIDA_VENTA', cantidad: item.cantidad, costoUnitario: producto.costoPromedio,
      saldoResultante: saldoStock, folioReferencia: venta.folio, motivo: `Venta a ${cliente.razonSocial}` } });
  }
  await tx.registroAuditoria.create({ data: { tenantId, usuarioId: user.id, usuarioNombre: user.nombre,
    modulo: 'VENTAS', accion: 'VENTA', detalles: `${venta.folio}: ${input.tipoPago}, total ${venta.total.toFixed(2)}${input.pos ? `, turno ${input.pos.turnoId}, ${input.pos.metodo}` : ''}${advertenciaCredito ? ', límite excedido con política ADVERTENCIA' : ''}` } });
  return { ...venta, advertenciaCredito };
}
