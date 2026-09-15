#!/usr/bin/env bash
# ==============================================================================
# Script de Instalación y Despliegue Automatizado para ControlERP en Ubuntu
# Compatible con Ubuntu 20.04 / 22.04 / 24.04 LTS
# Stack: Next.js 15 + PostgreSQL 16 + Docker Compose + Backups Automáticos
# ==============================================================================

set -e

echo "======================================================================"
echo "    Iniciando Despliegue de ControlERP SaaS (PostgreSQL + Docker)     "
echo "======================================================================"

# 1. Actualización de paquetes del sistema
echo "[1/6] Actualizando repositorios del sistema..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release git

# 2. Instalación de Docker y Docker Compose si no existen
if ! [ -x "$(command -v docker)" ]; then
  echo "[2/6] Instalando Docker Engine..."
  sudo mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin docker-compose
  sudo systemctl enable docker
  sudo systemctl start docker
  echo "✔ Docker instalado correctamente."
else
  echo "[2/6] Docker ya se encuentra instalado."
fi

# 3. Configuración del archivo de entorno .env
echo "[3/6] Verificando variables de entorno..."
if [ ! -f ".env" ]; then
  if [ -f ".env.production.example" ]; then
    cp .env.production.example .env
    # Generar un secreto JWT aleatorio de 32 bytes
    RANDOM_JWT=$(openssl rand -hex 32 || echo "jwt_secret_$(date +%s)_token")
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=\"${RANDOM_JWT}\"|g" .env
    echo "✔ Creado archivo .env con secreto JWT generado automáticamente."
  else
    echo "⚠ Advertencia: No se encontró .env ni .env.production.example"
  fi
else
  echo "✔ Archivo .env existente detectado."
fi

# 4. Permisos de ejecución para scripts
echo "[4/6] Asignando permisos a scripts operativos..."
chmod +x docker-entrypoint.sh 2>/dev/null || true
chmod +x scripts/*.sh 2>/dev/null || true
mkdir -p backups

# 5. Programación de respaldo diario automático en crontab
echo "[5/6] Configurando tarea cron para respaldos diarios de PostgreSQL a las 02:00 AM..."
BACKUP_SCRIPT_PATH="$(pwd)/scripts/backup-db.sh"
CRON_JOB="0 2 * * * ${BACKUP_SCRIPT_PATH} >> $(pwd)/backups/backup.log 2>&1"
(crontab -l 2>/dev/null | grep -F "${BACKUP_SCRIPT_PATH}") || (crontab -l 2>/dev/null; echo "${CRON_JOB}") | crontab -
echo "✔ Tarea cron programada correctamente."

# 6. Compilación y Levantamiento de Contenedores
echo "[6/6] Levantando cluster de ControlERP (App + PostgreSQL + Túnel)..."
sudo docker compose down || sudo docker-compose down || true
sudo docker compose build || sudo docker-compose build
sudo docker compose up -d || sudo docker-compose up -d

echo "======================================================================"
echo "  🎉 ControlERP está corriendo en: http://localhost:3000"
echo "  📦 Base de datos: PostgreSQL 16 (en contenedor controlerp-postgres)"
echo ""
echo "  Para acceso remoto mundial por HTTPS:"
echo "  1. Configura tu token en el archivo .env: CLOUDFLARE_TUNNEL_TOKEN=tu_token"
echo "  2. Reinicia el túnel con: sudo docker compose restart cloudflare-tunnel"
echo "======================================================================"
