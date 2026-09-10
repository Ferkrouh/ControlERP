---
name: ControlERP
description: Multiplatform SaaS ERP for wholesale inventory, credit governance, and ledger precision
colors:
  primary: "#2563eb"
  primary-hover: "#1d4ed8"
  primary-soft: "#eff6ff"
  platform-purple: "#7c3aed"
  platform-purple-soft: "#f5f3ff"
  neutral-bg: "#f8fafc"
  neutral-surface: "#ffffff"
  neutral-surface-dark: "#0f172a"
  neutral-sidebar: "#020617"
  neutral-text: "#0f172a"
  neutral-muted: "#64748b"
  neutral-border: "#e2e8f0"
  neutral-border-dark: "#1e293b"
  status-success: "#10b981"
  status-success-soft: "#ecfdf5"
  status-warning: "#f59e0b"
  status-warning-soft: "#fffbeb"
  status-danger: "#ef4444"
  status-danger-soft: "#fef2f2"
typography:
  display:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.25
  headline:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.25
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-surface}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.lg}"
    padding: "10px 14px"
  card-floating:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.xl}"
    padding: "24px"
---

# Design System: ControlERP

## Overview

**Creative North Star: "The Fintech Ledger"**

ControlERP encarna la pulcritud financiera, el rigor de auditoría contable y la precisión transaccional de una institución de banca corporativa moderna adaptada al dinamismo de la distribución mayorista y la logística multialmacén. Cada elemento en pantalla transmite solvencia, certidumbre numérica e inmediatez de control.

La interfaz fusiona una navegación lateral profunda (`#020617` / `#0f172a`) con áreas de trabajo claras sobre lienzo neutro (`#f8fafc`). Los datos numéricos, saldos de crédito, estatus fiscales y movimientos de inventario se jerarquizan con absoluta claridad tipográfica y códigos cromáticos semánticos sin ambigüedad. La experiencia de usuario elimina la saturación decorativa para empoderar tanto al administrador de la empresa como al almacenista y al auditor fiscal.

**Key Characteristics:**
- **Claridad contable y tipográfica:** Contraste balanceado, códigos alfanuméricos y fiscales en fuentes monoespaciadas legibles y cifras destacadas.
- **Tarjetas flotantes elevadas:** Contenedores con profundidad espacial que delimitan estados financieros y métricas críticas sobre el lienzo de trabajo.
- **Cromática semántica rigurosa:** Verde para flujos y cobros acreditados, ámbar para alertas de vencimiento/stock y carmín para bloqueos de crédito y desabasto.
- **Gobernanza cromática por rol:** Acentos púrpura profundo exclusivos para el Superadmin de la nube SaaS y azul corporativo o color de identidad de tenant para la operación de negocio.

## Colors

La paleta equilibra un azul corporativo de alta confianza con fondos neutros pulcros y acentos de estado categóricos para auditoría financiera.

### Primary
- **Ledger Corporate Blue** (#2563eb): Color rector para botones de acción principal, encabezados activos y navegación primaria en la operativa del negocio.
- **Ledger Blue Deep** (#1d4ed8): Estado hover y confirmación interactiva para llamadas a la acción primarias.
- **Ledger Blue Soft** (#eff6ff): Resaltados tenues, fondos de selección y etiquetas de estado activo para inquilinos.

### Secondary
- **Platform Sovereign Violet** (#7c3aed): Reservado exclusivamente para la vista, credenciales y navegación global de nivel Superadmin SaaS.
- **Platform Violet Soft** (#f5f3ff): Fondos de insignia y alertas administrativas de infraestructura SaaS.

### Neutral
- **Ledger Canvas** (#f8fafc): Fondo general del espacio de trabajo que descansa la vista en jornadas prolongadas.
- **Clean Surface** (#ffffff): Superficie para tarjetas de métricas, tablas de inventario y diálogos modales.
- **Slate Text Primary** (#0f172a): Tono de alto contraste para encabezados, totales y etiquetas clave.
- **Slate Text Muted** (#64748b): Indicadores secundarios, timestamps, descripciones y placeholders.
- **Border Slate** (#e2e8f0): Líneas divisorias de columnas y contornos de tarjetas.
- **Deep Navy Sidebar** (#020617): Fondo del menú de navegación lateral con borde divisorio (#1e293b).

### Status
- **Audit Emerald** (#10b981 / #ecfdf5): Ventas liquidadas, stock óptimo y aprobaciones de crédito.
- **Warning Amber** (#f59e0b / #fffbeb): Facturas próximas a vencer, días de gracia y stock bajo mínimos.
- **Risk Crimson** (#ef4444 / #fef2f2): Crédito bloqueado, cartera vencida, faltantes de inventario y anulaciones.

### Named Rules
**The Tenant Identity Rule.** La interfaz respeta el color primario asignado por cada negocio (`tenant.colorPrimario`), pero nunca reemplaza los colores semánticos de riesgo, auditoría ni el púrpura del Superadmin.

**The Financial Signal Rule.** Ningún número financiero o nivel de stock crítico se muestra sin su contexto semántico (icono, etiqueta de estado o contraste cromático explícito).

## Typography

**Display Font:** `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
**Body Font:** `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
**Label/Mono Font:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

**Character:** Tipografía nativa de alta legibilidad en pantallas de densidad variable con renderizado optimizado para tablas de datos densas, importes monetarios y números de folio.

### Hierarchy
- **Display** (700, 1.875rem / 30px, 1.25): Títulos de módulos principales y cifras macro de balance.
- **Headline** (700, 1.5rem / 24px, 1.3): Encabezados de dashboards y modales de alta prioridad.
- **Title** (600, 1.125rem / 18px, 1.4): Nombres de secciones, tarjetas KPI y columnas maestras.
- **Body** (400, 0.875rem / 14px, 1.5): Datos de celdas en tablas, formularios y descripciones.
- **Label** (600, 0.75rem / 12px, 1.25): Badges de estatus, encabezados de columnas de tabla y datos fiscales (RFC/SKU).

### Named Rules
**The Fiscal Code Rule.** Los números de parte (SKU), códigos de barras, RFCs, folios fiscales (UUID) y cantidades en moneda deben utilizar tipografía monoespaciada para evitar desalineación visual al comparar registros.

## Layout

El espacio de trabajo se organiza con una barra lateral izquierda fija de 256px (`w-64`) en tono oscuro, una barra de navegación superior fija (`h-16`) con información del tenant y selector de roles, y un contenedor principal fluido con padding interior generoso (`p-6` a `p-8`) sobre fondo `#f8fafc`.

- **Métricas:** Rejillas adaptables de 3 a 4 columnas (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`).
- **Tablas de Datos:** Diseño expansivo con barra superior de filtros unificada (búsqueda rápida por SKU/nombre + selectores de almacén/periodo + botones de acción).
- **Densidad:** Densidad media-alta optimizada para visualización simultánea de balances, inventarios y listas transaccionales sin scroll vertical innecesario.

## Elevation & Depth

El sistema adopta una filosofía de **sombras profundas pronunciadas con tarjetas flotantes elevadas**. En lugar de interfaces puramente planas, las tarjetas principales de métricas, paneles de balance y cuadros modales se elevan del lienzo para focalizar la atención y separar la información operativa del fondo estructural.

### Shadow Vocabulary
- **Card Float** (`0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`): Aplicada a tarjetas KPI, paneles de balance ejecutivo y contenedores centrales.
- **Hover Lift** (`0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 10px 10px -5px rgba(15, 23, 42, 0.06)`): Elevación reactiva suave para tarjetas interactivas y botones principales al situar el cursor.
- **Modal Elevation** (`0 25px 50px -12px rgba(15, 23, 42, 0.25)`): Elevación máxima para formularios modales de ventas, ajustes de stock y autorizaciones de crédito.

### Named Rules
**The Sovereign Lift Rule.** Los modales y diálogos de confirmación crítica emplean una sombra profunda combinada con un telón de fondo desenfocado (`backdrop-blur-sm bg-slate-950/60`), forzando concentración total en la acción contable.

## Shapes

- **Contenedores y Tarjetas:** Esquinas suavemente redondeadas de 12px a 16px (`rounded-xl` / `rounded-2xl`) con bordes sutiles de 1px en `#e2e8f0` para delimitar nítidamente los volúmenes flotantes.
- **Botones y Campos de Entrada:** Radio consistente de 8px a 10px (`rounded-lg` / `rounded-xl`) para un tacto equilibrado y ergonómico.
- **Insignias / Badges:** Píldoras redondeadas completas (`rounded-full`) para estados (Vigente, Vencido, Por Surtir, Admin).

## Components

### Buttons
- **Shape:** Radio de 8px a 10px (`rounded-lg` / `rounded-xl`).
- **Primary:** Fondo `#2563eb`, texto `#ffffff`, padding `10px 16px`, tipografía semibold (14px). Transición `all 0.15s ease`.
- **Secondary / Subtle:** Fondo `#ffffff`, borde `1px solid #e2e8f0`, texto `#0f172a`, hover `#f8fafc`.
- **Danger:** Fondo `#ef4444`, texto `#ffffff`, reservado para anulaciones o bloqueos de crédito.

### Cards / Containers
- **Corner Style:** 12px a 16px (`rounded-xl` / `rounded-2xl`).
- **Background:** `#ffffff` con borde `1px solid #e2e8f0`.
- **Elevation:** Sombra `Card Float` con transición de escala/sombra al interactuar.
- **Internal Padding:** `20px` a `24px` (`p-5` / `p-6`).

### Inputs / Form Fields
- **Style:** Fondo `#ffffff` (o `#020617` en login/sidebar), borde `#cbd5e1` / `#e2e8f0`, radio `8px` a `10px`, padding `10px 14px`.
- **Focus:** Anillo sutil y desplazamiento de borde a `#2563eb` con `outline: none`.
- **Icons:** Iconos funcionales de 16px integrados a la izquierda (`Search`, `Barcode`, `Mail`, `Lock`).

### Navigation
- **Sidebar:** Fondo `#020617`, enlaces en `#cbd5e1` con hover en `#0f172a` y estado activo con acento `#2563eb` (o `#7c3aed` para Superadmin).
- **Navbar:** Encabezado blanco flotante con sombra suave, logotipo de tenant dinámico y conmutador rápido de rol.

### Status Badges
- **Formato:** `px-2.5 py-0.5 rounded-full text-xs font-semibold border`.
- **Variantes:** Verde (`bg-emerald-50 text-emerald-700 border-emerald-200`), Ámbar (`bg-amber-50 text-amber-700 border-amber-200`), Rojo (`bg-rose-50 text-rose-700 border-rose-200`), Azul (`bg-blue-50 text-blue-700 border-blue-200`).

## Do's and Don'ts

### Do:
- **Do** presentar importes monetarios formateados con separador de miles y dos decimales (`$1,250.00 MXN`).
- **Do** utilizar tipografía monoespaciada para folios, RFCs, SKUs y números de serie en todas las tablas y tarjetas.
- **Do** aplicar la sombra flotante (`Card Float`) a paneles de KPI y tarjetas principales para conservar la profundidad estética aprobada.
- **Do** alertar claramente el límite de crédito disponible antes de confirmar cualquier remisión o venta a crédito.
- **Do** preservar el aislamiento estricto entre la interfaz de Superadmin (púrpura) y la interfaz de tenant (azul/corporativo).

### Don't:
- **Don't** eliminar los bordes divisores o las sombras en tablas y formularios volviendo la pantalla plana y confusa.
- **Don't** utilizar colores de estado arbitrarios (ej. azul para advertencia de vencimiento o verde para crédito bloqueado).
- **Don't** esconder las existencias por almacén en una sola cifra consolidada sin opción de desglose multialmacén.
- **Don't** permitir confirmación de compras o ventas sin mostrar el resumen financiero con impuestos desglosados.
