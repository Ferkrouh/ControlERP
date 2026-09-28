# Checklist para validar pendientes y calendarizar entregas — Etapa 3

**Uso:** complete una copia por revisión. Marque validado solo con evidencia enlazada. Las estimaciones T+ son relativas; acordar fechas calendario tras asignar responsables, fecha de inicio y dependencias.

## Coordinación

| Dato | Completar |
|---|---|
| Fecha de revisión | ____ / ____ / ______ |
| Coordinador | ______________________________ |
| SUPERADMIN (respaldo/incidentes) | ______________________________ |
| Empresa A / representante | ______________________________ |
| Empresa B / representante | ______________________________ |
| Hosting, región, dominio/TLS | ______________________________ |
| Staging / URL interna | ______________________________ |
| Fecha objetivo beta | ____ / ____ / ______ |
| Ventana empresa A / empresa B | ____ / ____ / ______ / ____ / ____ / ______ |
| RPO (pérdida máxima tolerable) | ______________________________ |
| RTO (tiempo de recuperación) | ______________________________ |
| Usuarios habilitados A / B | ____ / ____ (referencia: 10–15 por empresa) |

## Datos necesarios para fijar fechas

- [ ] Hosting, región, responsable de cuenta, dominio/TLS y acceso decididos.
- [ ] PostgreSQL: modalidad, versión, capacidad, conexiones y actualizaciones decididos.
- [ ] Secretos separados para staging/producción guardados fuera del repositorio.
- [ ] Costos y responsable de hosting, monitoreo, almacenamiento externo y alertas confirmados.
- [ ] RPO/RTO, retención, cifrado y ventanas de respaldo aprobados.
- [ ] Personas de ventas/caja y almacén y dueño de conciliación asignados en ambas empresas.
- [ ] Archivos Excel se entregarán cuando el usuario indique que la beta ya permite adjuntarlos; almacén para stock inicial identificado.
- [ ] Volumen y agenda de pruebas acordados.

## Puertas de salida y agenda

| ID | Requisito verificable | Responsable | Dependencia | Fecha propuesta | Fecha acordada | Estado | Evidencia |
|---|---|---|---|---|---|---|---|
| G1 | Seleccionar hosting/dominio/TLS y arquitectura staging | ____ | Dirección | ____ | ____ | ☐ Pendiente ☐ En curso ☐ Validado | ____ |
| G2 | E3-02: bloquear recepción fuera del almacén asignado | Ingeniería ____ | Código/pruebas | T+2–4 días hábiles* | ____ | ☐ Pendiente ☐ En curso ☐ Validado | ____ |
| G3 | E3-03: evitar sobre-recepción y carreras, permitir recepción parcial | Ingeniería ____ | Código/PostgreSQL | T+2–4 días hábiles* | ____ | ☐ Pendiente ☐ En curso ☐ Validado | ____ |
| G4 | E3-04: ocultar costos a ALMACENISTA en tres endpoints | Ingeniería ____ | Campos permitidos acordados | T+2–4 días hábiles* | ____ | ☐ Pendiente ☐ En curso ☐ Validado | ____ |
| G5 | Desplegar staging aislado, healthcheck, acceso y datos sintéticos | DevOps ____ | G1/secretos | T+1–3 días tras G1* | ____ | ☐ Pendiente ☐ En curso ☐ Validado | ____ |
| G6 | Ensayar migración, backup previo y rollback en copia | DevOps/DBA ____ | G5 | T+2–4 días tras G5* | ____ | ☐ Pendiente ☐ En curso ☐ Validado | ____ |
| G7 | Configurar backup externo cifrado, retención, RPO/RTO y alertas | SUPERADMIN ____ | G1 | ____ | ____ | ☐ Pendiente ☐ En curso ☐ Validado | ____ |
| G8 | Restaurar copia en ambiente aislado y registrar duración/resultado | SUPERADMIN/DBA ____ | G7 | Antes de usuarios | ____ | ☐ Pendiente ☐ En curso ☐ Validado | ____ |
| G9 | Pruebas seguridad/tenant/RBAC y cierre de hallazgos | Ingeniería ____ | G2–G5 | Antes de UAT | ____ | ☐ Pendiente ☐ En curso ☐ Validado | ____ |
| G10 | Regresión ventas/POS, traspasos, inventario, CxC/cobranza, proveedores | QA ____ | G5/G9 | 2–3 días tras staging* | ____ | ☐ Pendiente ☐ En curso ☐ Validado | ____ |
| G11 | Sesiones guiadas y revisión visual en las dos empresas | Representantes ____ | G10/agenda | ____ | ____ | ☐ Pendiente ☐ En curso ☐ Validado | ____ |
| G12 | Importar Excel reales, resolver mapeos y conciliar catálogos | Dueño de datos ____ | Entrega de archivos | ____ | ____ | ☐ Pendiente ☐ En curso ☐ Validado | ____ |
| G13 | Cargar stock inicial por almacén y firmar conteo/corte | Almacén/administración ____ | G12/conteo físico | ____ | ____ | ☐ Pendiente ☐ En curso ☐ Validado | ____ |
| G14 | Acordar soporte, escalamiento, límites, comunicación y rollback | Coordinador/SUPERADMIN ____ | G1/G7/G8 | Antes de go/no-go | ____ | ☐ Pendiente ☐ En curso ☐ Validado | ____ |
| G15 | Firmar go/no-go y ventana para cada empresa | Dirección/empresas ____ | G1–G14 | ____ | ____ | ☐ Pendiente ☐ En curso ☐ Validado | ____ |

\* Estimación de ingeniería desde disponibilidad de dependencias, no fecha comprometida.

## Auditoría de los flujos

Registrar caso ejecutado, empresa/rol, resultado y defecto. Repetir con ambas empresas. No adjuntar secretos ni PII innecesaria.

| Flujo | Empresa / rol | Criterio verificable | Estado | Evidencia / defecto |
|---|---|---|---|---|
| Venta contado → stock → Kárdex → caja | ____ | Un folio; decremento único; importes conciliados | ☐ | ____ |
| Crédito → límite/saldo CxC → abono parcial | ____ | Saldo y política correctos; retry no duplica | ☐ | ____ |
| POS, lector/captura y cambio | ____ | Precio del tenant y cambio exacto; venta única | ☐ | ____ |
| Traspaso entre almacenes | ____ | Origen/destino y Kárdex trazables | ☐ | ____ |
| Recepción parcial de traspaso | ____ | Recibido solo por cantidad física; restante pendiente | ☐ | ____ |
| Ajuste de inventario autorizado | ____ | Motivo/actor y Kárdex correctos | ☐ | ____ |
| Proveedor y recepción de compra | ____ | Rol, almacén y cantidad autorizada respetados | ☐ | ____ |
| Importación catálogo | ____ | Preview, errores por fila, duplicados/conteos | ☐ | ____ |
| PDF/CSV y bitácora | ____ | Datos reales; bitácora exclusiva SUPERADMIN | ☐ | ____ |
| Aislamiento entre empresas | ____ | Sin lectura/mutación/archivo cruzado | ☐ | ____ |

## Backup e incidentes

- [ ] Copia automática/manual identificada y almacenada fuera del host de aplicación.
- [ ] Integridad, cifrado y control de acceso comprobados.
- [ ] Restore aislado: fecha ____ duración ____ resultado ____ evidencia ____.
- [ ] Alerta de fallo y antigüedad probadas.
- [ ] Bitácora permite correlacionar actor, tenant, función, resultado y request; sin secretos.
- [ ] SUPERADMIN y suplente conocen contención, escalamiento, recuperación y comunicación.
- [ ] Rollback de aplicación/migración ensayable; no sobreescribe la última copia válida.

## Pendientes, compromiso y decisión

| Pendiente | Prioridad | Requisito para resolver | Responsable | Fecha compromiso | Evidencia esperada | Bloquea piloto | Estado |
|---|---|---|---|---|---|---|---|
| __________________ | ____ | __________________ | ____ | ____ | __________________ | ☐ Sí ☐ No | ☐ Abierto ☐ En curso ☐ Cerrado |
| __________________ | ____ | __________________ | ____ | ____ | __________________ | ☐ Sí ☐ No | ☐ Abierto ☐ En curso ☐ Cerrado |
| __________________ | ____ | __________________ | ____ | ____ | __________________ | ☐ Sí ☐ No | ☐ Abierto ☐ En curso ☐ Cerrado |
| __________________ | ____ | __________________ | ____ | ____ | __________________ | ☐ Sí ☐ No | ☐ Abierto ☐ En curso ☐ Cerrado |

- Empresa A: ☐ Go ☐ No-go — fecha/hora ____ — aprobador ____ — evidencia ____.
- Empresa B: ☐ Go ☐ No-go — fecha/hora ____ — aprobador ____ — evidencia ____.
- Bloqueos P0/P1 abiertos: ____; riesgos aceptados y dueño: ____.
- Versión/commit: ____; coordinación ____; SUPERADMIN ____; representante A ____; representante B ____.
