import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { VentaError } from '@/lib/ventas';
import { z } from 'zod';
import { attachCorrelationId, auditOperationalFailure } from '@/lib/platform-audit';

const importe = z.number().finite().nonnegative().max(1e12).refine(n => new Prisma.Decimal(n).decimalPlaces() <= 2);
const entrada = z.discriminatedUnion('accion', [
  z.object({ accion: z.literal('ABRIR'), almacenId: z.string().min(1), montoApertura: importe.default(0), notasApertura: z.string().max(2000).optional() }),
  z.object({ accion: z.literal('CERRAR'), turnoId: z.string().min(1), montoCierre: importe, notasCierre: z.string().max(2000).optional() }),
]);

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
  if (auth.errorResponse) return auth.errorResponse;
  const query = new URL(req.url).searchParams;
  const tenantId = auth.user.rol === 'SUPERADMIN' ? query.get('tenantId') : auth.user.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'Seleccione una empresa' }, { status: 400 });
  try {
    const turnoActivo = await prisma.turnoCajaPOS.findFirst({ where: { tenantId, estado: 'ABIERTO',
      ...(query.get('almacenId') ? { almacenId: query.get('almacenId')! } : {}),
      ...(auth.user.rol === 'ENCARGADO' ? { usuarioId: auth.user.id } : {}) }, orderBy: { fechaApertura: 'desc' } });
    return NextResponse.json({ turnoActivo });
  } catch (error) {
    console.error('Error al consultar caja:', error);
    return NextResponse.json({ error: 'Error al consultar caja' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let auditActor: { id: string; email: string; tenantId: string | null } | null = null;
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;
    auditActor = auth.user;
    const raw = await req.json().catch(() => null);
    const parsed = entrada.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: 'Datos de caja inválidos' }, { status: 400 });
    const tenantId = auth.user.rol === 'SUPERADMIN' ? raw.tenantId || auth.user.tenantId : auth.user.tenantId;
    if (!tenantId) return NextResponse.json({ error: 'Seleccione una empresa' }, { status: 400 });
    const body = parsed.data;
    const resultado = await prisma.$transaction(async tx => {
      const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant?.activo || tenant.bloqueadoPorSuscripcion || !tenant.moduloPos) throw new VentaError('Caja POS deshabilitada', 403);
      if (body.accion === 'ABRIR') {
        // El almacén es el punto de exclusión para aperturas concurrentes, también con turnos anteriores sin migrar.
        const lock = await tx.almacen.updateMany({ where: { id: body.almacenId, tenantId }, data: { id: body.almacenId } });
        if (!lock.count) throw new VentaError('Almacén ajeno a su empresa', 404);
        if (await tx.turnoCajaPOS.findFirst({ where: { tenantId, almacenId: body.almacenId, estado: 'ABIERTO' } })) {
          throw new VentaError('Ya hay una caja abierta en este almacén', 409);
        }
        const turno = await tx.turnoCajaPOS.create({ data: { tenantId, almacenId: body.almacenId, usuarioId: auth.user.id,
          usuarioNombre: auth.user.nombre, montoApertura: body.montoApertura, notasApertura: body.notasApertura?.trim() || null } });
        await tx.registroAuditoria.create({ data: { tenantId, usuarioId: auth.user.id, usuarioNombre: auth.user.nombre,
          modulo: 'POS', accion: 'ABRIR', detalles: `Turno ${turno.id}: fondo ${turno.montoApertura.toFixed(2)}` } });
        return { message: 'Caja abierta', turno };
      }
      const claim = await tx.turnoCajaPOS.updateMany({ where: { id: body.turnoId, tenantId, estado: 'ABIERTO',
        ...(auth.user.rol === 'ENCARGADO' ? { usuarioId: auth.user.id } : {}) },
        data: { estado: 'CERRADO', fechaCierre: new Date() } });
      if (!claim.count) throw new VentaError('Turno cerrado o no autorizado', 409);
      const previo = await tx.turnoCajaPOS.findUniqueOrThrow({ where: { id: body.turnoId } });
      const esperado = new Prisma.Decimal(previo.montoApertura).add(previo.totalEfectivo).toDecimalPlaces(2).toNumber();
      const diferencia = new Prisma.Decimal(body.montoCierre).sub(esperado).toDecimalPlaces(2).toNumber();
      const turno = await tx.turnoCajaPOS.update({ where: { id: previo.id }, data: { montoCierre: body.montoCierre,
        diferencia, notasCierre: body.notasCierre?.trim() || null } });
      await tx.registroAuditoria.create({ data: { tenantId, usuarioId: auth.user.id, usuarioNombre: auth.user.nombre,
        modulo: 'POS', accion: 'CERRAR', detalles: `Turno ${turno.id}: esperado ${esperado.toFixed(2)}, contado ${body.montoCierre.toFixed(2)}, diferencia ${diferencia.toFixed(2)}` } });
      return { message: 'Corte Z realizado', turno, resumen: { fondoApertura: turno.montoApertura,
        ventasEfectivo: turno.totalEfectivo, ventasTarjeta: turno.totalTarjeta, ventasTransferencia: turno.totalTransfer,
        totalVentas: turno.totalVentas, efectivoEsperado: esperado, efectivoEntregado: body.montoCierre, diferencia } };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json(resultado, { status: body.accion === 'ABRIR' ? 201 : 200 });
  } catch (error) {
    const code = (error as { code?: string }).code || '';
    const status = error instanceof VentaError ? error.status : ['P2034', 'P1008', 'P2028'].includes(code) ? 409 : 500;
    const correlationId = await auditOperationalFailure(req, auditActor, { categoria: 'POS', accion: 'TURNO_FALLIDO', status });
    if (status >= 500) console.error('Error al operar caja:', error);
    if (error instanceof VentaError) return attachCorrelationId(NextResponse.json({ error: error.message }, { status }), correlationId);
    if (status === 409) {
      return attachCorrelationId(NextResponse.json({ error: 'Caja modificada por otra operación; consulte su estado antes de reintentar' }, { status }), correlationId);
    }
    return attachCorrelationId(NextResponse.json({ error: 'Error al operar caja', correlationId }, { status }), correlationId);
  }
}
