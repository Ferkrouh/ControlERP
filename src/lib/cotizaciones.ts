import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from './prisma';
import type { UserSession } from './types';
import { entradaVenta, crearVentaEnTransaccion, VentaError } from './ventas';
import { calcularMontosVenta } from './montos-venta';

export const versionDocumento = z.string().regex(/^[a-f0-9]{64}$/);
const partida = entradaVenta.shape.items.element.extend({ descuento: z.number().finite().nonnegative().max(1e12)
  .refine(n => new Prisma.Decimal(n).decimalPlaces() <= 2).default(0) });
const items = z.array(partida).min(1).max(500).refine(it => new Set(it.map(p => p.productoId)).size === it.length);
const campos = z.object({ clienteId: z.string().min(1).max(128), vigenciaDias: z.number().int().min(1).max(3650).default(15),
  observaciones: z.string().max(1500).default(''), condicionesPago: z.string().max(2000).default('Contado / Crédito sujeto a aprobación'), items });
export const nuevaCotizacion = campos.extend({ tenantId: z.string().min(1).max(128).optional() });
export const editarCotizacion = campos.partial().extend({ version: versionDocumento });
export const entradaConversion = z.object({ almacenId: z.string().min(1).max(128),
  tipoPago: z.enum(['CONTADO', 'CREDITO']).default('CONTADO'), version: versionDocumento });
type Documento = Prisma.CotizacionGetPayload<{ include: { detalles: true } }>;
const estadosEditables = ['BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA'];
const estadosConvertibles = ['BORRADOR', 'ENVIADA', 'APROBADA'];
const scope = (id: string, user: UserSession) => ({ id, ...(user.rol === 'SUPERADMIN' ? {} : { tenantId: user.tenantId ?? '' }) });
function autorizar(user: UserSession) {
  if (!['SUPERADMIN', 'ADMIN', 'ENCARGADO'].includes(user.rol)) throw new VentaError('Sin permiso para modificar cotizaciones', 403);
}
export function versionCotizacion(c: Documento) {
  return createHash('sha256').update(JSON.stringify({ id: c.id, tenantId: c.tenantId, clienteId: c.clienteId,
    folio: c.folio, estado: c.estado, ventaIdGenerada: c.ventaIdGenerada, fecha: c.fecha.toISOString(),
    fechaVencimiento: c.fechaVencimiento.toISOString(), vigenciaDias: c.vigenciaDias, subtotal: c.subtotal,
    impuestos: c.impuestos, total: c.total, observaciones: c.observaciones, condicionesPago: c.condicionesPago,
    detalles: [...c.detalles].sort((a,b) => a.id.localeCompare(b.id)).map(d => ({ id: d.id, productoId: d.productoId,
      cantidad: d.cantidad, precioUnitario: d.precioUnitario, descuento: d.descuento, subtotal: d.subtotal })) })).digest('hex');
}
export const conVersion = <T extends Documento>(c: T) => ({ ...c, version: versionCotizacion(c) });
function importes(partidas: z.infer<typeof items>) {
  try { return calcularMontosVenta(partidas); }
  catch { throw new VentaError('Revise importes y descuentos de las partidas'); }
}
async function validarReferencias(tx: Prisma.TransactionClient, tenantId: string, clienteId: string, partidas: z.infer<typeof items>) {
  const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant?.activo || tenant.bloqueadoPorSuscripcion || !tenant.moduloCotizaciones) throw new VentaError('Cotizaciones deshabilitadas para esta empresa', 403);
  if (!await tx.cliente.findFirst({ where: { id: clienteId, tenantId } })
    || await tx.producto.count({ where: { tenantId, id: { in: partidas.map(d => d.productoId) } } }) !== partidas.length) {
    throw new VentaError('Cliente o productos ajenos a su empresa', 404);
  }
}
async function bloquear(tx: Prisma.TransactionClient, id: string, version: string, user: UserSession) {
  const claim = await tx.cotizacion.updateMany({ where: { ...scope(id, user), estado: { in: estadosEditables } }, data: { id } });
  if (!claim.count) {
    const existe = await tx.cotizacion.findFirst({ where: scope(id, user) });
    throw new VentaError(existe ? 'La cotización ya fue convertida o no admite modificaciones' : 'Cotización no encontrada', existe ? 409 : 404);
  }
  const c = await tx.cotizacion.findUniqueOrThrow({ where: { id }, include: { detalles: true } });
  if (versionCotizacion(c) !== version) throw new VentaError('La cotización cambió. Recargue y revise la propuesta antes de continuar', 409);
  return c;
}
export async function crearCotizacion(body: z.infer<typeof nuevaCotizacion>, user: UserSession) {
  autorizar(user);
  const tenantId = user.rol === 'SUPERADMIN' ? body.tenantId || user.tenantId : user.tenantId;
  if (!tenantId) throw new VentaError('Seleccione una empresa');
  return prisma.$transaction(async tx => {
    await validarReferencias(tx, tenantId, body.clienteId, body.items);
    const montos = importes(body.items);
    const c = await tx.cotizacion.create({ data: { tenantId, clienteId: body.clienteId,
      folio: `COT-${new Date().getFullYear()}-${randomUUID()}`, vigenciaDias: body.vigenciaDias,
      fechaVencimiento: new Date(Date.now() + body.vigenciaDias * 86400000), subtotal: montos.subtotal,
      impuestos: montos.impuestos, total: montos.total, usuarioId: user.id, usuarioNombre: user.nombre,
      observaciones: body.observaciones.trim() || null, condicionesPago: body.condicionesPago.trim(),
      detalles: { create: body.items.map((it,index) => ({ ...it, subtotal: montos.partidas[index] })) } },
      include: { cliente: true, detalles: { include: { producto: true } } } });
    await tx.registroAuditoria.create({ data: { tenantId, usuarioId: user.id, usuarioNombre: user.nombre,
      modulo: 'COTIZACIONES', accion: 'CREAR', detalles: `${c.folio}: total ${c.total.toFixed(2)}, versión ${versionCotizacion(c)}` } });
    return conVersion(c);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
export async function modificarCotizacion(id: string, body: z.infer<typeof editarCotizacion>, user: UserSession) {
  autorizar(user);
  return prisma.$transaction(async tx => {
    const c = await bloquear(tx, id, body.version, user);
    const partidas = body.items ?? items.parse(c.detalles);
    await validarReferencias(tx, c.tenantId, body.clienteId ?? c.clienteId, partidas);
    const montos = body.items ? importes(partidas) : null;
    if (body.items) {
      await tx.cotizacionDetalle.deleteMany({ where: { cotizacionId: id } });
      await tx.cotizacionDetalle.createMany({ data: partidas.map((it,index) => ({ ...it, cotizacionId: id, subtotal: montos!.partidas[index] })) });
    }
    const actualizado = await tx.cotizacion.update({ where: { id }, data: { estado: 'BORRADOR',
      clienteId: body.clienteId ?? c.clienteId, vigenciaDias: body.vigenciaDias ?? c.vigenciaDias,
      fechaVencimiento: body.vigenciaDias === undefined ? c.fechaVencimiento : new Date(c.fecha.getTime() + body.vigenciaDias * 86400000),
      observaciones: body.observaciones === undefined ? c.observaciones : body.observaciones.trim() || null,
      condicionesPago: body.condicionesPago === undefined ? c.condicionesPago : body.condicionesPago.trim(),
      ...(montos ? { subtotal: montos.subtotal, impuestos: montos.impuestos, total: montos.total } : {}) },
      include: { cliente: true, detalles: { include: { producto: true } } } });
    await tx.registroAuditoria.create({ data: { tenantId: c.tenantId, usuarioId: user.id, usuarioNombre: user.nombre,
      modulo: 'COTIZACIONES', accion: 'MODIFICAR', detalles: `${c.folio}: versión ${body.version} -> ${versionCotizacion(actualizado)}, estado BORRADOR` } });
    return conVersion(actualizado);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
export async function eliminarCotizacion(id: string, version: string, user: UserSession) {
  autorizar(user);
  return prisma.$transaction(async tx => {
    const c = await bloquear(tx, id, version, user);
    await tx.cotizacion.delete({ where: { id } });
    await tx.registroAuditoria.create({ data: { tenantId: c.tenantId, usuarioId: user.id, usuarioNombre: user.nombre,
      modulo: 'COTIZACIONES', accion: 'ELIMINAR', detalles: `${c.folio}: total ${c.total.toFixed(2)}, versión ${version}` } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
export async function convertirCotizacion(id: string, body: z.infer<typeof entradaConversion>, user: UserSession) {
  autorizar(user);
  const local = await prisma.cotizacion.findFirst({ where: scope(id, user), select: { tenantId: true } });
  if (!local) throw new VentaError('Cotización no encontrada', 404);
  const clave = 'COT_' + createHash('sha256').update(id).digest('hex');
  const key = { tenantId_clave: { tenantId: local.tenantId, clave } };
  const hash = createHash('sha256').update(JSON.stringify({ id, ...body })).digest('hex');
  const replay = (prev: { hashSolicitud: string; respuestaJson: string }) => {
    if (prev.hashSolicitud !== hash) throw new VentaError('La cotización ya se convirtió con otra versión, almacén o condición de pago', 409);
    return { venta: JSON.parse(prev.respuestaJson), repetida: true };
  };
  try {
    return await prisma.$transaction(async tx => {
      const previa = await tx.solicitudVenta.findUnique({ where: key });
      if (previa) return replay(previa);
      const c = await bloquear(tx, id, body.version, user);
      if (!estadosConvertibles.includes(c.estado)) throw new VentaError('Una cotización rechazada no puede convertirse a venta', 409);
      if (c.fechaVencimiento.getTime() <= Date.now()) throw new VentaError('Cotización vencida: renueve y revise la propuesta antes de convertir', 409);
      const ordenados = [...c.detalles].sort((a,b) => a.productoId.localeCompare(b.productoId));
      const parsed = items.safeParse(ordenados);
      if (!parsed.success) throw new VentaError('Revise las partidas históricas de la cotización', 409);
      await validarReferencias(tx, c.tenantId, c.clienteId, parsed.data);
      const montos = importes(parsed.data);
      const mismo = (a: number, b: number) => Number.isFinite(a) && Math.abs(a - b) < 0.0000001;
      if (!mismo(c.subtotal, montos.subtotal) || !mismo(c.impuestos, montos.impuestos) || !mismo(c.total, montos.total)
        || ordenados.some((d,i) => !mismo(d.subtotal, montos.partidas[i]))) {
        throw new VentaError('Los importes históricos no coinciden. Edite y revise la cotización antes de convertir', 409);
      }
      await tx.cotizacion.update({ where: { id }, data: { estado: 'CONVERTIDA' } });
      const solicitud = await tx.solicitudVenta.create({ data: { tenantId: c.tenantId, clave, usuarioId: user.id, hashSolicitud: hash, respuestaJson: '' } });
      const venta = await crearVentaEnTransaccion(tx, { tenantId: c.tenantId, clienteId: c.clienteId,
        almacenId: body.almacenId, tipoPago: body.tipoPago, items: parsed.data,
        observaciones: `Origen: cotización ${c.folio} (${c.id}). ${c.observaciones || ''}` }, c.tenantId, user, montos);
      await tx.cotizacion.update({ where: { id }, data: { ventaIdGenerada: venta.id } });
      await tx.solicitudVenta.update({ where: { id: solicitud.id }, data: { respuestaJson: JSON.stringify(venta) } });
      await tx.registroAuditoria.create({ data: { tenantId: c.tenantId, usuarioId: user.id, usuarioNombre: user.nombre,
        modulo: 'COTIZACIONES', accion: 'CONVERTIR', detalles: `${c.folio} -> ${venta.folio}, versión ${body.version}, total ${venta.total.toFixed(2)}` } });
      return { venta, repetida: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (['P2002', 'P2034', 'P1008', 'P2028'].includes((error as { code?: string }).code ?? '')) {
      const previa = await prisma.solicitudVenta.findUnique({ where: key });
      if (previa) return replay(previa);
      throw new VentaError('Operación concurrente: actualice y reintente la conversión', 409, true);
    }
    throw error;
  }
}
