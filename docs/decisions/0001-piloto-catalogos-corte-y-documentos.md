# ADR 0001 — Importación, corte inicial y documentos del piloto

Fecha: 27 de septiembre de 2026. Estado: aceptada para la beta de dos empresas.

## Contexto

El piloto necesita cargar cientos de productos, proveedores y clientes desde Excel. Las existencias representan una operación física y afectan Kárdex. No existe PAC y la facturación fiscal no forma parte del criterio de salida de esta etapa. Los archivos reales se recibirán después de la beta.

## Decisión

1. Catálogos y stock usan operaciones distintas. La importación de productos crea artículos sin existencia; el stock inicial exige almacén virgen, vista previa de corte, confirmación idempotente, Kárdex y auditoría.
2. Una importación de catálogo consta de lectura acotada, vista previa con errores por fila y confirmación explícita. El lote guarda tenant, usuario, tipo, modo, hash SHA-256 del archivo y resultado. `CREAR` y `ACTUALIZAR` son modos separados; no se importan saldos financieros. Cambios de precio o costo quedan auditados.
3. Los documentos de venta y traspaso son remisión/guía **internas**. Las rutas que podrían generar o enviar un CFDI, REP o recibo de nómina simulado quedan deshabilitadas hasta contar con integración y validación fiscal reales. La dispersión bancaria también queda deshabilitada hasta validar cuentas reales.
4. PostgreSQL se prepara con migración versionada. El arranque de producción aplica `migrate deploy`; una base previa requiere respaldo y baselining supervisado. La prueba sobre PostgreSQL y el restore son criterios pendientes antes de operar el piloto.

## Consecuencias y seguimiento

- Un archivo de stock contiene un solo almacén y hasta 1000 SKU existentes. Cada almacén se corta por separado.
- Los códigos con ceros iniciales deben guardarse como texto en Excel. Los encabezados canónicos están en las plantillas CSV.
- Los Excel reales y las actas de stock se validarán con las dos empresas después de la beta; el responsable del producto avisará cuando los adjunte.
- Las pantallas, reportes y formatos ajenos a remisión, cotización y guía aún requieren revisión de diseño y aceptación.
- La regresión PostgreSQL y el tratamiento de avisos de dependencias forman parte del bloqueo de salida a producción.
