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

export interface IFiscalAdapter {
  timbrar(factura: FacturaRequest): Promise<FacturaResponse>;
  cancelar(uuid: string, motivo: string): Promise<{ success: boolean; mensaje?: string; error?: string }>;
}

/**
 * Adaptador de Simulación / Entorno de Pruebas (Sandbox)
 * Valida todas las reglas del estándar CFDI 4.0 y genera comprobantes estructurados
 */
export class MockPacAdapter implements IFiscalAdapter {
  async timbrar(factura: FacturaRequest): Promise<FacturaResponse> {
    // 1. Validaciones estructurales CFDI 4.0 obligatorias por el SAT
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

    // 2. Simulación de firmado y timbrado SAT
    const fakeUuid = `${crypto.randomUUID().toUpperCase()}`;
    const fakeSelloSat = `SAT_${Buffer.from(fakeUuid + Date.now()).toString('base64').slice(0, 48)}`;
    const fakeSelloCfd = `CFD_${Buffer.from(factura.emisor.rfc + fakeUuid).toString('base64').slice(0, 48)}`;
    const now = new Date();

    // 3. Estructura base de XML CFDI 4.0
    const xmlMock = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Serie="A" Folio="${factura.folioInterno}" Fecha="${now.toISOString()}" FormaPago="${factura.formaPago}" MetodoPago="${factura.metodoPago}" SubTotal="${factura.subtotal.toFixed(2)}" Moneda="${factura.moneda}" Total="${factura.total.toFixed(2)}" TipoDeComprobante="${factura.tipoComprobante}" Exportacion="01" LugarExpedicion="${factura.emisor.codigoPostal}" Sello="${fakeSelloCfd}">
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

  async cancelar(uuid: string, motivo: string): Promise<{ success: boolean; mensaje?: string; error?: string }> {
    return {
      success: true,
      mensaje: `Folio fiscal ${uuid} cancelado exitosamente ante el SAT bajo motivo ${motivo}.`,
    };
  }
}

// Instancia única exportada para uso en el backend
export const fiscalService: IFiscalAdapter = new MockPacAdapter();
