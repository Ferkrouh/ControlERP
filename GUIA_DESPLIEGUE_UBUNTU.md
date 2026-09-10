# Guía de Despliegue en Servidor Ubuntu y Acceso Remoto por Internet

Esta guía detalla paso a paso cómo poner en producción **ControlERP** en tu servidor **Ubuntu Linux** (que estará encendido 24/7 en una locación central) y cómo permitir que los clientes y sucursales accedan desde cualquier navegador web en cualquier parte del mundo.

---

## 1. La Mejor Arquitectura de Acceso Remoto: Cloudflare Tunnel

### ¿Por qué Cloudflare Tunnel es la mejor opción?
1. **Sin abrir puertos en el módem/router**: No expones el puerto 80 ni 443 a ataques de fuerza bruta ni escaneos de IP de internet.
2. **Sin IP pública fija**: Funciona incluso si tu proveedor de internet residencial o de oficina (Telmex, Totalplay, Izzi, etc.) te asigna una IP dinámica o usa CGNAT.
3. **Certificado SSL (HTTPS) automático y gratuito**.
4. **Cero instalación en los clientes**: Las sucursales solo abren Google Chrome, Edge o Safari en su laptop, PC o tablet y entran a `https://erp.tuempresa.com`.

---

## 2. Pasos Rápidos de Despliegue en Ubuntu

### Paso 1: Clonar o copiar el proyecto al servidor
En tu servidor Ubuntu:
```bash
git clone <tu-repositorio> /opt/controlerp
cd /opt/controlerp
```

### Paso 2: Ejecutar el script automatizado
Le damos permisos de ejecución al script y lo corremos:
```bash
chmod +x setup-ubuntu.sh
./setup-ubuntu.sh
```
El script instalará Docker, compilará la imagen y dejará el ERP corriendo localmente en el puerto `3000`.

---

## 3. Configuración del Acceso Remoto con Cloudflare Tunnel (5 Minutos)

1. Regístrate gratis en [Cloudflare Dashboard](https://dash.cloudflare.com/) y agrega tu dominio (o subdominio).
2. En el menú lateral izquierdo ve a **Zero Trust** ➡️ **Networks** ➡️ **Tunnels**.
3. Haz clic en **Create a Tunnel** y selecciona **Cloudflared**.
4. Nómbralo: `controlerp-server`.
5. Cloudflare te dará un comando con un **TOKEN** (un texto largo).
6. Copia solo el token y colócalo en tu servidor en el archivo `.env`:
   ```bash
   CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoiOGQ0M2Y...tu_token_aqui
   ```
7. En la pestaña **Public Hostname** en Cloudflare, configura la ruta:
   - **Subdomain**: `erp`
   - **Domain**: `tuempresa.com`
   - **Type**: `HTTP`
   - **URL**: `app:3000` (nombre del contenedor de la app dentro de docker-compose)
8. Reinicia el contenedor en Ubuntu:
   ```bash
   sudo docker-compose up -d --force-recreate cloudflare-tunnel
   ```

**¡Listo!** Ahora cualquier persona con permisos puede acceder desde cualquier dispositivo a:
👉 `https://erp.tuempresa.com` con candado verde SSL y alta velocidad.

---

## 4. Usuarios Preconfigurados de Prueba (Base de Datos Inicial)

| Rol de Usuario | Correo de Acceso | Contraseña | Alcance de Operación |
| :--- | :--- | :--- | :--- |
| **👑 Superadmin SaaS** | `superadmin@controlerp.com` | `admin123` | Plataforma global, alta de negocios y modulación restrictiva |
| **👔 Admin Negocio 1** | `admin@distribuidora.com` | `admin123` | Administrador de Distribuidora Mayorista (control total de su empresa) |
| **👤 Encargado** | `encargado@distribuidora.com` | `encargado123` | Operación comercial, cobranza CxC, compras CxP, solicitud de traspasos |
| **📦 Almacenista** | `almacenista@distribuidora.com` | `almacen123` | Control físico de existencias, recepción y despacho (sin datos financieros) |
| **🔍 Auditor Fiscal** | `auditor@distribuidora.com` | `auditor123` | Solo lectura, kárdex valuado CFF Art. 28, balances y bitácora de auditoría |
| **👔 Admin Negocio 2** | `admin@servicios.com` | `admin123` | Empresa de Servicios (con multi-almacén y traspasos desactivados por Superadmin) |
