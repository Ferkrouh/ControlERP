# Etapa 4 — Escala y operación eficiente

**Estado al 28/09/2026:** optimizaciones locales de reportes implementadas y verificadas con TypeScript. La etapa queda **implementada en el repositorio, pendiente de aceptación de escala en el entorno objetivo**. No se declara concluida para producción: aún no existe destino de staging/PostgreSQL ni datos de carga representativos.

## Objetivo

Mantener tiempos de respuesta y operación predecibles cuando aumenten los registros de las dos empresas piloto; decidir cambios de índices, colas, métricas y retención con evidencia de uso real.

## Alcance y entregables

1. **Consultas y reportes.** Reducir filas/columnas transferidas y trabajo en JavaScript; comprobar que totales, conteos, permisos y cortes conservan semántica. Revisar planes SQL con datos anonimizados del staging antes de crear índices.
2. **Medición.** Capturar p50/p95/p99 y errores por endpoint, consultas lentas y tamaño de respuesta. Registrar despliegue, volumen, concurrencia y tenant de prueba sin datos personales. Acordar presupuesto de respuesta con usuarios antes de fijar SLO.
3. **Importaciones.** El flujo actual procesa de forma síncrona CSV/XLSX, con límite de 2 MB y 1000 filas, previsualización y confirmación. Medir duración, memoria, bloqueos y recuperación en el mayor archivo del piloto. Cola con estado/reintentos solo si mediciones muestran riesgo de timeout o si la capacidad supera esos límites.
4. **Correo.** El servicio SMTP envía en la petición. Medir latencia, errores, reintentos y duplicados; definir entrega idempotente y visibilidad de estado. No agregar un broker sin conocer proveedor, réplicas y servicio operativo del destino.
5. **Retención y respaldos.** El backup declara retención local configurable por `RETENTION_DAYS` (30 días por defecto), checksum y bitácora. Falta acordar retención de auditoría/importaciones/backups, copia externa cifrada, alertas y restauración probada. No ejecutar borrado automático de registros financieros o auditoría sin política aprobada.
6. **UX según evidencia.** Priorizar mejoras tras observar tiempos y fricciones en flujos de venta, inventario, CxC, cobranza, traspasos y proveedores; evitar activar módulos del ERP fuera del alcance piloto por anticipado.

## Criterio de cierre productivo

- Staging equivalente al destino con PostgreSQL y datos anonimizados que representen dos empresas y su volumen acordado.
- Baseline repetible y comparativo en reportes, listados, POS, importaciones y correo bajo concurrencia acordada.
- Sin diferencias entre totales antes/después en los reportes afectados; revisión de aislamiento multiempresa.
- Planes SQL revisados; cada índice nuevo justificado por consultas medidas y comparado con inserciones/actualizaciones.
- Umbrales acordados para cola, tamaño de importación, tiempos de endpoint y alertas; cola solo donde la evidencia lo requiera.
- Política de retención aprobada, copia externa cifrada y restauración cronometrada con RPO/RTO acordados.
- Aceptación del piloto de ambas empresas y checklist de salida actualizado.

## Decisiones abiertas

| Decisión | Responsable sugerido | Estado |
|---|---|---|
| Hosting, región, réplicas y PostgreSQL administrado | Propietario del producto | Pendiente de destino de producción |
| Métricas/APM y plazo de retención de telemetría | Propietario + operación | Pendiente |
| RPO/RTO, copia externa y retención de respaldos/auditoría | SUPERADMIN + propietario | Pendiente; no purgar bitácora transaccional |
| Concurrencia y presupuesto de latencia por flujo | Ambas empresas piloto + producto | Pendiente de baseline |
| Proveedor de cola/SMTP y operación de reintentos | Operación | Pendiente de hosting y mediciones |

## Recomendación de ejecución

Usar tickets pequeños de [ETAPA_4_TICKETS.md](ETAPA_4_TICKETS.md). Para CRUD/ajustes acotados basta GPT-6 Luna con contexto de ticket; para consultas financieras, SQL, concurrencia y aislamiento, GPT-6 Sol con razonamiento medio/alto y revisión enfocada del diff. Reservar Astra para decisiones de arquitectura o seguridad de alto riesgo. El modelo reduce trabajo mecánico, pero no reemplaza el benchmark en PostgreSQL ni la aceptación de usuarios.
