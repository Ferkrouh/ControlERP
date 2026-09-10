#!/usr/bin/env bash
# ==============================================================================
# Script de Instalación y Despliegue Automatizado para ControlERP en Ubuntu
# Compatible con Ubuntu 20.04 / 22.04 / 24.04 LTS
# ==============================================================================

set -e

echo "=========================================================="
echo "    Iniciando Despliegue de ControlERP SaaS en Ubuntu     "
echo "=========================================================="

# 1. Actualización del sistema
echo "[1/4] Actualizando repositorios del sistema..."
sudo apt-get update && sudo apt-get upgrade -y

# 2. Instalación de Docker y Docker Compose si no existen
if ! [ -x "$(command -v docker)" ]; then
  echo "[2/4] Instalando Docker Engine..."
  sudo apt-get install -y ca-certificates curl gnupg lsb-release
  sudo mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin docker-compose
  sudo systemctl enable docker
  sudo systemctl start docker
  echo "Docker instalado correctamente."
else
  echo "[2/4] Docker ya se encuentra instalado."
fi

# 3. Compilación y Levantamiento de Contenedores
echo "[3/4] Levantando contenedores de ControlERP con Docker Compose..."
sudo docker-compose down || true
sudo docker-compose build
sudo docker-compose up -d

# 4. Estado final
echo "[4/4] Verificando estado de los servicios..."
sudo docker-compose ps

echo "=========================================================="
echo "  ControlERP está corriendo localmente en: http://localhost:3000"
echo "  Para acceso global con HTTPS:"
echo "  Configura tu token en el archivo .env: CLOUDFLARE_TUNNEL_TOKEN=tu_token"
echo "  Y reinicia con: sudo docker-compose restart cloudflare-tunnel"
echo "=========================================================="
