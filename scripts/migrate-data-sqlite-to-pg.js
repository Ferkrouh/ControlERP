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
const path = require('path');
const { PrismaClient } = require('@prisma/client');
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
  'registroAuditoria'
];

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
      if (typeof prisma[model]?.findMany === 'function') {
        const records = await prisma[model].findMany();
        exportData.counts[model] = records.length;
        exportData.data[model] = records;
        console.log(`  ✔ ${model}: ${records.length} registros extraídos.`);
      }
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
  console.log(`📥 Cargando respaldo generado el: ${backup.exportedAt}`);

  // Asegurar que el cliente se conecta a la URL de Postgres
  const prisma = new PrismaClient({
    datasources: {
      db: { url: pgUrl || process.env.DATABASE_URL }
    }
  });

  try {
    console.log('⏳ Conectando a PostgreSQL e insertando registros...');
    for (const model of MODELS_IN_ORDER) {
      const records = backup.data[model] || [];
      if (records.length === 0) continue;

      let inserted = 0;
      for (const item of records) {
        try {
          // Convertir campos de fecha ISO a objetos Date
          const sanitized = { ...item };
          for (const key of Object.keys(sanitized)) {
            if (typeof sanitized[key] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(sanitized[key])) {
              sanitized[key] = new Date(sanitized[key]);
            }
          }

          await prisma[model].upsert({
            where: { id: sanitized.id },
            update: sanitized,
            create: sanitized
          });
          inserted++;
        } catch (err) {
          console.warn(`    ⚠ Error insertando registro en ${model} (${item.id}):`, err.message);
        }
      }
      console.log(`  ✔ ${model}: ${inserted}/${records.length} insertados en PostgreSQL.`);
    }

    console.log('\n🎉 Migración a PostgreSQL completada con éxito.');
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const defaultBackupPath = path.join(__dirname, '..', 'prisma', 'data-backup.json');

  if (args.includes('--export')) {
    const out = args[args.indexOf('--export') + 1] || defaultBackupPath;
    await exportSqliteData(out);
  } else if (args.includes('--import')) {
    const file = args[args.indexOf('--import') + 1] || defaultBackupPath;
    await importPostgresData(file, process.env.DATABASE_URL);
  } else if (args.includes('--direct')) {
    const pgUrl = process.env.TARGET_PG_URL || process.env.DATABASE_URL;
    if (!pgUrl || !pgUrl.startsWith('postgres')) {
      console.error('❌ Debes definir TARGET_PG_URL o DATABASE_URL apuntando a PostgreSQL.');
      process.exit(1);
    }
    const tempFile = path.join(__dirname, '..', 'prisma', 'temp-migration.json');
    await exportSqliteData(tempFile);
    await importPostgresData(tempFile, pgUrl);
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  } else {
    console.log(`
Uso de migrate-data-sqlite-to-pg:
  --export [archivo.json] : Exporta los datos de SQLite a un JSON (por defecto: prisma/data-backup.json)
  --import [archivo.json] : Importa el JSON a la base de datos PostgreSQL configurada en DATABASE_URL
  --direct                : Realiza exportación e importación directa (requiere TARGET_PG_URL)
    `);
  }
}

main().catch(e => {
  console.error('Error fatal:', e);
  process.exit(1);
});
