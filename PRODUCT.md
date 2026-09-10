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
- **Control de Crédito:** Límites de crédito por cliente, control de días de vencimiento, periodos de gracia y modos de bloqueo (ESTRICTO vs ADVERTENCIA).
- **Gestión de Stock:** Multialmacén, control de stock mínimo/máximo, trazabilidad mediante Kardex.
- **Fiscal / Localización:** Preparación para catálogo SAT CFDI 4.0, manejo de RFC, Régimen Fiscal y Código Postal.
- **Stack Técnico:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Prisma ORM con SQLite/PostgreSQL.

## Brand Commitments

- **Nombre:** ControlERP.
- **Voz y Tono:** Profesional, confiable, directo y ágil. Lenguaje financiero y de inventarios claro, sin fricciones innecesarias ni ambigüedades.
- **Identidad:** Modular y personalizable por empresa (logo y color primario configurable por tenant para la emisión de documentos e interfaz corporativa).

## Evidence on Hand

- Código fuente en Next.js 15 con rutas completas (`/ventas`, `/inventarios`, `/compras`, `/cxc`, `/cxp`, `/traspasos`, `/auditoria`, `/negocios`, `/reportes`).
- Modelo de datos Prisma detallado en [schema.prisma](file:///c:/Proyectos/ControlERP/prisma/schema.prisma) con modelos `Tenant`, `Usuario`, `Cliente`, `Proveedor`, `Producto`, `Almacen`, `Venta`, `Compra`, `CuentaPorCobrar`, `CuentaPorPagar`, `MovimientoKardex` y `RegistroAuditoria`.
- Sistema de autenticación con JWT (`jose`) y roles bien diferenciados con dashboards específicos por rol en `@/components/dashboards/`.

## Product Principles

1. **La integridad de inventario y saldos es sagrada:** Cada salida, entrada o cambio de crédito debe estar respaldado por un movimiento auditable y trazable.
2. **Claridad sobre complejidad:** Los procesos de almacén y cobro deben ejecutarse con la menor cantidad de clics y sin ambigüedad en los datos mostrados.
3. **Gobierno por rol sin estorbos:** Cada usuario ve exactamente la información relevante para su trabajo, sin saturar la pantalla con opciones para las que no tiene permiso.
4. **Respuesta inmediata en operaciones críticas:** La búsqueda de clientes, productos y validación de crédito debe ser instantánea.
