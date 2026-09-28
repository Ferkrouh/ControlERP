# Etapa 2 — Entregables y operación del piloto

Estado: **cierre técnico local completado; aceptación y salida a piloto condicionadas**. Alcance del piloto: dos empresas demo, ventas/POS, traspasos, inventario, CxC/cobranza y proveedores. Facturación SAT/PAC y documentos de nómina fiscales quedan fuera del criterio de salida del piloto. El cierre local entrega ajustes y documentación revisables; no equivale a declarar listo el despliegue productivo mientras falten validaciones externas detalladas abajo.

## Acta de cierre de implementación local — 28/09/2026

| Ticket | Entrega local | Pendiente externo / evidencia restante |
|---|---|---|
| E2-01 | Correcciones de CSV, copy/KPI, privacidad en documentos y bloqueo de XML SAT simulado; auditada impresión de órdenes de compra. | Inventario exhaustivo, pruebas visuales y por rol/tenant; suites `tsx` no corren en el entorno actual (`uv_os_get_passwd` / `ENOMEM`). |
| E2-02 | Correcciones de datos fiscales de ejemplo y nomenclatura de venta; ocultado el modal huérfano que ofrecía enviar factura oficial/XML sin servicio real. | Validación de tareas responsive y aceptación por personal de ambas empresas. |
| E2-03 | Importador beta y flujo sintético preparados. | Excel y conciliación reales expresamente pendientes hasta que el usuario los entregue. |
| E2-04 | Requisitos y brecha del script local documentados. | Infraestructura/destino, secretos, retención y RPO/RTO sin definir; copia remota y restauración no implementadas ni ensayadas. |
| E2-05 | Bitácora SUPERADMIN y correlación de fallas implementadas en rutas piloto identificadas. | Cobertura total de endpoints, pruebas de autorización/aislamiento y evento runtime por validar. |
| E2-06 | KPI de importe cancelado corregido. | Reembolso de efectivo/POS no implementado y fuera del piloto actual. |
| E2-07 | Criterios y evidencia de salida documentados; no se simula aceptación. | Prueba de restauración, soporte/escalamiento y aceptación de usuarios de los dos tenants. |

**Decisión:** se da por concluida la etapa 2 como ciclo de implementación local/documentación. El producto no queda certificado como listo para producción ni se autoriza pasar al piloto real hasta cerrar los pendientes de restauración, seguridad/tenant, importación conciliada y aceptación operacional. Los datos Excel siguen pendientes a petición del usuario; el destino productivo sigue por definirse.

## E2-01 — Catálogo de descargables y nomenclatura documental

**Estado:** correcciones locales aplicadas; inventario exhaustivo y revisión visual pendientes.

**Rutas:** `src/lib/pdf-service.ts`, `src/lib/pdfs-internos.ts`, `src/app/api/**/pdf/route.ts`, `src/app/api/reportes/**`, `src/app/ventas/page.tsx`, `src/components/reportes/NotasCreditoReport.tsx`.

**Hallazgos verificados:** estado de cuenta y ticket POS incluían datos de empresa de muestra; el ticket generaba QR a un dominio no configurado; corte Z y balanza concatenaban datos sin proteger celdas CSV; el corte Z interpolaba nombres/notas en HTML imprimible; el reporte de cancelaciones nombraba el total como “devuelto”; el reporte de balanza se presentaba como dictamen certificado sin revisión o firma reales; la contabilidad exponía XML con RFC genérico de ejemplo. También se localizaron fallbacks fiscales en otros módulos, fuera de estos cambios puntuales.

**Cambios aplicados:** retirar datos ficticios/QR de los PDFs internos; leyenda POS explícitamente interna; KPI API/UI como `totalCancelado`; proteger CSV de corte Z y antigüedad de saldos y escapar texto interpolado al imprimir; convertir CSV de balanza a `construirCsv`, corregir su lenguaje a reporte interno no certificado; bloquear descarga XML SAT con HTTP 409 y aviso visible durante el piloto.

**Criterios:** autenticación y tenant correctos; no datos de ejemplo, folios/UUID/QR ficticios ni afirmar devolución, pago o timbrado que no existan; marca interna visible; importes conciliables; archivos con nombre, tipo y política de caché consistentes; contenido legible en móvil/impresión y multipágina.

**Evidencia:** `npx tsc --noEmit`, `git diff --check`, paridad de esquemas y build de producción aprobaron el 28/09/2026. El build dejó la advertencia existente de Edge Runtime sin generación estática para una ruta. `tsx` no pudo iniciar las suites de PDF/catálogos porque Node 24 falla en `uv_os_get_passwd` con `ENOMEM`; no se cuenta esa ejecución como aprobada. Búsqueda dirigida ya no encontró los valores falsos auditados en los descargables revisados. Pendientes: lista completa de PDF/CSV/XML/layout, pruebas por rol y tenant, revisión visual de documentos y pruebas automatizadas al reparar el entorno Node. XML de ventas solo se ofrece con CFDI realmente timbrado y persistido. XML contable, REP, CFDI de nómina y layouts bancarios permanecen bloqueados para el piloto.

## E2-02 — Rediseño de flujos operativos frontend

**Estado:** auditoría funcional pendiente de sesión de uso con representantes; se mantiene el sistema de diseño `The Fintech Ledger`.

**Flujos/rutas:** `/ventas`, `/pos`, `/cotizaciones`, `/traspasos`, `/inventarios`, `/importaciones`, `/cxc`, `/proveedores`, `/reportes` y sus APIs.

**Auditoría que se debe completar por pantalla:** objetivo del rol, acción primaria, orden de campos, errores de validación, carga/vacío/error, confirmaciones de operaciones irreversibles, teclado/lector de código, accesibilidad/contraste, tablet y anchura móvil, permisos visibles y recuperación tras timeout.

**Criterios:** usuario puede completar tarea con lenguaje y estados claros; no mostrar acciones no autorizadas; confirmar importes/cantidades antes del commit; conservar idempotencia y formularios tras pérdida de respuesta; focus y errores accesibles; tablas utilizables en tablet; color tenant sin alterar semántica de estado.

**Evidencia necesaria:** sesiones guiadas con un representante de ventas/caja y uno de almacén por empresa, y responsable que valide saldos iniciales. Registrar tarea, resultado, confusión/defecto y aceptación. No inventar aceptación visual sin participantes.

**Ajustes de esta tanda:** alta e importación de clientes ya no prellenan ni persisten RFC, régimen, uso CFDI o CP de ejemplo; ventas y cotizaciones presentan “Sin registrar” cuando falta RFC y el modal principal se nombra “Registrar venta”. Son correcciones de veracidad/copy; falta la revisión responsive, teclado/lector, errores y recuperación de formularios con usuarios.

## E2-03 — Importación beta y conciliación

**Estado:** motor beta con datos sintéticos listo desde E1-07; Excel reales pendientes por indicación del usuario.

**Rutas:** `/importaciones`, `src/lib/importaciones.ts`, `src/app/api/importaciones/**`, importación de stock de E1-06.

**Criterios:** mapear columnas reales con ambas empresas; conservar ceros/decimales; validar claves y duplicados; revisión antes de confirmar; rollback/reintento seguro; comparar conteos y muestras; cargar stock como corte independiente por almacén, con acta aprobada.

**Evidencia/bloqueo:** no solicitar archivos nuevamente: el usuario avisará y entregará Excel después de que la beta esté implementada. Mientras tanto usar solo datos sintéticos. No subir saldos de cartera mediante importación.

## E2-04 — Respaldo externo, restauración e incidentes

**Estado:** script local de PostgreSQL detectado; no está demostrado respaldo externo, cifrado en reposo, restore ni alertas.

**Rutas:** `scripts/backup-db.sh`, `RegistroPlataforma`, `src/lib/platform-audit.ts`, Docker y documentación de operación.

**Hallazgo:** script escribe en un directorio local del host, comprime y valida gzip/hash, rota archivos; no cifra ni replica fuera del host ni prueba restauración. El fallback JSONL no contiene detalles sanitizados ni garantiza escritura en disco externo. La escritura de auditoría de plataforma captura el fallo en consola, pero no tiene transporte durable secundario configurado. No se tocó el script de respaldo porque no hay proveedor/infraestructura elegidos para implementar y ensayar una copia remota.

**Criterios:** destino externo cifrado con permisos mínimos; secretos fuera de comandos/logs; retención definida; manifiesto y verificación de integridad; restauración aislada de punta a punta y registro de duración/resultado; alertas por fallo/antigüedad; procedimiento de incidentes con responsable SUPERADMIN; RPO/RTO acordados; nunca borrar última copia válida.

**Dependencias:** requiere proveedor/infraestructura elegida y credenciales operativas. No configurar ni simular destino externo en local. Ejecutar restauración solo en un entorno aislado.

## E2-05 — Observabilidad y bitácora exclusiva SUPERADMIN

**Estado:** bitácora exclusiva existente; fallos de importaciones piloto y fallos/rechazos de venta, ajuste de inventario, caja POS y operación de traspasos se integraron a eventos de plataforma con referencia de correlación; la cobertura del resto de operaciones y la canalización siguen incompletas.

**Rutas:** `src/lib/platform-audit.ts`, `src/app/api/superadmin/bitacora/**`, middleware/auth y APIs mutantes de flujos piloto.

**Criterios:** eventos correlacionables para inicio de sesión, denegación, mutación, fallo, importación, respaldo/restore; tenant/actor/acción/resultado/fecha/request-id; redactar credenciales, datos de pago y PII no necesaria; bitácora de solo lectura para SUPERADMIN y sin fuga entre empresas; alerta de pérdida del propio registro; logs con severidad y retención.

**Cambio aplicado:** previsualización de catálogos, corte de stock y confirmación fallida escriben evento de plataforma con acción/categoría, usuario, resultado HTTP y sin el archivo, valores de fila ni texto de error. Fallos/rechazos de ventas, ajuste, caja POS y traspasos guardan ruta, método, estado y correlación; el API retorna `X-Correlation-ID`. Las confirmaciones exitosas mantienen auditoría de negocio por registro. Quedan fuera de cobertura los intentos denegados antes de entrar a los handlers y los demás flujos operativos. La UI de bitácora sigue siendo solo lectura y exclusiva de SUPERADMIN.

**Evidencia:** TypeScript y build de producción aprobados el 28/09/2026. Falta suite de handlers/API por el error de arranque de `tsx` descrito en E2-01 y verificación de eventos en una base de pruebas; no se declara probado el comportamiento en runtime.

**Evidencia:** matriz de endpoint-evento, tests de rol/tenant y evento ante fallas inducidas; prueba del canal secundario y alerta solo cuando exista infraestructura.

## E2-06 — Cierre de reporte financiero de cancelaciones

**Estado:** contrato del KPI corregido como parte de E2-01. El reembolso en efectivo/POS aún no existe.

**Criterios:** separar importe cancelado de efectivo devuelto; no llamarlo nota de crédito fiscal; separar ventas fiscales timbradas y no timbradas; conciliación con caja/tesorería al implementar devolución. No prometer salidas fiscales en el piloto.

## E2-07 — Aceptación de artefactos y cierre operacional

**Estado:** criterios y acta de cierre técnico registrados; aceptación operacional pendiente.

**Criterios de cierre:** todas las evidencias E2-01 a E2-06 registradas; defectos P0/P1 resueltos o aceptados con responsable/fecha; restore comprobado; procesos de soporte y escalamiento claros; aceptación de tareas críticas por los dos tenants. Los bloqueos externos deben declararse, no marcarse como terminados.

## Puertas para pasar de cierre técnico a piloto real

1. Elegir el destino productivo y ejecutar respaldo remoto más restauración en entorno aislado, con RPO/RTO acordados.
2. Completar matriz de permisos/tenant y validar eventos de auditoría en base de pruebas.
3. Revisar documentos por familias y cerrar las pruebas bloqueadas por `tsx`.
4. Cuando se entreguen los Excel, conciliar productos, clientes, proveedores y corte inicial de inventario por almacén.
5. Realizar sesiones de aceptación por empresa y documentar responsables, defectos y decisión de piloto.
