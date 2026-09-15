const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const target = process.argv[2]; // 'postgres' | 'sqlite'

if (!target || !['postgres', 'sqlite'].includes(target)) {
  console.error('Uso: node scripts/switch-db.js [postgres|sqlite]');
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const schemaPath = path.join(rootDir, 'prisma', 'schema.prisma');
const pgSchemaPath = path.join(rootDir, 'prisma', 'schema.postgresql.prisma');
const sqliteSchemaPath = path.join(rootDir, 'prisma', 'schema.sqlite.prisma');

// Si no existen los backups base, crearlos desde schema.prisma
if (!fs.existsSync(schemaPath)) {
  console.error('No se encontró prisma/schema.prisma');
  process.exit(1);
}

const currentContent = fs.readFileSync(schemaPath, 'utf8');

if (target === 'postgres') {
  // Asegurar que guardamos la versión sqlite
  if (!fs.existsSync(sqliteSchemaPath) && currentContent.includes('provider = "sqlite"')) {
    fs.writeFileSync(sqliteSchemaPath, currentContent, 'utf8');
    console.log('✔ Guardado respaldo schema.sqlite.prisma');
  }

  let newContent;
  if (fs.existsSync(pgSchemaPath)) {
    newContent = fs.readFileSync(pgSchemaPath, 'utf8');
  } else {
    newContent = currentContent.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
    fs.writeFileSync(pgSchemaPath, newContent, 'utf8');
    console.log('✔ Creado schema.postgresql.prisma');
  }

  // Asegurar que provider en schema.prisma sea postgresql
  newContent = newContent.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, newContent, 'utf8');
  console.log('✔ prisma/schema.prisma configurado para PostgreSQL.');
} else if (target === 'sqlite') {
  // Asegurar que guardamos la versión postgres
  if (!fs.existsSync(pgSchemaPath) && currentContent.includes('provider = "postgresql"')) {
    fs.writeFileSync(pgSchemaPath, currentContent, 'utf8');
    console.log('✔ Guardado respaldo schema.postgresql.prisma');
  }

  let newContent;
  if (fs.existsSync(sqliteSchemaPath)) {
    newContent = fs.readFileSync(sqliteSchemaPath, 'utf8');
  } else {
    newContent = currentContent.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');
    fs.writeFileSync(sqliteSchemaPath, newContent, 'utf8');
    console.log('✔ Creado schema.sqlite.prisma');
  }

  newContent = newContent.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');
  fs.writeFileSync(schemaPath, newContent, 'utf8');
  console.log('✔ prisma/schema.prisma configurado para SQLite.');
}

console.log('Regenerando Prisma Client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit', cwd: rootDir });
  console.log(`\n🎉 Base de datos configurada exitosamente para: ${target.toUpperCase()}`);
} catch (error) {
  console.error('Error al regenerar Prisma client:', error.message);
  process.exit(1);
}
