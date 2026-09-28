/**
 * Script de Exportación y Migración de Datos: SQLite (dev.db) -> PostgreSQL (Producción)
 * 
 * Modos de uso:
 * 1. Exportar datos de SQLite a un archivo JSON transportable:
 *    node scripts/migrate-data-sqlite-to-pg.js --export
 * 
 * 2. Importar archivo JSON a una base de datos PostgreSQL:
 *    DATABASE_URL="postgresql://user:pass@host:5432/db" node scripts/migrate-data-sqlite-to-pg.js --import prisma/data-backup.json
 * 
 * 3. Migración directa (si ambas BDs son accesibles localmente):
 *    TARGET_PG_URL="postgresql://user:pass@localhost:5432/db" node scripts/migrate-data-sqlite-to-pg.js --direct
 */

const fs = require('fs');
const { PrismaClient, Prisma } = require('@prisma/client');
const { execSync } = require('child_process');

const MODELS_IN_ORDER = [
  'tenant',
  'usuario',
  'cliente',
  'proveedor',
  'almacen',
  'producto',
  'existencia',
  'listaPrecio',
  'listaPrecioItem',
  'loteProducto',
  'cuentaBancaria',
  'movimientoBancario',
  'listaMateriales',
  'listaMaterialesItem',
  'ordenProduccion',
  'oportunidadCRM',
  'cotizacion',
  'cotizacionDetalle',
  'turnoCajaPOS',
  'ordenCompra',
  'ordenCompraItem',
  'compra',
  'compraDetalle',
  'venta',
  'ventaDetalle',
  'cuentaPorCobrar',
  'pagoCxC',
  'cuentaPorPagar',
  'pagoCxP',
  'traspaso',
  'traspasoItem',
  'ajusteInventario',
  'ajusteInventarioItem',
  'movimientoKardex',
  'cuentaContable',
  'polizaContable',
  'partidaPoliza',
  'empleado',
  'periodoNomina',
  'reciboNomina',
  'incidenciaNomina',
  'solicitudVenta',
  'solicitudCobranza',
  'solicitudInventario',
  'loteImportacion',
  'registroAuditoria',
  'registroPlataforma'
];

const clientModels = Prisma.dmmf.datamodel.models.map(model => model.name[0].toLowerCase() + model.name.slice(1));
const faltantes = clientModels.filter(name => !MODELS_IN_ORDER.includes(name));
if (faltantes.length || MODELS_IN_ORDER.some(name => !clientModels.includes(name))) {
  throw new Error(`Modelo sin cobertura de migración: ${faltantes.join(', ') || 'lista inválida'}`);
}

async function exportSqliteData(outputPath) {
  console.log('📦 Iniciando exportación de datos desde SQLite...');
  const prisma = new PrismaClient();
  const exportData = {
    exportedAt: new Date().toISOString(),
    counts: {},
    data: {}
  };

  try {
    for (const model of MODELS_IN_ORDER) {
      if (typeof prisma[model]?.findMany !== 'function') throw new Error(`Modelo ${model} no disponible en Prisma Client`);
      const records = await prisma[model].findMany();
      exportData.counts[model] = records.length;
      exportData.data[model] = records;
      console.log(`  ✔ ${model}: ${records.length} registros extraídos.`);
    }

    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf8');
    console.log(`\n🎉 Datos exportados con éxito a: ${outputPath}`);
    console.log(`   Tamaño del archivo: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
    return exportData;
  } finally {
    await prisma.$disconnect();
  }
}

async function importPostgresData(inputPath, pgUrl) {
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ No se encontró el archivo: ${inputPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, 'utf8');
  const backup = JSON.parse(raw);
  if (!pgUrl?.startsWith('postgresql://') && !pgUrl?.startsWith('postgres://')) {
    throw new Error('La importación exige DATABASE_URL de PostgreSQL; SQLite no es destino válido');
  }
  for (const model of MODELS_IN_ORDER) {
    if (!Array.isArray(backup.data?.[model]) || backup.counts?.[model] !== backup.data[model].length) {
      throw new Error(`Respaldo incompleto o conteo incorrecto para ${model}`);
    }
  }
  console.log(`📥 Cargando respaldo generado el: ${backup.exportedAt}`);

  // Asegurar que el cliente se conecta a la URL de Postgres
  const prisma = new PrismaClient({
    datasources: {
      db: { url: pgUrl || process.env.DATABASE_URL }
    }
  });

  try {
    console.log('⏳ Conectando a PostgreSQL e insertando registros...');
    await prisma.$transaction(async (tx) => {
    for (const model of MODELS_IN_ORDER) {
      const count = await tx[model].count();
      if (count) throw new Error(`Destino no vacío (${model}: ${count}); restaure una base nueva y reintente`);
    }
    for (const model of MODELS_IN_ORDER) {
      const records = backup.data[model];
      if (records.length === 0) continue;

      let inserted = 0;
      for (const item of records) {
          // Convertir campos de fecha ISO a objetos Date
          const sanitized = { ...item };
          for (const key of Object.keys(sanitized)) {
            if (typeof sanitized[key] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(sanitized[key])) {
              sanitized[key] = new Date(sanitized[key]);
            }
          }

          await tx[model].create({ data: sanitized });
          inserted++;
      }
      if (inserted !== backup.counts[model]) throw new Error(`Migración incompleta: ${model}`);
      console.log(`  ✔ ${model}: ${inserted}/${records.length} insertados en PostgreSQL.`);
    }
    }, { timeout: 600000, maxWait: 30000 });

    console.log('\n🎉 Migración a PostgreSQL completada con éxito.');
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--export')) {
    const out = args[args.indexOf('--export') + 1];
    if (!out || out.startsWith('--')) throw new Error('Indique una ruta explícita para el archivo de exportación fuera del repositorio');
    await exportSqliteData(out);
  } else if (args.includes('--import')) {
    const file = args[args.indexOf('--import') + 1];
    if (!file || file.startsWith('--')) throw new Error('Indique la ruta explícita del respaldo que desea importar');
    await importPostgresData(file, process.env.DATABASE_URL);
  } else if (args.includes('--direct')) {
    throw new Error('Migración directa deshabilitada: exporte con cliente SQLite e importe tras generar cliente PostgreSQL');
  } else {
    console.log(`
Uso de migrate-data-sqlite-to-pg:
  --export archivo.json : Exporta todos los modelos desde SQLite a una ruta explícita
  --import archivo.json : Importa de forma transaccional en un PostgreSQL vacío tras cambiar y generar Prisma Client
    `);
  }
}

main().catch(e => {
  console.error('Error fatal:', e);
  process.exit(1);
});
