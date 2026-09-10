import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET: Consultar si el cajero/usuario o almacén tiene un turno abierto
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);
    const almacenId = searchParams.get('almacenId');

    const targetTenantId = user.tenantId;
    if (!targetTenantId && user.rol !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Tenant requerido' }, { status: 400 });
    }

    const where: any = {
      tenantId: targetTenantId,
      estado: 'ABIERTO',
    };

    if (almacenId) {
      where.almacenId = almacenId;
    }

    const turnoActivo = await prisma.turnoCajaPOS.findFirst({
      where,
      orderBy: { fechaApertura: 'desc' },
    });

    return NextResponse.json({ turnoActivo });
  } catch (error: any) {
    console.error('Error al consultar turno de caja:', error);
    return NextResponse.json({ error: 'Error al consultar estado de caja' }, { status: 500 });
  }
}

// POST: Abrir turno de caja con fondo inicial o Cerrar turno (Corte Z / Arqueo)
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();
    const { accion, almacenId, montoApertura = 0, notasApertura, turnoId, montoCierre = 0, notasCierre } = body;

    const targetTenantId = user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    if (accion === 'ABRIR') {
      if (!almacenId) {
        return NextResponse.json({ error: 'Debe seleccionar el almacén/punto de venta' }, { status: 400 });
      }

      // Verificar que no haya un turno abierto previo en este almacén
      const existente = await prisma.turnoCajaPOS.findFirst({
        where: {
          tenantId: targetTenantId,
          almacenId,
          estado: 'ABIERTO',
        },
      });

      if (existente) {
        return NextResponse.json({
          error: `Ya existe una caja abierta en este almacén (Iniciada por ${existente.usuarioNombre}). Debe cerrarse antes de abrir una nueva.`,
          turnoActivo: existente,
        }, { status: 400 });
      }

      const nuevoTurno = await prisma.turnoCajaPOS.create({
        data: {
          tenantId: targetTenantId!,
          almacenId,
          usuarioId: user.id,
          usuarioNombre: user.nombre,
          montoApertura: Number(montoApertura) || 0,
          notasApertura: notasApertura ? notasApertura.trim() : null,
          estado: 'ABIERTO',
        },
      });

      // Auditoría
      await prisma.registroAuditoria.create({
        data: {
          tenantId: targetTenantId!,
          usuarioId: user.id,
          usuarioNombre: user.nombre,
          modulo: 'POS',
          accion: 'CREAR',
          detalles: `Apertura de turno de caja en mostrador con fondo de $${Number(montoApertura).toFixed(2)} MXN`,
        },
      });

      return NextResponse.json({ message: 'Turno de caja abierto con éxito', turno: nuevoTurno }, { status: 201 });
    }

    if (accion === 'CERRAR') {
      if (!turnoId) {
        return NextResponse.json({ error: 'ID de turno requerido para arqueo de caja' }, { status: 400 });
      }

      const turno = await prisma.turnoCajaPOS.findUnique({
        where: { id: turnoId },
      });

      if (!turno || turno.estado !== 'ABIERTO') {
        return NextResponse.json({ error: 'Turno no encontrado o ya cerrado previamente' }, { status: 404 });
      }

      const cierreEfectivoContado = Number(montoCierre);
      const efectivoEsperado = turno.montoApertura + turno.totalEfectivo;
      const diferencia = cierreEfectivoContado - efectivoEsperado;

      const turnoCerrado = await prisma.turnoCajaPOS.update({
        where: { id: turnoId },
        data: {
          estado: 'CERRADO',
          montoCierre: cierreEfectivoContado,
          diferencia,
          notasCierre: notasCierre ? notasCierre.trim() : null,
          fechaCierre: new Date(),
        },
      });

      // Auditoría
      await prisma.registroAuditoria.create({
        data: {
          tenantId: targetTenantId!,
          usuarioId: user.id,
          usuarioNombre: user.nombre,
          modulo: 'POS',
          accion: 'AUTORIZAR',
          detalles: `Corte Z de Caja POS. Fondo apertura: $${turno.montoApertura.toFixed(2)}, Ventas efectivo: $${turno.totalEfectivo.toFixed(2)}, Entregado: $${cierreEfectivoContado.toFixed(2)}, Diferencia: $${diferencia.toFixed(2)} MXN`,
        },
      });

      return NextResponse.json({
        message: 'Turno de caja cerrado exitosamente (Corte Z realizado)',
        turno: turnoCerrado,
        resumen: {
          fondoApertura: turno.montoApertura,
          ventasEfectivo: turno.totalEfectivo,
          ventasTarjeta: turno.totalTarjeta,
          totalVentas: turno.totalVentas,
          efectivoEsperado,
          efectivoEntregado: cierreEfectivoContado,
          diferencia,
        },
      });
    }

    return NextResponse.json({ error: 'Acción de caja no válida' }, { status: 400 });
  } catch (error: any) {
    console.error('Error al procesar turno de caja:', error);
    return NextResponse.json({ error: error.message || 'Error en operación de caja' }, { status: 500 });
  }
}
