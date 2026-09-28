const fs = require('fs');
const path = require('path');

const prismaDir = path.resolve(__dirname, '..', 'prisma');
const files = ['schema.prisma', 'schema.sqlite.prisma', 'schema.postgresql.prisma'];
const read = name => fs.readFileSync(path.join(prismaDir, name), 'utf8').replace(/\r\n/g, '\n');
const canonical = value => value.replace(/provider\s*=\s*"(?:sqlite|postgresql)"/, 'provider = "DB_PROVIDER"');
const [active, sqlite, postgres] = files.map(read);
if (!/provider\s*=\s*"sqlite"/.test(sqlite) || !/provider\s*=\s*"postgresql"/.test(postgres)) {
  console.error('Proveedor incorrecto en plantillas Prisma'); process.exit(1);
}
if (canonical(sqlite) !== canonical(postgres) || canonical(active) !== canonical(sqlite)) {
  console.error('Los esquemas Prisma divergen. Sincronice modelos y campos antes de cambiar de motor o desplegar.'); process.exit(1);
}
console.log('Paridad Prisma: esquema activo, SQLite y PostgreSQL coinciden salvo el proveedor.');
