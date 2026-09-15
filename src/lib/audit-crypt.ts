import crypto from 'crypto';

export type NivelRiesgo = 'NORMAL' | 'ADVERTENCIA' | 'CRITICO';

export interface AuditDataPayload {
  id: string;
  tenantId: string;
  fecha: string | Date;
  modulo: string;
  accion: string;
  detalles: string;
  usuarioId: string;
}

/**
 * Hash génesis inicial para el ancla de la cadena de bloques contable.
 */
export const GENESIS_AUDIT_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Calcula un hash criptográfico SHA-256 determinístico encadenando el bloque anterior.
 */
export function computeAuditHash(prevHash: string, data: AuditDataPayload): string {
  const normalizedFecha = data.fecha instanceof Date ? data.fecha.toISOString() : new Date(data.fecha).toISOString();
  const rawString = [
    prevHash || GENESIS_AUDIT_HASH,
    data.id,
    data.tenantId,
    normalizedFecha,
    data.modulo.toUpperCase().trim(),
    data.accion.toUpperCase().trim(),
    data.detalles.trim(),
    data.usuarioId
  ].join('|::|');

  return crypto.createHash('sha256').update(rawString, 'utf8').digest('hex');
}

/**
 * Clasifica de forma inteligente el nivel de riesgo contable/operativo del evento.
 */
export function classifyAuditRisk(modulo: string, accion: string, detalles: string): NivelRiesgo {
  const normAccion = (accion || '').toUpperCase();
  const normDetalles = (detalles || '').toLowerCase();
  const normModulo = (modulo || '').toUpperCase();

  // Nivel CRÍTICO: acciones destructivas, cancelaciones fiscales, mermas graves o desbloqueos de riesgo
  if (
    normAccion === 'ELIMINAR' ||
    normAccion === 'CANCELAR' ||
    normDetalles.includes('cancelac') ||
    normDetalles.includes('cancelad') ||
    normDetalles.includes('anulad') ||
    normDetalles.includes('merma_caducidad') ||
    normDetalles.includes('ajuste_negativo') ||
    normDetalles.includes('ajuste negativo') ||
    normDetalles.includes('bloqueado') ||
    normDetalles.includes('bloqueo forzado') ||
    normDetalles.includes('desbloqueo forzado')
  ) {
    return 'CRITICO';
  }

  // Nivel ADVERTENCIA: cambios en políticas, precios, límites de crédito, traspasos o autorizaciones
  if (
    normAccion === 'EDITAR' ||
    normAccion === 'AUTORIZAR' ||
    normAccion === 'TRASPASO' ||
    normAccion === 'AJUSTE_STOCK' ||
    normDetalles.includes('límite de crédito') ||
    normDetalles.includes('limite de credito') ||
    normDetalles.includes('precio') ||
    normDetalles.includes('lista de precios') ||
    normDetalles.includes('días de gracia') ||
    normDetalles.includes('password') ||
    normDetalles.includes('contraseña') ||
    normDetalles.includes('rol') ||
    normDetalles.includes('descuento') ||
    normModulo === 'MANUFACTURA' && normAccion === 'FINALIZAR'
  ) {
    return 'ADVERTENCIA';
  }

  // Nivel NORMAL: transacciones cotidianas de venta, compra, recepción y cobro
  return 'NORMAL';
}

export interface VerificationResult {
  isIntact: boolean;
  totalChecked: number;
  compromisedCount: number;
  compromisedRecordId: string | null;
  latestHash: string;
  verifiedAt: string;
}

/**
 * Valida matemáticamente toda la cadena cronológica de auditoría para verificar inmutabilidad.
 */
export function verifyAuditChain(orderedRecordsAsc: any[]): VerificationResult {
  if (!orderedRecordsAsc || orderedRecordsAsc.length === 0) {
    return {
      isIntact: true,
      totalChecked: 0,
      compromisedCount: 0,
      compromisedRecordId: null,
      latestHash: GENESIS_AUDIT_HASH,
      verifiedAt: new Date().toISOString()
    };
  }

  let expectedPrevHash = GENESIS_AUDIT_HASH;
  let compromisedCount = 0;
  let firstCompromisedId: string | null = null;
  let lastValidHash = GENESIS_AUDIT_HASH;

  for (let i = 0; i < orderedRecordsAsc.length; i++) {
    const record = orderedRecordsAsc[i];
    const calculatedHash = computeAuditHash(expectedPrevHash, {
      id: record.id,
      tenantId: record.tenantId,
      fecha: record.fecha,
      modulo: record.modulo,
      accion: record.accion,
      detalles: record.detalles,
      usuarioId: record.usuarioId
    });

    const recordedHash = record.hashEvento || calculatedHash;
    const recordedPrev = record.hashPrevio || expectedPrevHash;

    if (recordedPrev !== expectedPrevHash || (record.hashEvento && record.hashEvento !== calculatedHash)) {
      compromisedCount++;
      if (!firstCompromisedId) {
        firstCompromisedId = record.id;
      }
    } else {
      lastValidHash = calculatedHash;
    }

    expectedPrevHash = calculatedHash;
  }

  return {
    isIntact: compromisedCount === 0,
    totalChecked: orderedRecordsAsc.length,
    compromisedCount,
    compromisedRecordId: firstCompromisedId,
    latestHash: lastValidHash,
    verifiedAt: new Date().toISOString()
  };
}
