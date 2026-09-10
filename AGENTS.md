# ControlERP — Contexto de Memoria y Reglas de Proyecto

## Visión General del Proyecto
- **Proyecto:** ControlERP (SaaS Multiempresa / Multi-tenant).
- **Enfoque:** Control integral para distribución, mayoreo, inventarios multialmacén con Kárdex en tiempo real, gestión estricta de crédito y cobranza (CxC y CxP), trazabilidad total de auditoría y preparación para facturación SAT CFDI 4.0 (México).
- **Stack Tecnológico:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Prisma ORM con SQLite (desarrollo) y PostgreSQL / Docker para producción en Linux Ubuntu.

## Arquitectura de Roles y Acceso
1. **SUPERADMIN:** Gestión global de inquilinos (`Tenant`), activación/desactivación de módulos SaaS y supervisión de infraestructura.
2. **ADMIN:** Dueño o director de la empresa. Configura políticas de crédito (días de gracia, alerta de vencimiento, política estricta vs. advertencia), almacenes, usuarios y personalización de marca.
3. **ENCARGADO:** Operación de ventas (contado/crédito), consulta de saldos y límites de crédito de clientes, abonos a CxC y solicitudes de traspasos entre almacenes.
4. **ALMACENISTA:** Gestión física de inventario: recepción de compras, confirmación de traspasos, ajustes de stock y kárdex transaccional. Vista restringida de costos.
5. **AUDITOR / CONTADOR:** Revisión fiscal y contable, pólizas, auditoría de cambios en precios/límites de crédito y reportes de rentabilidad.

## Sistema de Diseño Normativo ("The Fintech Ledger")
- **Creative North Star:** "The Fintech Ledger" (pulcritud financiera, rigor de auditoría contable y precisión transaccional estilo banca corporativa moderna).
- **Fuentes Canónicas:**
  - Archivo maestro de tokens: [`DESIGN.md`](file:///c:/Proyectos/ControlERP/DESIGN.md)
  - Sidecar de componentes y metadata: [`.impeccable/design.json`](file:///c:/Proyectos/ControlERP/.impeccable/design.json)
  - Verdad de producto: [`PRODUCT.md`](file:///c:/Proyectos/ControlERP/PRODUCT.md)
- **Reglas de Diseño Esenciales:**
  - **The Tenant Identity Rule:** Respetar el color primario de cada empresa (`tenant.colorPrimario`), sin alterar la semántica de estados críticos.
  - **The Fiscal Code Rule:** SKU, códigos de barras, RFCs, folios fiscales (UUID) e importes monetarios deben usar siempre tipografía monoespaciada (`font-mono`).
  - **The Sovereign Lift Rule:** Modales críticos y formularios clave con elevación profunda sobre fondo desenfocado (`backdrop-blur-sm bg-slate-950/60`).
  - **The Card Float Principle:** Tarjetas principales y KPIs con profundidad espacial (`shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5`).
  - **No Slop:** Prohibidos los degradados estridentes estilo AI (`from-purple-900 to-indigo-900`); preferir fondos navy o corporativos sólidos y sobrios.

## Convenciones de Base de Datos y APIs
- Todos los modelos transaccionales deben aislarse estrictamente por `tenantId`.
- Las modificaciones a límites de crédito, precios o existencias deben registrarse en `RegistroAuditoria` o `MovimientoKardex`.
