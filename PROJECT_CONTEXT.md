# PROJECT_CONTEXT.md — ControlERP Master Blueprint & Agent Onboarding

Este documento está diseñado como la **fuente canónica de verdad y memoria operativa** para cualquier agente de programación (Codex, Claude Code, Antigravity, Cursor, etc.) o ingeniero de software que se incorpore a colaborar en **ControlERP**. Contiene la visión técnica, modelo de negocio, arquitectura, estado de avance por fases, métricas, historial de modificaciones recientes y requerimientos clave para su ejecución y despliegue.

---

## 1. Visión General del Producto y Propósito

- **Producto:** ControlERP (SaaS Multiempresa / Multi-tenant).
- **Enfoque de Negocio:** Control integral para distribución, mayoreo, inventarios multialmacén con Kárdex en tiempo real, gestión estricta de crédito y cobranza (CxC y CxP), trazabilidad total de auditoría y preparación completa para el ecosistema fiscal mexicano (SAT CFDI 4.0, REP 2.0, Carta Porte 3.1, Contabilidad Electrónica Anexo 24 y Nómina CFDI 1.2).
- **Propósito:** Eliminar mermas de stock, blindar la cartera contra clientes morosos mediante políticas automáticas de crédito, automatizar la emisión fiscal y proporcionar una plataforma robusta y ágil para el mostrador mayorista y la dirección general.

---

## 2. Stack Tecnológico y Arquitectura

| Componente | Tecnología / Librería | Notas de Implementación |
| :--- | :--- | :--- |
| **Framework Web** | Next.js 15 (App Router) | React 19, Server Components y Route Handlers (`/api/*`) |
| **Lenguaje** | TypeScript 5.8+ | Tipado estricto en APIs, modelos y componentes |
| **Estilos & Diseño** | Tailwind CSS 3.4 | Sistema de tokens corporativo *"The Fintech Ledger"* |
| **ORM / Base de Datos** | Prisma ORM 6.4.1 | Dualidad con scripts de cambio rápido: SQLite (desarrollo local) y PostgreSQL (producción) |
| **Autenticación** | JWT con `jose` + bcryptjs | Multi-tenant aislado por cookie `token` y validación por sesión |
| **Motor Fiscal (SAT)** | Adaptador Multi-PAC | Finkok, SW Sapien, Prodigia y Simulador local con generación de XML sellado y QR SAT |
| **Motor de Documentos** | jsPDF + jspdf-autotable | Facturas, Cotizaciones, Recibos REP y Tickets térmicos 80mm bajo diseño estricto |
| **Mensajería & Correo** | Nodemailer | Envío directo de comprobantes con XML y PDF oficial adjunto |
| **IA Copilot** | Vercel AI SDK (`ai`, `@ai-sdk/openai`) | Asistente `ControlBot` con function calling multi-paso e inteligencia de catálogos |

---

## 3. Matriz de Roles y Control de Acceso (RBAC)

1. **`SUPERADMIN`**: Gestión de inquilinos (`Tenant`), activación/desactivación granular de más de 50 módulos SaaS, cuotas de infraestructura y métricas globales del SaaS.
2. **`ADMIN`**: Dueño o director de la empresa. Configura políticas de crédito (días de gracia, alerta vs bloqueo estricto), almacenes, sucursales, usuarios, listas de precios y personalización corporativa.
3. **`ENCARGADO`**: Operación comercial, Punto de Venta (POS), cotizaciones, consulta de límites de crédito, registro de abonos a CxC y solicitudes de traspaso de stock.
4. **`ALMACENISTA`**: Entrada física de compras (validación 3-way matching), picking, confirmación de traspasos interestatales, control de lotes/caducidades y Kárdex (vista restringida de costos).
5. **`AUDITOR / CONTADOR`**: Balanza de comprobación, pólizas contables automáticas, auditoría de modificaciones a precios y límites de crédito, reportes de rentabilidad y timbrado fiscal.

---

## 4. Estado de Avance por Fases (Odoo-Scale Architecture)

| Fase | Módulo / Capacidad | Estado | Rutas Clave |
| :---: | :--- | :---: | :--- |
| **Fase 1** | **Core Foundation & Multi-Tenant**: Aislamiento por `tenantId`, 5 roles RBAC, multialmacén, Kárdex (Costo Promedio Ponderado), CxC, CxP y despliegue Docker. | ✅ 100% | `/inventarios`, `/compras`, `/cxc`, `/cxp`, `/traspasos`, `/auditoria` |
| **Fase 2** | **Ciclo Comercial & POS**: Cotizaciones formales (edición/eliminación en vivo), POS rápido con lector de código de barras, calculadora de cambio, arqueo de caja (Corte Z) y listas de precios. | ✅ 100% | `/cotizaciones`, `/pos` |
| **Fase 3** | **Supply Chain & 3-Way Matching**: Órdenes de compra autorizadas, validación tripartita (OC vs Factura Proveedor vs Recepción Almacén), recepciones parciales y lotes/caducidad. | ✅ 100% | `/ordenes-compra`, `/compras` |
| **Fase 4** | **SAT CFDI 4.0 Readiness**: Multi-PAC (Finkok, SW Sapien, Prodigia, Mock), timbrado en 1 clic con XML y UUID, Recibo Electrónico de Pago (REP 2.0) y Carta Porte 3.1. | ✅ 100% | `/ventas`, `/cxc`, `/traspasos` |
| **Fase 5** | **Tesorería & Conciliación Bancaria**: Cuentas bancarias multimoneda, cajas chicas, flujo de caja acumulativo y conciliación de movimientos en 1 clic. | ✅ 100% | `/tesoreria` |
| **Fase 6** | **Manufactura & MRP**: Listas de Materiales (BOM) con porcentaje de merma, órdenes de producción (`OP-YYYY-XXXX`) y deducción automática de insumos con entrada de producto terminado. | ✅ 100% | `/manufactura` |
| **Fase 7** | **CRM Comercial & Pipeline**: Tablero Kanban interactivo con 6 etapas de venta, pronóstico de ventas ponderado por probabilidad (Forecasting) y bitácora de oportunidades. | ✅ 100% | `/crm` |
| **Fase 8** | **Contabilidad Electrónica (Anexo 24)**: Catálogo de cuentas con códigos agrupadores SAT, pólizas contables automáticas de partida doble (ventas, compras, CxC, nómina) y balanza. | ✅ 100% | `/contabilidad` |
| **Fase 9** | **Recursos Humanos & Nómina CFDI 1.2**: Expediente de colaboradores, cálculo fiscal ISR Art. 96 e IMSS, prenómina quincenal, timbrado de recibos con QR y layouts bancarios. | ✅ 100% | `/nomina` |
| **Fase 10** | **Suite de Reportes & Analítica Financiera**: Centro de inteligencia financiera con 4 macro-pestañas: Balanza CxC, Antigüedad de Saldos, Márgenes, Comisiones con Ticket Térmico y LTV. | ✅ 100% | `/reportes` |
| **Fase 11** | **Consola de Personalización Extrema**: Panel para Superadmin con interruptores para más de 50 submódulos, 5 plantillas instantáneas (Retail, Wholesale, MRP, etc.), cuotas y temas. | ✅ 100% | `/superadmin/personalizar` |

---

## 5. Historial de Modificaciones Recientes (Changelog de Commits)

- **`fcda953` — feat(cotizaciones): Modificación y Eliminación Dinámica con Recálculo en Vivo**
  - Implementación de botones de acción rápida para editar y cancelar cotizaciones en estado `PENDIENTE`.
  - Modal reactivo con ajuste de cantidades, precios, descuentos y recálculo automático de IVA/IEPS/Total en [`src/app/cotizaciones/page.tsx`](file:///c:/Proyectos/ControlERP/src/app/cotizaciones/page.tsx).
  - Endpoints seguros `PATCH` y `DELETE` en [`src/app/api/cotizaciones/[id]/route.ts`](file:///c:/Proyectos/ControlERP/src/app/api/cotizaciones/[id]/route.ts).
- **`c498731` — fix(controlbot): Resolución Multi-paso y Búsqueda Inteligente en Catálogo**
  - Corrección en la integración de Vercel AI SDK para procesar herramientas encadenadas sin perder contexto.
  - Búsqueda difusa de productos por SKU, nombre y categoría en [`src/lib/ai/tools.ts`](file:///c:/Proyectos/ControlERP/src/lib/ai/tools.ts).
- **`e3438e3` — feat(email): Envío de Comprobantes CFDI 4.0 con PDF+XML y Cotizaciones**
  - Servicio SMTP/Nodemailer en [`src/lib/email-service.ts`](file:///c:/Proyectos/ControlERP/src/lib/email-service.ts).
  - Envío automático o a petición de Facturas de Venta (`PDF + XML oficial`), Recibos Electrónicos de Pago (REP 2.0) y Cotizaciones formales en [`/ventas`](file:///c:/Proyectos/ControlERP/src/app/ventas/page.tsx) y [`/cotizaciones`](file:///c:/Proyectos/ControlERP/src/app/cotizaciones/page.tsx).
- **`3ea8516` & `2cc4b88` — feat/fix(pdf): Rediseño Corporativo bajo "The Fintech Ledger"**
  - Rediseño de motor de renderizado PDF en [`src/lib/pdf-service.ts`](file:///c:/Proyectos/ControlERP/src/lib/pdf-service.ts).
  - Tipografía monoespaciada para claves SAT, UUIDs fiscales e importes, márgenes uniformes, tickets térmicos para impresoras de 80mm y prevención de traslapes en membretes.

---

## 6. Métricas y KPIs de la Plataforma

- **Modelos de Datos en Prisma:** 35 modelos relacionales fuertemente tipados en [`prisma/schema.prisma`](file:///c:/Proyectos/ControlERP/prisma/schema.prisma).
- **Aislamiento Multi-Tenant:** 100% de las consultas transaccionales filtradas por `tenantId`.
- **Rendimiento de Carga:** Respuesta local en desarrollo `< 2.0s`, puerto por defecto de desarrollo `3222`.
- **Validación de Crédito:** Validación síncrona en milisegundos en punto de venta y pedidos, impidiendo ventas si se excede el límite de crédito o existen facturas vencidas (modo `ESTRICTO`).
- **Trazabilidad Kárdex:** Balance cero de inconsistencias; cualquier entrada o salida de almacén (incluyendo ensamblaje MRP o traspaso) genera un registro inmutable con costo promedio ponderado.

---

## 7. Requerimientos para Ejecución y Despliegue

### Requisitos del Sistema
- **Node.js:** Versión 20.x o 22.x LTS.
- **Gestor de Paquetes:** `npm` (o `pnpm`).
- **Base de Datos:**
  - *Desarrollo local:* SQLite (`prisma/dev.db`).
  - *Producción:* PostgreSQL 16+ en Linux Ubuntu / Docker.

### Variables de Entorno Clave (`.env`)
```bash
# Conexión de Base de Datos
DATABASE_URL="file:./dev.db"        # SQLite local
# DATABASE_URL="postgresql://user:password@localhost:5432/controlerp" # Producción

# Seguridad & Autenticación
JWT_SECRET="tu-clave-secreta-jwt-de-minimo-32-caracteres"

# Facturación SAT (PAC)
PAC_PROVIDER="SIMULADOR"            # FINKOK | SW_SAPIEN | PRODIGIA | SIMULADOR
PAC_USER="usuario_pac_o_rfc"
PAC_PASSWORD="password_pac"

# Envío de Correos (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="notificaciones@tudominio.com"
SMTP_PASS="tu_contraseña_de_aplicacion"
SMTP_FROM="ControlERP <notificaciones@tudominio.com>"

# Inteligencia Artificial (ControlBot)
OPENAI_API_KEY="sk-..."
```

### Comandos de Operación
```bash
# 1. Instalar dependencias
npm install

# 2. Sincronizar esquema y generar cliente Prisma
npm run prisma:generate
npm run db:push

# 3. Cargar datos semilla (Tenants, usuarios demo, productos, cuentas contables)
npm run db:seed

# 4. Iniciar entorno de desarrollo (puerto 3222)
npm run dev

# 5. Compilación para producción
npm run build
npm start
```

---

## 8. Reglas de Diseño e Ingeniería para Agentes de Código

Cualquier agente que modifique este repositorio debe obedecer estrictamente las siguientes directrices:

1. **The Fiscal Code Rule:** Todo SKU, código de barras, RFC, folio fiscal UUID e importes monetarios deben formatearse con tipografía monoespaciada (`font-mono`).
2. **The Sovereign Lift Rule:** Todos los modales y formularios emergentes deben usar elevación profunda sobre fondo desenfocado (`backdrop-blur-sm bg-slate-950/60`).
3. **No Slop:** Prohibidos los degradados estridentes o diseños genéricos tipo plantilla de IA. Seguir la paleta sobria corporativa definida en [`DESIGN.md`](file:///c:/Proyectos/ControlERP/DESIGN.md).
4. **Integridad Transaccional:** Nunca restar o sumar inventario directamente en la tabla de productos sin insertar el correspondiente `MovimientoKardex` o validar el almacén específico.
5. **Aislamiento Multi-Tenant:** Cada endpoint API en `src/app/api/*` debe obtener la sesión del usuario mediante `await getSessionUser()` y forzar la cláusula `where: { tenantId }`.
