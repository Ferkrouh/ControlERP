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

# 2. Aplicar únicamente migraciones versionadas. Una base previa sin historial
# de migraciones debe baselinarse por separado tras respaldo y revisión.
echo "📦 Aplicando migraciones PostgreSQL versionadas..."
npx prisma migrate deploy

# 3. Iniciar Next.js en modo producción. El seed demo es destructivo y nunca corre al arrancar.
echo "🚀 Arrancando servidor web en http://0.0.0.0:${PORT:-3000}..."
exec npm run start -- -p ${PORT:-3000}
