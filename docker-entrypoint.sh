#!/bin/sh
# ==============================================================================
# Script de Entrada para Contenedor Docker de ControlERP
# Aplica migraciones a PostgreSQL y lanza el servidor Next.js en producción
# ==============================================================================

set -e

echo "=========================================================="
echo "    Iniciando Contenedor ControlERP SaaS en Producción   "
echo "=========================================================="

# 1. Asegurar que Prisma Client esté sincronizado con el esquema actual
echo "⚙️  Verificando esquema de base de datos..."
if [ -f "prisma/schema.postgresql.prisma" ]; then
  cp prisma/schema.postgresql.prisma prisma/schema.prisma
fi

# 2. Sincronizar estructura de base de datos (tablas, relaciones, índices)
echo "📦 Aplicando estructura en PostgreSQL (prisma db push)..."
npx prisma db push --skip-generate || echo "⚠ Advertencia: No se pudo conectar inmediatamente a la BD, reintentando con el servidor..."

# 3. Seed automático opcional
if [ "$SEED_ON_START" = "true" ]; then
  echo "🌱 Ejecutando población de datos iniciales (seed)..."
  node prisma/seed.js || echo "⚠ Advertencia en seed inicial (posiblemente ya existían registros)."
fi

# 4. Iniciar Next.js en modo producción
echo "🚀 Arrancando servidor web en http://0.0.0.0:${PORT:-3000}..."
exec npm run start -- -p ${PORT:-3000}
