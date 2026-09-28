const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.usuario.findMany({ select: { id: true, passwordHash: true } });
  const legacy = users.filter(({ passwordHash }) => !/^\$2[ab]\$\d{2}\$/.test(passwordHash));
  console.log(`${legacy.length} contraseñas legacy requieren hash. ${apply ? 'Aplicando migración.' : 'Modo vista previa; use --apply para ejecutar.'}`);

  if (!apply) return;
  for (const user of legacy) {
    const passwordHash = await bcrypt.hash(user.passwordHash, 12);
    await prisma.usuario.update({ where: { id: user.id }, data: { passwordHash } });
  }
  console.log('Migración de contraseñas legacy completada. No se imprimieron credenciales.');
}

main()
  .catch(() => {
    console.error('Falló la migración de contraseñas legacy.');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
