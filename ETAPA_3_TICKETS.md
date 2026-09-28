# Etapa 3 — Preproducción y salida gradual

**Estado:** preparación y correcciones locales completas para los bloqueos auditados; 97 escenarios de flujos más 6 de recepción/seguridad pasan sobre SQLite temporal. Preproducción y piloto siguen pendientes de destino, PostgreSQL, respaldo externo y aceptación de las dos empresas. Auditoría: 28/09/2026. Responsables, ventanas y fechas comprometidas se acuerdan mediante `ETAPA_3_CHECKLIST_SALIDA.md`.

## Alcance

Piloto con dos empresas demo, 10–15 empleados por empresa. Flujos incluidos: ventas/POS, traspasos con recepción parcial, inventarios/stock, CxC/cobranza y proveedores. SAT/PAC y nómina fiscal fuera del piloto. Excel reales se incorporan cuando el usuario los entregue; entretanto usar datos sintéticos.

## Tickets

### E3-01 — Readiness y acceso neutral
- **Estado:** completado localmente.
- **Rutas:** `src/app/api/health/route.ts`, `docker-compose.yml`.
- **Criterio:** endpoint genérico 200/503 con estado de DB, sin caché ni detalles internos; Compose lo consulta y deja Cloudflare como perfil optativo.
- **Evidencia:** TypeScript/build y configuración Compose cuando Docker esté disponible.

### E3-02 — Autorizar recepción solo en almacén asignado
- **Estado:** corrección local implementada; pendiente validar en PostgreSQL/staging.
- **Rutas:** `src/app/api/ordenes-compra/[id]/recibir/route.ts` y pruebas.
- **Criterio:** ALMACENISTA recibe solo en su almacén; rechazo no modifica OC, stock, Kárdex, compra ni CxP.
- **Evidencia local:** `scripts/test-ordenes-compra-seguridad.ts` comprueba 403 para almacén distinto y cero escrituras; 6 escenarios pasan en SQLite temporal el 28/09/2026. **Responsable/fecha PostgreSQL:** ____ / ____.

### E3-03 — Limitar recepción a cantidad autorizada
- **Estado:** corrección local implementada; pendiente validar concurrencia en PostgreSQL/staging.
- **Rutas:** `src/app/api/ordenes-compra/[id]/recibir/route.ts`, lógica de recepción y pruebas.
- **Criterio:** cantidad finita/positiva, acumulado <= solicitado; rechazar filas duplicadas/desconocidas; parcial deja faltante pendiente; carrera no infla inventario ni CxP.
- **Evidencia local:** valida schema estricto, SKU dentro de OC, cantidades pendientes; reclama la OC dentro de transacción y condiciona actualización al saldo. Suite prueba exceso, fila desconocida/duplicada, cantidad inválida, recepción parcial y concurrencia; 6 escenarios pasan en SQLite temporal el 28/09/2026. **Responsable/fecha PostgreSQL:** ____ / ____.

### E3-04 — Ocultar costos al ALMACENISTA
- **Estado:** corrección local implementada; pendiente recorrido de UI y validación en staging.
- **Rutas:** `src/app/api/ordenes-compra/route.ts`, `src/app/api/almacenes/route.ts`, `src/app/api/inventarios/ajustes/route.ts`.
- **Criterio:** respuestas ALMACENISTA omiten costo/subtotales; roles autorizados conservan campos necesarios; pantallas siguen funcionando.
- **Evidencia local:** quitados montos de OC y campos de costo/subtotal de las tres respuestas; pantalla oculta montos, KPI financieros y acción de imprimir al ALMACENISTA. Prueba API comprueba ausencia de campos sensibles en los tres endpoints; 6 escenarios pasan en SQLite temporal el 28/09/2026. **Responsable/fecha de aceptación UI:** ____ / ____.

### E3-05 — PostgreSQL de staging, migración y rollback
- **Estado:** pendiente de destino y acceso aislado.
- **Rutas:** `prisma/migrations/**`, `docker-entrypoint.sh`, `scripts/check-schema-parity.js`, scripts de migración y `docker-compose.yml`.
- **Criterio:** versión elegida, paridad, backup previo, migración reproducible y rollback ensayado sobre copia; control operativo antes de migración.
- **Evidencia:** versión/esquema, salida, duración, id de backup y resultado de restore. **Responsable/fecha:** ____ / ____.

### E3-06 — Respaldo externo, restauración e incidentes
- **Estado:** pendiente de destino externo, política y credenciales.
- **Rutas:** `scripts/backup-db.sh`, `src/lib/platform-audit.ts`, bitácora SUPERADMIN y manual operativo.
- **Criterio:** copia externa cifrada, integridad, retención, alerta de falla/antigüedad, restore aislado cronometrado y RPO/RTO acordados; SUPERADMIN gestiona incidentes.
- **Evidencia:** manifiesto/checksum, acta de restore, duración y alerta. **Responsable/fecha:** SUPERADMIN/proveedor ____ / ____.

### E3-07 — Cierre de seguridad y aislamiento
- **Estado:** hallazgos de E3-02/03/04 corregidos localmente; análisis inicial es parcial y queda la verificación del diff, endpoints restantes, PostgreSQL, staging y pruebas de tenant.
- **Rutas:** APIs piloto, auth/middleware, bitácora y descargables.
- **Criterio:** confirmar que las tres correcciones cierran los hallazgos; probar RBAC y tenant cruzado en lectura/escritura/archivos; bitácora solo SUPERADMIN y sin secretos.
- **Evidencia:** matriz ruta/rol/tenant, suite de autorización e informe revisado.
- **Límite del informe:** inventario de 231 archivos y tres hallazgos; cobertura semántica parcial, sin HTTP/PostgreSQL ni examen exhaustivo de cada archivo. Delegación de auditores no disponible. No certifica ausencia de otros defectos.

### E3-08 — Smoke y regresión de flujos
- **Estado:** regresión local SQLite ejecutada; pendiente repetir sobre PostgreSQL/staging.
- **Rutas:** APIs de ventas/POS, traspasos, inventario, CxC/cobranza, proveedores e importación; `scripts/test-*.ts`.
- **Criterio:** casos críticos pasan en PostgreSQL; venta→stock→Kárdex→CxC→cobranza concilia; parcial de traspaso conserva faltante; reintento no duplica.
- **Evidencia local (28/09/2026):** ventas/POS 27, traspasos 17, inventario 15, cobranza 21, importaciones 11, recepción/seguridad de compras 6; 97 escenarios aprobados en total, cada suite con DB temporal aislada. **Pendiente:** ejecutar sobre PostgreSQL y staging con versiones/volumen acordados. **Responsable/fecha:** ____ / ____.

### E3-09 — Navegador, UX y carga piloto
- **Estado:** pendiente de staging y representantes.
- **Rutas:** `/ventas`, `/pos`, `/traspasos`, `/inventarios`, `/cxc`, `/proveedores`, `/importaciones`.
- **Criterio:** tareas guiadas por rol; responsive/tablet, teclado/lector, estados de error/timeout y permisos claros; POS/listados medidos con 20–30 usuarios de prueba acordados.
- **Evidencia:** tarea, rol, empresa, resultado, capturas sanitizadas, defectos y métricas. **Responsable/fecha:** ____ / ____.

### E3-10 — Importar y conciliar saldos iniciales
- **Estado:** diferido hasta que el usuario entregue Excel reales.
- **Rutas:** `/importaciones`, `src/lib/importaciones.ts`, APIs y corte de stock.
- **Criterio:** mapear columnas, validar filas/duplicados, aprobar preview; separar catálogos del stock por almacén; saldos iniciales firmados.
- **Evidencia:** entrada resguardada, rechazados/aceptados, conteos y acta. **Responsable/fecha:** ____ / ____.

### E3-11 — Go/no-go por empresa
- **Estado:** pendiente de G2–G10 y destino.
- **Criterio:** checklist firmado; sin bloqueos P0/P1; soporte, límites, rollback y SUPERADMIN disponibles; decisión separada por cada empresa.
- **Evidencia:** versión, respaldo vigente, métricas y aceptación de usuarios. **Responsable/fecha:** ____ / ____.

## Esfuerzo orientativo

Estimación de ingeniería, no compromiso: E3-02/03/04, 2–4 días hábiles; staging, 1–3 días después de elegir destino; migración/restore, 2–4 días; regresión, 2–3 días; sesiones/importación, 1–3 días tras agenda y Excel. Se solapan algunos bloques. Comprometer calendario al completar checklist.
