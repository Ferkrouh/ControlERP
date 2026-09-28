# Etapa 1 — Integridad transaccional e importación del piloto

Estado: **iniciada; no cerrada**. Fecha: 27 de septiembre de 2026.
Alcance: las dos empresas demo, ventas, stock, Kárdex, CxC/cobranza, traspasos y catálogos. Sin PAC ni facturación fiscal como requisito de salida.

## Decisiones confirmadas

- Si un traspaso llega incompleto, se recibe parcialmente y el faltante sigue pendiente. Confirmado por el responsable del producto en esta tarea.
- En recepción se captura el **total acumulado recibido** por partida. El servidor suma únicamente la diferencia respecto a lo previamente recibido. Esto permite reenviar la misma confirmación sin duplicar entradas.
- `DESPACHADO` incluye envíos parcialmente recibidos; `RECIBIDO` exige que todas las partidas estén completas. No se introduce un estado nuevo ni se modifica el esquema.
- ADMIN y SUPERADMIN operan los almacenes autorizados por su alcance. ALMACENISTA despacha o recibe únicamente en su almacén asignado. ENCARGADO solicita; AUDITOR consulta.
- Los nuevos traspasos usan folios con año y UUID, respaldados por la restricción única existente. No constituyen una serie fiscal. La idempotencia de la **solicitud** aún se debe implementar; folio único no evita dos solicitudes equivalentes.
- No se emite Carta Porte simulada desde la solicitud de traspasos del piloto. Queda pendiente cerrar los demás puntos de entrada al simulador fiscal.

## Tickets ordenados

Cada ticket se trabaja con sus rutas, estos criterios y el contrato de producto. No necesita cargar todo el repositorio. No debe darse por aceptado con solo compilar.

### E1-01 — Traspasos seguros y recepción parcial

**Estado:** implementado y probado en SQLite; aceptación visual y PostgreSQL pendientes. Prioridad P0.

**Rutas:** `src/lib/traspasos.ts`, `src/app/api/traspasos/route.ts`, `src/app/api/traspasos/[id]/route.ts`, `src/app/traspasos/page.tsx`, `scripts/test-traspasos.ts`, `package.json`.

**Hallazgos iniciales:** recepción sin límite ni comprobación de valores finitos; estado comprobado fuera de transacción; reintento podía duplicar stock; productos de otra empresa aceptados en solicitud; faltantes cerrados como recibidos; movimientos sin auditoría de actor; costos expuestos al almacenista.

**Criterios de aceptación:**

- Almacenes diferentes y productos de la empresa; cantidades positivas finitas; sin partidas duplicadas.
- Todas las partidas se confirman explícitamente; no se puede recibir más de lo enviado ni disminuir lo recibido.
- Stock, cantidades recibidas, estado, Kárdex y auditoría se actualizan en una transacción serializable. Error en cualquier partida revierte el conjunto.
- Despacho repetido o estado terminal devuelve conflicto sin mover stock. Recepción parcial idéntica no vuelve a acreditar existencia ni generar Kárdex.
- Recepción parcial deja pendiente el faltante; solo la recepción completa cierra el envío.
- Stock de origen se decrementa condicionalmente; entradas usan incremento atómico. No se aceptan referencias cruzadas entre empresas.
- API aplica roles y almacén asignado; listado del almacenista no expone costo promedio.
- Interfaz muestra enviado, recibido y pendiente y explica total acumulado; controles de despacho/recepción respetan rol y almacén.

**Evidencia registrada:** `npm run test:traspasos`: 17 escenarios aprobados en base temporal creada y eliminada por el script. Incluye llamadas directas a handlers autenticados, concurrencia, aislamiento, rollback, conciliación y permisos. `npx tsc --noEmit` aprobado. `git diff --check` sin errores.

**Límites:** las pruebas no pasan por servidor HTTP, middleware o navegador. El caso sin cookie devuelve 401 y registra una advertencia de contexto de cookies de Next al llamar el handler directamente. Falta probar PostgreSQL y interacción real. Otros flujos todavía escriben stock con valores absolutos; no se declara resuelta la concurrencia global. No se auditan todavía todos los intentos fallidos en bitácora de plataforma.

### E1-02 — Venta directa, crédito y stock bajo concurrencia

**Estado:** implementado y verificado en SQLite y HTTP local; aceptación visual y PostgreSQL pendientes. Prioridad P0.

**Rutas:** `src/app/api/ventas/route.ts`, `src/app/ventas/page.tsx`, `src/app/pos/page.tsx`, `src/app/api/pos/turno/route.ts` y nuevo servicio compartido de ventas.

**Hallazgos:** venta directa no comprueba que el almacén pertenezca a la empresa; conversiones numéricas no excluyen NaN/infinito; crédito consultado fuera de transacción; stock actualizado con cantidad absoluta; folios calculados mediante conteo; no hay clave de idempotencia de venta.

**Aceptación:** validar almacén/cliente/productos del tenant, módulos y permisos; precios/cantidades finitos y redondeo monetario explícito; crédito bloqueado o insuficiente según política; venta, stock, Kárdex, cartera y auditoría atómicos; dos ventas compiten sin sobreventa ni exceso de crédito; misma clave con mismo contenido devuelve resultado original y contenido distinto devuelve 409. POS debe usar el mismo servicio.

**Evidencia:** escenarios contado/crédito, último stock disputado, mismo cliente con crédito concurrente, rollback de varias partidas, almacén ajeno, montos inválidos, reintento y conciliación venta↔Kárdex↔CxC↔saldo del cliente en SQLite y PostgreSQL.

**Cambios implementados:**

- Servicio `src/lib/ventas.ts` compartido por venta directa y POS; la conversión de cotizaciones se integra en E1-03.
- API exige `Idempotency-Key` de 16–128 caracteres. `SolicitudVenta` guarda clave por empresa, actor, hash del contenido y resultado en la misma transacción. Repetición devuelve la venta original con HTTP 200 y `Idempotency-Replayed: true`; nueva emisión devuelve 201; misma clave con otros datos devuelve 409. El registro permanece aunque después se cancele o elimine una venta, para no repetir la emisión.
- Cliente y almacén se resuelven en el tenant de sesión; productos y costos se validan dentro de transacción. Un tenant en el cuerpo no amplía el alcance de ADMIN/ENCARGADO.
- Stock se descuenta condicionalmente y se normaliza a seis decimales bajo bloqueo; crédito usa comparación del saldo anterior y actualización transaccional. No se reactivan bloqueos manuales. Se respetan cero días de crédito, módulos de crédito/CxC y política estricta o advertencia; el exceso permitido se devuelve y registra explícitamente.
- `src/lib/montos-venta.ts` comparte cálculo de centavos entre pantalla y servidor. Cantidades hasta seis decimales, precios hasta dos, redondeo por partida y después IVA 16% (regla actual del producto; no se implementa un motor de tasas fiscales en este ticket).
- POS envía turno, método y recibido; servidor contabiliza efectivo, tarjeta y transferencia. Venta, caja, stock, Kárdex, CxC, saldo de cliente, auditoría y resultado de solicitud se confirman o revierten juntos.
- Apertura de caja bloquea el almacén para evitar dos turnos concurrentes; cierre reclama el turno dentro del tenant antes de calcular totales y diferencia. ENCARGADO solo opera su turno; ADMIN puede supervisar turnos de su empresa.
- Ventas y POS conservan la solicitud pendiente en `sessionStorage` antes de enviar y la restauran al recargar la misma pestaña. No permiten cambiar el contenido de una solicitud cuyo resultado todavía es desconocido. Un rechazo confirmado permite corregir datos; una respuesta perdida conserva la clave. Cerrar la pestaña o borrar el almacenamiento exige conciliar el historial antes de repetir el cobro.
- `src/lib/auth-token.ts` separa JWT del acceso a Prisma/bcrypt para middleware Edge. Se requiere un secreto configurado también en desarrollo. En este equipo se generó un secreto local en `.env.local` sin exponer su valor; `.env` y `.env.local` quedan ignorados por Git. Sesiones anteriores pueden requerir iniciar sesión nuevamente.

**Evidencia registrada el 27/09/2026:**

- `npm run test:ventas`: 27 escenarios aprobados en base temporal, incluyendo respuesta perdida después del commit y recuperación de la solicitud, venta contra cierre de turno, rollback de totales de caja y stock fraccionario sin residuos.
- Regresión de traspasos: 17 escenarios aprobados; comprobación TypeScript aprobada.
- Build final de producción aprobado con `CONTROLERP_BUILD_CHECK=1`, en `.next-build-check` para no sobrescribir el servidor de desarrollo. Las importaciones JWT específicas eliminan las advertencias de módulos de Node en middleware; queda la advertencia informativa de generación estática de una ruta Edge existente.
- HTTP local: `/login` 200; `/api/ventas` sin sesión 401; listado con sesión válida 200; venta con referencias inexistentes 404 y sin incremento de registros `SolicitudVenta`.
- Copia de la base demo antes del cambio: `%TEMP%/controlerp-before-sales-20260927-144800.db` (1,019,904 bytes). Se sincronizó únicamente el cambio aditivo del esquema y se regeneró Prisma Client correctamente.

**Pendientes:** probar PostgreSQL, revisar recuperación completa en navegador/móvil y validar operación con usuarios. La recuperación cliente se probó con almacenamiento/fetch simulados y API real del handler; no equivale a aceptación visual. Los motores anteriores de cotizaciones, ajustes, cobranza y cancelación todavía requieren E1-03 a E1-06; los totales históricos de caja previos a este cambio no se reconstruyeron. Las ventas POS se trazan al turno/método en auditoría; reportes posteriores deben conciliar esa asociación. Las plantillas de esquema mantienen divergencias históricas ajenas a la tabla agregada: E1-09 sigue siendo requisito de despliegue.

**Configuración local:** se detectó `.env` previamente rastreado por Git y se retiró del índice sin borrar el archivo del equipo. La exclusión evita futuras incorporaciones; no elimina versiones históricas. La revisión/rotación de credenciales históricas permanece en Etapa 0. El secreto JWT nuevo solo existe en `.env.local`, ignorado por Git.

### E1-03 — Conversión de cotizaciones a venta

**Estado:** implementado y verificado en SQLite y HTTP local; aceptación visual y PostgreSQL pendientes. Prioridad P0. Depende de E1-02.

**Rutas:** `src/lib/cotizaciones.ts`, `src/lib/cotizaciones-http.ts`, `src/lib/ventas.ts`, `src/lib/montos-venta.ts`, `src/app/api/cotizaciones/route.ts`, `src/app/api/cotizaciones/[id]/route.ts`, `src/app/api/cotizaciones/[id]/convertir/route.ts`, `src/app/cotizaciones/page.tsx`, `scripts/test-cotizaciones.ts`, `package.json`.

**Hallazgos:** estado y disponibilidad comprobados antes de la transacción; motor de ventas duplicado; descuento absoluto de stock; edición/eliminación podía competir con la conversión; precios y descuento de la propuesta no tenían un contrato compartido de redondeo.

**Aceptación:** reutilizar reglas transaccionales de E1-02; reclamar cotización dentro de transacción; solo estados autorizados; doble conversión produce una venta; proteger edición concurrente y respetar precios/impuestos aprobados.

**Cambios y decisiones:**

- Venta directa, POS y cotizaciones llaman al mismo núcleo de emisión dentro de una transacción serializable. Conversión, estado, vínculo con venta, stock, Kárdex, crédito, CxC, auditoría y solicitud se confirman juntos; un fallo revierte todo.
- Se permiten BORRADOR, ENVIADA y APROBADA vigentes. Se conserva la conversión directa de borradores existente; no hay un flujo nuevo de aprobación. RECHAZADA/vencida no se convierte. Editar una propuesta devuelve su estado a BORRADOR para exigir revisión de la nueva versión.
- Listado y consulta devuelven `version`, huella del documento y sus partidas; GET individual también devuelve ETag. PUT y conversión exigen esa versión; DELETE exige `If-Match`. El servidor bloquea el documento antes de comparar, evitando cambios perdidos y carreras entre editar/eliminar/convertir. Clientes externos deben adoptar este contrato.
- La clave de conversión deriva del ID de la cotización y se guarda en `SolicitudVenta`. Un reintento idéntico devuelve la venta original y `Idempotency-Replayed: true`; otra versión, almacén o condición de pago devuelve 409. Un compañero autorizado de la misma empresa puede recuperar la respuesta; la auditoría conserva el actor de emisión original. Conversiones históricas sin solicitud se rechazan, sin emitir otra venta.
- Se preservan precio unitario y descuento absoluto por partida. Se calcula subtotal neto en centavos, luego IVA 16%, con el mismo motor de pantalla y servidor. Un cambio posterior de precio en catálogo no repricia la propuesta. Importes históricos inconsistentes exigen edición/revisión explícita.
- `VentaDetalle` conserva precio bruto y subtotal neto; el descuento permanece explícito en la cotización y puede derivarse en la venta. No se agrega un campo de descuento a ventas ni se rediseñan documentos en este ticket. E1-08/Etapa 2 deben presentar y conciliar descuentos en PDFs/reportes.
- La vigencia editada continúa contándose desde la fecha original de la cotización, como antes. Renovar un documento antiguo exige suficientes días; un flujo específico de renovación con fecha nueva queda por definir.
- La pantalla envía versiones y muestra errores de importes sin bloquear su render. No se modificó el esquema ni se migraron datos históricos en este incremento. Crear una cotización todavía no tiene idempotencia de solicitud: el alcance aquí es impedir ventas/cargos duplicados.

**Evidencia registrada el 27/09/2026:**

- `npm run test:cotizaciones`: 22 escenarios aprobados en base temporal. Incluyen conversión concurrente, edición/eliminación contra conversión, respuesta perdida, referencias ajenas, crédito excedido/bloqueado, stock insuficiente, propuestas vencidas/rechazadas, versiones obsoletas, descuentos inválidos, precios de catálogo cambiados, auditoría y comparación con venta directa.
- Regresión: 27 escenarios de ventas/POS y 17 de traspasos aprobados (66 en total). Los scripts crean/eliminan sus bases; no cambian la demo. Persiste la advertencia conocida de cookies fuera de contexto en el caso anónimo del handler de traspasos, que retorna 401 correctamente.
- TypeScript aprobado; build de producción aprobado con `CONTROLERP_BUILD_CHECK=1` sin sobrescribir `.next` del servidor activo. Permanece una advertencia informativa de generación estática de una ruta Edge existente.
- HTTP local: `/login` 200, `/api/cotizaciones` sin sesión 401 y listado autenticado 200; todas las propuestas devueltas incluyen una versión válida. Comprobación solo de lectura, sin modificar la demo.

**Límites:** falta PostgreSQL, operación real en navegador/móvil y aceptación con empleados. El smoke HTTP no sustituye conversión completa en navegador. PDFs/correo y reportes conservan sus pendientes de E1-08/Etapa 2; no se validó PAC. La seguridad transaccional de cobranza, cancelaciones y ajustes requiere los siguientes tickets.

### E1-04 — Cobranza sin doble aplicación ni saldos perdidos

**Estado:** implementado y verificado en SQLite y HTTP local; aceptación en navegador y PostgreSQL pendientes. Prioridad P0.

**Rutas:** `src/lib/cobranza.ts`, `src/lib/cobranza-http.ts`, `src/lib/solicitud-cobranza-client.ts`, `src/lib/recibo-cobranza.ts`, `src/app/api/cxc/route.ts`, `src/app/api/cxc/[id]/abono/route.ts`, `src/app/api/cxc/[id]/rep/pdf/route.ts`, `src/app/cxc/page.tsx`, tres esquemas Prisma, `scripts/test-cobranza.ts`, `package.json`.

**Hallazgos:** saldo de CxC y cliente calculado antes de la transacción y sobrescrito; valores no finitos aceptados; reintento registra otro pago; abono reactiva bloqueos sin conocer su causa. Cargos manuales escribían el mismo saldo inseguro y generaban folios por conteo. REP simulado solicitado por defecto y recibo con UUID/sellos de ejemplo.

**Aceptación:** monto positivo en centavos y método permitido; actualizar bajo bloqueo/condición atómica; no sobrepagar ni crear saldos negativos; idempotencia por solicitud; preservar bloqueos manuales; pago, cartera y auditoría atómicos; rechazar timbrado REP mientras no exista PAC validado.

**Implementación y decisiones:**

- Cargos manuales y abonos requieren `Idempotency-Key` (16–128 caracteres). `SolicitudCobranza` conserva resultado, empresa, actor y hash de tipo/documento/datos dentro de la misma transacción. Clave idéntica recupera respuesta; datos o actor diferentes devuelven 409. No se borra el registro de solicitud al eliminar un documento; una repetición no crea otro cargo/pago. Clientes externos deben actualizar su contrato.
- El documento se bloquea antes de leer saldo e historial. Se concilia suma de pagos + saldo = monto original y se comprueba el tenant del cliente. Saldos históricos inválidos o importe superior al saldo del cliente exigen revisión; no se corrigen silenciosamente. Importes nuevos se validan en centavos y métodos son TRANSFERENCIA/EFECTIVO/CHEQUE/TARJETA.
- El saldo del cliente se actualiza con comparación del valor anterior. Pago, estado PARCIAL/PAGADA, saldos, solicitud y auditoría del actor se confirman juntos bajo transacción serializable. Conflictos de concurrencia conservan la solicitud para reintentar con la misma clave.
- Todo estado de crédito se conserva al cobrar, incluidos BLOQUEADO, SUSPENDIDO y EN_REVISION. El esquema no distingue bloqueo manual del histórico automático: se adopta no reactivar ninguno automáticamente. ADMIN debe revisar/desbloquear explícitamente. Los cargos nuevos respetan ACTIVO, límite estricto, política ADVERTENCIA y cero días de crédito; no introducen bloqueos automáticos indistinguibles.
- La pantalla conserva clave y cuerpo antes de enviar en `sessionStorage`, por usuario/empresa. Recarga recupera el documento incluso si ya aparece pagado y permite reintentar el cuerpo original. Una respuesta desconocida impide cambiar sus datos; éxito o rechazo confirmado libera la solicitud. Cerrar la pestaña/borrar almacenamiento requiere conciliar historial antes de volver a cobrar. La apertura de otro abono recupera el pendiente primero.
- `timbrarRep: true` se rechaza sin pagos ni escrituras fiscales. Se retiró la opción de timbrado de pantalla. No se invoca adaptador fiscal.
- Se mantiene la URL histórica `/rep/pdf`, pero entrega un recibo interno sin CFDI/REP, UUID fiscal inventado, QR SAT ni sellos simulados. Documento y pago se consultan dentro del tenant antes de generar PDF; `pagoId` debe pertenecer al documento. Los nuevos pagos muestran saldos congelados en su respuesta confirmada; históricos sin esa evidencia muestran explícitamente el saldo actual al emitir, sin reconstruir un saldo pasado ambiguo. Se conserva color de empresa y monoespaciado para folios/importes, con ajuste de líneas y páginas.

**Evidencia del 27/09/2026:**

- `npm run test:cobranza`: 21 escenarios aprobados en base temporal. Parcial/total/vencido, centavos, respuesta perdida con cliente y API, reintento, carreras entre pagos/cargos/venta, rollback al fallar auditoría, aislamiento por documento/pago, roles, módulo, REP bloqueado, saldos inconsistentes, límite y bloqueo.
- Regresión: 27 ventas/POS + 22 cotizaciones + 17 traspasos aprobados; **87 escenarios acumulados**. El fallo de auditoría se provoca deliberadamente y registra un error esperado; la advertencia del handler anónimo de traspasos sigue documentada. Ninguna suite modifica demo.
- TypeScript y build de producción aprobados; `CONTROLERP_BUILD_CHECK=1` preserva `.next`. Solo queda la advertencia informativa de generación estática de la ruta Edge existente.
- HTTP local: login 200, cartera sin sesión 401, listado autenticado 200, abono a documento inexistente 404 sin nuevas solicitudes. La aceptación de pagos completos HTTP/navegador permanece pendiente; los escenarios transaccionales usan handlers autenticados.
- Recibo de prueba con empresa/cliente y referencia extensa renderizado con Poppler y revisado visualmente: una página legible, sin desbordamientos, acentos correctos y sin secciones fiscales simuladas. Extracción de texto comprobada; avisos de fuentes opcionales de Poppler no afectaron el render observado. Los archivos de QA se eliminaron.
- Auditoría de solo lectura sobre demo: 11 documentos y 3 clientes; cero diferencias entre pagos + saldo y monto del documento, y cero diferencias entre saldo del cliente y cartera pendiente. No prueba corrección del origen histórico ni aceptación del cliente.
- Respaldo SQLite consistente previo: `%TEMP%/controlerp-before-cobranza-20260927-152143.db`, 1,028,096 bytes. Se agregó únicamente la tabla/índices de solicitudes y se regeneró Prisma Client. Se reinició Next local por el bloqueo Windows de la DLL y quedó disponible en puerto 3222.

**Pendientes:** PostgreSQL y migración versionada (E1-09), aceptación real en navegador/móvil y recibos históricos, recuperación tras cambio de sesión, cobertura de incidentes fallidos en bitácora global (Etapa 0), conciliación con tesorería/bancos y pólizas fuera del alcance del abono actual. El generador REP anterior permanece en librería sin uso desde esta ruta; otros documentos fiscales se auditan en E1-08. Cancelaciones siguen pendientes en E1-05 y todavía pueden alterar la cartera: no se declara íntegro el ciclo completo hasta cerrarlas.

### E1-05 — Cancelación y edición conservando historial

**Estado:** implementado y verificado en SQLite y HTTP local; aceptación en navegador y PostgreSQL pendientes. Prioridad P0. Depende de E1-02/E1-04.

**Rutas:** `src/lib/cancelacion-venta.ts`, `src/app/api/ventas/[id]/route.ts`, `src/app/api/ventas/[id]/pdf/route.ts`, ticket PDF, correo y timbrado, `src/app/ventas/page.tsx`, `src/lib/ventas.ts`, reportes mensual/balanza/conciliación/notas de crédito, tres esquemas Prisma y `scripts/test-cancelaciones.ts`.

**Hallazgos:** DELETE eliminaba venta y CxC; la cascada eliminaba pagos. PUT cambiaba contado/crédito sin reconstruir cartera. Reversión calculada con datos leídos antes de transacción; stock absoluto sobrescribía operaciones concurrentes. Venta cancelada seguía sumándose en reportes y podía generar comprobantes vigentes. No se vinculaba estructuralmente la venta POS al turno.

**Aceptación aplicada:** cancelación lógica con motivo y actor, conservar detalles/CxC/pagos; impedir CxC con pagos y venta fiscal/POS; reversión transaccional de stock y saldo; repetición sin duplicado; reportes operativos excluyen canceladas; edición de venta emitida solo de observaciones.

**Decisiones e implementación:**

- DELETE requiere JSON `{ motivo }` con 10–500 caracteres. Reclama la venta COMPLETADA dentro de una transacción serializable. Guarda `estado=CANCELADA`, fecha, actor y motivo; conserva la venta, sus partidas y la referencia de cotización. La misma cancelación repetida responde 200 con `Idempotency-Replayed`; motivo distinto responde 409. No se reintegra stock dos veces.
- Bloquea ventas con pagos de CxC, documentación fiscal ya emitida o vínculo POS. Para POS nuevas se guarda `turnoCajaId`; para ventas anteriores se revisa además la auditoría de venta con turno. Una venta POS requiere un flujo específico de devolución/caja; no se toca el corte Z.
- Venta a crédito sin abonos: reclama CxC y verifica que saldo = monto y que no existan pagos. Reduce el saldo del cliente con condición sobre el valor anterior, conserva su estado de bloqueo y deja CxC `CANCELADA` con saldo cero y monto original. No borra cartera ni pagos. Datos inconsistentes se rechazan para conciliación manual.
- Cada partida repone existencia por incremento atómico; crea la fila si falta y asienta Kárdex con saldo resultante. Fallar Kárdex/auditoría/cliente revierte toda la cancelación. Venta a contado también puede cancelarse, pero **la devolución monetaria no se registra automáticamente**; el administrador debe atenderla fuera de este flujo hasta implementar una reversa de caja/tesorería. No se declara completo el circuito financiero de devoluciones.
- PUT de venta emitida acepta únicamente observaciones (y puede recibir el mismo `tipoPago` por compatibilidad); rechaza cambiar contado/crédito, ventas canceladas o documento fiscal. Guarda auditoría del valor anterior/nuevo en la misma transacción.
- Listado conserva canceladas con estado y motivo; KPIs de la pantalla y reporte mensual excluyen sus importes. Balanza/CxC y conciliación excluyen documentos cancelados del cálculo activo. Reporte de cancelaciones usa fecha de cancelación y muestra fecha original, motivo y actor. El reporte separa importe cancelado de efectivo devuelto; no acredita reembolso.
- PDF comercial/ticket y correo rechazan ventas canceladas (409); la pantalla oculta las acciones de emisión y marca CANCELADA, pero permite consultar historial. El endpoint de timbrado responde 409 durante el piloto sin PAC, impidiendo emitir CFDI simulados también desde llamadas directas.

**Evidencia del 27/09/2026:**

- `npm run test:cancelaciones`: 22 escenarios aprobados en base temporal: repetición/concurrencia, pagos vs cancelación, venta vs cancelación, POS real/antiguo, fiscal, tenant/roles, edición, stock sin fila, crédito bloqueado, reportes, PDF, CxC inconsistente y rollback provocado al fallar Kárdex.
- Regresión: 27 ventas/POS + 21 cobranza + 22 cotizaciones + 17 traspasos aprobados; **109 escenarios acumulados**. Los errores de Kárdex/auditoría son fallos provocados por triggers de prueba y se revierten; ninguna suite cambia demo.
- TypeScript aprobado después del build; build de producción aprobado en `.next-build-check`, sin sobrescribir `.next` del servidor. Queda la advertencia informativa Edge existente. Una comprobación de TypeScript ejecutada simultáneamente al build produjo TS6053 porque Next regeneraba sus tipos; se repitió al terminar y aprobó.
- HTTP local: sin sesión 401; cancelar ID inexistente 404; timbrado deshabilitado 409; listado autenticado 200 y auditoría sin escrituras. La prueba HTTP es de solo lectura/rechazos; cancelaciones reales se ejercitaron contra handlers autenticados y base temporal.
- Respaldo SQLite consistente antes del esquema: `%TEMP%/controlerp-before-cancelaciones-20260927-222425.db` (1,044,480 bytes). Se agregaron campos opcionales a Venta en los tres esquemas y se sincronizó la demo de forma aditiva. El servidor local quedó disponible en puerto 3222.

**Pendientes:** aceptación visual con los dos equipos, PostgreSQL/migración versionada E1-09, flujo de devolución monetaria para contado/POS, conciliación de caja/bancos/pólizas y tratamiento de facturas reales cuando se incorpore PAC. La cotización convertida conserva vínculo a la venta cancelada; crear una nueva propuesta es la operación actual. Otros generadores y reportes se revisan en E1-08/Etapa 2. Las ventas POS anteriores sin rastro fiable de turno requieren revisión antes de permitir cualquier cancelación manual.

### E1-06 — Ajustes y carga inicial de inventario

**Estado:** implementado y probado en SQLite; aceptación física de ambas empresas y PostgreSQL pendientes. Prioridad P0.

**Rutas:** `src/app/api/inventarios/ajustes/route.ts`, vista de inventario, nuevo importador de stock, `MovimientoKardex` y `AjusteInventario`.

**Hallazgos:** ajuste solo verifica nuevo stock < 0, no valores finitos; folio por conteo; lectura y reemplazo absoluto pueden sobrescribir ventas/despachos concurrentes. Falta protocolo de corte y carga inicial.

**Aceptación:** almacén asignado y tenant, motivo obligatorio, valores finitos y partidas únicas; previsualización de anterior/nuevo/diferencia; confirmación detecta si el stock cambió desde la vista previa; idempotencia del lote; registro de ajuste, Kárdex y actor atómicos. La carga inicial no es un upsert silencioso del catálogo.

**Evidencia:** ajuste vs venta concurrentes, repetición del lote, almacén ajeno, existencia nueva, conciliación por almacén y acta de saldos iniciales aceptada por ambas empresas.

**Implementación del 27/09/2026:** `src/lib/ajustes-inventario.ts` y `POST /api/inventarios/ajustes` exigen vista previa firmada, motivo, actor, almacén asignado y `Idempotency-Key` en la confirmación. El corte conserva anterior/nuevo/diferencia, vence en 15 minutos y se rechaza si cambia cualquier existencia. Ajuste, Kárdex, auditoría y resultado durable `SolicitudInventario` se confirman juntos. El corte inicial solo se admite en un almacén sin movimientos ni stock previo; la creación de productos ya no puede cargar stock directamente. La pantalla conserva una confirmación incierta para reintentar la misma clave. `POST /api/importaciones/stock-inicial` admite un archivo CSV/XLSX por almacén, mapea SKU existentes y devuelve el mismo corte para confirmar.

**Evidencia registrada:** 15 escenarios de `scripts/test-inventario.ts` y 1 escenario adicional de corte masivo en `scripts/test-importaciones.ts`, en bases temporales. Respaldo consistente antes de la tabla nueva: `%TEMP%/controlerp-before-inventario-20260927-223607.db`; antes del lote de importaciones: `%TEMP%/controlerp-before-importaciones-20260927.db` (1,060,864 bytes). La base demo recibió solo modelos aditivos. Pendiente acta de saldos reales firmada por cada empresa y prueba visual completa.

### E1-07 — Importar productos, proveedores y clientes

**Estado:** importador beta implementado y probado con datos sintéticos; archivos reales pendientes por decisión expresa del responsable del piloto. Prioridad P1.

**Rutas previstas:** nuevo módulo `src/app/importaciones/`, API de previsualización/confirmación, servicio de validación de archivos, esquemas Prisma de lote y resultado, catálogos existentes.

**Contratos propuestos para validar con los Excel:**

| Catálogo | Clave dentro de empresa | Campos mínimos propuestos |
|---|---|---|
| Productos/materiales | SKU | SKU, nombre, unidad, precio, costo inicial |
| Proveedores | código | código, razón social; RFC/contacto opcionales |
| Clientes | código | código, razón social; crédito se valida por separado |
| Stock inicial | almacén + SKU | código de almacén, SKU, cantidad de corte |

**Aceptación:** plantilla descargable; archivo acotado en tamaño/filas; preservar códigos y ceros iniciales; mapear encabezados; validar duplicados del archivo y BD por tenant; vista previa y errores por fila; confirmar crea exactamente lo aprobado; lote identificable e idempotente; modo crear/actualizar explícito; nunca importar saldo financiero como campo libre; reporte de resultado sin fórmulas ejecutables; permisos ADMIN/SUPERADMIN y auditoría. Stock se carga por E1-06, separado de productos.

**Evidencia:** muestras anonimizadas de ambos clientes, cientos de filas, acentos/decimales/celdas vacías, códigos duplicados, reintento, archivo inválido, aislamiento, conciliación de conteos. No se encontraron archivos XLS/XLSX/CSV de negocio en el repositorio durante esta inspección.

**Implementación:** `/importaciones` y APIs de plantilla, vista previa y confirmación aceptan CSV UTF-8 o XLSX hasta 2 MB/1000 filas. `exceljs-hardened` limita la expansión del XLSX; se rechazan fórmulas y enlaces. Los lotes `LoteImportacion` se ligan a usuario, tenant, tipo, modo y SHA-256 del archivo. La vista previa muestra errores por fila, duplicados en archivo/empresa y primeras 20 partidas. Confirmar revalida el catálogo, aplica `CREAR` o `ACTUALIZAR` en una transacción, registra cada fila en auditoría y permite recuperar el mismo resultado por lote. Las columnas opcionales omitidas no se limpian en actualización. Cliente y proveedor se crean sin saldos; el crédito inicial de cliente queda en cero. Stock inicial se tramita por E1-06, nunca por alta de producto.

**Evidencia registrada:** 11 escenarios aislados de `scripts/test-importaciones.ts`, incluyendo XLSX, fórmulas, ceros iniciales, actualización obsoleta, aislamiento, saldos y corte masivo. Falta probar los Excel reales: el usuario indicó que los entregará **después de implementar la beta** y avisará. No solicitar de nuevo hasta ese momento. Quedan mapeo fino de columnas y conciliación de cientos de registros por ambas empresas.

### E1-08 — Catálogos y protección de descargables

**Estado:** protección P0 y documentos internos principales implementados; auditoría visual de todos los formatos y aceptación de usuarios pendientes. Prioridad P1; fugas de tenant/costos eran P0.

**Rutas:** `src/app/api/proveedores/route.ts`, `src/app/api/clientes/route.ts`, `src/app/api/productos/route.ts`, `src/app/api/**/pdf/route.ts`, `src/app/api/reportes/**`, `src/lib/pdf-service.ts`.

**Hallazgos:** creación de proveedores/clientes usa código por conteo y no valida números de crédito de forma estricta; proveedor creado sin auditoría. Venta por ID permite ALMACENISTA y carga detalles/producto con costos. Generadores de documentos contienen secciones fiscales y valores de ejemplo que requieren revisión.

**Aceptación:** matriz por endpoint/campo/rol; CRUD validado y auditado; filtro tenant también en joins; no enviar costos a almacenista; PDFs/exports autenticados y del tenant; documentos internos identificados como tales; simulación nunca como fiscal real. Rediseño visual completo se ejecuta en Etapa 2.

**Evidencia:** pruebas sin sesión, cada rol, IDs/queries ajenos y archivos descargados; inspección del contenido y render de PDF con partidas largas, más de una página y recepción parcial.

**Cambios:** alta de productos/proveedores/clientes valida montos finitos, códigos, límites de texto y datos de contacto; genera códigos no basados en conteo y registra auditoría transaccional. ENCARGADO no puede crear o editar condiciones de crédito. Edición de cliente preserva alcance de tenant y registra antes/después. Venta individual/PDF/ticket y cotización PDF niegan el rol ALMACENISTA; guía de traspaso lo restringe al almacén asignado. Remisión, cotización y guía de traspaso usan PDFs internos paginados y marca de empresa, sin sellos/UUID/CLABE ficticios; la guía muestra enviado/recibido/pendiente. Se eliminó la impresión HTML que insertaba datos en `document.write`. Las rutas de correo fiscal de venta/REP, recibo fiscal de nómina y dispersión bancaria de nómina responden 409 durante el piloto sin PAC o datos bancarios validados. El correo de cotización ya no incluye datos bancarios ficticios ni finge éxito si no hay SMTP. Cinco exportaciones CSV del frontend usan escape de fórmulas y Blob; la generación interna de dispersión ya no pone una CLABE de ceros. Los comandos históricos de prueba de PDF/correo se convirtieron en comprobaciones sintéticas sin envío ni demo.

**Evidencia registrada:** 8 escenarios de catálogos/permisos/CSV, 3 PDFs sintéticos con 47 partidas cada uno generados y revisados visualmente. `pypdf` confirmó cuatro páginas por archivo y ausencia de frases fiscales y cuentas de ejemplo. La generación por ruta se probó para guía; falta revisión de todos los PDFs y exportaciones menos prioritarios, así como aceptación de formato por ambas empresas. Las rutas fiscales deshabilitadas requieren rediseño y pruebas con PAC real en una etapa posterior.

### E1-09 — Unificar esquema y comprobar PostgreSQL

**Estado:** paridad y migración inicial PostgreSQL preparadas; ejecución real sobre PostgreSQL pendiente. Prioridad P0 antes del despliegue.

**Rutas:** `prisma/schema.prisma`, `prisma/schema.sqlite.prisma`, `prisma/schema.postgresql.prisma`, `scripts/switch-db.js`, Docker y scripts de regresión.

**Evidencia inicial:** al crear la base de prueba con `schema.sqlite.prisma`, Prisma Client falló por ausencia de `Tenant.moduloPos`. La misma prueba con el esquema activo funcionó. El script de cambio de motor copia la plantilla sobre el esquema activo; cambiar a producción exige reconciliar las plantillas primero.

**Aceptación:** modelos y campos equivalentes salvo diferencias justificadas del proveedor; migración versionada y ensayo sin pérdida; generar cliente desde esquema correcto; suite transaccional sobre PostgreSQL; índice/constraint de idempotencia; documentar errores de concurrencia y política de reintentos.

**Evidencia:** diff de esquemas, migración sobre copia, restore previo, regresión y conciliación de datos. No se dispone todavía del destino de producción.

**Cambios:** los tres esquemas Prisma contienen los mismos 47 modelos/campos salvo el proveedor. `scripts/check-schema-parity.js` bloquea divergencias antes de conmutar de motor. Se generó `prisma/migrations/20260928045000_baseline_postgresql/migration.sql` con 47 tablas para una base PostgreSQL nueva. `docker-entrypoint.sh` aplica `prisma migrate deploy` y deja de ejecutar `db push` en arranque. El script SQLite→PostgreSQL cubre todos los modelos, exige respaldo completo y destino vacío, usa una transacción y falla ante cualquier inserción; su modo directo inseguro quedó deshabilitado. Una base PostgreSQL existente sin historial de migraciones requiere baselining supervisado tras respaldo.

**Evidencia/límite:** comprobación offline de paridad y conteo 47/47 aprobadas; TypeScript, build y regresiones SQLite aprobados. Docker no está disponible en este equipo y aún no se ha elegido infraestructura de producción: **no hay evidencia PostgreSQL, restore ni ensayo de migración de datos**. No ejecutar la migración en el destino final sin esas pruebas.

## Evidencia y pendientes de cierre

- Primer incremento: 17 escenarios en SQLite aprobados el 27/09/2026; datos demo sin cambios por estas pruebas.
- Segundo incremento E1-02: 27 escenarios de ventas/caja aprobados; esquema demo actualizado de forma aditiva con respaldo previo. Conversión integrada en E1-03.
- Tercer incremento E1-03: 22 escenarios de cotizaciones aprobados; 66 escenarios acumulados con regresión. Build, TypeScript y lectura HTTP local aprobados. Cobranza integrada en E1-04.
- Cuarto incremento E1-04: 21 escenarios de cobranza aprobados; 87 acumulados con regresión, recibo interno revisado y demo conciliada sin diferencias. Cancelación lógica integrada en E1-05.
- Quinto incremento E1-05: 22 escenarios de cancelación aprobados; 109 acumulados con regresión.
- Sexto incremento E1-06 a E1-08: 15 escenarios de inventario, 11 de importación y 8 de catálogos/descargables; **143 escenarios aislados acumulados** más generación/revisión de 3 PDFs multipágina. La compilación de producción y TypeScript aprobaron. La demo no se modificó por esas suites.
- Comprobación de tipos y revisión de espacios del diff aprobadas. E1-02 incluye build de producción y comprobación HTTP; la aceptación visual en navegador continúa pendiente.
- Pendientes para aceptar Etapa 1: regresión PostgreSQL de todos los flujos, migración y restore ensayados, aceptación visual y operación por las dos empresas, actas de stock inicial, Excel reales tras la beta y revisión de formatos restantes.
- `npm audit` reporta cuatro avisos (uno alto asociado a `postcss@8.4.31` anidado en Next, tres moderados, incluido `uuid@8.3.2` transitivo del lector XLSX). Un override puntual de PostCSS dejó el árbol de npm inválido y se retiró. Registrar actualización/mitigación antes de producción; no se afirma que el árbol esté libre de avisos.
- Etapa 0 mantiene pendientes de restauración de respaldo, cobertura completa de bitácora y operación de credenciales. Iniciar Etapa 1 no declara cerrado ese trabajo ni autoriza salida a producción.
