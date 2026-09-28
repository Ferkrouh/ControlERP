# Reporte de faltantes y cambios — Etapa 4

**Fecha:** 28/09/2026
**Resultado:** optimizaciones locales aplicadas y verificación de tipos exitosa. Las actividades que requieren staging, PostgreSQL poblado, monitoreo, decisión de hosting o aprobación de política siguen pendientes; por ello la etapa no tiene aceptación productiva.

## Cambios realizados

| Área | Cambio | Evidencia |
|---|---|---|
| Resumen mensual | Agregación en base de datos para ventas, compras, CxP y pagos; conteo directo de ajustes; selección estrecha para CxC y existencias. Se quitaron relaciones de clientes/proveedores que no participaban en el cálculo. | `src/app/api/reportes/mensual/route.ts`; `npx tsc --noEmit` terminó con código 0. |
| Balanza CxC | Selección limitada a campos de cuenta, cliente y pago usados en filas/totales; excluye CxC canceladas como el resumen. | `src/app/api/reportes/balanza-cxc/route.ts`; `npx tsc --noEmit` terminó con código 0. |
| Plan de escala | Se documentaron objetivos, criterios de aceptación productiva, decisiones pendientes y orden de ejecución. | `ETAPA_4_PLAN.md`, `ETAPA_4_TICKETS.md`. |

Las consultas evitan materializar columnas/relaciones que el informe descarta y trasladan sumas/conteos sencillos a Prisma. No se reporta una reducción de latencia medida: falta ejecutar carga en PostgreSQL con volumen representativo y contrastar la misma consulta antes/después.

## Faltantes y evidencia requerida

| Prioridad | Faltante | Para cerrarlo se necesita |
|---|---|---|
| P0 | Destino de staging/producción y PostgreSQL configurado | Decisión de hosting/región, credenciales seguras y ambiente equivalente. |
| P1 | Comparación funcional de salidas y carga de reportes | Dataset anon., resultados previos/posteriores para casos de cuenta cancelada, pagos históricos, antigüedad, almacenes y tenants; p50/p95/p99 y errores bajo concurrencia acordada. |
| P1 | Índices fundamentados | Planes `EXPLAIN ANALYZE` y medición de escritura en staging; el esquema ya contiene índices de tenant/fecha en varias entidades, no basta una lista estática para decidir. |
| P1 | Métricas y alertas de aplicación | Proveedor/retención elegidos, trazas por ruta y consultas lentas sin exponer datos personales o secretos. El health endpoint de Docker verifica disponibilidad y BD, no rendimiento. |
| P1 | Política de retención y recuperación | Aprobación SUPERADMIN/propietario, copia externa cifrada, alertas, RPO/RTO y restore con tiempo documentado. El script tiene 30 días por defecto para copias locales, que no equivale a respaldo externo probado. |
| P2 | Colas | Medir operación síncrona máxima actual (importaciones: 2 MB/1000 filas; SMTP en petición). Elegir broker/worker según hosting y evidencia de timeout/capacidad. |
| P2 | UX secundaria | Observación y aceptación en navegador por los usuarios de las dos empresas piloto. |

## Decisión de alcance

Con cientos de filas y 10–15 empleados por empresa, se conserva el importador síncrono actual como capacidad inicial y no se incorpora infraestructura de cola sin medición. Esta es una decisión provisional para el tamaño descrito; si el piloto crece, se reabre con evidencia de duración/memoria/errores.

No se fija retención para auditoría o transacciones ni se habilita borrado automático. La política actual de backup local (30 días por defecto) requiere validación del operador y debe complementarse con almacenamiento externo y restauración ensayada.

## Verificación y límites

- `npx tsc --noEmit`: **pasa** después de los cambios.
- `npx next build`: **pasa**, incluyendo compilación, validación de tipos, generación de páginas y trazas.
- `npm run build`: no completó porque `prisma generate` no pudo renombrar `query_engine-windows.dll.node.tmp...` por `EPERM`; la compilación Next directa con el cliente Prisma existente sí terminó. Conviene revisar el proceso que mantiene la DLL antes del próximo `prisma generate`.
- No se ejecutaron pruebas funcionales ni de carga para este incremento, por lo que la equivalencia numérica debe comprobarse con los casos del ticket E4-02 y E4-03 antes de promoverlo.
- No se añadieron índices; no hay staging/PostgreSQL seleccionado para capturar planes de ejecución.
- No se modificó el contrato HTTP de los reportes.
- Los cambios se realizaron dentro de un árbol de trabajo con numerosos cambios previos de las etapas 1–3; el diff de esta etapa está delimitado por los dos endpoints anteriores y tres documentos E4.

## Próximo paso

Al seleccionar destino de hosting, cerrar primero E4-03 (dataset y baseline) y E4-06 (política/restore), luego medir índices/colas y validar las optimizaciones con importes reconciliados. Checklist de salida general: [ETAPA_3_CHECKLIST_SALIDA.md](ETAPA_3_CHECKLIST_SALIDA.md).
