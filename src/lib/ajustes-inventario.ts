import { Prisma } from '@prisma/client';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { prisma } from './prisma';
import type { UserSession } from './types';
import { VentaError } from './ventas';

const id = z.string().min(1).max(128);
const cantidad = z.number().finite().nonnegative().max(1e9).refine(n => new Prisma.Decimal(n).decimalPlaces() <= 6);
const tipo = z.enum(['CONTEO_FISICO','AJUSTE_POSITIVO','AJUSTE_NEGATIVO','MERMA','INVENTARIO_INICIAL']);
const motivo = z.enum(['CONTEO_FISICO','CORRECCION_SISTEMA','MERMA','MERMA_CADUCIDAD','DAÑO_TRANSPORTE','INVENTARIO_INICIAL']);
export const entradaPrevisualizacion = z.object({ accion: z.literal('PREVISUALIZAR'), tenantId: id.optional(), almacenId: id,
  tipo, motivo, observaciones: z.string().trim().min(10).max(1000),
  items: z.array(z.object({ productoId: id, cantidadNueva: cantidad })).min(1).max(1000)
    .refine(rows => new Set(rows.map(r => r.productoId)).size === rows.length) });
export const entradaConfirmacion = z.object({ accion: z.literal('CONFIRMAR'), token: z.string().min(30).max(200000) });
type PreviewInput = z.infer<typeof entradaPrevisualizacion>;
type Partida = { productoId: string; cantidadAnterior: number; cantidadNueva: number; diferencia: number };
type Corte = { tenantId: string; usuarioId: string; almacenId: string; tipo: z.infer<typeof tipo>;
  motivo: z.infer<typeof motivo>; observaciones: string; items: Partida[]; vence: number };
const secreto = () => { if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET requerido'); return process.env.JWT_SECRET; };
function codificar(c: Corte) {
  const payload = Buffer.from(JSON.stringify(c)).toString('base64url');
  const firma = createHmac('sha256', secreto()).update(payload).digest('base64url');
  return `${payload}.${firma}`;
}
function verificar(token: string): Corte {
  const [payload, firma, ...extra] = token.split('.');
  if (!payload || !firma || extra.length || !/^[A-Za-z0-9_-]+$/.test(payload)) throw new VentaError('Previsualización inválida');
  const esperada = createHmac('sha256', secreto()).update(payload).digest();
  let recibida: Buffer;
  try { recibida = Buffer.from(firma, 'base64url'); } catch { throw new VentaError('Previsualización inválida'); }
  if (firma !== recibida.toString('base64url') || recibida.length !== esperada.length || !timingSafeEqual(recibida, esperada)) throw new VentaError('Previsualización alterada');
  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Corte;
  if (!parsed.tenantId || !parsed.almacenId || !parsed.usuarioId || !Array.isArray(parsed.items)) throw new VentaError('Previsualización inválida');
  return parsed;
}
function autorizar(user: UserSession, inicial: boolean) {
  if (!['SUPERADMIN','ADMIN','ALMACENISTA'].includes(user.rol) || inicial && !['SUPERADMIN','ADMIN'].includes(user.rol))
    throw new VentaError('Sin permiso para ajustar inventario', 403);
}
const scopeTenant = (tenantId: string, user: UserSession) => {
  if (user.rol !== 'SUPERADMIN' && user.tenantId !== tenantId) throw new VentaError('Empresa no autorizada', 404);
};
async function validarAlmacen(tx: Prisma.TransactionClient, c: Corte | { tenantId: string; almacenId: string; tipo: string }, user: UserSession) {
  const tenant = await tx.tenant.findUnique({ where: { id: c.tenantId } });
  const almacen = await tx.almacen.findFirst({ where: { id: c.almacenId, tenantId: c.tenantId } });
  if (!tenant?.activo || tenant.bloqueadoPorSuscripcion) throw new VentaError('Inventario no habilitado', 403);
  if (!almacen) throw new VentaError('Almacén no encontrado en la empresa', 404);
  if (user.rol === 'ALMACENISTA' && user.almacenAsignadoId !== c.almacenId)
    throw new VentaError('Almacén no asignado', 403);
  if (c.tipo === 'INVENTARIO_INICIAL') {
    const movimientos = await tx.movimientoKardex.count({ where: { tenantId: c.tenantId, almacenId: c.almacenId } });
    const existencias = await tx.existencia.count({ where: { almacenId: c.almacenId, cantidad: { not: 0 } } });
    const cortes = await tx.ajusteInventario.count({ where: { tenantId: c.tenantId, almacenId: c.almacenId, tipo: 'INVENTARIO_INICIAL' } });
    if (movimientos || existencias || cortes) throw new VentaError('El almacén ya tiene movimientos o stock; no admite inventario inicial', 409);
  }
  return almacen;
}
export async function previsualizarAjuste(body: PreviewInput, user: UserSession) {
  autorizar(user, body.tipo === 'INVENTARIO_INICIAL');
  const tenantId = user.rol === 'SUPERADMIN' ? body.tenantId || user.tenantId : user.tenantId;
  if (!tenantId) throw new VentaError('Seleccione una empresa');
  if (body.tipo === 'INVENTARIO_INICIAL' && body.motivo !== 'INVENTARIO_INICIAL'
    || body.tipo !== 'INVENTARIO_INICIAL' && body.motivo === 'INVENTARIO_INICIAL') throw new VentaError('Motivo incompatible con corte inicial');
  return prisma.$transaction(async tx => {
    await validarAlmacen(tx, { tenantId, almacenId: body.almacenId, tipo: body.tipo }, user);
    const rows = [...body.items].sort((a,b) => a.productoId.localeCompare(b.productoId));
    const productos = await tx.producto.findMany({ where: { tenantId, id: { in: rows.map(r => r.productoId) } } });
    if (productos.length !== rows.length) throw new VentaError('Producto ajeno a la empresa', 404);
    const actuales = await tx.existencia.findMany({ where: { almacenId: body.almacenId, productoId: { in: rows.map(r => r.productoId) } } });
    const items = rows.map(r => {
      const anterior = actuales.find(e => e.productoId === r.productoId)?.cantidad ?? 0;
      if (!Number.isFinite(anterior) || anterior < 0) throw new VentaError('Existencia histórica inválida', 409);
      const diferencia = new Prisma.Decimal(r.cantidadNueva).sub(anterior).toDecimalPlaces(6).toNumber();
      if (body.tipo === 'AJUSTE_POSITIVO' && diferencia <= 0 || ['AJUSTE_NEGATIVO','MERMA'].includes(body.tipo) && diferencia >= 0)
        throw new VentaError('El sentido de la diferencia no coincide con el tipo de ajuste');
      return { productoId: r.productoId, cantidadAnterior: anterior, cantidadNueva: r.cantidadNueva, diferencia };
    });
    const corte: Corte = { tenantId, usuarioId: user.id, almacenId: body.almacenId, tipo: body.tipo,
      motivo: body.motivo, observaciones: body.observaciones, items, vence: Date.now() + 15 * 60_000 };
    return { token: codificar(corte), partidas: items, vence: new Date(corte.vence).toISOString() };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
export async function confirmarAjuste(token: string, clave: string, user: UserSession) {
  const c = verificar(token);
  autorizar(user, c.tipo === 'INVENTARIO_INICIAL'); scopeTenant(c.tenantId,user);
  if (c.usuarioId !== user.id) throw new VentaError('Previsualización de otro usuario', 403);
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(clave)) throw new VentaError('Idempotency-Key requerido (16 a 128 caracteres)');
  const hash = createHash('sha256').update(token).digest('hex');
  const key = { tenantId_clave: { tenantId: c.tenantId, clave } };
  const replay = (p: { hashSolicitud: string; respuestaJson: string }) => {
    if (p.hashSolicitud !== hash) throw new VentaError('Clave usada para otro corte', 409);
    return { ajuste: JSON.parse(p.respuestaJson), repetida: true };
  };
  try {
    return await prisma.$transaction(async tx => {
      const previa = await tx.solicitudInventario.findUnique({ where: key }); if (previa) return replay(previa);
      if (c.vence < Date.now()) throw new VentaError('Previsualización vencida; obtenga otra');
      const almacen = await validarAlmacen(tx, c, user);
      const productos = await tx.producto.findMany({ where: { tenantId: c.tenantId, id: { in: c.items.map(i => i.productoId) } } });
      if (productos.length !== c.items.length) throw new VentaError('Producto ya no disponible', 409);
      const reserva = await tx.solicitudInventario.create({ data: { tenantId: c.tenantId, clave, usuarioId: user.id, hashSolicitud: hash, respuestaJson: '' } });
      const folio = `AJU-${new Date().getFullYear()}-${randomUUID()}`;
      const ajuste = await tx.ajusteInventario.create({ data: { tenantId: c.tenantId, almacenId: c.almacenId, folio,
        tipo: c.tipo, motivo: c.motivo, observaciones: c.observaciones, usuarioId: user.id, usuarioNombre: user.nombre } });
      for (const item of c.items) {
        const producto = productos.find(p => p.id === item.productoId)!;
        const keyStock = { almacenId_productoId: { almacenId: c.almacenId, productoId: item.productoId } };
        let actualizado;
        if (item.cantidadAnterior === 0) {
          const cambio = await tx.existencia.updateMany({ where: { almacenId: c.almacenId, productoId: item.productoId, cantidad: 0 },
            data: { cantidad: item.cantidadNueva } });
          if (cambio.count) actualizado = await tx.existencia.findUniqueOrThrow({ where: keyStock });
          else {
            const existe = await tx.existencia.findUnique({ where: keyStock });
            if (existe) throw new VentaError('Stock cambió desde la previsualización', 409);
            actualizado = await tx.existencia.create({ data: { almacenId: c.almacenId, productoId: item.productoId, cantidad: item.cantidadNueva } });
          }
        } else {
          const cambio = await tx.existencia.updateMany({ where: { almacenId: c.almacenId, productoId: item.productoId,
            cantidad: item.cantidadAnterior }, data: { cantidad: item.cantidadNueva } });
          if (!cambio.count) throw new VentaError('Stock cambió desde la previsualización', 409);
          actualizado = await tx.existencia.findUniqueOrThrow({ where: keyStock });
        }
        await tx.ajusteInventarioItem.create({ data: { ajusteId: ajuste.id, productoId: item.productoId,
          cantidadAnterior: item.cantidadAnterior, cantidadAjustada: item.diferencia, cantidadNueva: item.cantidadNueva,
          costoUnitario: producto.costoPromedio } });
        if (item.diferencia !== 0) await tx.movimientoKardex.create({ data: { tenantId: c.tenantId, almacenId: c.almacenId,
          productoId: item.productoId, tipoMovimiento: c.tipo === 'INVENTARIO_INICIAL' ? 'INVENTARIO_INICIAL' : c.tipo === 'MERMA' ? 'MERMA' : 'AJUSTE_INVENTARIO',
          cantidad: Math.abs(item.diferencia), costoUnitario: producto.costoPromedio,
          saldoResultante: actualizado.cantidad, folioReferencia: folio, motivo: `${c.motivo}: ${c.observaciones}` } });
      }
      await tx.registroAuditoria.create({ data: { tenantId: c.tenantId, usuarioId: user.id, usuarioNombre: user.nombre,
        modulo: 'INVENTARIOS', accion: c.tipo === 'INVENTARIO_INICIAL' ? 'CORTE_INICIAL' : 'AJUSTE_STOCK',
        detalles: `${folio} en ${almacen.nombre}: ${c.items.length} partidas; ${c.motivo}; solicitud ${clave}` } });
      const completo = await tx.ajusteInventario.findUniqueOrThrow({ where: { id: ajuste.id }, include: { items: true } });
      await tx.solicitudInventario.update({ where: { id: reserva.id }, data: { respuestaJson: JSON.stringify(completo) } });
      return { ajuste: completo, repetida: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (['P2002','P2034','P1008','P2028'].includes((error as { code?: string }).code ?? '')) {
      const previa = await prisma.solicitudInventario.findUnique({ where: key }); if (previa) return replay(previa);
      throw new VentaError('Operación concurrente: previsualice nuevamente y reintente', 409);
    }
    throw error;
  }
}
