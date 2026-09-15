import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { 
  computeAuditHash, 
  classifyAuditRisk, 
  verifyAuditChain, 
  GENESIS_AUDIT_HASH 
} from '@/lib/audit-crypt';

export async function GET(req: NextRequest) {
  try {
    // Solo Superadmin, Admin y Auditor pueden ver la bitácora
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);
    const tenantParam = searchParams.get('tenantId');
    const effectiveTenantId = user.rol === 'SUPERADMIN' ? (tenantParam || undefined) : user.tenantId;

    if (!effectiveTenantId && user.rol !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const modulo = searchParams.get('modulo');
    const nivelRiesgo = searchParams.get('nivelRiesgo');
    const limitParam = parseInt(searchParams.get('limit') || '300', 10);
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');

    const where: any = {};
    if (effectiveTenantId) {
      where.tenantId = effectiveTenantId;
    }

    if (modulo && modulo !== 'TODOS') {
      where.modulo = modulo;
    }

    if (nivelRiesgo && nivelRiesgo !== 'TODOS') {
      where.nivelRiesgo = nivelRiesgo;
    }

    if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) {
        where.fecha.gte = new Date(fechaDesde);
      }
      if (fechaHasta) {
        where.fecha.lte = new Date(fechaHasta);
      }
    }

    // Obtenemos los registros en orden cronológico ASC para sellado y validación de hash encadenado
    const allRecordsAsc = await prisma.registroAuditoria.findMany({
      where,
      orderBy: { fecha: 'asc' },
      take: limitParam,
    });

    // Sellado dinámico si existen registros antiguos sin hash o sin clasificación de riesgo
    let prevHash = GENESIS_AUDIT_HASH;
    const recordsToUpdate: { id: string; hashPrevio: string; hashEvento: string; nivelRiesgo: string }[] = [];

    const processedRecords = allRecordsAsc.map((record) => {
      const risk = record.nivelRiesgo || classifyAuditRisk(record.modulo, record.accion, record.detalles);
      const computedHash = computeAuditHash(prevHash, {
        id: record.id,
        tenantId: record.tenantId,
        fecha: record.fecha,
        modulo: record.modulo,
        accion: record.accion,
        detalles: record.detalles,
        usuarioId: record.usuarioId,
      });

      const needsSealing = !record.hashEvento || !record.hashPrevio;
      const finalPrevHash: string = (needsSealing ? prevHash : record.hashPrevio) || prevHash;
      const finalEventHash: string = (needsSealing ? computedHash : record.hashEvento) || computedHash;

      if (needsSealing || !record.nivelRiesgo) {
        recordsToUpdate.push({
          id: record.id,
          hashPrevio: finalPrevHash,
          hashEvento: finalEventHash,
          nivelRiesgo: risk,
        });
      }

      prevHash = finalEventHash;

      return {
        ...record,
        nivelRiesgo: risk,
        hashPrevio: finalPrevHash,
        hashEvento: finalEventHash,
      };
    });

    // Actualización asíncrona en lote de registros no sellados
    if (recordsToUpdate.length > 0) {
      (async () => {
        try {
          for (const item of recordsToUpdate) {
            await prisma.registroAuditoria.update({
              where: { id: item.id },
              data: {
                hashPrevio: item.hashPrevio,
                hashEvento: item.hashEvento,
                nivelRiesgo: item.nivelRiesgo,
              },
            });
          }
        } catch (err) {
          console.error('Error sellando registros de auditoría en background:', err);
        }
      })();
    }

    // Verificación matemática de la cadena
    const integrity = verifyAuditChain(processedRecords);

    // Métricas para los KPIs
    const stats = {
      total: processedRecords.length,
      criticos: processedRecords.filter((r) => r.nivelRiesgo === 'CRITICO').length,
      advertencias: processedRecords.filter((r) => r.nivelRiesgo === 'ADVERTENCIA').length,
      normales: processedRecords.filter((r) => r.nivelRiesgo === 'NORMAL').length,
      modulosUnicos: Array.from(new Set(processedRecords.map((r) => r.modulo))).length,
      operadoresUnicos: Array.from(new Set(processedRecords.map((r) => r.usuarioNombre))).length,
    };

    // Para la vista principal se entregan en orden cronológico DESC (más recientes primero)
    const logsDesc = [...processedRecords].reverse();

    return NextResponse.json({
      logs: logsDesc,
      integrity,
      stats,
    });
  } catch (error) {
    console.error('Error fetching auditoria:', error);
    return NextResponse.json({ error: 'Error al obtener auditoría' }, { status: 500 });
  }
}
