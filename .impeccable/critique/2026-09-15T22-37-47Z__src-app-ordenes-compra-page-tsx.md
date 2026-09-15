---
timestamp: 2026-09-15T22-37-47Z
slug: src-app-ordenes-compra-page-tsx
---
# Design Critique: Órdenes de Compra & Cadena de Suministro (3-Way Matching)

**Target:** `src/app/ordenes-compra/page.tsx`
**Design System:** The Fintech Ledger (`DESIGN.md`)
**Platform:** Web

## Heuristic Scores
- Visibility of system status: 4/4
- Match real world: 4/4
- User control: 3/4
- Consistency and standards: 3/4
- Error prevention: 4/4
- Recognition rather than recall: 3/4
- Flexibility and efficiency: 3/4
- Aesthetic and minimalist design: 3/4
- Help users recognize errors: 3/4
- Help and documentation: 3/4
**Composite Score: 73/100**

## Priority Issues
1. **Falta de KPIs de Gestión de Compras en cabecera:** La página entra directo a la tabla sin mostrar métricas de resumen (Monto en Tránsito, Pendientes por Recibir, Órdenes Autorizadas).
2. **Carga cognitiva en el modal de 3-Way Matching:** La recepción de compras requiere capturar lote, caducidad y factura en una tabla ancha con campos densos.
3. **Impresión con estilos inline y colores fuera de rampa:** El generador de PDF/Impresión utiliza estilos inline con tamaños de fuente arbitrarios (10px, 11px, 13px) en lugar de tokens unificados.
