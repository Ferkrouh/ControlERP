# Guía Definitiva de Despliegue en Ubuntu Linux (Producción)

Esta guía detalla paso a paso cómo poner en producción **ControlERP SaaS** en un servidor con **Linux Ubuntu** (físico, VPS en la nube o servidor en oficina central 24/7) utilizando arquitectura de contenedores **Docker**, base de datos corporativa **PostgreSQL 16**, respaldos automáticos y acceso remoto seguro mediante **Cloudflare Zero Trust**.

---

## 1. Arquitectura de Producción

```
       [ Dispositivos Clientes: Laptop / POS / Tablet / Celular ]
                                   │ (HTTPS - Puerto 443 Seguro)
                                   ▼
                       [ Cloudflare Zero Trust ]
                                   │ (Túnel Cifrado Saliente)
                                   ▼
        ┌─────────────────────────────────────────────────────┐
        │              SERVIDOR UBUNTU LINUX                  │
        │                                                     │
        │   ┌──────────────────┐       ┌──────────────────┐   │
        │   │  controlerp-app  │◄─────►│ controlerp-pg    │   │
        │   │  (Next.js 15)    │       │ (PostgreSQL 16)  │   │
        │   └────────▲─────────┘       └────────┬─────────┘   │
        │            │                          │             │
        │   ┌────────┴─────────┐       ┌────────▼─────────┐   │
        │   │ cloudflare-tunnel│       │ Volumen de Datos │   │
        │   │ (cloudflared)    │       │ + Cron Backups   │   │
        │   └──────────────────┘       └──────────────────┘   │
        └─────────────────────────────────────────────────────┘
```

### Ventajas Clave:
1. **Cero Puertos Abiertos en el Router:** El servidor no expone los puertos 80, 443 ni 5432 a Internet. El túnel de Cloudflare se conecta de adentro hacia afuera de forma cifrada.
2. **Sin necesidad de IP Pública Fija:** Funciona con conexiones residenciales o empresariales con IP dinámica o CGNAT (Telmex, Totalplay, Megacable, Izzi, etc.).
3. **PostgreSQL 16 Multi-Tenant:** Soporta transacciones concurrentes masivas (mostrador POS, picking de almacenes, facturación CFDI 4.0) sin bloqueos de archivo.
4. **Respaldos Automáticos Diarios:** Un cronjob respaldará automáticamente la base de datos cada noche a las 02:00 AM con compresión gzip y rotación a 30 días.

---

## 2. Requisitos Previos del Servidor

- **Sistema Operativo:** Ubuntu 20.04, 22.04 o 24.04 LTS (x86_64 o ARM64).
- **CPU:** 2 núcleos o superior.
- **Memoria RAM:** Mínimo 2 GB (Recomendado 4 GB).
- **Disco:** 20 GB de espacio libre (SSD recomendado).

---

## 3. Despliegue en 3 Pasos

### Paso 1: Clonar o copiar el repositorio al servidor
En la terminal de tu servidor Ubuntu:
```bash
git clone <tu-repositorio> /opt/controlerp
cd /opt/controlerp
```

### Paso 2: Ejecutar el script automatizado
```bash
chmod +x setup-ubuntu.sh
./setup-ubuntu.sh
```
El script realizará automáticamente:
1. Actualización de paquetes Ubuntu y librerías base.
2. Instalación oficial de Docker Engine y Docker Compose.
3. Creación del archivo `.env` con un `JWT_SECRET` criptográfico generado al vuelo.
4. Programación del cronjob para respaldos automáticos cada madrugada.
5. Construcción y arranque de los contenedores (`controlerp-postgres`, `controlerp-app` y `controlerp-tunnel`).

### Paso 3: Configurar el Acceso Remoto Mundial por HTTPS (5 minutos)
1. Inicia sesión en [Cloudflare Dashboard](https://dash.cloudflare.com/) (cuenta gratuita).
2. En el menú lateral izquierdo navega a: **Zero Trust** ➡️ **Networks** ➡️ **Tunnels**.
3. Haz clic en **Create a Tunnel**, selecciona **Cloudflared** y ponle de nombre `controlerp-server`.
4. Cloudflare te mostrará un comando que incluye un token largo (`eyJhIjoi...`). Copia **solo el token**.
5. En tu servidor Ubuntu, edita el archivo `.env`:
   ```bash
   nano .env
   ```
   Pega tu token en la variable:
   ```env
   CLOUDFLARE_TUNNEL_TOKEN="eyJhIjoiOGQ0M2Y...tu_token_aqui"
   ```
   Guarda con `Ctrl + O` y sal con `Ctrl + X`.
6. En la pestaña **Public Hostname** en el dashboard de Cloudflare:
   - **Subdomain:** `erp` (o el nombre que prefieras).
   - **Domain:** `tuempresa.com`.
   - **Type:** `HTTP`.
   - **URL:** `app:3000`.
7. Reinicia el contenedor del túnel en el servidor:
   ```bash
   sudo docker compose restart cloudflare-tunnel
   ```

**¡Listo!** Ahora el sistema está accesible desde cualquier parte del mundo con candado SSL en:
👉 `https://erp.tuempresa.com`

---

## 4. Comandos de Operación y Mantenimiento

### Ver el estado de los contenedores:
```bash
sudo docker compose ps
```

### Ver registros en tiempo real (logs de la app):
```bash
sudo docker compose logs -f app
```

### Reiniciar el servicio:
```bash
sudo docker compose restart app
```

### Detener todo el sistema:
```bash
sudo docker compose down
```

---

## 5. Respaldo y Restauración de Base de Datos

### Ejecutar un respaldo manual inmediato:
```bash
./scripts/backup-db.sh
```
Los respaldos se almacenan comprimidos en `/opt/controlerp/backups/controlerp_controlerp_db_YYYYMMDD_HHMMSS.sql.gz`.

### Restaurar un respaldo en caso de contingencia:
```bash
gunzip < /opt/controlerp/backups/nombre_del_archivo.sql.gz | docker exec -i controlerp-postgres psql -U controlerp -d controlerp_db
```

---

## 6. Migrar Datos Existentes de SQLite (dev.db) a PostgreSQL

Si vienes trabajando con la base de datos de desarrollo SQLite y deseas migrar todos tus clientes, productos, ventas y movimientos al nuevo PostgreSQL:
1. En tu máquina de desarrollo, exporta los datos:
   ```bash
   node scripts/migrate-data-sqlite-to-pg.js --export
   ```
   Esto generará el archivo `prisma/data-backup.json`.
2. Sube ese archivo a tu servidor Ubuntu.
3. En el servidor, ejecuta la importación hacia PostgreSQL:
   ```bash
   docker exec -i controlerp-app node scripts/migrate-data-sqlite-to-pg.js --import prisma/data-backup.json
   ```

---

## 7. Cuentas Preconfiguradas de Acceso Inicial

| Rol de Usuario | Correo Electrónico | Contraseña Inicial | Alcance de Operación |
| :--- | :--- | :--- | :--- |
| **👑 Superadmin SaaS** | `superadmin@controlerp.com` | `admin123` | Gestión de inquilinos, suscripciones, módulos y auditoría forense |
| **👔 Admin Negocio** | `admin@distribuidora.com` | `admin123` | Control total de su empresa, políticas de crédito y usuarios |
| **👤 Encargado** | `encargado@distribuidora.com` | `encargado123` | Operación comercial, cobranza CxC, compras CxP, traspasos |
| **📦 Almacenista** | `almacenista@distribuidora.com` | `almacen123` | Inventario físico, confirmación de entradas y despachos |
| **🔍 Auditor Fiscal** | `auditor@distribuidora.com` | `auditor123` | Solo lectura, kárdex valuado CFF Art. 28, balances contables |
