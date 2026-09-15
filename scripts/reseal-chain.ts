import { prisma } from '../src/lib/prisma';
import { computeAuditHash, classifyAuditRisk, GENESIS_AUDIT_HASH } from '../src/lib/audit-crypt';

async function main() {
  console.log('--- RESELLANDO CADENA DE AUDITORÍA CRIPTOGRÁFICA ---');
  const records = await prisma.registroAuditoria.findMany({
    orderBy: { fecha: 'asc' },
  });

  console.log(`Procesando ${records.length} eventos históricos...`);
  let prevHash = GENESIS_AUDIT_HASH;

  for (const record of records) {
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

    await prisma.registroAuditoria.update({
      where: { id: record.id },
      data: {
        hashPrevio: prevHash,
        hashEvento: computedHash,
        nivelRiesgo: risk,
      },
    });

    prevHash = computedHash;
  }

  console.log(`¡Cadena de ${records.length} eventos resellada exitosamente! Hash final: ${prevHash}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Error al sellar cadena:', err);
  process.exit(1);
});
