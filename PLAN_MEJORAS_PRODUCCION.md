# Plan de mejoras y preparación para producción — ControlERP

**Estado del documento:** hoja de ruta inicial basada en inspección estática del repositorio. No sustituye auditoría dinámica, revisión fiscal profesional ni pruebas con infraestructura de producción.

**Ejecución Etapa 0 (27/09/2026):** en curso. Se endurecieron auth/roles, se añadió el modelo y la vista inicial de bitácora SUPERADMIN, se mejoró el respaldo y se quitaron secretos por defecto en Compose. La base SQLite demo se respaldó antes de agregar la tabla de bitácora. Falta completar instrumentación por flujo, validar respaldos en PostgreSQL externo y ejecutar el flujo de aceptación de piloto.

**Alcance del piloto acordado:** las dos empresas que ya existen en la base de datos demo; alrededor de 10–15 empleados por empresa. Las prioridades funcionales son ventas, traspasos, inventarios/manejo de stock, CxC y cobranza, y proveedores. Se cuenta con archivos Excel de productos, proveedores y clientes con unos cientos de registros. No hay PAC contratado y la facturación electrónica no es prioridad del primer piloto.

## Objetivo

Preparar ControlERP para una salida a producción rápida, pero controlada: primero cerrar bloqueos que pueden causar acceso indebido, pérdida de datos o documentos fiscales inválidos; después estabilizar los flujos comerciales y operativos de mayor uso; por último ampliar capacidades y optimizar experiencia y operación.

## Hallazgos que cambian la prioridad

1. `src/lib/fiscal-adapter.ts` exporta `MockPacAdapter` como servicio global. El código genera UUID, sellos y XML sintéticos y responde éxito sin conexión a un PAC. No es bloqueo para el piloto si la facturación está fuera del alcance; sí se debe rotular y aislar el modo simulador para evitar presentar documentos como fiscales y mantenerlo deshabilitado en operaciones reales.
2. `src/lib/auth.ts` tiene secreto JWT por defecto y `comparePassword` permite comparar contraseñas en texto plano. Debe cerrarse antes de exponer el sistema a usuarios reales. La sesión dura siete días; la expiración, revocación y rotación deben definirse como política.
3. En la revisión de las rutas API hay handlers en `src/app/api/mrp/bom/route.ts`, `src/app/api/mrp/ordenes/route.ts`, `src/app/api/mrp/ordenes/[id]/procesar/route.ts` y `src/app/api/crm/route.ts` que no muestran llamada a `requireAuth`. El middleware no protege API (matcher excluye `api`), por lo que requieren análisis y corrección prioritaria.
4. Algunas operaciones privilegian `tenantId` enviado en body/query para SUPERADMIN, lo cual puede ser válido para administración global, pero necesita política explícita, comprobación de tenant, autorización por acción y auditoría. Las consultas de usuario de negocio deben derivar tenant de sesión.
5. Existe `scripts/backup-db.sh` para PostgreSQL, pero el repositorio no demuestra restauración ensayada, copia fuera del servidor, cifrado, monitorización ni política de RPO/RTO. El script usa una salida comprimida que debe comprobarse ante fallas del pipeline antes de considerarla respaldo válido.
6. No se encontró API/pantalla de importación masiva de productos/materiales, proveedores, clientes o inventario. El alta individual existe. La importación de los Excel disponibles es una dependencia temprana del piloto; el inventario inicial debe generar Kárdex y quedar conciliable.
7. El nombre/documentación describe funciones reales de varias fases, pero “100%” y “listo SAT” no son evidencia de certificación ni funcionamiento en entorno productivo. Los documentos exportados (PDF, CSV, XML, layouts) necesitan criterios de contenido, validación, privacidad y compatibilidad explícitos.

## Auditoría de flujos y trabajo requerido

| Flujo | Estado visto en código/documentación | Trabajo para versión final | Prioridad |
|---|---|---|---|
| Acceso y sesiones | JWT en cookie HTTP-only; `requireAuth` existe. Se detectó secreto por defecto, compatibilidad de password plano y falta de rate limit evidente en login. | Secretos obligatorios fuertes por entorno; migrar hashes legacy; límite progresivo de intentos; expiración/revocación; cierre de sesiones; validar estado de tenant/usuario; recuperación segura; eventos de acceso y alertas. Revisar CSRF/origin en mutaciones y cookies. | P0 |
| Autorización y multi-tenant | Muchas rutas usan `requireAuth`; existen endpoints sin guardia visible y tenant objetivo controlable por request en algunos flujos. Middleware no cubre API. | Matriz rol × acción × recurso; guardia en cada handler; tenant desde sesión por defecto; autorización SUPERADMIN deliberada; pruebas negativas de aislamiento entre tenants; evitar consultas globales accidentales. | P0 |
| Catálogos: productos/materiales | CRUD individual de productos y existencias; SKU/código de barras, precios/costos y claves SAT. Hay Excel existente con cientos de registros. | Importador de Excel/CSV de vista previa, mapeo, validación, deduplicación, actualización vs alta, errores por fila e idempotencia. Confirmar qué columnas del Excel existen y si “material” comparte catálogo de producto o requiere tipo/categoría. | P0 |
| Proveedores | Alta individual con RFC, contacto, días de crédito y saldo. Hay Excel existente. | Importación masiva con normalización RFC, unicidad por tenant, validación de email/días, resolución de duplicados y reporte descargable. Nunca sobrescribir saldos por archivo. | P0 |
| Clientes | CRUD individual y relación a CxC/crédito; hay Excel existente. | Importador con RFC, razón social, domicilio fiscal/código postal si aplica, contacto, límite/días crédito y estado; deduplicar sin alterar saldo/crédito existente inadvertidamente. | P0 |
| Inventario inicial y ajustes | Ajuste transaccional y alta de stock inicial con movimiento Kárdex. | Importación por almacén, conteo/costo base, cantidades decimales/unidades, prevalidación, lote auditable, folio único y conciliación de totales; prohibir cambiar existencias sin Kárdex. Definir archivo fuente y fecha de corte del conteo. | P0 |
| Compras y recepción | Compras registran compra/CxP/stock/Kárdex en transacción. Orden de compra y recepción tienen endpoints aparte. | Revisar consistencia entre compra directa y OC; recepción parcial, cantidades pendientes, costo/impuestos, lotes/caducidad, concurrencia y reintentos. Formalizar 3-way match y autorización. | P1 |
| Ventas, crédito, CxC y cobranza | Venta con reglas de crédito e inventario; abono y CxC en transacciones. | Revisar carrera de límite de crédito/stock, reversas, cancelaciones, redondeo, IVA configurable, folios concurrentes, pagos parciales, saldo vencido y ledger único. Idempotencia ante doble click/reintento. | P0/P1 |
| POS y corte Z | Apertura/cierre de turno y cálculos de caja. | Asegurar pertenencia tenant/almacén y permisos sobre `turnoId`; integrar cada venta con turno y método de pago; incluir retiros/ingresos y conciliación; impedir cierre concurrente y auditar diferencias. | P1 |
| Cotización a venta | Crear/editar/eliminar y endpoint de conversión documentados. | Conversión atómica, expiración, precios/impuestos congelados, stock reservado si aplica, no duplicar venta por reintento, autorización de descuentos y trazabilidad cotización-factura. | P1 |
| Traspasos | Solicitud/confirmación y Kárdex; generación Carta Porte depende del adaptador mock. | Validar cantidades contra existencia bajo concurrencia; transiciones legales; despacho/recepción parcial y merma; movimientos simétricos; responsables y trazabilidad. Carta Porte fuera del alcance del piloto. | P0 |
| Tesorería y bancos | Cuentas y movimientos con transacciones. | Reconciliar saldos con ledger, importación bancaria segura, reglas de conciliación, monedas/tipo de cambio, permisos y protección contra pagos duplicados. | P2 |
| Contabilidad | Motor de pólizas, balanza y exportador XML/CSV. | Validación partida doble e idempotencia por evento; cierre de periodos; reversas; trazabilidad documento-origen; conciliación con subledgers; validar XML contra XSD y reglas SAT vigentes con asesor contable. | P1 |
| Nómina | Cálculo, timbrado/interfaz, dispersión y póliza descritos; motor presente. | Verificar tablas/tabuladores y vigencia fiscal, topes/exenciones, incidencias, permisos de datos sensibles, separación cálculo/autorización/pago, timbrado PAC real, layouts bancarios y protección de archivos. Revisión especializada antes de uso legal. | P0 para uso de nómina |
| CRM y reportes | Rutas de CRM/reportes presentes; CRM aparece entre rutas sin `requireAuth`. | Cerrar autenticación/tenant; definir dueño y permisos; validar cálculos contra datos de origen; filtros, paginación y fecha/zona horaria; evitar fuga de costos/comisiones. | P0 CRM auth; P2 reportes |
| PDF y documentos | Servicio PDF genera factura, cotización, estado de cuenta, REP, Carta Porte y tickets. | Priorizar documentos usados en piloto: cotización, comprobante/ticket de venta, estado de cuenta/recibo de cobranza y formatos de inventario/traspaso. Dejar CFDI/REP/Carta Porte real fuera de alcance; rotular resultados mock. Validar paginación, cifras, tenant, impresión térmica, privacidad y nombres/tipo MIME. | P1 |
| CSV/XML/layouts | Exportaciones de balanza y nómina, más XML fiscal/SAT. | Especificar formato por consumidor, encoding/BOM/delimitadores, escape CSV y fórmula maliciosa, campos obligatorios, fechas/decimales, validación XSD, firmas, versión de layout bancario y control de acceso/auditoría. | P1 |
| Respaldo/recuperación y bitácora Superadmin | Script `backup-db.sh`, retención local 30 días y procedimientos Docker documentados. Se acordó que Superadmin será responsable de respaldos e incidentes y necesita bitácora exclusiva para investigar acciones y fallas. | Backup consistente, cifrado y copia externa; checksum/manifiesto, alertas por fallo/antigüedad, retención, restauración ensayada y registro de cada ejecución. Bitácora append-only visible solo a SUPERADMIN: actor, tenant, acción, recurso/folio, resultado, timestamp, correlation ID, error técnico saneado y cambios antes/después con datos sensibles redactados. Definir retención y alertas sin registrar contraseñas, tokens ni secretos. | P0 |
| Despliegue y operación | Docker/Compose y guía Ubuntu existen; destino aún por decidir. | Mantener app portable; documentar configuración externa, secretos, TLS, migraciones con respaldo previo, health/readiness, logs sin datos sensibles, métricas/alertas, rollback y runbooks. Elegir arquitectura final cuando se conozca carga, presupuesto y región. | P0/P1 |

## Mejoras de frontend

- Auditar cada pantalla por rol y tarea real; priorizar POS, ventas, recepción, inventario, cobranza y compras.
- Unificar componentes de tablas, filtros, formularios, confirmaciones y estados vacíos/cargando/error. Mostrar fallos de validación junto al campo y resumir operaciones antes de confirmar.
- Hacer visibles tenant, almacén, moneda, estado y permisos; mantener importes/códigos en `font-mono` y semántica de colores normativa.
- Añadir paginación/búsqueda del lado servidor, no cargar todo el catálogo en cada vista; controlar errores de red y reintentos seguros.
- Verificar responsive para tablet y mostrador, teclado/lector de barras, foco, contraste, etiquetas accesibles y navegación por teclado.
- Añadir confirmación reforzada para cancelar, timbrar, cerrar caja, recibir mercancía y ajustar stock. Mostrar quién/qué/cuánto/almacén antes de comprometer cambios.
- Definir jerarquía visual y navegación por rol; ocultar accesos sin permiso sin depender de la UI para seguridad.

## Diseño de importaciones masivas

Implementar una infraestructura compartida de importación, con perfiles para productos/materiales, proveedores e inventario inicial:

1. Descargar plantilla CSV/XLSX versionada con diccionario de campos y ejemplos.
2. Subir archivo con límite de tamaño, tipos permitidos y análisis seguro; nunca ejecutar macros ni confiar en MIME del cliente.
3. Vista previa con mapeo de columnas, normalización y conteo de altas/actualizaciones/errores/duplicados.
4. Validación total sin escritura: SKU, RFC, almacén del tenant, unidades, números finitos/rangos y referencias existentes.
5. Confirmación explícita de estrategia (solo altas / actualizar campos permitidos / inventario de apertura) con resumen de impacto.
6. Procesamiento por lotes con `importJobId`, idempotencia, transacción por lote y opción de cancelar. Stock siempre genera Kárdex con folio de importación.
7. Descargar resultado de cada fila y conservar usuario, fecha, archivo hash, tenant, totales y auditoría. Definir eliminación/retención del archivo subido.

## Secuencia propuesta para llegar a producción pronto

### Etapa 0 — Cerrar bloqueos del piloto (P0)

- [x] Agregar autorización por rol a rutas CRM/MRP y validar pertenencia multi-tenant de recursos relacionados en MRP.
- [x] Eliminar secreto JWT de producción predeterminado y comparación de contraseñas en texto plano; agregar herramienta de vista previa/migración legacy (la base demo reportó cero hashes legacy).
- [x] Deshabilitar el cambio de usuario en producción, ocultar el listado de usuarios de sesión en producción y endurecer cierre lógico de tenants suspendidos.
- [x] Agregar limitador de intentos de login por proceso (8 intentos por combinación IP/correo en 15 minutos) y eventos de acceso.
- [x] Retirar secretos PAC/CSD de las respuestas de sesión; impedir claves compartidas por defecto al crear tenants/usuarios; bloquear seed destructivo al arrancar o en producción.
- [x] Agregar modelo, API SUPERADMIN y vista inicial para bitácora de plataforma; registrar accesos y respaldos.
- [x] Exigir `JWT_SECRET` y `POSTGRES_PASSWORD` en Compose, apagar seed automático por defecto, limitar el puerto de app a loopback y detener arranque si `db push` falla.
- [x] Hacer que el backup escriba temporalmente, valide gzip, emita SHA-256 y registre resultado en bitácora cuando PostgreSQL esté disponible.
- [ ] Completar cobertura de bitácora para errores de todos los flujos piloto; definir retención, acceso a logs fallback y alertas. La bitácora ya consolida acciones operativas existentes y eventos de acceso/respaldos.
- [ ] Establecer claves personales nuevas para las cuentas demo antes de invitar a los dos clientes; las contraseñas existentes pueden ser débiles aunque estén almacenadas con bcrypt. Falta un flujo de cambio/recuperación de contraseña o un procedimiento administrativo de rotación.
- [ ] Probar autorización anónima/rol incorrecto/tenant ajeno y revisión del diff de seguridad.
- [ ] Definir almacenamiento externo cifrado y ensayar restore PostgreSQL antes del piloto. El limitador de login actual vive en memoria por proceso; migrarlo a un mecanismo compartido si el despliegue usa varias réplicas.
- Mantener facturación fuera del piloto; marcar el simulador de forma inequívoca como no fiscal y bloquear su uso para emitir documentos oficiales.
- Diseñar e implementar bitácora operativa exclusiva de SUPERADMIN para auditoría de acciones e incidentes; asegurar aislamiento y saneamiento de datos sensibles.
- [x] Respaldar la base SQLite actual en ubicación temporal antes del cambio aditivo de esquema. La copia está en `%TEMP%` del equipo que ejecutó la tarea.
- [ ] Respaldar la base PostgreSQL del ambiente objetivo y ensayar restauración; no declarar piloto sin restore comprobado.
- Validar datos/configuración reales: `.env` no se comparte ni se imprime; rotar cualquier secreto que haya podido exponerse.

### Etapa 1 — Importación y auditoría transaccional del piloto (P0/P1)

**Iniciada el 27/09/2026; todavía no aceptada para producción.** Tickets, decisiones, criterios y evidencia en [ETAPA_1_TICKETS.md](ETAPA_1_TICKETS.md). Primer incremento: traspasos con recepción parcial, aislamiento, permisos, transacción y regresión aislada.

Segundo incremento: venta directa/POS, clave de solicitud persistente, control transaccional de stock/crédito, caja contabilizada en servidor y cierre aislado por empresa. Se aprobaron 27 escenarios adicionales; la conversión de cotizaciones quedó integrada en el tercer incremento; siguen pendientes cobranza, cancelaciones, importaciones y validación sobre PostgreSQL.

Tercer incremento: cotizaciones usan el mismo núcleo de venta, conservan descuentos y se protegen con versiones frente a edición/eliminación concurrentes. Una conversión repetida recupera la venta original. Se aprobaron 22 escenarios de cotizaciones y 66 acumulados con regresión, TypeScript, build y lectura HTTP local. Siguiente bloque: E1-04, cobranza. La aceptación visual y PostgreSQL siguen pendientes.

Cuarto incremento: cargos manuales y abonos con claves persistentes, saldo protegido y bloqueos de crédito conservados; REP deshabilitado y recibo interno sin simulación fiscal. Se aprobaron 21 escenarios de cobranza y 87 acumulados, TypeScript/build/HTTP local. La demo concilia sus 11 documentos y 3 clientes sin diferencias. Siguiente bloque: E1-05, cancelaciones/reversas. PostgreSQL y aceptación de usuarios continúan pendientes.

Quinto incremento: cancelación lógica de ventas sin borrar CxC ni pagos, reversión atómica de stock/crédito y reportes activos corregidos. POS, ventas con abonos y documentos fiscales se bloquean hasta sus flujos de devolución/cancelación respectivos. Se aprobaron 22 escenarios nuevos y 109 acumulados, TypeScript/build/HTTP local. Siguiente bloque: E1-06, ajustes de inventario. El flujo de devolución de dinero de contado, PostgreSQL y aceptación de usuarios siguen pendientes.

Sexto incremento: E1-06 a E1-08 implementan corte inicial y ajustes con vista previa firmada, importación CSV/XLSX de catálogos separada del stock, auditoría de altas/cambios y protección de descargables. Se aprobaron 34 escenarios aislados adicionales, **143 acumulados**, y se revisaron tres PDFs multipágina con datos sintéticos. E1-09 sincroniza esquemas y prepara migración versionada para PostgreSQL. Continúan pendientes el ensayo real de PostgreSQL y restore, aceptación en navegador por ambas empresas, actas físicas de stock y los Excel reales. El usuario entregará esos archivos después de la beta y avisará.

Decisión registrada en [ADR 0001](docs/decisions/0001-piloto-catalogos-corte-y-documentos.md). `npm audit` aún informa un aviso alto transitivo de PostCSS dentro de Next y tres moderados; actualizar o mitigar antes del despliegue objetivo. La infraestructura de producción aún no está definida.

- Mapear y depurar los Excel de productos, proveedores y clientes; confirmar formato, columnas, claves únicas, almacenes y conteo inicial de stock.
- Implementar importación con plantilla, previsualización, reporte por fila, idempotencia y auditoría. Cargar productos/proveedores/clientes; cargar stock inicial en una operación separada y conciliada por almacén.
- Recorrer con escenarios las cadenas venta→stock→Kárdex→CxC→cobranza y solicitud→despacho→recepción de traspaso→Kárdex en ambos almacenes.
- Revisar atomicidad, carreras, reversas, folios, montos y estados terminales.
- Confirmar roles por endpoint y protección de PDFs, exports y datos sensibles.
- Definir pruebas de aceptación por flujo y datos demo/reset; automatizar regresión crítica.

### Etapa 2 — Entregables y operación (P1)

El trabajo se desglosa en [ETAPA_2_TICKETS.md](ETAPA_2_TICKETS.md). Se corrigieron CSV vulnerables a fórmulas, la impresión de corte Z y órdenes de compra, la nomenclatura del KPI de cancelaciones y un reporte presentado erróneamente como dictamen; la generación de XML SAT está bloqueada durante el piloto. Se da por concluido el ciclo de implementación local y su documentación. La salida a piloto real sigue condicionada a restauración de respaldo en el destino elegido, validación de permisos/aislamiento y bitácora, revisión visual y aceptación de usuarios, además de cargar y conciliar los Excel cuando el usuario los entregue. Las suites `tsx` no pudieron ejecutarse en este entorno por error de Node `uv_os_get_passwd` / `ENOMEM`.

### Etapa 3 — Preproducción y salida gradual (P1)

El desglose ejecutable, estado, rutas, criterios y evidencia está en [ETAPA_3_TICKETS.md](ETAPA_3_TICKETS.md); usar [ETAPA_3_CHECKLIST_SALIDA.md](ETAPA_3_CHECKLIST_SALIDA.md) para responsables, requisitos, fechas y decisión go/no-go. La preparación de readiness local está hecha. Los tres hallazgos de seguridad iniciales tienen correcciones locales; 97 escenarios de regresión de flujos y 6 escenarios específicos de compras pasan en SQLite temporal. PostgreSQL, staging, restore y aceptación de usuarios continúan pendientes. No hay destino de staging seleccionado.

- Desplegar ambiente de staging equivalente al destino, con datos anonimizados.
- Migración ensayada, revisión de seguridad, smoke tests, pruebas de carga en POS/listados y pruebas de navegador de flujos principales.
- Piloto con tenant controlado, límites de uso, respaldo anterior a cada migración y plan de rollback.
- Pilotear con las dos empresas demo y 10–15 empleados cada una, comenzando por ventas, traspasos, inventarios, manejo de stock, CxC, cobranza y proveedores. Facturación SAT no forma parte del criterio de salida inicial.
- Habilitar progresivamente módulos fiscal/nómina solo tras integración y validación legal/contable.

### Etapa 4 — Escala (P2)

- Métricas de rendimiento, índices/consultas, colas para imports y envíos de correo, optimización de reportes y políticas de retención.
- Mejoras UX secundarias y activación gradual de todos los módulos según evidencia de uso.

## Criterios mínimos de salida

- Ningún endpoint privado accesible sin autenticación y autorización; pruebas de aislamiento multi-tenant para cada flujo crítico.
- Cero secretos por defecto; contraseñas siempre hasheadas y sesión revocable.
- Ningún modo simulado presentado como documento SAT real.
- Inventario, cartera, caja y contabilidad conciliables; cada mutación tiene actor, folio y evento trazable.
- Backup cifrado externo y restauración cronometrada con RPO/RTO acordados.
- Aceptación documentada de los flujos críticos; errores operativos recuperables y sin duplicar cargos/ventas.
- PDFs/exports con contenido y formatos validados por usuarios; importaciones con previsualización y resultado auditable.
- Despliegue repetible, migración/rollback documentados y monitoreo activo.

## Recomendación de modelo GPT y uso de tokens

Para el trabajo cotidiano de implementación por tickets, usar **GPT-6 Luna** con razonamiento bajo o medio: es la opción más económica/rápida entre los modelos disponibles y suele bastar para CRUD, componentes, importadores acotados y correcciones guiadas por criterios claros.

Reservar **GPT-6 Sol** con razonamiento medio/alto para cambios que cruzan varios módulos, análisis de concurrencia/transacciones, autenticación y aislamiento multi-tenant. Usar **GPT-6 Astra** solo para decisiones o revisiones de alto riesgo (arquitectura, fiscalidad, seguridad integral) que luego deben verificarse con herramientas y especialistas; no mantenerlo en cada tarea.

Para reducir tokens sin perder control: convertir esta hoja de ruta en tickets pequeños con rutas afectadas, criterios de aceptación y evidencia necesaria; cargar solo el contexto del ticket; pedir una revisión enfocada de diff; ejecutar las comprobaciones pertinentes y mantener documentación de decisiones. El modelo no sustituye asesoría fiscal/legal ni pruebas del PAC real.

## Decisiones e información que faltan para cerrar el plan

Estas respuestas pueden darse en paralelo mientras se abordan los bloqueos técnicos:

1. ¿El primer piloto usará una sola empresa real o varios tenants desde el día uno?
2. ¿Cuál es el flujo que debe funcionar primero en producción: ventas/POS, compras/inventario, cobranza o factura SAT?
3. ¿Tienen ya PAC contratado, certificados CSD de prueba/producción y asesor contable/fiscal para validar CFDI, REP, Carta Porte y nómina?
4. ¿Cuántos usuarios, almacenes y operaciones diarias se esperan aproximadamente en el primer año?
5. ¿Habrá un conjunto de datos existente para importar? ¿En qué formatos y con qué volumen aproximado?
6. ¿Qué tolerancia de pérdida/indisponibilidad se requiere (RPO/RTO) y quién será responsable de recibir alertas de respaldo/incidentes?
7. **Validación por usuarios:** necesitamos que algunas personas que harán el trabajo real prueben los flujos antes del piloto. Por ejemplo: una persona de ventas/caja crea ventas y cobra; una de almacén recibe y traspasa mercancía; una persona administradora revisa clientes/proveedores y saldos. Les damos una lista breve de tareas, observamos qué funciona/confunde, registramos defectos y conseguimos su aceptación para los casos críticos. Esto evita dar por listo un flujo basándonos solo en que el código compila. No requiere que participen todos los empleados ni detener el trabajo de desarrollo. ¿Puedes designar al menos una persona de cada empresa para ventas/caja y una para almacén, y un responsable que confirme los saldos iniciales?

## Acuerdos del piloto confirmados

- Primer piloto con los dos tenants/empresas de la base demo, alrededor de 10–15 empleados por empresa.
- Prioridad: ventas, traspasos, inventarios y manejo de stock, CxC/cobranza y proveedores.
- Se dispone de Excel de productos, proveedores y clientes, con algunos cientos de filas. Falta inspeccionar las plantillas para confirmar campos, calidad y volumen.
- No hay PAC contratado; facturación SAT no es prioridad del piloto. La integración fiscal se planifica después.
- SUPERADMIN será responsable de respaldos e incidentes y requiere una bitácora exclusiva para auditar acciones, fallas y eventos asociados a funciones.
- Falta confirmar usuarios representantes para validación práctica y corte/saldos iniciales.

**Nota:** El repositorio está limpio en `main` en esta inspección. Este documento registra hallazgos estáticos; no se ejecutó suite de pruebas ni auditoría dinámica.
