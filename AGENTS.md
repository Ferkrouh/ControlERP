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

## Módulos Implementados en el Sistema (Fases 1 a 7 - Odoo Architecture)
1. **Core Foundation (Fase 1):** Multi-tenant SaaS, RBAC de 5 roles (`SUPERADMIN`, `ADMIN`, `ENCARGADO`, `ALMACENISTA`, `AUDITOR`), control estricto de crédito y cartera, CxC, CxP, inventarios multialmacén con Kárdex en tiempo real (Costo Promedio), reportes mensuales y despliegue Docker en Ubuntu.
2. **Ciclo Comercial & POS (Fase 2):** Cotizaciones y presupuestos formales con conversión a venta en 1 clic (`/cotizaciones`), Punto de Venta de mostrador rápido (`/pos`) con escaneo de código de barras, calculadora de cambio y tickets térmicos, arqueo/corte Z de caja (`TurnoCajaPOS`) y listas de precios (`ListaPrecio`).
3. **Cadena de Suministro & 3-Way Matching (Fase 3):** Órdenes de compra autorizadas (`/ordenes-compra`), validación de 3 vías (`OC = Factura/Remisión = Picking físico en almacén`), entregas parciales/totales y control de lotes y fechas de caducidad (`LoteProducto`).
4. **SAT CFDI 4.0 Readiness (Fase 4):** Adaptador fiscal multi-PAC (Finkok, SW Sapien, Prodigia, Simulador), timbrado de facturas de ingreso en 1 clic con XML y UUID SAT (`/ventas`), Complemento de Pago REP 2.0 en abonos a CxC (`/cxc`), y Carta Porte 3.1 en traslados carreteros (`/traspasos`).
5. **Tesorería & Bancos (Fase 5):** Catálogo de cuentas bancarias multimoneda y cajas chicas (`/tesoreria`), flujo de ingresos/egresos con saldo acumulativo y conciliación bancaria en 1 clic (`CuentaBancaria`, `MovimientoBancario`).
6. **Manufactura & MRP (Fase 6):** Listas de Materiales / BOM con componentes y porcentaje de merma (`/manufactura`), órdenes de producción (`OP-YYYY-XXXX`) y motor transaccional de conversión física que descuenta insumos y da entrada al producto terminado recalculando su costo promedio ponderado (`ListaMateriales`, `OrdenProduccion`).
7. **CRM Comercial & Pipeline (Fase 7):** Tablero visual Kanban con 6 etapas de ventas (`/crm`), pronóstico ponderado de ventas (Sales Forecasting) y registro de oportunidades (`OportunidadCRM`).
8. **Contabilidad Electrónica & Pólizas Automáticas (Fase 8 - SAT Anexo 24):** Catálogo de cuentas estructurado con códigos agrupadores del SAT (`/contabilidad`), motor transaccional de pólizas automáticas de partida doble (Ventas, Compras, CxC, CxP, Nómina), balanza de comprobación y exportación de XMLs oficiales para el SAT (`CuentaContable`, `PolizaContable`, `PartidaPoliza`).
9. **Recursos Humanos & Nómina Digital (Fase 9 - CFDI 1.2):** Expediente digital del colaborador (`/nomina`), cálculo fiscal de ISR Art. 96 y cuotas obrero-patronales IMSS, prenómina quincenal, timbrado digital de recibos con QR oficial, archivo layout de dispersión bancaria y póliza contable automática (`Empleado`, `PeriodoNomina`, `ReciboNomina`, `IncidenciaNomina`).
10. **Suite de Reportes Avanzados & Analítica Financiera (Fase 10):** Centro de inteligencia financiera y comercial (`/reportes`) estructurado en 4 pestañas ejecutivas: Balanza CxC, Antigüedad de Saldos por Rangos, Ingresos y Recaudación Real, Conciliación Cotización/Venta vs Facturas, Pronóstico Ponderado CRM (Forecasting), Lifetime Value (LTV), Ventas por Producto y Márgenes, Comisiones de Vendedores con Liquidación e Impresión de Ticket Térmico, Cumplimiento de Cuotas Mensuales y Control de Notas de Crédito / Descuentos. Navegación directa simplificada en el Sidebar.
11. **Consola de Personalización Extrema de Espacios de Negocio (Fase 11 - Superadmin Master):** Panel de control quirúrgico para SUPERADMIN (`/superadmin/personalizar`) que permite seleccionar cualquier inquilino y activar/desactivar de forma granular más de 50 módulos y microfunciones operativas (Corte Z, Fondo de caja, Escaneo rápido, 3-Way Match, Lotes, Carta Porte, Conciliación, BOM, Nómina, 10 Reportes independientes), aplicar 5 plantillas instantáneas (Retail, Mayorista, MRP, Full Suite, Mínimo), calibrar cuotas de infraestructura (usuarios/almacenes), políticas de crédito, credenciales PAC fiscal y marca/paleta de color con previsualización en vivo.




