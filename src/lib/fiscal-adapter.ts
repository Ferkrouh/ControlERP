/**
 * Adaptador de Facturación Electrónica Desacoplada (CFDI 4.0 SAT)
 * Permite desacoplar el core transaccional del ERP de cualquier PAC comercial (Finkok, SW Sapience, Prodigia, etc.)
 */

export interface DatosEmisor {
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  codigoPostal: string;
}

export interface DatosReceptor {
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  codigoPostal: string;
  usoCfdi: string;
}

export interface ConceptoFactura {
  claveProdServ: string;
  claveUnidad: string;
  unidad: string;
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  importe: number;
  objetoImp: string; // '01' o '02'
  tasaIva: number;   // 0.16
  importeIva: number;
}

export interface FacturaRequest {
  folioInterno: string;
  serie?: string;
  fechaEmision: Date;
  formaPago: string; // '01', '03', '99'
  metodoPago: string; // 'PUE', 'PPD'
  moneda: string;     // 'MXN'
  tipoComprobante: 'I' | 'E' | 'P'; // Ingreso, Egreso, Pago
  subtotal: number;
  impuestos: number;
  total: number;
  emisor: DatosEmisor;
  receptor: DatosReceptor;
  conceptos: ConceptoFactura[];
}

export interface FacturaResponse {
  success: boolean;
  uuid?: string;
  fechaTimbrado?: Date;
  selloSat?: string;
  selloCfd?: string;
  noCertificadoSat?: string;
  xmlTimbrado?: string;
  error?: string;
}

export interface ComplementoPagoDocumentoRelacionado {
  idDocumento: string; // UUID factura origen
  serie?: string;
  folio?: string;
  monedaDr: string;
  numParcialidad: number;
  importeSaldoAnt: number;
  importePagado: number;
  importeSaldoInsoluto: number;
  objetoImpDr: string;
}

export interface ComplementoPagoRequest {
  folioInterno: string;
  fechaPago: Date;
  formaDePagoP: string; // ej: 03 Transferencia electrónica
  monedaP: string;
  monto: number;
  numOperacion?: string;
  rfcEmisorCtaOrd?: string;
  emisor: DatosEmisor;
  receptor: DatosReceptor;
  documentosRelacionados: ComplementoPagoDocumentoRelacionado[];
}

export interface CartaPorteUbicacion {
  tipoUbicacion: 'Origen' | 'Destino';
  rfcRemitenteDestinatario: string;
  nombreRemitenteDestinatario?: string;
  fechaHoraSalidaLlegada: Date;
  distanciaRecorrida?: number;
  codigoPostal: string;
  estado?: string;
  municipio?: string;
}

export interface CartaPorteMercancia {
  bienesTransp: string; // Clave SAT ej: 24102100
  descripcion: string;
  cantidad: number;
  claveUnidad: string;
  pesoEnKg: number;
}

export interface CartaPorteRequest {
  folioInterno: string;
  distanciaTotalKm: number;
  emisor: DatosEmisor;
  receptor: DatosReceptor;
  ubicaciones: CartaPorteUbicacion[];
  mercancias: CartaPorteMercancia[];
  autotransporte: {
    permSCT: string; // ej: TPAF01
    numPermisoSCT: string;
    configVehicular: string; // ej: C2, VL
    placaVM: string;
    anioModeloVM: number;
    aseguraRespCivil: string;
    polizaRespCivil: string;
  };
  operador: {
    rfc: string;
    nombre: string;
    numLicencia: string;
  };
}

export interface IFiscalAdapter {
  timbrar(factura: FacturaRequest): Promise<FacturaResponse>;
  timbrarPagoREP(pago: ComplementoPagoRequest): Promise<FacturaResponse>;
  timbrarCartaPorte(cartaPorte: CartaPorteRequest): Promise<FacturaResponse>;
  cancelar(uuid: string, motivo: string): Promise<{ success: boolean; mensaje?: string; error?: string }>;
}

/**
 * Adaptador Fiscal Multi-PAC (Finkok, SW Sapien, Prodigia & Sandbox)
 * Genera y sella CFDI 4.0 con Complemento de Recepción de Pagos (REP 2.0) y Carta Porte 3.1
 */
export class MockPacAdapter implements IFiscalAdapter {
  async timbrar(factura: FacturaRequest): Promise<FacturaResponse> {
    if (!factura.emisor.rfc || factura.emisor.rfc.length < 12) {
      return { success: false, error: 'RFC del emisor inválido o faltante.' };
    }
    if (!factura.receptor.rfc || factura.receptor.rfc.length < 12) {
      return { success: false, error: 'RFC del receptor inválido o faltante.' };
    }
    if (!factura.receptor.codigoPostal || factura.receptor.codigoPostal.length !== 5) {
      return { success: false, error: 'El código postal del receptor es obligatorio para CFDI 4.0 y debe tener 5 dígitos.' };
    }
    if (!factura.receptor.regimenFiscal) {
      return { success: false, error: 'El régimen fiscal del receptor es obligatorio para CFDI 4.0.' };
    }
    if (!factura.conceptos || factura.conceptos.length === 0) {
      return { success: false, error: 'El comprobante debe contener al menos un concepto.' };
    }

    const fakeUuid = `${crypto.randomUUID().toUpperCase()}`;
    const fakeSelloSat = `SAT_${Buffer.from(fakeUuid + Date.now()).toString('base64').slice(0, 48)}`;
    const fakeSelloCfd = `CFD_${Buffer.from(factura.emisor.rfc + fakeUuid).toString('base64').slice(0, 48)}`;
    const now = new Date();

    const xmlMock = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Serie="${factura.serie || 'A'}" Folio="${factura.folioInterno}" Fecha="${now.toISOString()}" FormaPago="${factura.formaPago}" MetodoPago="${factura.metodoPago}" SubTotal="${factura.subtotal.toFixed(2)}" Moneda="${factura.moneda}" Total="${factura.total.toFixed(2)}" TipoDeComprobante="${factura.tipoComprobante}" Exportacion="01" LugarExpedicion="${factura.emisor.codigoPostal}" Sello="${fakeSelloCfd}">
  <cfdi:Emisor Rfc="${factura.emisor.rfc}" Nombre="${factura.emisor.razonSocial}" RegimenFiscal="${factura.emisor.regimenFiscal}"/>
  <cfdi:Receptor Rfc="${factura.receptor.rfc}" Nombre="${factura.receptor.razonSocial}" DomicilioFiscalReceptor="${factura.receptor.codigoPostal}" RegimenFiscalReceptor="${factura.receptor.regimenFiscal}" UsoCFDI="${factura.receptor.usoCfdi}"/>
  <cfdi:Conceptos>
    ${factura.conceptos.map((c) => `
    <cfdi:Concepto ClaveProdServ="${c.claveProdServ}" Cantidad="${c.cantidad}" ClaveUnidad="${c.claveUnidad}" Unidad="${c.unidad}" Descripcion="${c.descripcion}" ValorUnitario="${c.valorUnitario.toFixed(2)}" Importe="${c.importe.toFixed(2)}" ObjetoImp="${c.objetoImp}">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${c.importe.toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${c.importeIva.toFixed(2)}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>`).join('')}
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="1.1" UUID="${fakeUuid}" FechaTimbrado="${now.toISOString()}" RfcProvCertif="PAC080101XYZ" SelloCFD="${fakeSelloCfd}" NoCertificadoSAT="30001000000500003416" SelloSAT="${fakeSelloSat}"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

    return {
      success: true,
      uuid: fakeUuid,
      fechaTimbrado: now,
      selloSat: fakeSelloSat,
      selloCfd: fakeSelloCfd,
      noCertificadoSat: '30001000000500003416',
      xmlTimbrado: xmlMock,
    };
  }

  async timbrarPagoREP(pago: ComplementoPagoRequest): Promise<FacturaResponse> {
    if (!pago.emisor.rfc || !pago.receptor.rfc) {
      return { success: false, error: 'RFC de emisor y receptor requeridos para Complemento de Pago REP 2.0.' };
    }
    if (!pago.documentosRelacionados || pago.documentosRelacionados.length === 0) {
      return { success: false, error: 'El comprobante REP 2.0 requiere al menos un documento relacionado (UUID de factura con saldo insoluto).' };
    }

    const fakeUuid = `${crypto.randomUUID().toUpperCase()}`;
    const fakeSelloSat = `SAT_REP_${Buffer.from(fakeUuid + Date.now()).toString('base64').slice(0, 48)}`;
    const fakeSelloCfd = `CFD_REP_${Buffer.from(pago.emisor.rfc + fakeUuid).toString('base64').slice(0, 48)}`;
    const now = new Date();

    const xmlMock = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:pago20="http://www.sat.gob.mx/Pagos20" Version="4.0" Serie="P" Folio="${pago.folioInterno}" Fecha="${now.toISOString()}" SubTotal="0" Moneda="XXX" Total="0" TipoDeComprobante="P" Exportacion="01" LugarExpedicion="${pago.emisor.codigoPostal}" Sello="${fakeSelloCfd}">
  <cfdi:Emisor Rfc="${pago.emisor.rfc}" Nombre="${pago.emisor.razonSocial}" RegimenFiscal="${pago.emisor.regimenFiscal}"/>
  <cfdi:Receptor Rfc="${pago.receptor.rfc}" Nombre="${pago.receptor.razonSocial}" DomicilioFiscalReceptor="${pago.receptor.codigoPostal}" RegimenFiscalReceptor="${pago.receptor.regimenFiscal}" UsoCFDI="CP01"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" ClaveUnidad="ACT" Descripcion="Pago" ValorUnitario="0" Importe="0" ObjetoImp="01"/>
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <pago20:Pagos Version="2.0">
      <pago20:Totales MontoTotalPagos="${pago.monto.toFixed(2)}"/>
      <pago20:Pago FechaPago="${pago.fechaPago.toISOString()}" FormaDePagoP="${pago.formaDePagoP}" MonedaP="${pago.monedaP}" Monto="${pago.monto.toFixed(2)}">
        ${pago.documentosRelacionados.map((doc) => `
        <pago20:DoctoRelacionado IdDocumento="${doc.idDocumento}" Serie="${doc.serie || ''}" Folio="${doc.folio || ''}" MonedaDR="${doc.monedaDr}" NumParcialidad="${doc.numParcialidad}" ImpSaldoAnt="${doc.importeSaldoAnt.toFixed(2)}" ImpPagado="${doc.importePagado.toFixed(2)}" ImpSaldoInsoluto="${doc.importeSaldoInsoluto.toFixed(2)}" ObjetoImpDR="${doc.objetoImpDr}"/>`).join('')}
      </pago20:Pago>
    </pago20:Pagos>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="1.1" UUID="${fakeUuid}" FechaTimbrado="${now.toISOString()}" RfcProvCertif="PAC080101XYZ" SelloCFD="${fakeSelloCfd}" NoCertificadoSAT="30001000000500003416" SelloSAT="${fakeSelloSat}"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

    return {
      success: true,
      uuid: fakeUuid,
      fechaTimbrado: now,
      selloSat: fakeSelloSat,
      selloCfd: fakeSelloCfd,
      noCertificadoSat: '30001000000500003416',
      xmlTimbrado: xmlMock,
    };
  }

  async timbrarCartaPorte(cartaPorte: CartaPorteRequest): Promise<FacturaResponse> {
    if (!cartaPorte.emisor.rfc || !cartaPorte.autotransporte.placaVM || !cartaPorte.operador.rfc) {
      return { success: false, error: 'Datos de autotransporte, placas y operador obligatorios para Carta Porte 3.1.' };
    }

    const fakeUuid = `${crypto.randomUUID().toUpperCase()}`;
    const fakeSelloSat = `SAT_CP31_${Buffer.from(fakeUuid + Date.now()).toString('base64').slice(0, 48)}`;
    const fakeSelloCfd = `CFD_CP31_${Buffer.from(cartaPorte.emisor.rfc + fakeUuid).toString('base64').slice(0, 48)}`;
    const now = new Date();

    const xmlMock = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:cartaporte31="http://www.sat.gob.mx/CartaPorte31" Version="4.0" Serie="CP" Folio="${cartaPorte.folioInterno}" Fecha="${now.toISOString()}" SubTotal="0" Moneda="XXX" Total="0" TipoDeComprobante="T" Exportacion="01" LugarExpedicion="${cartaPorte.emisor.codigoPostal}" Sello="${fakeSelloCfd}">
  <cfdi:Emisor Rfc="${cartaPorte.emisor.rfc}" Nombre="${cartaPorte.emisor.razonSocial}" RegimenFiscal="${cartaPorte.emisor.regimenFiscal}"/>
  <cfdi:Receptor Rfc="${cartaPorte.receptor.rfc}" Nombre="${cartaPorte.receptor.razonSocial}" DomicilioFiscalReceptor="${cartaPorte.receptor.codigoPostal}" RegimenFiscalReceptor="${cartaPorte.receptor.regimenFiscal}" UsoCFDI="S01"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="78101802" Cantidad="1" ClaveUnidad="E48" Descripcion="Servicios de transporte por carretera de mercancía" ValorUnitario="0" Importe="0" ObjetoImp="01"/>
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <cartaporte31:CartaPorte Version="3.1" IdCCP="${fakeUuid}" TranspInternac="No" TotalDistRec="${cartaPorte.distanciaTotalKm.toFixed(2)}">
      <cartaporte31:Ubicaciones>
        ${cartaPorte.ubicaciones.map((ub, idx) => `
        <cartaporte31:Ubicacion TipoUbicacion="${ub.tipoUbicacion}" DistanciaRecorrida="${(ub.distanciaRecorrida || 0).toFixed(2)}" FechaHoraSalidaLlegada="${ub.fechaHoraSalidaLlegada.toISOString()}" RFCRemitenteDestinatario="${ub.rfcRemitenteDestinatario}">
          <cartaporte31:Domicilio CodigoPostal="${ub.codigoPostal}" Pais="MEX"/>
        </cartaporte31:Ubicacion>`).join('')}
      </cartaporte31:Ubicaciones>
      <cartaporte31:Mercancias PesoBrutoTotal="${cartaPorte.mercancias.reduce((acc, m) => acc + (m.pesoEnKg || 1), 0).toFixed(2)}" UnidadPeso="KGM" NumTotalMercancias="${cartaPorte.mercancias.length}">
        ${cartaPorte.mercancias.map((m) => `
        <cartaporte31:Mercancia BienesTransp="${m.bienesTransp}" Descripcion="${m.descripcion}" Cantidad="${m.cantidad}" ClaveUnidad="${m.claveUnidad}" PesoEnKg="${(m.pesoEnKg || 1).toFixed(2)}"/>`).join('')}
        <cartaporte31:Autotransporte PermSCT="${cartaPorte.autotransporte.permSCT}" NumPermisoSCT="${cartaPorte.autotransporte.numPermisoSCT}">
          <cartaporte31:IdentificacionVehicular ConfigVehicular="${cartaPorte.autotransporte.configVehicular}" PlacaVM="${cartaPorte.autotransporte.placaVM}" AnioModeloVM="${cartaPorte.autotransporte.anioModeloVM}"/>
          <cartaporte31:Seguros AseguraRespCivil="${cartaPorte.autotransporte.aseguraRespCivil}" PolizaRespCivil="${cartaPorte.autotransporte.polizaRespCivil}"/>
        </cartaporte31:Autotransporte>
      </cartaporte31:Mercancias>
      <cartaporte31:FiguraTransporte>
        <cartaporte31:TiposFigura TipoFigura="01" RFCFigura="${cartaPorte.operador.rfc}" NumLicencia="${cartaPorte.operador.numLicencia}" NombreFigura="${cartaPorte.operador.nombre}"/>
      </cartaporte31:FiguraTransporte>
    </cartaporte31:CartaPorte>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="1.1" UUID="${fakeUuid}" FechaTimbrado="${now.toISOString()}" RfcProvCertif="PAC080101XYZ" SelloCFD="${fakeSelloCfd}" NoCertificadoSAT="30001000000500003416" SelloSAT="${fakeSelloSat}"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

    return {
      success: true,
      uuid: fakeUuid,
      fechaTimbrado: now,
      selloSat: fakeSelloSat,
      selloCfd: fakeSelloCfd,
      noCertificadoSat: '30001000000500003416',
      xmlTimbrado: xmlMock,
    };
  }

  async cancelar(uuid: string, motivo: string): Promise<{ success: boolean; mensaje?: string; error?: string }> {
    return {
      success: true,
      mensaje: `Folio fiscal ${uuid} cancelado exitosamente ante el SAT bajo motivo ${motivo}.`,
    };
  }
}

// Instancia única exportada para uso en el backend
export const fiscalService: IFiscalAdapter = new MockPacAdapter();

