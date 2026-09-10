---
target: page
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-09-10T00-49-17Z
slug: src-app-page-tsx
---
# Design Critique: Home Page & Dashboards (src/app/page.tsx)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Estado de carga adecuado con spinner central y badges de salud, pero falta feedback reactivo al alternar módulos o actualizar métricas |
| 2 | Match System / Real World | 3 | Vocabulario contable sólido (RFC, CxC, CxP, Kárdex, Traspasos); algunos términos como "Ubuntu Online" mezclan infraestructura con negocio |
| 3 | User Control and Freedom | 2 | No hay filtros de rango de fechas en los dashboards principales ni forma de deshacer o revertir toggles inmediatos de módulos |
| 4 | Consistency and Standards | 2 | Variación de estilos entre dashboards: banners con degradados arbitrarios (`from-purple-900`, `from-emerald-800`), font-sizes ad-hoc (`text-[10px]`, `text-[11px]`) |
| 5 | Error Prevention | 3 | Buen manejo de estados nulos (`loading || !user`), pero la activación/desactivación de módulos SaaS en Superadmin carece de confirmación preventiva |
| 6 | Recognition Rather Than Recall | 3 | Buenas tarjetas métricas con accesos rápidos directos, aunque los atajos rápidos de teclado no son visibles |
| 7 | Flexibility and Efficiency | 2 | Carece de atajos de teclado para operaciones frecuentes de mostrador/almacén; no hay ordenamiento dinámico de tablas resumen |
| 8 | Aesthetic and Minimalist Design | 3 | Estructura legible pero visualmente dividida entre degradados AI genéricos y tarjetas que aún no explotan plenamente la elevación flotante de "The Fintech Ledger" |
| 9 | Error Recovery | 2 | Errores en peticiones fetch (`/api/reportes/mensual`, `/api/tenants`) solo se registran en `console.error` sin banner de reintento en UI |
| 10 | Help and Documentation | 2 | Tooltips ausentes en métricas financieras complejas (ej. cálculo de margen ponderado o saldo retenido) |
| **Total** | | **25/40** | **Acceptable** |

---

## Design Specificity Verdict

**LLM assessment:**
El sistema demuestra una intención funcional auténtica orientada a la gobernanza multi-rol (diferenciando las vistas según `SUPERADMIN`, `ADMIN`, `ENCARGADO`, `ALMACENISTA`, `AUDITOR`). Sin embargo, visualmente aún muestra inconsistencias de prototipo: degradados de fondo saturados en los encabezados (`from-purple-900 to-indigo-900`, `from-emerald-800 to-teal-900`) que contrastan con la sobriedad requerida por la dirección "The Fintech Ledger". Asimismo, las tarjetas KPI usan elevaciones estándar (`shadow-sm`) en vez del vocabulario de profundidad flotante (`Card Float` con bordes nítidos y micro-elevación en hover) estipulado en DESIGN.md.

**Deterministic scan:**
El detector analizó `src/app/page.tsx` y los dashboards hijos (`AdminDashboard.tsx`, `SuperadminDashboard.tsx`, `EncargadoDashboard.tsx`), detectando:
- **1 aviso de Slop visual (`ai-color-palette`):** Gradiente púrpura/violeta en `SuperadminDashboard.tsx:62` (`from-purple-900 to-indigo-900`).
- **8 avisos de calidad tipográfica (`design-system-font-size`):** Clases ad-hoc fuera de la rampa tipográfica de DESIGN.md (`text-[10px]` y `text-[11px]`) dispersas en subtítulos y etiquetas de insignias.

---

## Overall Impression
La arquitectura de enrutamiento condicional por rol en `page.tsx` es limpia y sólida. La interfaz tiene una base funcional robusta, pero requiere unificar la estética hacia la pulcritud de "The Fintech Ledger": erradicar los degradados estridentes, alinear la tipografía a la rampa de diseño y dotar a las tarjetas KPI de la elevación flotante y contrastes que transmitan solidez financiera.

---

## What's Working
1. **Diferenciación estricta por rol:** Cada perfil de usuario aterriza exactamente en los indicadores que necesita para trabajar, sin ruido de otros departamentos.
2. **Jerarquía de información clara:** Desglose en 3 niveles efectivos: Encabezado con identidad del tenant/plataforma -> Tarjetas KPI de balance -> Tablas y accesos de acción directa.
3. **Buen uso de micro-componentes semánticos:** Íconos coherentes (`Lucide`) con fondos tintados suaves (`bg-emerald-50`, `bg-amber-50`, `bg-rose-50`).

---

## Priority Issues

### [P1] Degradados de encabezado estridentes y estilo AI
- **Why it matters:** Los degradados violeta/verde azulado restan seriedad institucional y contradicen el principio de diseño "The Fintech Ledger", haciendo que la plataforma luzca genérica.
- **Fix:** Sustituir los degradados por tarjetas de identidad en fondo sólido elegante (navy `#0f172a` o color primario corporativo del tenant `#2563eb`), con tipografía monoespaciada para folios y sutil textura de borde.
- **Suggested command:** `/impeccable quieter src/components/dashboards`

### [P1] Dispersión tipográfica fuera de la escala DESIGN.md
- **Why it matters:** El uso recurrente de `text-[10px]` y `text-[11px]` fragmenta el ritmo de lectura y dificulta la legibilidad en pantallas operativas de almacén y mostrador.
- **Fix:** Estandarizar todas las micro-etiquetas a `text-xs font-semibold` (12px) y aplicar `font-mono` para cifras, RFCs y códigos alfanuméricos.
- **Suggested command:** `/impeccable typeset src/components/dashboards`

### [P2] Ausencia de elevación "Card Float" en tarjetas KPI
- **Why it matters:** Las tarjetas de balance financiero usan `shadow-sm` plano, desaprovechando la profundidad visual aprobada para enfocar la atención en montos clave.
- **Fix:** Aplicar el token `Card Float` (`shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200`) y bordes de 1px en `#e2e8f0`.
- **Suggested command:** `/impeccable polish src/components/dashboards`

### [P2] Manejo silencioso de errores y falta de estados de reintento
- **Why it matters:** Si la API `/api/reportes/mensual` o `/api/tenants` falla o tarda, el usuario se queda con pantalla vacía o valores indefinidos sin opción de reintentar.
- **Fix:** Agregar contenedor de estado de error visible con botón de recarga inline.
- **Suggested command:** `/impeccable harden src/components/dashboards`

---

## Persona Red Flags

- **Alex (Power User - Administrador):** No dispone de un filtro rápido para alternar entre periodos ("Hoy", "Esta Semana", "Mes en Curso") en el Dashboard Ejecutivo, obligándolo a navegar hasta la pantalla de reportes para una simple comparación.
- **Jordan (First-Timer - Encargado):** Al entrar al dashboard operativo, no hay explicación clara de qué dispara el estado "Clientes Retenidos" ni el umbral de días que clasifica una factura como "Por Vencer".
- **Sam (Accesibilidad):** Varios textos secundarios en `text-slate-500` sobre fondos coloreados y badges `text-[10px]` no alcanzan el ratio de contraste WCAG AA (4.5:1).

---

## Minor Observations
- El spinner de carga en `page.tsx` está centrado pero carece de un skeleton que anticipe la estructura del dashboard.
- El toggle de módulos en Superadmin actualiza el estado local pero no muestra un indicador de guardando ("Guardando...") durante la petición PATCH.

---

## Questions to Consider
- ¿Debería el Dashboard Ejecutivo permitir cambiar el periodo de métricas (Día / Semana / Mes) directamente desde el encabezado?
- ¿Conviene incorporar un estado esqueleto (Skeleton UI) en lugar del spinner genérico durante la carga inicial?
