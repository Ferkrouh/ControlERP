import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { UserSession } from './types';

export class TraspasoError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

// Las cantidades de recepción son TOTALES acumulados, no incrementos.
export async function operarTraspaso(id: string, accion: 'despachar' | 'recibir',
  recepciones: Record<string, number> | undefined, user: UserSession) {
  return prisma.$transaction(async (tx) => {
    const scope = { id, ...(user.rol === 'SUPERADMIN' ? {} : { tenantId: user.tenantId ?? '' }) };
    const actual = await tx.traspaso.findFirst({ where: scope });
    if (!actual) throw new TraspasoError('Traspaso no encontrado', 404);
    const almacenOperado = accion === 'despachar' ? actual.almacenOrigenId : actual.almacenDestinoId;
    if (user.rol === 'ALMACENISTA' && user.almacenAsignadoId !== almacenOperado) {
      throw new TraspasoError('Solo puede operar su almacén asignado', 403);
    }
    const esperado = accion === 'despachar' ? 'SOLICITADO' : 'DESPACHADO';
    // La escritura condicional bloquea la cabecera antes de leer partidas/stock.
    const claim = await tx.traspaso.updateMany({ where: { ...scope, estado: esperado },
      data: accion === 'despachar' ? { estado: 'DESPACHADO', fechaEnvio: new Date() } : { estado: 'DESPACHADO' } });
    if (!claim.count) throw new TraspasoError(`El traspaso debe estar ${esperado}; actualice el listado antes de continuar`, 409);
    const traspaso = await tx.traspaso.findUniqueOrThrow({ where: { id },
      include: { items: { include: { producto: true }, orderBy: { productoId: 'asc' } } } });
    if (!traspaso.items.length) throw new TraspasoError('El traspaso no tiene partidas válidas', 409);
    const almacenes = await tx.almacen.count({ where: { tenantId: traspaso.tenantId,
      id: { in: [traspaso.almacenOrigenId, traspaso.almacenDestinoId] } } });
    if (almacenes !== 2 || traspaso.items.some(it => it.producto.tenantId !== traspaso.tenantId
      || !Number.isFinite(it.cantidadEnviada) || it.cantidadEnviada <= 0)) {
      throw new TraspasoError('El traspaso contiene referencias o cantidades inválidas', 409);
    }
    if (accion === 'recibir' && (!recepciones || Object.keys(recepciones).length !== traspaso.items.length
      || Object.keys(recepciones).some(key => !traspaso.items.some(it => it.id === key)))) {
      throw new TraspasoError('Confirme explícitamente todas las partidas de la recepción');
    }
    let completa = true;
    let huboMovimiento = false;
    for (const item of traspaso.items) {
      const recibidaAnterior = item.cantidadRecibida ?? 0;
      if (!Number.isFinite(recibidaAnterior) || recibidaAnterior < 0 || recibidaAnterior > item.cantidadEnviada) {
        throw new TraspasoError('La partida tiene cantidades históricas inconsistentes; solicite revisión del administrador', 409);
      }
      const acumulado = accion === 'recibir' ? recepciones![item.id] : 0;
      if (accion === 'recibir' && (!Number.isFinite(acumulado) || acumulado < recibidaAnterior || acumulado > item.cantidadEnviada)) {
        throw new TraspasoError(`La recepción de ${item.producto.nombre} debe estar entre ${recibidaAnterior} y ${item.cantidadEnviada}`);
      }
      completa = completa && acumulado === item.cantidadEnviada;
      const cantidad = accion === 'despachar' ? item.cantidadEnviada : acumulado - recibidaAnterior;
      if (cantidad === 0) continue;
      huboMovimiento = true;
      let saldo: number;
      if (accion === 'despachar') {
        const salida = await tx.existencia.updateMany({ where: { almacenId: almacenOperado,
          productoId: item.productoId, cantidad: { gte: cantidad } }, data: { cantidad: { decrement: cantidad } } });
        if (!salida.count) throw new TraspasoError(`Stock insuficiente para ${item.producto.nombre}`, 409);
        saldo = (await tx.existencia.findUniqueOrThrow({ where: {
          almacenId_productoId: { almacenId: almacenOperado, productoId: item.productoId } } })).cantidad;
      } else {
        const existencia = await tx.existencia.upsert({ where: {
          almacenId_productoId: { almacenId: almacenOperado, productoId: item.productoId } },
          create: { almacenId: almacenOperado, productoId: item.productoId, cantidad },
          update: { cantidad: { increment: cantidad } } });
        saldo = existencia.cantidad;
        await tx.traspasoItem.update({ where: { id: item.id }, data: { cantidadRecibida: acumulado } });
      }
      await tx.movimientoKardex.create({ data: { tenantId: traspaso.tenantId, almacenId: almacenOperado,
        productoId: item.productoId, tipoMovimiento: accion === 'despachar' ? 'TRASPASO_SALIDA' : 'TRASPASO_ENTRADA',
        cantidad, costoUnitario: item.producto.costoPromedio, saldoResultante: saldo,
        folioReferencia: traspaso.folio, motivo: `${accion} por ${user.nombre}` } });
    }
    if (accion === 'recibir' && completa) {
      await tx.traspaso.update({ where: { id }, data: { estado: 'RECIBIDO', fechaRecepcion: new Date() } });
    }
    if (huboMovimiento) await tx.registroAuditoria.create({ data: { tenantId: traspaso.tenantId,
      usuarioId: user.id, usuarioNombre: user.nombre, modulo: 'TRASPASOS', accion: accion.toUpperCase(),
      detalles: `${traspaso.folio}: ${accion}${accion === 'recibir' ? (completa ? ' completo' : ' parcial; faltante pendiente') : ''}` } });
    return tx.traspaso.findUniqueOrThrow({ where: { id } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
