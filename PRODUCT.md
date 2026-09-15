# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Superadmin (Plataforma):** Administra tenants (empresas), asigna suscripciones/módulos activados, y supervisa la salud operativa global.
- **Admin del Negocio:** Dueño o director de la distribuidora/empresa. Configura políticas comerciales, almacenes, usuarios, líneas de crédito, días de gracia y personalización visual de su empresa.
- **Encargado / Ventas:** Realiza cotizaciones, ventas de contado o crédito, consulta límites de crédito de clientes y saldos vencidos, y registra abonos o solicitudes.
- **Almacenista:** Gestiona entradas por compras, traspasos entre almacenes, ajustes de stock y consultas de Kardex.
- **Auditor / Contador:** Revisa pólizas, reportes de compras, ventas, márgenes, movimientos de inventario, auditoría de cambios y preparación de facturación SAT.

## Product Purpose

ControlERP es una plataforma SaaS multi-tenant diseñada para empresas de distribución y mayoreo que requieren control riguroso de inventarios en múltiples almacenes, gestión estricta de crédito y cobranza (CxC y CxP), trazabilidad total de auditoría y preparación para facturación fiscal (CFDI 4.0 en México / RFC). Su éxito se mide en la reducción de mermas de inventario, prevención de cartera vencida y facilidad operativa para cada rol del negocio.

## Positioning

A diferencia de los ERPs tradicionales costosos, rígidos o de los puntos de venta genéricos pensados solo para mostrador minorista, ControlERP proporciona una solución web moderna, rápida y multi-rol que combina gobierno multiempresa con políticas comerciales flexibles (política de bloqueo de crédito estricto o advertencia, días de gracia, trazabilidad por almacén y Kardex en tiempo real).

## Operating Context

- **Entorno:** Aplicación web de escritorio y tabletas para oficinas comerciales, bodegas de almacén y mostradores de distribución mayorista.
- **Flujos clave:**
  - Venta con validación inmediata de saldo y límite de crédito disponible.
  - Recepción de órdenes de compra y alimentación automática de existencias y costos ponderados.
  - Traspasos entre almacenes con estados (solicitado, en tránsito, recibido).
  - Cobranza y pagos con recibos y actualización de saldo en tiempo real.
  - Auditoría transparente de operaciones críticas (quién modificó precios, autorizó crédito o ajustó inventario).

## Capabilities and Constraints

- **Multi-tenancy:** Aislamiento estricto por `tenantId` en datos transaccionales, configurable por empresa.
- **Control de Crédito & Cartera:** Límites de crédito por cliente, control de días de vencimiento, periodos de gracia y modos de bloqueo (`ESTRICTO` vs `ADVERTENCIA`).
- **Punto de Venta (POS) & Comercial:** Terminal POS rápida de mostrador con escaneo de código de barras, arqueo/corte Z de caja (`TurnoCajaPOS`), listas de precios diferenciadas (`ListaPrecio`) y cotizaciones formales con conversión a venta en 1 clic (`/cotizaciones`).
- **Cadena de Suministro & 3-Way Matching:** Órdenes de compra autorizadas (`/ordenes-compra`), validación cruzada tripartita (OC = Factura/Remisión = Picking físico en almacén), entregas parciales/totales y control de lotes con fechas de caducidad (`LoteProducto`).
- **Gestión de Stock & Kardex:** Multialmacén, control de stock mínimo/máximo, traspasos interestatales con estatus, y Kárdex transaccional con cálculo continuo de Costo Promedio Ponderado.
- **SAT CFDI 4.0 (México):** Facturación electrónica multi-PAC (Finkok, SW Sapien, Prodigia, Simulador), timbrado de facturas de ingreso en 1 clic con XML y UUID SAT, Recibo Electrónico de Pago (REP 2.0) en abonos a CxC y Carta Porte 3.1 en traslados de almacén.
- **Tesorería & Bancos:** Catálogo de cuentas bancarias multimoneda y cajas chicas (`/tesoreria`), flujo de ingresos/egresos con saldo acumulativo y conciliación bancaria en 1 clic (`CuentaBancaria`, `MovimientoBancario`).
- **Manufactura & MRP:** Listas de Materiales / BOM con componentes y porcentaje de merma (`/manufactura`), órdenes de producción (`OrdenProduccion`) y motor transaccional de conversión física que descuenta insumos y da entrada al producto terminado recalculando su costo promedio ponderado.
- **CRM Comercial & Pipeline:** Tablero visual Kanban con 6 etapas de ventas (`/crm`), pronóstico ponderado de ventas (Sales Forecasting) y registro de oportunidades (`OportunidadCRM`).
- **Contabilidad Electrónica (SAT Anexo 24):** Catálogo de cuentas con código agrupador oficial (`/contabilidad`), motor transaccional de pólizas automáticas de partida doble (ingreso, egreso, diario), balanza de comprobación y exportación de XMLs oficiales para el SAT (`CuentaContable`, `PolizaContable`, `PartidaPoliza`).
- **Recursos Humanos & Nómina CFDI 1.2:** Expediente digital de colaboradores (`/nomina`), cálculo fiscal automatizado de ISR (Art. 96 LISR) y cuotas obrero-patronales IMSS, timbrado digital de recibos con QR SAT, dispersión bancaria masiva y póliza contable automática (`Empleado`, `PeriodoNomina`, `ReciboNomina`, `IncidenciaNomina`).
- **Stack Técnico:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Prisma ORM con SQLite/PostgreSQL y Docker para despliegue en Linux Ubuntu.

## Brand Commitments

- **Nombre:** ControlERP.
- **Voz y Tono:** Profesional, confiable, directo y ágil. Estilo "The Fintech Ledger" con pulcritud financiera, rigor contable y precisión transaccional estilo banca corporativa moderna.
- **Identidad:** Modular y personalizable por empresa (logo y color primario configurable por tenant para la emisión de documentos e interfaz corporativa).
- **The Fiscal Code Rule:** SKU, códigos de barras, RFCs, folios fiscales (UUID) e importes monetarios deben usar siempre tipografía monoespaciada (`font-mono`).

## Evidence on Hand

- Código fuente en Next.js 15 con rutas completas (`/ventas`, `/inventarios`, `/compras`, `/cxc`, `/cxp`, `/traspasos`, `/auditoria`, `/negocios`, `/reportes`, `/cotizaciones`, `/pos`, `/ordenes-compra`, `/tesoreria`, `/manufactura`, `/crm`, `/contabilidad`, `/nomina`).
- Modelo de datos Prisma detallado en [schema.prisma](file:///c:/Proyectos/ControlERP/prisma/schema.prisma) con 35 modelos completamente integrados.
- Sistema de autenticación con JWT (`jose`) y roles bien diferenciados con dashboards específicos por rol en `@/components/dashboards/`.

## Product Principles

1. **La integridad de inventario y saldos es sagrada:** Cada salida, entrada, transformación física (MRP) o cambio de crédito debe estar respaldado por un movimiento auditable y trazable en Kárdex o auditoría.
2. **Claridad sobre complejidad:** Los procesos de almacén, cobro, facturación y POS deben ejecutarse con la menor cantidad de clics y sin ambigüedad en los datos mostrados.
3. **Gobierno por rol sin estorbos:** Cada usuario ve exactamente la información relevante para su trabajo (`SUPERADMIN`, `ADMIN`, `ENCARGADO`, `ALMACENISTA`, `AUDITOR`), sin saturar la pantalla con opciones para las que no tiene permiso.
4. **Respuesta inmediata en operaciones críticas:** La búsqueda de clientes, escaneo de productos por código de barras y validación de crédito debe ser instantánea.
