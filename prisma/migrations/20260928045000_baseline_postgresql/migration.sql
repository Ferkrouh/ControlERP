-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "nombreComercial" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "identificacionFiscal" TEXT NOT NULL,
    "regimenFiscal" TEXT,
    "codigoPostal" TEXT,
    "giro" TEXT NOT NULL DEFAULT 'DISTRIBUCION_MAYOREO',
    "moneda" TEXT NOT NULL DEFAULT 'MXN',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "logoUrl" TEXT,
    "colorPrimario" TEXT NOT NULL DEFAULT '#2563eb',
    "textoEncabezadoDoc" TEXT,
    "diasGraciaCredito" INTEGER NOT NULL DEFAULT 0,
    "alertaVencimientoDias" INTEGER NOT NULL DEFAULT 5,
    "politicaBloqueoCredito" TEXT NOT NULL DEFAULT 'ESTRICTO',
    "planSuscripcion" TEXT NOT NULL DEFAULT 'PROFESIONAL',
    "fechaInicioPlan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimientoPlan" TIMESTAMP(3),
    "diasGraciaSuscripcion" INTEGER NOT NULL DEFAULT 3,
    "bloqueadoPorSuscripcion" BOOLEAN NOT NULL DEFAULT false,
    "limiteUsuarios" INTEGER NOT NULL DEFAULT 10,
    "limiteAlmacenes" INTEGER NOT NULL DEFAULT 5,
    "notasSuperadmin" TEXT,
    "moduloPos" BOOLEAN NOT NULL DEFAULT true,
    "moduloCotizaciones" BOOLEAN NOT NULL DEFAULT true,
    "moduloCredito" BOOLEAN NOT NULL DEFAULT true,
    "moduloCxC" BOOLEAN NOT NULL DEFAULT true,
    "moduloListasPrecio" BOOLEAN NOT NULL DEFAULT true,
    "moduloOrdenesCompra" BOOLEAN NOT NULL DEFAULT true,
    "moduloProveedores" BOOLEAN NOT NULL DEFAULT true,
    "moduloCxP" BOOLEAN NOT NULL DEFAULT true,
    "moduloMultiAlmacen" BOOLEAN NOT NULL DEFAULT true,
    "moduloTraspasos" BOOLEAN NOT NULL DEFAULT true,
    "moduloLotes" BOOLEAN NOT NULL DEFAULT true,
    "moduloReportes" BOOLEAN NOT NULL DEFAULT true,
    "moduloFacturacionSAT" BOOLEAN NOT NULL DEFAULT false,
    "moduloTesoreria" BOOLEAN NOT NULL DEFAULT true,
    "moduloManufactura" BOOLEAN NOT NULL DEFAULT true,
    "moduloCrm" BOOLEAN NOT NULL DEFAULT true,
    "moduloContabilidad" BOOLEAN NOT NULL DEFAULT true,
    "moduloNomina" BOOLEAN NOT NULL DEFAULT true,
    "funcionesHabilitadas" TEXT,
    "pacProveedor" TEXT DEFAULT 'FINKOK',
    "pacUsuario" TEXT,
    "pacPassword" TEXT,
    "pacModoProduccion" BOOLEAN NOT NULL DEFAULT false,
    "serieFactura" TEXT DEFAULT 'A',
    "seriePagoRep" TEXT DEFAULT 'P',
    "serieCartaPorte" TEXT DEFAULT 'CP',
    "csdCertificadoBase64" TEXT,
    "csdLlaveBase64" TEXT,
    "csdPassword" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'ENCARGADO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "almacenAsignadoId" TEXT,
    "comisionPct" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "metaVentasMensual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "rfc" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "diasCredito" INTEGER NOT NULL DEFAULT 0,
    "limiteCredito" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saldoActual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estadoCredito" TEXT NOT NULL DEFAULT 'ACTIVO',
    "regimenFiscal" TEXT,
    "usoCfdi" TEXT DEFAULT 'G01',
    "codigoPostal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "rfc" TEXT,
    "contacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "diasCredito" INTEGER NOT NULL DEFAULT 0,
    "saldoPendiente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Almacen" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ubicacion" TEXT,
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Almacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "codigoBarras" TEXT,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'General',
    "unidadMedida" TEXT NOT NULL DEFAULT 'PZA',
    "costoPromedio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "precioVenta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stockMinimo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stockMaximo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "claveSat" TEXT DEFAULT '01010101',
    "claveUnidadSat" TEXT DEFAULT 'H87',
    "objetoImp" TEXT NOT NULL DEFAULT '02',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Existencia" (
    "id" TEXT NOT NULL,
    "almacenId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Existencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "almacenId" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "tipoPago" TEXT NOT NULL DEFAULT 'CONTADO',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "impuestos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'COMPLETADA',
    "cxcId" TEXT,
    "turnoCajaId" TEXT,
    "canceladaEn" TIMESTAMP(3),
    "canceladaPorId" TEXT,
    "motivoCancelacion" TEXT,
    "usuarioId" TEXT NOT NULL,
    "usuarioNombre" TEXT NOT NULL,
    "observaciones" TEXT,
    "estadoFiscal" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "uuidFiscal" TEXT,
    "fechaTimbrado" TIMESTAMP(3),
    "selloDigitalSat" TEXT,
    "xmlSat" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentaDetalle" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "costoUnitario" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "VentaDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compra" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "almacenId" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "folioFacturaProv" TEXT,
    "tipoPago" TEXT NOT NULL DEFAULT 'CREDITO',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "impuestos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'RECIBIDA',
    "cxpId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "usuarioNombre" TEXT NOT NULL,
    "observaciones" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompraDetalle" (
    "id" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "costoUnitario" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CompraDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Traspaso" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "almacenOrigenId" TEXT NOT NULL,
    "almacenDestinoId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'SOLICITADO',
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEnvio" TIMESTAMP(3),
    "fechaRecepcion" TIMESTAMP(3),
    "observaciones" TEXT,
    "requiereCartaPorte" BOOLEAN NOT NULL DEFAULT false,
    "estadoCartaPorte" TEXT NOT NULL DEFAULT 'NO_APLICA',
    "uuidCartaPorte" TEXT,
    "fechaTimbradoCP" TIMESTAMP(3),
    "xmlCartaPorte" TEXT,
    "distanciaKm" DOUBLE PRECISION DEFAULT 0,
    "vehiculoPlacas" TEXT,
    "vehiculoModelo" TEXT,
    "operadorNombre" TEXT,
    "operadorRfc" TEXT,
    "operadorLicencia" TEXT,

    CONSTRAINT "Traspaso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraspasoItem" (
    "id" TEXT NOT NULL,
    "traspasoId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidadEnviada" DOUBLE PRECISION NOT NULL,
    "cantidadRecibida" DOUBLE PRECISION,

    CONSTRAINT "TraspasoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AjusteInventario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "almacenId" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "observaciones" TEXT,
    "usuarioId" TEXT NOT NULL,
    "usuarioNombre" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AjusteInventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AjusteInventarioItem" (
    "id" TEXT NOT NULL,
    "ajusteId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidadAnterior" DOUBLE PRECISION NOT NULL,
    "cantidadAjustada" DOUBLE PRECISION NOT NULL,
    "cantidadNueva" DOUBLE PRECISION NOT NULL,
    "costoUnitario" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AjusteInventarioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoKardex" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "almacenId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "tipoMovimiento" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "costoUnitario" DOUBLE PRECISION NOT NULL,
    "saldoResultante" DOUBLE PRECISION NOT NULL,
    "folioReferencia" TEXT,
    "motivo" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoKardex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuentaPorCobrar" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "montoTotal" DOUBLE PRECISION NOT NULL,
    "saldoPendiente" DOUBLE PRECISION NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "CuentaPorCobrar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoCxC" (
    "id" TEXT NOT NULL,
    "cxcId" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "metodo" TEXT NOT NULL,
    "referencia" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requiereRep" BOOLEAN NOT NULL DEFAULT false,
    "estadoFiscalRep" TEXT NOT NULL DEFAULT 'NO_APLICA',
    "uuidRep" TEXT,
    "fechaTimbradoRep" TIMESTAMP(3),
    "xmlRep" TEXT,

    CONSTRAINT "PagoCxC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuentaPorPagar" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "folioFactura" TEXT NOT NULL,
    "montoTotal" DOUBLE PRECISION NOT NULL,
    "saldoPendiente" DOUBLE PRECISION NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "CuentaPorPagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoCxP" (
    "id" TEXT NOT NULL,
    "cxpId" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "metodo" TEXT NOT NULL,
    "referencia" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagoCxP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroAuditoria" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "usuarioNombre" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "nivelRiesgo" TEXT NOT NULL DEFAULT 'NORMAL',
    "detalles" TEXT NOT NULL,
    "hashPrevio" TEXT,
    "hashEvento" TEXT,
    "ipAddress" TEXT,
    "metadataJson" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroPlataforma" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "usuarioId" TEXT,
    "usuarioEmail" TEXT,
    "categoria" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "resultado" TEXT NOT NULL DEFAULT 'OK',
    "detalles" TEXT NOT NULL,
    "correlationId" TEXT,
    "ipAddress" TEXT,
    "metadataJson" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroPlataforma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cotizacion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "vigenciaDias" INTEGER NOT NULL DEFAULT 15,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "impuestos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "ventaIdGenerada" TEXT,
    "usuarioId" TEXT NOT NULL,
    "usuarioNombre" TEXT NOT NULL,
    "observaciones" TEXT,
    "condicionesPago" TEXT DEFAULT 'Contado / Crédito sujeto a aprobación',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionDetalle" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CotizacionDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurnoCajaPOS" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "almacenId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "usuarioNombre" TEXT NOT NULL,
    "montoApertura" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montoCierre" DOUBLE PRECISION,
    "totalEfectivo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTarjeta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTransfer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalVentas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "diferencia" DOUBLE PRECISION DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTO',
    "notasApertura" TEXT,
    "notasCierre" TEXT,
    "fechaApertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" TIMESTAMP(3),

    CONSTRAINT "TurnoCajaPOS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListaPrecio" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "porcentajeDescuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListaPrecio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListaPrecioItem" (
    "id" TEXT NOT NULL,
    "listaPrecioId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "precioFijo" DOUBLE PRECISION,
    "descuento" DOUBLE PRECISION,

    CONSTRAINT "ListaPrecioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdenCompra" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "almacenDestinoId" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "impuestos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "usuarioId" TEXT NOT NULL,
    "usuarioNombre" TEXT NOT NULL,
    "observaciones" TEXT,
    "fechaEsperada" TIMESTAMP(3),
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrdenCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdenCompraItem" (
    "id" TEXT NOT NULL,
    "ordenCompraId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidadSolicitada" DOUBLE PRECISION NOT NULL,
    "cantidadRecibida" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costoUnitario" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "OrdenCompraItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoteProducto" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "almacenId" TEXT NOT NULL,
    "numeroLote" TEXT NOT NULL,
    "fechaCaducidad" TIMESTAMP(3),
    "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoteProducto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuentaBancaria" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "nombreCuenta" TEXT NOT NULL,
    "numeroCuenta" TEXT,
    "clabe" TEXT,
    "moneda" TEXT NOT NULL DEFAULT 'MXN',
    "saldoActual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CuentaBancaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoBancario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cuentaBancariaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "saldoResultante" DOUBLE PRECISION NOT NULL,
    "concepto" TEXT NOT NULL,
    "referencia" TEXT,
    "categoria" TEXT NOT NULL DEFAULT 'OPERATIVO',
    "origenModulo" TEXT,
    "origenId" TEXT,
    "conciliado" BOOLEAN NOT NULL DEFAULT false,
    "fechaConciliacion" TIMESTAMP(3),
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoBancario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListaMateriales" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidadBase" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "costoEstimado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListaMateriales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListaMaterialesItem" (
    "id" TEXT NOT NULL,
    "listaMaterialesId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidadRequerida" DOUBLE PRECISION NOT NULL,
    "mermaEsperadaPct" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ListaMaterialesItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdenProduccion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "listaMaterialesId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "almacenOrigenId" TEXT NOT NULL,
    "almacenDestinoId" TEXT NOT NULL,
    "cantidadPlan" DOUBLE PRECISION NOT NULL,
    "cantidadReal" DOUBLE PRECISION,
    "costoTotalInsumos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costoManoObra" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costoTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'PLANIFICADA',
    "usuarioId" TEXT NOT NULL,
    "usuarioNombre" TEXT NOT NULL,
    "observaciones" TEXT,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrdenProduccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OportunidadCRM" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contactoNombre" TEXT NOT NULL,
    "contactoEmail" TEXT,
    "contactoTelefono" TEXT,
    "etapa" TEXT NOT NULL DEFAULT 'PROSPECCION',
    "valorEstimado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "probabilidadPct" INTEGER NOT NULL DEFAULT 20,
    "fechaCierrePrev" TIMESTAMP(3),
    "origen" TEXT DEFAULT 'DIRECTO',
    "usuarioAsignado" TEXT,
    "notas" TEXT,
    "motivoPerdida" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OportunidadCRM_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuentaContable" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "naturaleza" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL DEFAULT 1,
    "codigoAgrupadorSAT" TEXT NOT NULL,
    "saldoInicial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saldoActual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cuentaPadreId" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CuentaContable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolizaContable" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "concepto" TEXT NOT NULL,
    "totalDebe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHaber" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cuadrada" BOOLEAN NOT NULL DEFAULT true,
    "origenModulo" TEXT,
    "origenReferenciaId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "usuarioNombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolizaContable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartidaPoliza" (
    "id" TEXT NOT NULL,
    "polizaId" TEXT NOT NULL,
    "cuentaContableId" TEXT NOT NULL,
    "cargo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "abono" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "concepto" TEXT,
    "referenciaFolio" TEXT,
    "uuidFiscalSAT" TEXT,

    CONSTRAINT "PartidaPoliza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empleado" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "numeroEmpleado" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidoPaterno" TEXT NOT NULL,
    "apellidoMaterno" TEXT,
    "rfc" TEXT NOT NULL,
    "curp" TEXT NOT NULL,
    "nss" TEXT,
    "puesto" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "fechaIngreso" TIMESTAMP(3) NOT NULL,
    "tipoContrato" TEXT NOT NULL DEFAULT '01',
    "tipoJornada" TEXT NOT NULL DEFAULT '01',
    "regimenContratacion" TEXT NOT NULL DEFAULT '02',
    "salarioDiario" DOUBLE PRECISION NOT NULL,
    "salarioDiarioIntegrado" DOUBLE PRECISION NOT NULL,
    "salarioBaseCotizacion" DOUBLE PRECISION NOT NULL,
    "periodicidadPago" TEXT NOT NULL DEFAULT 'QUINCENAL',
    "bancoNombre" TEXT,
    "cuentaClabe" TEXT,
    "metodoPago" TEXT NOT NULL DEFAULT 'TRANSFERENCIA',
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "almacenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Empleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodoNomina" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'QUINCENAL',
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "diasPagados" INTEGER NOT NULL DEFAULT 15,
    "totalPercepciones" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeducciones" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalNeto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCargasPatronales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "polizaContableId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeriodoNomina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReciboNomina" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodoNominaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "diasTrabajados" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "sueldoOrdinario" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasExtra" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valesDespensa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPercepciones" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retencionISR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "imssObrero" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otrasDeducciones" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeducciones" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netoAPagar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "imssPatronal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "infonavitPatronal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isnPatronal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "uuidSAT" TEXT,
    "selloSAT" TEXT,
    "fechaTimbrado" TIMESTAMP(3),
    "cadenaOriginalSAT" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReciboNomina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidenciaNomina" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "horas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "justificada" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidenciaNomina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudVenta" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "hashSolicitud" TEXT NOT NULL,
    "respuestaJson" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitudVenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudCobranza" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "hashSolicitud" TEXT NOT NULL,
    "respuestaJson" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitudCobranza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudInventario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "hashSolicitud" TEXT NOT NULL,
    "respuestaJson" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitudInventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoteImportacion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "modo" TEXT NOT NULL,
    "archivoHash" TEXT NOT NULL,
    "filasJson" TEXT NOT NULL,
    "erroresJson" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PREVISUALIZADO',
    "resultadoJson" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmadoAt" TIMESTAMP(3),

    CONSTRAINT "LoteImportacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tenant_identificacionFiscal_idx" ON "Tenant"("identificacionFiscal");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_tenantId_rol_idx" ON "Usuario"("tenantId", "rol");

-- CreateIndex
CREATE INDEX "Cliente_tenantId_estadoCredito_idx" ON "Cliente"("tenantId", "estadoCredito");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_tenantId_codigo_key" ON "Cliente"("tenantId", "codigo");

-- CreateIndex
CREATE INDEX "Proveedor_tenantId_idx" ON "Proveedor"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_tenantId_codigo_key" ON "Proveedor"("tenantId", "codigo");

-- CreateIndex
CREATE INDEX "Almacen_tenantId_idx" ON "Almacen"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Almacen_tenantId_codigo_key" ON "Almacen"("tenantId", "codigo");

-- CreateIndex
CREATE INDEX "Producto_tenantId_codigoBarras_idx" ON "Producto"("tenantId", "codigoBarras");

-- CreateIndex
CREATE INDEX "Producto_tenantId_categoria_idx" ON "Producto"("tenantId", "categoria");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_tenantId_sku_key" ON "Producto"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "Existencia_productoId_idx" ON "Existencia"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "Existencia_almacenId_productoId_key" ON "Existencia"("almacenId", "productoId");

-- CreateIndex
CREATE INDEX "Venta_tenantId_fecha_idx" ON "Venta"("tenantId", "fecha");

-- CreateIndex
CREATE INDEX "Venta_clienteId_idx" ON "Venta"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Venta_tenantId_folio_key" ON "Venta"("tenantId", "folio");

-- CreateIndex
CREATE INDEX "VentaDetalle_ventaId_idx" ON "VentaDetalle"("ventaId");

-- CreateIndex
CREATE INDEX "VentaDetalle_productoId_idx" ON "VentaDetalle"("productoId");

-- CreateIndex
CREATE INDEX "Compra_tenantId_fecha_idx" ON "Compra"("tenantId", "fecha");

-- CreateIndex
CREATE INDEX "Compra_proveedorId_idx" ON "Compra"("proveedorId");

-- CreateIndex
CREATE UNIQUE INDEX "Compra_tenantId_folio_key" ON "Compra"("tenantId", "folio");

-- CreateIndex
CREATE INDEX "CompraDetalle_compraId_idx" ON "CompraDetalle"("compraId");

-- CreateIndex
CREATE INDEX "CompraDetalle_productoId_idx" ON "CompraDetalle"("productoId");

-- CreateIndex
CREATE INDEX "Traspaso_tenantId_estado_idx" ON "Traspaso"("tenantId", "estado");

-- CreateIndex
CREATE INDEX "Traspaso_tenantId_estadoCartaPorte_idx" ON "Traspaso"("tenantId", "estadoCartaPorte");

-- CreateIndex
CREATE UNIQUE INDEX "Traspaso_tenantId_folio_key" ON "Traspaso"("tenantId", "folio");

-- CreateIndex
CREATE INDEX "TraspasoItem_traspasoId_idx" ON "TraspasoItem"("traspasoId");

-- CreateIndex
CREATE INDEX "TraspasoItem_productoId_idx" ON "TraspasoItem"("productoId");

-- CreateIndex
CREATE INDEX "AjusteInventario_tenantId_fecha_idx" ON "AjusteInventario"("tenantId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "AjusteInventario_tenantId_folio_key" ON "AjusteInventario"("tenantId", "folio");

-- CreateIndex
CREATE INDEX "AjusteInventarioItem_ajusteId_idx" ON "AjusteInventarioItem"("ajusteId");

-- CreateIndex
CREATE INDEX "AjusteInventarioItem_productoId_idx" ON "AjusteInventarioItem"("productoId");

-- CreateIndex
CREATE INDEX "MovimientoKardex_tenantId_almacenId_productoId_idx" ON "MovimientoKardex"("tenantId", "almacenId", "productoId");

-- CreateIndex
CREATE INDEX "MovimientoKardex_tenantId_fecha_idx" ON "MovimientoKardex"("tenantId", "fecha");

-- CreateIndex
CREATE INDEX "CuentaPorCobrar_tenantId_estado_idx" ON "CuentaPorCobrar"("tenantId", "estado");

-- CreateIndex
CREATE INDEX "CuentaPorCobrar_clienteId_idx" ON "CuentaPorCobrar"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "CuentaPorCobrar_tenantId_folio_key" ON "CuentaPorCobrar"("tenantId", "folio");

-- CreateIndex
CREATE INDEX "PagoCxC_cxcId_idx" ON "PagoCxC"("cxcId");

-- CreateIndex
CREATE INDEX "PagoCxC_estadoFiscalRep_idx" ON "PagoCxC"("estadoFiscalRep");

-- CreateIndex
CREATE INDEX "CuentaPorPagar_tenantId_estado_idx" ON "CuentaPorPagar"("tenantId", "estado");

-- CreateIndex
CREATE INDEX "CuentaPorPagar_proveedorId_idx" ON "CuentaPorPagar"("proveedorId");

-- CreateIndex
CREATE INDEX "PagoCxP_cxpId_idx" ON "PagoCxP"("cxpId");

-- CreateIndex
CREATE INDEX "RegistroAuditoria_tenantId_fecha_idx" ON "RegistroAuditoria"("tenantId", "fecha");

-- CreateIndex
CREATE INDEX "RegistroAuditoria_tenantId_modulo_idx" ON "RegistroAuditoria"("tenantId", "modulo");

-- CreateIndex
CREATE INDEX "RegistroAuditoria_tenantId_nivelRiesgo_idx" ON "RegistroAuditoria"("tenantId", "nivelRiesgo");

-- CreateIndex
CREATE INDEX "RegistroPlataforma_fecha_idx" ON "RegistroPlataforma"("fecha");

-- CreateIndex
CREATE INDEX "RegistroPlataforma_tenantId_fecha_idx" ON "RegistroPlataforma"("tenantId", "fecha");

-- CreateIndex
CREATE INDEX "RegistroPlataforma_categoria_fecha_idx" ON "RegistroPlataforma"("categoria", "fecha");

-- CreateIndex
CREATE INDEX "RegistroPlataforma_resultado_fecha_idx" ON "RegistroPlataforma"("resultado", "fecha");

-- CreateIndex
CREATE INDEX "Cotizacion_tenantId_estado_idx" ON "Cotizacion"("tenantId", "estado");

-- CreateIndex
CREATE INDEX "Cotizacion_clienteId_idx" ON "Cotizacion"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Cotizacion_tenantId_folio_key" ON "Cotizacion"("tenantId", "folio");

-- CreateIndex
CREATE INDEX "CotizacionDetalle_cotizacionId_idx" ON "CotizacionDetalle"("cotizacionId");

-- CreateIndex
CREATE INDEX "CotizacionDetalle_productoId_idx" ON "CotizacionDetalle"("productoId");

-- CreateIndex
CREATE INDEX "TurnoCajaPOS_tenantId_estado_idx" ON "TurnoCajaPOS"("tenantId", "estado");

-- CreateIndex
CREATE INDEX "TurnoCajaPOS_almacenId_idx" ON "TurnoCajaPOS"("almacenId");

-- CreateIndex
CREATE UNIQUE INDEX "ListaPrecio_tenantId_nombre_key" ON "ListaPrecio"("tenantId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ListaPrecioItem_listaPrecioId_productoId_key" ON "ListaPrecioItem"("listaPrecioId", "productoId");

-- CreateIndex
CREATE INDEX "OrdenCompra_tenantId_estado_idx" ON "OrdenCompra"("tenantId", "estado");

-- CreateIndex
CREATE INDEX "OrdenCompra_proveedorId_idx" ON "OrdenCompra"("proveedorId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenCompra_tenantId_folio_key" ON "OrdenCompra"("tenantId", "folio");

-- CreateIndex
CREATE INDEX "OrdenCompraItem_ordenCompraId_idx" ON "OrdenCompraItem"("ordenCompraId");

-- CreateIndex
CREATE INDEX "OrdenCompraItem_productoId_idx" ON "OrdenCompraItem"("productoId");

-- CreateIndex
CREATE INDEX "LoteProducto_tenantId_fechaCaducidad_idx" ON "LoteProducto"("tenantId", "fechaCaducidad");

-- CreateIndex
CREATE UNIQUE INDEX "LoteProducto_tenantId_productoId_numeroLote_almacenId_key" ON "LoteProducto"("tenantId", "productoId", "numeroLote", "almacenId");

-- CreateIndex
CREATE INDEX "CuentaBancaria_tenantId_banco_idx" ON "CuentaBancaria"("tenantId", "banco");

-- CreateIndex
CREATE UNIQUE INDEX "CuentaBancaria_tenantId_nombreCuenta_key" ON "CuentaBancaria"("tenantId", "nombreCuenta");

-- CreateIndex
CREATE INDEX "MovimientoBancario_tenantId_cuentaBancariaId_idx" ON "MovimientoBancario"("tenantId", "cuentaBancariaId");

-- CreateIndex
CREATE INDEX "MovimientoBancario_tenantId_fecha_idx" ON "MovimientoBancario"("tenantId", "fecha");

-- CreateIndex
CREATE INDEX "MovimientoBancario_tenantId_conciliado_idx" ON "MovimientoBancario"("tenantId", "conciliado");

-- CreateIndex
CREATE INDEX "ListaMateriales_tenantId_productoId_idx" ON "ListaMateriales"("tenantId", "productoId");

-- CreateIndex
CREATE UNIQUE INDEX "ListaMateriales_tenantId_codigo_key" ON "ListaMateriales"("tenantId", "codigo");

-- CreateIndex
CREATE INDEX "ListaMaterialesItem_listaMaterialesId_idx" ON "ListaMaterialesItem"("listaMaterialesId");

-- CreateIndex
CREATE INDEX "ListaMaterialesItem_productoId_idx" ON "ListaMaterialesItem"("productoId");

-- CreateIndex
CREATE INDEX "OrdenProduccion_tenantId_estado_idx" ON "OrdenProduccion"("tenantId", "estado");

-- CreateIndex
CREATE INDEX "OrdenProduccion_tenantId_productoId_idx" ON "OrdenProduccion"("tenantId", "productoId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenProduccion_tenantId_folio_key" ON "OrdenProduccion"("tenantId", "folio");

-- CreateIndex
CREATE INDEX "OportunidadCRM_tenantId_etapa_idx" ON "OportunidadCRM"("tenantId", "etapa");

-- CreateIndex
CREATE INDEX "OportunidadCRM_tenantId_usuarioAsignado_idx" ON "OportunidadCRM"("tenantId", "usuarioAsignado");

-- CreateIndex
CREATE INDEX "CuentaContable_tenantId_tipo_idx" ON "CuentaContable"("tenantId", "tipo");

-- CreateIndex
CREATE INDEX "CuentaContable_tenantId_codigoAgrupadorSAT_idx" ON "CuentaContable"("tenantId", "codigoAgrupadorSAT");

-- CreateIndex
CREATE UNIQUE INDEX "CuentaContable_tenantId_codigo_key" ON "CuentaContable"("tenantId", "codigo");

-- CreateIndex
CREATE INDEX "PolizaContable_tenantId_tipo_fecha_idx" ON "PolizaContable"("tenantId", "tipo", "fecha");

-- CreateIndex
CREATE INDEX "PolizaContable_tenantId_origenModulo_origenReferenciaId_idx" ON "PolizaContable"("tenantId", "origenModulo", "origenReferenciaId");

-- CreateIndex
CREATE UNIQUE INDEX "PolizaContable_tenantId_folio_key" ON "PolizaContable"("tenantId", "folio");

-- CreateIndex
CREATE INDEX "PartidaPoliza_polizaId_idx" ON "PartidaPoliza"("polizaId");

-- CreateIndex
CREATE INDEX "PartidaPoliza_cuentaContableId_idx" ON "PartidaPoliza"("cuentaContableId");

-- CreateIndex
CREATE INDEX "Empleado_tenantId_estado_idx" ON "Empleado"("tenantId", "estado");

-- CreateIndex
CREATE INDEX "Empleado_tenantId_departamento_idx" ON "Empleado"("tenantId", "departamento");

-- CreateIndex
CREATE UNIQUE INDEX "Empleado_tenantId_numeroEmpleado_key" ON "Empleado"("tenantId", "numeroEmpleado");

-- CreateIndex
CREATE UNIQUE INDEX "Empleado_tenantId_rfc_key" ON "Empleado"("tenantId", "rfc");

-- CreateIndex
CREATE INDEX "PeriodoNomina_tenantId_estado_idx" ON "PeriodoNomina"("tenantId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodoNomina_tenantId_folio_key" ON "PeriodoNomina"("tenantId", "folio");

-- CreateIndex
CREATE INDEX "ReciboNomina_tenantId_periodoNominaId_idx" ON "ReciboNomina"("tenantId", "periodoNominaId");

-- CreateIndex
CREATE INDEX "ReciboNomina_tenantId_empleadoId_idx" ON "ReciboNomina"("tenantId", "empleadoId");

-- CreateIndex
CREATE INDEX "IncidenciaNomina_tenantId_empleadoId_fecha_idx" ON "IncidenciaNomina"("tenantId", "empleadoId", "fecha");

-- CreateIndex
CREATE INDEX "SolicitudVenta_tenantId_fecha_idx" ON "SolicitudVenta"("tenantId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudVenta_tenantId_clave_key" ON "SolicitudVenta"("tenantId", "clave");

-- CreateIndex
CREATE INDEX "SolicitudCobranza_tenantId_fecha_idx" ON "SolicitudCobranza"("tenantId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudCobranza_tenantId_clave_key" ON "SolicitudCobranza"("tenantId", "clave");

-- CreateIndex
CREATE INDEX "SolicitudInventario_tenantId_fecha_idx" ON "SolicitudInventario"("tenantId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudInventario_tenantId_clave_key" ON "SolicitudInventario"("tenantId", "clave");

-- CreateIndex
CREATE INDEX "LoteImportacion_tenantId_fecha_idx" ON "LoteImportacion"("tenantId", "fecha");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proveedor" ADD CONSTRAINT "Proveedor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Almacen" ADD CONSTRAINT "Almacen_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Existencia" ADD CONSTRAINT "Existencia_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "Almacen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Existencia" ADD CONSTRAINT "Existencia_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "Almacen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaDetalle" ADD CONSTRAINT "VentaDetalle_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaDetalle" ADD CONSTRAINT "VentaDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "Almacen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraDetalle" ADD CONSTRAINT "CompraDetalle_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraDetalle" ADD CONSTRAINT "CompraDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Traspaso" ADD CONSTRAINT "Traspaso_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraspasoItem" ADD CONSTRAINT "TraspasoItem_traspasoId_fkey" FOREIGN KEY ("traspasoId") REFERENCES "Traspaso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraspasoItem" ADD CONSTRAINT "TraspasoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AjusteInventario" ADD CONSTRAINT "AjusteInventario_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AjusteInventario" ADD CONSTRAINT "AjusteInventario_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "Almacen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AjusteInventarioItem" ADD CONSTRAINT "AjusteInventarioItem_ajusteId_fkey" FOREIGN KEY ("ajusteId") REFERENCES "AjusteInventario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AjusteInventarioItem" ADD CONSTRAINT "AjusteInventarioItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoKardex" ADD CONSTRAINT "MovimientoKardex_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoKardex" ADD CONSTRAINT "MovimientoKardex_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "Almacen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoKardex" ADD CONSTRAINT "MovimientoKardex_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaPorCobrar" ADD CONSTRAINT "CuentaPorCobrar_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaPorCobrar" ADD CONSTRAINT "CuentaPorCobrar_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCxC" ADD CONSTRAINT "PagoCxC_cxcId_fkey" FOREIGN KEY ("cxcId") REFERENCES "CuentaPorCobrar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaPorPagar" ADD CONSTRAINT "CuentaPorPagar_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaPorPagar" ADD CONSTRAINT "CuentaPorPagar_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCxP" ADD CONSTRAINT "PagoCxP_cxpId_fkey" FOREIGN KEY ("cxpId") REFERENCES "CuentaPorPagar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroAuditoria" ADD CONSTRAINT "RegistroAuditoria_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionDetalle" ADD CONSTRAINT "CotizacionDetalle_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionDetalle" ADD CONSTRAINT "CotizacionDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnoCajaPOS" ADD CONSTRAINT "TurnoCajaPOS_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaPrecio" ADD CONSTRAINT "ListaPrecio_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaPrecioItem" ADD CONSTRAINT "ListaPrecioItem_listaPrecioId_fkey" FOREIGN KEY ("listaPrecioId") REFERENCES "ListaPrecio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaPrecioItem" ADD CONSTRAINT "ListaPrecioItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_almacenDestinoId_fkey" FOREIGN KEY ("almacenDestinoId") REFERENCES "Almacen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompraItem" ADD CONSTRAINT "OrdenCompraItem_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompraItem" ADD CONSTRAINT "OrdenCompraItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoteProducto" ADD CONSTRAINT "LoteProducto_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoteProducto" ADD CONSTRAINT "LoteProducto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaBancaria" ADD CONSTRAINT "CuentaBancaria_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoBancario" ADD CONSTRAINT "MovimientoBancario_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoBancario" ADD CONSTRAINT "MovimientoBancario_cuentaBancariaId_fkey" FOREIGN KEY ("cuentaBancariaId") REFERENCES "CuentaBancaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaMateriales" ADD CONSTRAINT "ListaMateriales_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaMateriales" ADD CONSTRAINT "ListaMateriales_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaMaterialesItem" ADD CONSTRAINT "ListaMaterialesItem_listaMaterialesId_fkey" FOREIGN KEY ("listaMaterialesId") REFERENCES "ListaMateriales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaMaterialesItem" ADD CONSTRAINT "ListaMaterialesItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenProduccion" ADD CONSTRAINT "OrdenProduccion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenProduccion" ADD CONSTRAINT "OrdenProduccion_listaMaterialesId_fkey" FOREIGN KEY ("listaMaterialesId") REFERENCES "ListaMateriales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenProduccion" ADD CONSTRAINT "OrdenProduccion_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenProduccion" ADD CONSTRAINT "OrdenProduccion_almacenOrigenId_fkey" FOREIGN KEY ("almacenOrigenId") REFERENCES "Almacen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenProduccion" ADD CONSTRAINT "OrdenProduccion_almacenDestinoId_fkey" FOREIGN KEY ("almacenDestinoId") REFERENCES "Almacen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OportunidadCRM" ADD CONSTRAINT "OportunidadCRM_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaContable" ADD CONSTRAINT "CuentaContable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolizaContable" ADD CONSTRAINT "PolizaContable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidaPoliza" ADD CONSTRAINT "PartidaPoliza_polizaId_fkey" FOREIGN KEY ("polizaId") REFERENCES "PolizaContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidaPoliza" ADD CONSTRAINT "PartidaPoliza_cuentaContableId_fkey" FOREIGN KEY ("cuentaContableId") REFERENCES "CuentaContable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empleado" ADD CONSTRAINT "Empleado_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodoNomina" ADD CONSTRAINT "PeriodoNomina_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReciboNomina" ADD CONSTRAINT "ReciboNomina_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReciboNomina" ADD CONSTRAINT "ReciboNomina_periodoNominaId_fkey" FOREIGN KEY ("periodoNominaId") REFERENCES "PeriodoNomina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReciboNomina" ADD CONSTRAINT "ReciboNomina_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidenciaNomina" ADD CONSTRAINT "IncidenciaNomina_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidenciaNomina" ADD CONSTRAINT "IncidenciaNomina_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE CASCADE ON UPDATE CASCADE;
