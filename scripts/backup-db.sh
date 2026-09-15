#!/usr/bin/env bash
# ==============================================================================
# Script de Respaldo Automatizado para Base de Datos PostgreSQL de ControlERP
# Diseñado para ejecutarse manualmente o vía cron en servidores Linux Ubuntu
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/controlerp/backups}"
CONTAINER_NAME="${CONTAINER_NAME:-controlerp-postgres}"
DB_USER="${POSTGRES_USER:-controlerp}"
DB_NAME="${POSTGRES_DB:-controlerp_db}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

DATE_STR=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/controlerp_${DB_NAME}_${DATE_STR}.sql.gz"

echo "=========================================================="
echo "    Iniciando Respaldo de Base de Datos ControlERP        "
echo "    Fecha: $(date)                                        "
echo "=========================================================="

# 1. Crear directorio de respaldos si no existe
mkdir -p "${BACKUP_DIR}"

# 2. Validar que el contenedor de PostgreSQL esté en ejecución
if ! docker ps --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}\$"; then
    echo "❌ Error: El contenedor '${CONTAINER_NAME}' no está en ejecución."
    exit 1
fi

# 3. Ejecutar pg_dump y comprimir con gzip en streaming
echo "📦 Extrayendo volcado de base de datos '${DB_NAME}'..."
docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists | gzip > "${BACKUP_FILE}"

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "✔ Respaldo generado con éxito: ${BACKUP_FILE} (${FILE_SIZE})"

# 4. Limpieza de respaldos con antigüedad mayor al periodo de retención
echo "🧹 Limpiando respaldos con más de ${RETENTION_DAYS} días de antigüedad..."
DELETED_COUNT=$(find "${BACKUP_DIR}" -type f -name "controlerp_*.sql.gz" -mtime +"${RETENTION_DAYS}" | wc -l)
find "${BACKUP_DIR}" -type f -name "controlerp_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete
echo "✔ Archivos antiguos depurados: ${DELETED_COUNT}"

echo "=========================================================="
echo "  Proceso de Respaldo Finalizado Satisfactoriamente       "
echo "=========================================================="
