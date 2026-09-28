#!/usr/bin/env bash
# Backup PostgreSQL atómico: no publica un archivo final hasta validar pg_dump y gzip.
set -Eeuo pipefail
umask 077

BACKUP_DIR="${BACKUP_DIR:-/opt/controlerp/backups}"
CONTAINER_NAME="${CONTAINER_NAME:-controlerp-postgres}"
DB_USER="${POSTGRES_USER:?Define POSTGRES_USER}"
DB_NAME="${POSTGRES_DB:?Define POSTGRES_DB}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE_STR="$(date -u +"%Y%m%d_%H%M%S")"
BACKUP_FILE="${BACKUP_DIR}/controlerp_${DB_NAME}_${DATE_STR}.sql.gz"
TEMP_FILE="${BACKUP_FILE}.partial"

log_event() {
  local result="$1" action="$2" details="$3"
  docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" \
    -v category=RESPALDO -v action="$action" -v result="$result" -v details="$details" \
    -c "INSERT INTO \"RegistroPlataforma\" (\"id\", \"categoria\", \"accion\", \"resultado\", \"detalles\") VALUES (gen_random_uuid()::text, :'category', :'action', :'result', :'details')" \
    >/dev/null 2>&1 || {
      printf '{"at":"%s","category":"RESPALDO","action":"%s","result":"%s"}\n' \
        "$(date -u +%FT%TZ)" "$action" "$result" >> "${BACKUP_DIR}/platform-backup-events.jsonl" 2>/dev/null || true
    }
}

on_error() {
  rm -f "$TEMP_FILE"
  log_event ERROR BACKUP_FAILED "Falló el proceso de respaldo PostgreSQL; revisar logs del host."
}
trap on_error ERR

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

if ! docker ps --format '{{.Names}}' | grep -Fxq "$CONTAINER_NAME"; then
  echo "El contenedor PostgreSQL '$CONTAINER_NAME' no está en ejecución." >&2
  exit 1
fi

docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists \
  | gzip -c > "$TEMP_FILE"
gzip -t "$TEMP_FILE"
test -s "$TEMP_FILE"
mv "$TEMP_FILE" "$BACKUP_FILE"

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$BACKUP_FILE" > "${BACKUP_FILE}.sha256"
else
  shasum -a 256 "$BACKUP_FILE" > "${BACKUP_FILE}.sha256"
fi
chmod 600 "$BACKUP_FILE" "${BACKUP_FILE}.sha256"

FILE_SIZE="$(du -h "$BACKUP_FILE" | cut -f1)"
log_event OK BACKUP_SUCCEEDED "Respaldo PostgreSQL creado y comprimido; tamaño ${FILE_SIZE}."
echo "Respaldo validado: $BACKUP_FILE ($FILE_SIZE)"

find "$BACKUP_DIR" -type f \( -name "controlerp_*.sql.gz" -o -name "controlerp_*.sql.gz.sha256" \) \
  -mtime "+${RETENTION_DAYS}" -delete
trap - ERR
