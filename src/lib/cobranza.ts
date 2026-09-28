import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from './prisma';
import type { UserSession } from './types';
import { VentaError } from './ventas';

const monto = z.number().finite().positive().max(1e12).refine(n => new Prisma.Decimal(n).decimalPlaces() <= 2);
export const entradaAbono = z.object({ monto, metodo: z.enum(['TRANSFERENCIA', 'EFECTIVO', 'CHEQUE', 'TARJETA']).default('TRANSFERENCIA'),
  referencia: z.string().max(300).default(''), timbrarRep: z.boolean().default(false) });
export const entradaCargo = z.object({ clienteId: z.string().min(1).max(128), montoTotal: monto,
  diasCredito: z.number().int().min(0).max(3650).optional(), tenantId: z.string().min(1).max(128).optional() });
function centavos(n: number) {
  if (!Number.isFinite(n) || n < 0 || n > 1e12 || Math.abs(n - Math.round(n * 100) / 100) > 1e-7)
    throw new VentaError('Los saldos históricos requieren revisión antes de operar', 409);
  return Math.round(n * 100);
}
async function solicitud<T>(tenantId: string, clave: string, contenido: unknown, user: UserSession,
  operar: (tx: Prisma.TransactionClient) => Promise<T>) {
  if (!['SUPERADMIN', 'ADMIN', 'ENCARGADO'].includes(user.rol)) throw new VentaError('Sin permiso para registrar cobranza', 403);
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(clave)) throw new VentaError('Idempotency-Key requerido (16 a 128 caracteres)');
  const hash = createHash('sha256').update(JSON.stringify({ usuarioId: user.id, contenido })).digest('hex');
  const where = { tenantId_clave: { tenantId, clave } };
  const replay = (p: { hashSolicitud: string; respuestaJson: string }) => {
    if (p.hashSolicitud !== hash) throw new VentaError('La clave ya se utilizó con otros datos; recupere la solicitud original', 409, true);
    return { resultado: JSON.parse(p.respuestaJson) as T, repetida: true };
  };
  try {
    return await prisma.$transaction(async tx => {
      const previa = await tx.solicitudCobranza.findUnique({ where }); if (previa) return replay(previa);
      const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant?.activo || tenant.bloqueadoPorSuscripcion || !tenant.moduloCxC) throw new VentaError('Cobranza deshabilitada para esta empresa', 403);
      const reserva = await tx.solicitudCobranza.create({ data: { tenantId, clave, usuarioId: user.id, hashSolicitud: hash, respuestaJson: '' } });
      const resultado = await operar(tx);
      await tx.solicitudCobranza.update({ where: { id: reserva.id }, data: { respuestaJson: JSON.stringify(resultado) } });
      return { resultado, repetida: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (['P2002','P2034','P1008','P2028'].includes((error as { code?: string }).code ?? '')) {
      const previa = await prisma.solicitudCobranza.findUnique({ where }); if (previa) return replay(previa);
      throw new VentaError('Operación concurrente: reintente con la misma clave y datos', 409, true);
    }
    throw error;
  }
}
export async function registrarAbono(id: string, body: z.infer<typeof entradaAbono>, clave: string, user: UserSession) {
  if (body.timbrarRep) throw new VentaError('REP fiscal deshabilitado en el piloto sin PAC', 409);
  const where = { id, ...(user.rol === 'SUPERADMIN' ? {} : { tenantId: user.tenantId ?? '' }) };
  const local = await prisma.cuentaPorCobrar.findFirst({ where, select: { tenantId: true } });
  if (!local) throw new VentaError('Documento CxC no encontrado', 404);
  const datos = { ...body, referencia: body.referencia.trim() };
  return solicitud(local.tenantId, clave, { tipo: 'ABONO', id, ...datos }, user, async tx => {
    const lock = await tx.cuentaPorCobrar.updateMany({ where, data: { id } });
    if (!lock.count) throw new VentaError('Documento CxC no encontrado', 404);
    const cxc = await tx.cuentaPorCobrar.findUniqueOrThrow({ where: { id }, include: { cliente: true, pagos: true } });
    if (cxc.cliente.tenantId !== cxc.tenantId) throw new VentaError('Referencias de cartera inconsistentes', 409);
    if (!['PENDIENTE','PARCIAL','VENCIDA'].includes(cxc.estado)) throw new VentaError('El documento no admite abonos', 409);
    const anterior = centavos(cxc.saldoPendiente), importe = centavos(body.monto), total = centavos(cxc.montoTotal);
    const pagado = cxc.pagos.reduce((sum,p) => sum + centavos(p.monto), 0);
    if (pagado + anterior !== total) throw new VentaError('El historial de pagos no concilia con el documento; requiere revisión', 409);
    if (importe > anterior) throw new VentaError('El abono excede el saldo pendiente', 409);
    const saldoCliente = centavos(cxc.cliente.saldoActual);
    if (importe > saldoCliente) throw new VentaError('El saldo del cliente requiere conciliación', 409);
    const nuevoSaldoPendiente = (anterior - importe) / 100, nuevoSaldoCliente = (saldoCliente - importe) / 100;
    const changed = await tx.cliente.updateMany({ where: { id: cxc.clienteId, tenantId: cxc.tenantId,
      saldoActual: cxc.cliente.saldoActual }, data: { saldoActual: nuevoSaldoCliente } });
    if (!changed.count) throw new VentaError('El saldo del cliente cambió; reintente la solicitud', 409, true);
    const pago = await tx.pagoCxC.create({ data: { cxcId: id, monto: body.monto, metodo: body.metodo, referencia: datos.referencia || null } });
    await tx.cuentaPorCobrar.update({ where: { id }, data: { saldoPendiente: nuevoSaldoPendiente, estado: nuevoSaldoPendiente === 0 ? 'PAGADA' : 'PARCIAL' } });
    await tx.registroAuditoria.create({ data: { tenantId: cxc.tenantId, usuarioId: user.id, usuarioNombre: user.nombre,
      modulo: 'CXC', accion: 'ABONO', detalles: `${cxc.folio}: pago ${pago.id}, ${body.metodo}, monto ${body.monto.toFixed(2)}, saldo ${nuevoSaldoPendiente.toFixed(2)}, cliente ${nuevoSaldoCliente.toFixed(2)}, crédito ${cxc.cliente.estadoCredito} conservado; solicitud ${clave}` } });
    return { success: true, pago, saldoAnterior: anterior / 100, nuevoSaldoPendiente, nuevoSaldoCliente, repTimbrado: false };
  });
}
export async function registrarCargo(body: z.infer<typeof entradaCargo>, clave: string, user: UserSession) {
  const tenantId = user.rol === 'SUPERADMIN' ? body.tenantId || user.tenantId : user.tenantId;
  if (!tenantId) throw new VentaError('Seleccione una empresa');
  return solicitud(tenantId, clave, { tipo: 'CARGO', ...body, tenantId }, user, async tx => {
    const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    if (!tenant.moduloCredito) throw new VentaError('Crédito deshabilitado', 403);
    const cliente = await tx.cliente.findFirst({ where: { id: body.clienteId, tenantId } });
    if (!cliente) throw new VentaError('Cliente no encontrado', 404);
    if (cliente.estadoCredito !== 'ACTIVO') throw new VentaError('Crédito del cliente no activo', 409);
    const nuevoSaldo = (centavos(cliente.saldoActual) + centavos(body.montoTotal)) / 100;
    const limite = centavos(cliente.limiteCredito) / 100;
    if (nuevoSaldo > 1e12) throw new VentaError('Saldo máximo excedido');
    if (tenant.politicaBloqueoCredito === 'ESTRICTO' && nuevoSaldo > limite) throw new VentaError('Límite de crédito excedido', 409);
    const dias = body.diasCredito ?? cliente.diasCredito;
    if (!Number.isInteger(dias) || dias < 0 || dias > 3650) throw new VentaError('Revise los días de crédito del cliente', 409);
    const changed = await tx.cliente.updateMany({ where: { id: cliente.id, tenantId, saldoActual: cliente.saldoActual, estadoCredito: 'ACTIVO' }, data: { saldoActual: nuevoSaldo } });
    if (!changed.count) throw new VentaError('Crédito modificado; reintente la misma solicitud', 409, true);
    const cxc = await tx.cuentaPorCobrar.create({ data: { tenantId, clienteId: cliente.id,
      folio: `CXC-${new Date().getFullYear()}-${randomUUID()}`, montoTotal: body.montoTotal, saldoPendiente: body.montoTotal,
      fechaVencimiento: new Date(Date.now() + dias * 86400000) } });
    await tx.registroAuditoria.create({ data: { tenantId, usuarioId: user.id, usuarioNombre: user.nombre,
      modulo: 'CXC', accion: 'CARGO', detalles: `${cxc.folio}: monto ${body.montoTotal.toFixed(2)}, saldo cliente ${nuevoSaldo.toFixed(2)}${nuevoSaldo > limite ? ', límite excedido permitido por ADVERTENCIA' : ''}; solicitud ${clave}` } });
    return cxc;
  });
}
