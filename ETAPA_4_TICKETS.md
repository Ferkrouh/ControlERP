# Tickets — Etapa 4: Escala

## E4-01 — Reducir lecturas del resumen mensual

- **Estado:** implementado localmente.
- **Rutas:** `src/app/api/reportes/mensual/route.ts`.
- **Cambio:** ventas, compras, CxP, pagos y ajustes usan agregaciones/contadores de Prisma; CxC selecciona solo saldo y vencimiento; existencias solo cantidad, costo promedio y almacén.
- **Aceptación:** JSON conserva los mismos campos y reglas; importes vacíos siguen en cero; aislamiento por tenant sigue aplicado.
- **Evidencia:** `npx tsc --noEmit` pasa. No se obtuvo benchmark SQL ni comparativo con PostgreSQL; mejora esperada de tráfico/materialización, no se afirma menor latencia medida.

## E4-02 — Reducir lecturas de la balanza CxC

- **Estado:** implementado localmente.
- **Rutas:** `src/app/api/reportes/balanza-cxc/route.ts`.
- **Cambio:** CxC devuelve los campos de la balanza y nombre/código de cliente; pagos solo selecciona `cxcId` y `monto`. Se aplica exclusión de cuentas canceladas existente en el resumen ejecutivo.
- **Aceptación:** salida conserva cargos, abonos, saldo, cuentas y agrupación; datos de tenant ajeno no se consultan.
- **Evidencia:** TypeScript pasa. No hay comparación de resultados sobre un PostgreSQL poblado; confirmar semántica con casos de cuentas canceladas y pagos históricos antes de producción.

## E4-03 — Establecer baseline de rendimiento en staging

- **Estado:** bloqueado por infraestructura no seleccionada.
- **Rutas/artefactos:** `ETAPA_4_PLAN.md`, `ETAPA_3_CHECKLIST_SALIDA.md` y entorno de observabilidad por seleccionar.
- **Aceptación:** datos anonimizados; muestras repetibles con concurrencia acordada; p50/p95/p99, errores, memoria y consultas lentas por endpoint; comparación por tenant.
- **Evidencia requerida:** informe de carga con versión, configuración, dataset, concurrencia, tiempos y errores.

## E4-04 — Evaluar índices por planes SQL

- **Estado:** pendiente de E4-03.
- **Rutas:** `prisma/schema.prisma`, esquemas PostgreSQL/SQLite y migraciones.
- **Aceptación:** cada índice enlazado a consulta medida; `EXPLAIN (ANALYZE, BUFFERS)` antes/después; medir costo de escritura y migración en volumen real.
- **Evidencia requerida:** planes y métricas; no crear índices por intuición.

## E4-05 — Decidir colas para importaciones y correo

- **Estado:** revisión de código hecha; cola diferida a mediciones y elección de hosting.
- **Rutas:** `src/lib/importaciones.ts`, `src/lib/email-service.ts`, APIs respectivas.
- **Estado observado:** importación síncrona limitada a 2 MB/1000 filas; SMTP se ejecuta en la petición. El piloto son dos empresas de 10–15 usuarios y cientos de registros previstos.
- **Aceptación:** medir el máximo de importación y envío; definir propietario, estados, idempotencia, reintentos acotados, fallos permanentes y alerta. Adoptar cola si se rebasa timeout/capacidad o se necesita desacoplar el proveedor.
- **Evidencia requerida:** p95/duración/memoria, timeout y tasas de error; luego prueba de duplicidad, reintento y recuperación del worker.

## E4-06 — Aprobar política de retención y recuperación

- **Estado:** controles iniciales existen; política productiva pendiente.
- **Rutas:** `scripts/backup-db.sh`, `src/app/api/superadmin/`, modelos de auditoría y lotes de importación.
- **Estado observado:** backup PostgreSQL local configurable, 30 días por defecto; gzip validado, SHA-256 y evento de resultado. No hay evidencia de copia externa cifrada ni restore en hosting elegido.
- **Aceptación:** SUPERADMIN aprueba retención por categoría, ubicación externa/cifrado, alertas por antigüedad/fallo, acceso a logs fallback, RPO/RTO y prueba periódica de restore. Datos financieros/auditoría no se purgan hasta decisión documentada.
- **Evidencia requerida:** decisión firmada, configuración efectiva, registro de backup y restore cronometrado.

## E4-07 — Mejoras UX basadas en observación de piloto

- **Estado:** pendiente de piloto en navegador.
- **Rutas:** flujos de ventas, traspasos, inventario, CxC/cobranza y proveedores.
- **Aceptación:** lista priorizada con problema observado, rol/empresa, impacto, captura/evidencia, criterio verificable y aceptación del usuario.
- **Evidencia requerida:** sesiones de aceptación de ambas empresas; no reemplazar con hipótesis de diseño.
