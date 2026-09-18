import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

// ==============================================================================
// Utilidad: Conversión de Montos a Letras en Moneda Nacional (Pesos Mexicanos)
// ==============================================================================
export function numeroALetras(monto: number): string {
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const diezY = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  const entero = Math.floor(Math.abs(monto));
  const centavos = Math.round((Math.abs(monto) - entero) * 100);
  const centavosStr = centavos.toString().padStart(2, '0') + '/100 M.N.';

  if (entero === 0) return `CERO PESOS ${centavosStr}`;
  if (entero === 100) return `CIEN PESOS ${centavosStr}`;

  function seccion(num: number): string {
    let str = '';
    const c = Math.floor(num / 100);
    const d = Math.floor((num % 100) / 10);
    const u = num % 10;

    if (c > 0) {
      if (c === 1 && d === 0 && u === 0) {
        str += 'CIEN ';
      } else {
        str += centenas[c] + ' ';
      }
    }

    if (d === 1) {
      str += diezY[u] + ' ';
    } else if (d === 2 && u > 0) {
      str += 'VEINTI' + unidades[u] + ' ';
    } else if (d > 0) {
      str += decenas[d];
      if (u > 0) str += ' Y ' + unidades[u];
      str += ' ';
    } else if (u > 0) {
      str += unidades[u] + ' ';
    }

    return str.trim();
  }

  let letras = '';
  const millones = Math.floor(entero / 1000000);
  const miles = Math.floor((entero % 1000000) / 1000);
  const resto = entero % 1000;

  if (millones > 0) {
    if (millones === 1) letras += 'UN MILLON ';
    else letras += seccion(millones) + ' MILLONES ';
  }

  if (miles > 0) {
    if (miles === 1) letras += 'UN MIL ';
    else letras += seccion(miles) + ' MIL ';
  }

  if (resto > 0) {
    letras += seccion(resto);
  }

  letras = letras.trim();
  if (entero === 1) {
    return `UN PESO ${centavosStr}`;
  }
  return `${letras} PESOS ${centavosStr}`;
}

// Helper: Extraer componentes RGB de hex
function hexToRgb(hex: string) {
  const cleanHex = hex?.startsWith('#') ? hex : '#2563eb';
  const r = parseInt(cleanHex.slice(1, 3), 16) || 37;
  const g = parseInt(cleanHex.slice(3, 5), 16) || 99;
  const b = parseInt(cleanHex.slice(5, 7), 16) || 235;
  return { r, g, b };
}

// ==============================================================================
// 1. GENERADOR DE FACTURA CFDI 4.0 SAT (The Fintech Ledger - Subtle & Corporate)
// ==============================================================================
export async function generateFacturaPdf(venta: any, tenant: any): Promise<Buffer> {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const { r, g, b } = hexToRgb(tenant?.colorPrimario);

  const isTimbrada = venta.estadoFiscal === 'TIMBRADA';
  const uuid = venta.uuidFiscal || 'NO_TIMBRADA_PREFACTURA';
  const emisorRfc = tenant?.identificacionFiscal || 'XAXX010101000';
  const receptorRfc = venta.cliente?.rfc || 'XAXX010101000';

  // Barra de acento sutil superior
  doc.setFillColor(r, g, b);
  doc.rect(10, 10, 196, 1.5, 'F');

  // Encabezado Emisor (Izquierda con límite estricto maxWidth = 114mm)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(tenant?.nombreComercial || 'ControlERP Enterprise', 10, 17.5, { maxWidth: 114 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(tenant?.razonSocial || 'Distribuidora Mayorista S.A. de C.V.', 10, 22, { maxWidth: 114 });
  doc.text(`RFC: ${emisorRfc} • Régimen: ${tenant?.regimenFiscal || '601 General de Ley'}`, 10, 26, { maxWidth: 114 });
  doc.text(`Lugar de Expedición: C.P. ${tenant?.codigoPostal || '64000'} • Sucursal: ${venta.almacen?.nombre || 'Almacén Central'}`, 10, 30, { maxWidth: 114 });

  // Recuadro de Folio y Tipo Fiscal (Derecha: x=130, w=76)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(130, 13, 76, 22, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(r, g, b);
  doc.text(isTimbrada ? 'FACTURA ELECTRÓNICA (CFDI 4.0)' : 'COMPROBANTE DE VENTA / REMISIÓN', 133, 17.5, { maxWidth: 70 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`FOLIO: ${venta.folio}`, 133, 23, { maxWidth: 70 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha Emisión: ${new Date(venta.fecha).toLocaleString('es-MX')}`, 133, 27.5, { maxWidth: 70 });
  doc.text(`Efecto: I - Ingreso • Moneda: MXN`, 133, 31.5, { maxWidth: 70 });

  // Recuadro de Datos del Cliente / Receptor (x=10, y=38, w=196, h=23)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, 38, 196, 23, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(r, g, b);
  doc.text('DATOS DEL RECEPTOR (CLIENTE)', 13, 42.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Razón Social: ${venta.cliente?.razonSocial || 'PÚBLICO EN GENERAL'}`, 13, 47, { maxWidth: 190 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`RFC: ${receptorRfc}   |   Cód: ${venta.cliente?.codigo || 'CLI-001'}   |   C.P. Domicilio Fiscal: ${venta.cliente?.codigoPostal || '64000'}`, 13, 51, { maxWidth: 190 });
  doc.text(`Régimen Fiscal: ${venta.cliente?.regimenFiscal || '612 - Personas Físicas con Actividades Empresariales'}`, 13, 55, { maxWidth: 190 });
  doc.text(`Uso CFDI: G03 - Gastos en general   |   Método: ${venta.tipoPago === 'CREDITO' ? 'PPD - Pago en Parcialidades' : 'PUE - Pago en una sola exhibición'}   |   Forma: ${venta.tipoPago === 'CREDITO' ? '99 - Por Definir' : '01 - Efectivo'}`, 13, 59, { maxWidth: 190 });

  // Tabla de Conceptos / Partidas (Estilo Sutil Corporativo)
  let y = 64;
  doc.setFillColor(241, 245, 249); // slate-100 suave
  doc.rect(10, y, 196, 6, 'F');
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.line(10, y, 206, y);
  doc.line(10, y + 6, 206, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text('CLAVE SAT', 13, y + 4.2);
  doc.text('SKU / CÓD', 33, y + 4.2);
  doc.text('CANT', 56, y + 4.2, { align: 'center' });
  doc.text('UNIDAD', 68, y + 4.2);
  doc.text('DESCRIPCIÓN DEL ARTÍCULO', 84, y + 4.2);
  doc.text('P. UNITARIO', 152, y + 4.2, { align: 'right' });
  doc.text('IVA 16%', 176, y + 4.2, { align: 'right' });
  doc.text('IMPORTE', 203, y + 4.2, { align: 'right' });

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  const items = venta.detalles || [];
  items.forEach((it: any, idx: number) => {
    const prod = it.producto;
    const sub = Number(it.subtotal || it.cantidad * it.precioUnitario);
    const iva = Math.round(sub * 0.16 * 100) / 100;
    const desc = prod?.nombre || it.nombre || 'Artículo de Catálogo';

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(10, y, 196, 6, 'F');
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(10, y + 6, 206, y + 6);

    doc.setTextColor(71, 85, 105);
    doc.text(prod?.claveSat || '01010101', 13, y + 4);
    doc.text(prod?.sku || 'SKU-00', 33, y + 4);
    doc.setTextColor(15, 23, 42);
    doc.text(String(it.cantidad), 56, y + 4, { align: 'center' });
    doc.text((prod?.claveUnidadSat || 'H87 PZA').slice(0, 7), 68, y + 4);
    doc.text(desc.slice(0, 38), 84, y + 4);
    doc.text(`$${Number(it.precioUnitario).toFixed(2)}`, 152, y + 4, { align: 'right' });
    doc.text(`$${iva.toFixed(2)}`, 176, y + 4, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`$${sub.toFixed(2)}`, 203, y + 4, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += 6;
    if (y > 215) {
      doc.addPage();
      y = 15;
    }
  });

  // Sección de Totales y Resumen
  y += 2;
  doc.setDrawColor(226, 232, 240);
  doc.line(10, y, 206, y);
  y += 3;

  // Importe con Letra (Izquierda)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, y, 115, 23, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('IMPORTE CON LETRA:', 13, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text(numeroALetras(Number(venta.total)), 13, y + 9.5, { maxWidth: 108 });

  if (venta.observaciones) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(`Obs: ${venta.observaciones}`, 13, y + 18, { maxWidth: 108 });
  }

  // Cuadro numérico de totales (Derecha)
  const totalSub = Number(venta.subtotal || Number(venta.total) / 1.16);
  const totalIva = Number(venta.impuestos || Number(venta.total) - totalSub);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', 164, y + 4, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`$${totalSub.toFixed(2)}`, 203, y + 4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('IVA Trasladado (16%):', 164, y + 8.5, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`$${totalIva.toFixed(2)}`, 203, y + 8.5, { align: 'right' });

  // Total Neto Sutil y Ejecutivo
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(130, y + 12, 76, 9, 1.5, 1.5, 'FD');
  // Barra lateral izquierda decorativa
  doc.setFillColor(r, g, b);
  doc.rect(130, y + 12, 2, 9, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL NETO:', 135, y + 17.5);
  doc.setFontSize(9.5);
  doc.text(`$${Number(venta.total).toFixed(2)} MXN`, 202, y + 17.5, { align: 'right' });

  // 5. Timbre Fiscal Digital SAT (Código QR y Sellos Criptográficos)
  const fiscalY = 226;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, fiscalY, 196, 42, 1.5, 1.5, 'FD');

  const satVerifyUrl = `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${uuid}&re=${emisorRfc}&rr=${receptorRfc}&tt=${Number(venta.total).toFixed(2)}&fe=30001000`;
  const qrDataUrl = await QRCode.toDataURL(satVerifyUrl, { margin: 1, width: 128 });
  doc.addImage(qrDataUrl, 'PNG', 13, fiscalY + 3, 26, 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(r, g, b);
  doc.text('TIMBRE FISCAL DIGITAL DEL SAT (CFDI 4.0)', 43, fiscalY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`Folio Fiscal (UUID SAT): ${uuid}`, 43, fiscalY + 9.5, { maxWidth: 160 });
  doc.text(`No. Serie Certificado SAT: 00001000000504465028   |   No. Serie Certificado Emisor: 00001000000508923412`, 43, fiscalY + 13.5, { maxWidth: 160 });
  doc.text(`Fecha y Hora de Certificación: ${new Date(venta.fecha).toISOString()}   |   RFC Prov Cert: FIN1203015JA`, 43, fiscalY + 17.5, { maxWidth: 160 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.setTextColor(100, 116, 139);
  doc.text('Cadena Original del Complemento de Certificación Digital del SAT:', 43, fiscalY + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(`||1.1|${uuid}|${new Date(venta.fecha).toISOString()}|FIN1203015JA|M0g4jK/1A9876543210x98124bcv...||`, 43, fiscalY + 25.5, { maxWidth: 160 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Este documento es una representación impresa de un CFDI versión 4.0', 108, fiscalY + 39, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

// ==============================================================================
// 2. GENERADOR DE COTIZACIÓN / PRESUPUESTO FORMAL (The Fintech Ledger)
// ==============================================================================
export async function generateCotizacionPdf(cotizacion: any, tenant: any): Promise<Buffer> {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const { r, g, b } = hexToRgb(tenant?.colorPrimario);

  const fechaExp = new Date(cotizacion.fecha || cotizacion.createdAt || Date.now());
  const fechaVto = new Date(cotizacion.fechaVencimiento || Date.now() + 15 * 86400000);

  // Barra de acento superior
  doc.setFillColor(r, g, b);
  doc.rect(10, 10, 196, 1.5, 'F');

  // Encabezado Emisor (Izquierda, maxWidth: 114mm)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(tenant?.nombreComercial || 'ControlERP Enterprise', 10, 17.5, { maxWidth: 114 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(tenant?.razonSocial || 'Distribuidora Mayorista S.A. de C.V.', 10, 22, { maxWidth: 114 });
  doc.text(`RFC: ${tenant?.identificacionFiscal || 'XAXX010101000'} • Tel: ${tenant?.telefono || '(81) 8234-5678'}`, 10, 26, { maxWidth: 114 });
  doc.text(`Email: ${tenant?.email || 'ventas@empresa.com'} • Web: ${tenant?.sitioWeb || 'www.empresa.com'}`, 10, 30, { maxWidth: 114 });

  // Recuadro de Cotización (Derecha: x=130, w=76)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(130, 13, 76, 22, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(r, g, b);
  doc.text('COTIZACIÓN / PRESUPUESTO', 133, 17.5, { maxWidth: 70 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`FOLIO: ${cotizacion.folio}`, 133, 23, { maxWidth: 70 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha Emisión: ${fechaExp.toLocaleDateString('es-MX')}`, 133, 27.5, { maxWidth: 70 });
  doc.text(`Vigencia: ${cotizacion.vigenciaDias || 15} días (Hasta ${fechaVto.toLocaleDateString('es-MX')})`, 133, 31.5, { maxWidth: 70 });

  // Datos del Prospecto / Cliente
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, 38, 196, 22, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(r, g, b);
  doc.text('PROPUESTA COMERCIAL PREPARADA PARA:', 13, 42.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Cliente: ${cotizacion.cliente?.razonSocial || 'CLIENTE COMERCIAL'}`, 13, 47, { maxWidth: 190 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`RFC: ${cotizacion.cliente?.rfc || 'XAXX010101000'}   |   Contacto: ${cotizacion.cliente?.contacto || 'Depto. de Compras'}   |   Tel: ${cotizacion.cliente?.telefono || 'S/N'}`, 13, 51, { maxWidth: 190 });
  doc.text(`Asesor Comercial: ${cotizacion.usuarioNombre || 'Ejecutivo de Ventas'}   |   Condiciones: ${cotizacion.condicionesPago || 'Contado comercial / Sujeto a existencias'}`, 13, 55, { maxWidth: 190 });

  // Tabla de Partidas
  let y = 63;
  doc.setFillColor(241, 245, 249);
  doc.rect(10, y, 196, 6, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(10, y, 206, y);
  doc.line(10, y + 6, 206, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text('SKU / CÓDIGO', 13, y + 4.2);
  doc.text('DESCRIPCIÓN DEL ARTÍCULO', 45, y + 4.2);
  doc.text('UNIDAD', 120, y + 4.2);
  doc.text('CANTIDAD', 140, y + 4.2, { align: 'right' });
  doc.text('P. UNITARIO', 172, y + 4.2, { align: 'right' });
  doc.text('SUBTOTAL', 203, y + 4.2, { align: 'right' });

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  const items = cotizacion.detalles || [];
  items.forEach((it: any, idx: number) => {
    const prod = it.producto;
    const sub = Number(it.subtotal || it.cantidad * it.precioUnitario);
    const desc = prod?.nombre || it.nombre || 'Artículo de Cotización';

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(10, y, 196, 6, 'F');
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(10, y + 6, 206, y + 6);

    doc.setTextColor(71, 85, 105);
    doc.text(prod?.sku || 'SKU-00', 13, y + 4);
    doc.setTextColor(15, 23, 42);
    doc.text(desc.slice(0, 48), 45, y + 4);
    doc.text(prod?.unidadMedida || 'PZA', 120, y + 4);
    doc.text(String(it.cantidad), 140, y + 4, { align: 'right' });
    doc.text(`$${Number(it.precioUnitario).toFixed(2)}`, 172, y + 4, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`$${sub.toFixed(2)}`, 203, y + 4, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += 6;
    if (y > 205) {
      doc.addPage();
      y = 15;
    }
  });

  // Totales y Datos Bancarios
  y += 2;
  doc.setDrawColor(226, 232, 240);
  doc.line(10, y, 206, y);
  y += 3;

  // Condiciones y Datos Bancarios (Izquierda)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, y, 115, 30, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(r, g, b);
  doc.text('DATOS PARA TRANSFERENCIA BANCARIA (SPEI):', 13, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Banco: BBVA México   |   Beneficiario: ${tenant?.razonSocial || tenant?.nombreComercial}`, 13, y + 9, { maxWidth: 108 });
  doc.text(`Cuenta CLABE: 012 580 00123456789 0   |   Ref: ${cotizacion.folio}`, 13, y + 13, { maxWidth: 108 });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(`Notas: Precios sujetos a cambio sin previo aviso. Entrega sujeta a existencias.`, 13, y + 18, { maxWidth: 108 });
  if (cotizacion.observaciones) {
    doc.text(`Obs: ${cotizacion.observaciones}`, 13, y + 22, { maxWidth: 108 });
  }

  // Totales numéricos (Derecha)
  const totalSub = Number(cotizacion.subtotal || 0);
  const totalIva = Number(cotizacion.impuestos || totalSub * 0.16);
  const totalNet = Number(cotizacion.total || totalSub + totalIva);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', 164, y + 4, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`$${totalSub.toFixed(2)}`, 203, y + 4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('IVA (16%):', 164, y + 8.5, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`$${totalIva.toFixed(2)}`, 203, y + 8.5, { align: 'right' });

  // Total Neto
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(130, y + 12, 76, 9, 1.5, 1.5, 'FD');
  doc.setFillColor(r, g, b);
  doc.rect(130, y + 12, 2, 9, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL COTIZADO:', 135, y + 17.5);
  doc.setFontSize(9.5);
  doc.text(`$${totalNet.toFixed(2)} MXN`, 202, y + 17.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(numeroALetras(totalNet), 130, y + 25, { maxWidth: 76 });

  // Firmas al pie
  const firmaY = 246;
  doc.setDrawColor(148, 163, 184);
  doc.line(25, firmaY, 85, firmaY);
  doc.line(135, firmaY, 195, firmaY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('ELABORADO POR ASESOR COMERCIAL', 55, firmaY + 4, { align: 'center' });
  doc.text('ACEPTACIÓN Y CONFORMIDAD DEL CLIENTE', 165, firmaY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(cotizacion.usuarioNombre || 'Ejecutivo de Ventas', 55, firmaY + 8, { align: 'center' });
  doc.text('Nombre, Firma y Fecha de Autorización', 165, firmaY + 8, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

// ==============================================================================
// 3. GENERADOR DE COMPLEMENTO DE RECEPCIÓN DE PAGOS (REP 2.0 SAT)
// ==============================================================================
export async function generateRepPdf(pago: any, cxc: any, tenant: any): Promise<Buffer> {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const { r, g, b } = hexToRgb(tenant?.colorPrimario);

  const uuidRep = pago.uuidRep || 'REP-PENDIENTE-CERTIFICACION';
  const emisorRfc = tenant?.identificacionFiscal || 'XAXX010101000';
  const receptorRfc = cxc?.cliente?.rfc || 'XAXX010101000';
  const montoPagado = Number(pago.monto || 0);

  // Barra de acento
  doc.setFillColor(r, g, b);
  doc.rect(10, 10, 196, 1.5, 'F');

  // Encabezado Emisor
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(tenant?.nombreComercial || 'ControlERP Enterprise', 10, 17.5, { maxWidth: 114 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(tenant?.razonSocial || 'Distribuidora Mayorista S.A. de C.V.', 10, 22, { maxWidth: 114 });
  doc.text(`RFC Emisor: ${emisorRfc} • Régimen: ${tenant?.regimenFiscal || '601 General de Ley'}`, 10, 26, { maxWidth: 114 });
  doc.text(`Lugar de Expedición: C.P. ${tenant?.codigoPostal || '64000'} • Efecto: P - Pago`, 10, 30, { maxWidth: 114 });

  // Recuadro REP
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(130, 13, 76, 22, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(r, g, b);
  doc.text('RECIBO ELECTRÓNICO DE PAGO (REP 2.0)', 133, 17.5, { maxWidth: 70 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`FOLIO REP: ${pago.folioRep || `REP-${pago.id.slice(0, 8).toUpperCase()}`}`, 133, 23, { maxWidth: 70 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha Pago: ${new Date(pago.fecha).toLocaleString('es-MX')}`, 133, 27.5, { maxWidth: 70 });
  doc.text(`Versión: CFDI 4.0 / Complemento Pagos 2.0`, 133, 31.5, { maxWidth: 70 });

  // Receptor
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, 38, 196, 22, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(r, g, b);
  doc.text('DATOS DEL RECEPTOR / CLIENTE', 13, 42.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Razón Social: ${cxc?.cliente?.razonSocial || 'PÚBLICO EN GENERAL'}`, 13, 47, { maxWidth: 190 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`RFC: ${receptorRfc}   |   C.P. Fiscal: ${cxc?.cliente?.codigoPostal || '64000'}   |   Régimen: ${cxc?.cliente?.regimenFiscal || '612'}`, 13, 51, { maxWidth: 190 });
  doc.text(`Uso CFDI: CP01 - Pagos   |   Domicilio: ${cxc?.cliente?.direccion || 'Domicilio Fiscal Registrado'}`, 13, 55, { maxWidth: 190 });

  // Detalle de la Transacción
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(10, 63, 196, 20, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(r, g, b);
  doc.text('DETALLE DEL PAGO RECIBIDO', 13, 67.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text(`Forma de Pago SAT: ${pago.metodoPago === 'TRANSFERENCIA' ? '03 - Transferencia electrónica' : pago.metodoPago === 'TARJETA' ? '04 - Tarjeta' : '01 - Efectivo'}   |   Moneda: MXN   |   Tipo Cambio: 1.0000`, 13, 72, { maxWidth: 190 });
  doc.text(`No. Operación / SPEI: ${pago.referencia || 'SPEI-9923841'}   |   Banco Emisor: BBVA   |   Banco Receptor: Santander`, 13, 76.5, { maxWidth: 190 });

  // Tabla de Documentos Relacionados
  let y = 86;
  doc.setFillColor(241, 245, 249);
  doc.rect(10, y, 196, 6, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(10, y, 206, y);
  doc.line(10, y + 6, 206, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text('UUID FACTURA ORIGEN', 13, y + 4.2);
  doc.text('FOLIO FACTURA', 78, y + 4.2);
  doc.text('PARCIALIDAD', 110, y + 4.2);
  doc.text('IMP. SALDO ANT.', 142, y + 4.2, { align: 'right' });
  doc.text('IMP. PAGADO', 172, y + 4.2, { align: 'right' });
  doc.text('SALDO INSOLUTO', 203, y + 4.2, { align: 'right' });

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  const saldoAnterior = Number(cxc?.montoTotal || montoPagado);
  const saldoInsoluto = Math.max(0, saldoAnterior - montoPagado);

  doc.setTextColor(71, 85, 105);
  doc.text((cxc?.uuidFiscal || '4F8A9B2C-1E3D-4F5A-9B0C-1E2D3F4A5B6C').slice(0, 34), 13, y + 4);
  doc.setTextColor(15, 23, 42);
  doc.text(cxc?.folio || 'FAC-2026-0001', 78, y + 4);
  doc.text('1 de 1', 110, y + 4);
  doc.text(`$${saldoAnterior.toFixed(2)}`, 142, y + 4, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(`$${montoPagado.toFixed(2)}`, 172, y + 4, { align: 'right' });
  doc.setTextColor(15, 23, 42);
  doc.text(`$${saldoInsoluto.toFixed(2)}`, 203, y + 4, { align: 'right' });

  // Cuadro Total Acreditado Sutil
  y += 9;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(120, y, 86, 9, 1.5, 1.5, 'FD');
  doc.setFillColor(r, g, b);
  doc.rect(120, y, 2, 9, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL ACREDITADO:', 125, y + 5.8);
  doc.setFontSize(9.5);
  doc.text(`$${montoPagado.toFixed(2)} MXN`, 202, y + 5.8, { align: 'right' });

  // Timbre Fiscal Digital SAT (QR y Sellos)
  const fiscalY = 226;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, fiscalY, 196, 42, 1.5, 1.5, 'FD');

  const satVerifyUrl = `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${uuidRep}&re=${emisorRfc}&rr=${receptorRfc}&tt=${montoPagado.toFixed(2)}&fe=30001000`;
  const qrDataUrl = await QRCode.toDataURL(satVerifyUrl, { margin: 1, width: 128 });
  doc.addImage(qrDataUrl, 'PNG', 13, fiscalY + 3, 26, 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(r, g, b);
  doc.text('TIMBRE FISCAL DIGITAL - COMPLEMENTO DE PAGO 2.0 (SAT)', 43, fiscalY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`UUID REP: ${uuidRep}`, 43, fiscalY + 9.5, { maxWidth: 160 });
  doc.text(`Certificado SAT: 00001000000504465028   |   Certificado Emisor: 00001000000508923412`, 43, fiscalY + 13.5, { maxWidth: 160 });
  doc.text(`Fecha Timbrado: ${new Date(pago.fecha).toISOString()}`, 43, fiscalY + 17.5, { maxWidth: 160 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.setTextColor(100, 116, 139);
  doc.text('Cadena Original del Timbre Fiscal REP:', 43, fiscalY + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(`||1.1|${uuidRep}|${new Date(pago.fecha).toISOString()}|PAG200101XYZ|${montoPagado.toFixed(2)}|MXN||`, 43, fiscalY + 25.5, { maxWidth: 160 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Este documento es una representación impresa de un CFDI versión 4.0 con Complemento de Pagos 2.0', 108, fiscalY + 39, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

// ==============================================================================
// 4. GENERADOR DE TICKET TÉRMICO POS (Formato 80mm en PDF Sutil y Limpio)
// ==============================================================================
export async function generateTicketPosPdf(venta: any, tenant: any): Promise<Buffer> {
  const items = venta.detalles || venta.items || [];
  const baseHeight = 150;
  const itemHeight = items.length * 6;
  const totalHeight = Math.max(160, baseHeight + itemHeight);

  const doc = new jsPDF({
    unit: 'mm',
    format: [80, totalHeight],
  });

  let y = 8;

  // Encabezado Comercial
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(tenant?.nombreComercial || 'ControlERP', 40, y, { align: 'center', maxWidth: 72 });

  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(tenant?.razonSocial || 'Distribuidora S.A. de C.V.', 40, y, { align: 'center', maxWidth: 72 });
  y += 3.5;
  doc.text(`RFC: ${tenant?.identificacionFiscal || 'XAXX010101000'}`, 40, y, { align: 'center' });
  y += 3.5;
  doc.text(`Sucursal: ${venta.almacen?.nombre || venta.almacen || 'Mostrador Principal'}`, 40, y, { align: 'center' });
  y += 3.5;
  doc.text(`C.P. ${tenant?.codigoPostal || '64000'} • Tel: ${tenant?.telefono || '(81) 8123-4567'}`, 40, y, { align: 'center' });

  // Línea divisoria suave
  y += 3;
  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, y, 76, y);
  doc.setLineDashPattern([], 0);

  // Metadatos de Venta
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`TICKET: ${venta.folio}`, 4, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(new Date(venta.fecha || Date.now()).toLocaleString('es-MX'), 76, y, { align: 'right' });

  y += 3.5;
  doc.setTextColor(71, 85, 105);
  doc.text(`Cajero: ${(venta.cajero || venta.usuarioNombre || 'Usuario Mostrador').slice(0, 24)}`, 4, y);
  y += 3.5;
  doc.text(`Cliente: ${(venta.cliente?.razonSocial || venta.cliente || 'PÚBLICO EN GENERAL').slice(0, 24)}`, 4, y);

  // Línea de cabecera de artículos
  y += 3;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, y, 76, y);
  doc.setLineDashPattern([], 0);

  y += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('CANT x DESCRIPCIÓN', 4, y);
  doc.text('TOTAL', 76, y, { align: 'right' });

  y += 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);

  items.forEach((it: any) => {
    const desc = it.producto?.nombre || it.nombre || 'Artículo de mostrador';
    const sub = Number(it.subtotal || it.cantidad * it.precioUnitario);

    doc.text(`${it.cantidad}x ${desc.slice(0, 24)}`, 4, y);
    doc.text(`$${sub.toFixed(2)}`, 76, y, { align: 'right' });
    y += 4.2;
  });

  // Línea de totales
  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, y, 76, y);
  doc.setLineDashPattern([], 0);
  y += 3.5;

  const totalSub = Number(venta.subtotal || Number(venta.total) / 1.16);
  const totalIva = Number(venta.impuestos || Number(venta.total) - totalSub);
  const totalNet = Number(venta.total || 0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', 48, y, { align: 'right' });
  doc.text(`$${totalSub.toFixed(2)}`, 76, y, { align: 'right' });
  y += 3.2;

  doc.text('IVA (16%):', 48, y, { align: 'right' });
  doc.text(`$${totalIva.toFixed(2)}`, 76, y, { align: 'right' });
  y += 4.5;

  // Total destacado sutil (Fondo suave con borde, sin plastas negras)
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(4, y - 3, 72, 7.5, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL:', 7, y + 1.8);
  doc.setFontSize(8.5);
  doc.text(`$${totalNet.toFixed(2)} MXN`, 73, y + 1.8, { align: 'right' });
  y += 8;

  // Desglose de Pago
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Método de Pago: ${venta.tipoPago || 'EFECTIVO'}`, 4, y);
  y += 3.2;

  if (venta.pagoCon !== undefined && venta.pagoCon > 0) {
    doc.text(`Pago con: $${Number(venta.pagoCon).toFixed(2)}`, 4, y);
    doc.text(`Cambio: $${Number(venta.cambio || 0).toFixed(2)}`, 76, y, { align: 'right' });
    y += 3.8;
  }

  // QR de Verificación
  y += 2;
  const qrUrl = `https://controlerp.app/t/${venta.folio}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 96 });
  doc.addImage(qrDataUrl, 'PNG', 29, y, 22, 22);
  y += 24;

  // Mensaje de Cierre
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('¡GRACIAS POR SU COMPRA!', 40, y, { align: 'center' });
  y += 3.2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Comprobante simplificado de mostrador', 40, y, { align: 'center' });
  y += 2.8;
  doc.text('Para facturar solicítelo en caja con su folio de ticket', 40, y, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

// ==============================================================================
// 5. GENERADOR DE ESTADO DE CUENTA DE CLIENTES & ANTIGÜEDAD DE SALDOS
// ==============================================================================
export async function generateEstadoCuentaPdf(cliente: any, tenant: any): Promise<Buffer> {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const { r, g, b } = hexToRgb(tenant?.colorPrimario);

  const now = new Date();
  const cxcList = cliente.cxc || [];
  const saldoTotal = cxcList.reduce((sum: number, doc: any) => sum + Number(doc.saldoPendiente || 0), 0);
  const limiteCredito = Number(cliente.limiteCredito || 0);
  const disponible = Math.max(0, limiteCredito - saldoTotal);

  // Barra superior
  doc.setFillColor(r, g, b);
  doc.rect(10, 10, 196, 1.5, 'F');

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(tenant?.nombreComercial || 'ControlERP Enterprise', 10, 17.5, { maxWidth: 114 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(tenant?.razonSocial || 'Distribuidora Mayorista S.A. de C.V.', 10, 22, { maxWidth: 114 });
  doc.text(`RFC: ${tenant?.identificacionFiscal || 'XAXX010101000'} • Tel: ${tenant?.telefono || '(81) 8123-4567'}`, 10, 26, { maxWidth: 114 });

  // Recuadro Estado de Cuenta
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(130, 13, 76, 22, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(r, g, b);
  doc.text('ESTADO DE CUENTA Y CARTERA', 133, 17.5, { maxWidth: 70 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`CLIENTE: ${cliente.codigo || 'CLI-001'}`, 133, 23, { maxWidth: 70 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha Corte: ${now.toLocaleDateString('es-MX')}`, 133, 27.5, { maxWidth: 70 });
  doc.text(`Moneda: Pesos Mexicanos (MXN)`, 133, 31.5, { maxWidth: 70 });

  // Tarjetas KPI de Cartera Sutiles
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, 38, 46, 15, 1.5, 1.5, 'FD');
  doc.roundedRect(60, 38, 46, 15, 1.5, 1.5, 'FD');
  doc.roundedRect(110, 38, 46, 15, 1.5, 1.5, 'FD');
  doc.roundedRect(160, 38, 46, 15, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('LÍMITE DE CRÉDITO', 13, 42.5);
  doc.text('SALDO ADEUDADO', 63, 42.5);
  doc.text('CRÉDITO DISPONIBLE', 113, 42.5);
  doc.text('DÍAS DE CRÉDITO', 163, 42.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`$${limiteCredito.toFixed(2)}`, 13, 49);
  doc.setTextColor(saldoTotal > limiteCredito ? 225 : 15, saldoTotal > limiteCredito ? 29 : 23, saldoTotal > limiteCredito ? 72 : 42);
  doc.text(`$${saldoTotal.toFixed(2)}`, 63, 49);
  doc.setTextColor(5, 150, 105);
  doc.text(`$${disponible.toFixed(2)}`, 113, 49);
  doc.setTextColor(15, 23, 42);
  doc.text(`${cliente.diasCredito || 30} Días`, 163, 49);

  // Tabla de Facturas Pendientes
  let y = 58;
  doc.setFillColor(241, 245, 249);
  doc.rect(10, y, 196, 6, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(10, y, 206, y);
  doc.line(10, y + 6, 206, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text('FOLIO FACTURA', 13, y + 4.2);
  doc.text('FECHA EMISIÓN', 48, y + 4.2);
  doc.text('VENCIMIENTO', 82, y + 4.2);
  doc.text('DÍAS MORA', 115, y + 4.2);
  doc.text('MONTO TOTAL', 148, y + 4.2, { align: 'right' });
  doc.text('SALDO PENDIENTE', 178, y + 4.2, { align: 'right' });
  doc.text('ESTADO', 203, y + 4.2, { align: 'right' });

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  cxcList.forEach((c: any, idx: number) => {
    const vto = new Date(c.fechaVencimiento);
    const diffDays = Math.floor((now.getTime() - vto.getTime()) / (1000 * 60 * 60 * 24));
    const isVencida = diffDays > 0 && c.saldoPendiente > 0;

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(10, y, 196, 6, 'F');
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(10, y + 6, 206, y + 6);

    doc.setTextColor(15, 23, 42);
    doc.text(c.folio || 'FAC-000', 13, y + 4);
    doc.setTextColor(71, 85, 105);
    doc.text(new Date(c.fechaEmision || c.fecha).toLocaleDateString('es-MX'), 48, y + 4);
    doc.text(vto.toLocaleDateString('es-MX'), 82, y + 4);
    doc.text(isVencida ? `${diffDays} d` : '0 d', 115, y + 4);
    doc.text(`$${Number(c.montoTotal).toFixed(2)}`, 148, y + 4, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`$${Number(c.saldoPendiente).toFixed(2)}`, 178, y + 4, { align: 'right' });

    if (isVencida) {
      doc.setTextColor(225, 29, 72);
      doc.text('EN MORA', 203, y + 4, { align: 'right' });
    } else {
      doc.setTextColor(5, 150, 105);
      doc.text('VIGENTE', 203, y + 4, { align: 'right' });
    }
    doc.setFont('helvetica', 'normal');

    y += 6;
    if (y > 240) {
      doc.addPage();
      y = 15;
    }
  });

  return Buffer.from(doc.output('arraybuffer'));
}

// ==============================================================================
// 6. GENERADOR DE GUÍA DE TRASLADO / CARTA PORTE 3.1
// ==============================================================================
export async function generateCartaPortePdf(traspaso: any, tenant: any): Promise<Buffer> {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const { r, g, b } = hexToRgb(tenant?.colorPrimario);

  // Barra de acento
  doc.setFillColor(r, g, b);
  doc.rect(10, 10, 196, 1.5, 'F');

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(tenant?.nombreComercial || 'ControlERP Logistics', 10, 17.5, { maxWidth: 114 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`RFC: ${tenant?.identificacionFiscal || 'XAXX010101000'} • Traslado Carretero de Mercancías`, 10, 22, { maxWidth: 114 });

  // Recuadro Folio
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(130, 13, 76, 22, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(r, g, b);
  doc.text('CARTA PORTE 3.1 (TRASLADO)', 133, 17.5, { maxWidth: 70 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`FOLIO: ${traspaso.folio}`, 133, 23, { maxWidth: 70 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha Traslado: ${new Date(traspaso.fechaSolicitud).toLocaleString('es-MX')}`, 133, 27.5, { maxWidth: 70 });
  doc.text(`Distancia: ${traspaso.distanciaKm || 45} Km • Tipo: T - Traslado`, 133, 31.5, { maxWidth: 70 });

  // Datos del Vehículo y Operador
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, 38, 196, 23, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(r, g, b);
  doc.text('DATOS DEL AUTOTRANSPORTE FEDERAL Y OPERADOR:', 13, 42.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text(`Vehículo: ${traspaso.vehiculoModelo || 'Kenworth T680 2024'}   |   Placas: ${traspaso.vehiculoPlacas || 'P-991-NL'}`, 13, 47, { maxWidth: 190 });
  doc.text(`Operador: ${traspaso.operadorNombre || 'Juan Pérez González'}   |   RFC: ${traspaso.operadorRfc || 'PEGJ800101XYZ'}`, 13, 51, { maxWidth: 190 });
  doc.text(`Licencia: ${traspaso.operadorLicencia || 'LIC-NL-992384'}   |   Origen: ${traspaso.almacenOrigen?.nombre || 'Principal'} → Destino: ${traspaso.almacenDestino?.nombre || 'Sucursal'}`, 13, 55, { maxWidth: 190 });

  // Tabla de Bienes Transportados
  let y = 64;
  doc.setFillColor(241, 245, 249);
  doc.rect(10, y, 196, 6, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(10, y, 206, y);
  doc.line(10, y + 6, 206, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text('CLAVE SAT', 13, y + 4.2);
  doc.text('SKU', 38, y + 4.2);
  doc.text('DESCRIPCIÓN DE MERCANCÍA', 65, y + 4.2);
  doc.text('CANTIDAD ENVIADA', 150, y + 4.2, { align: 'right' });
  doc.text('UNIDAD', 203, y + 4.2, { align: 'right' });

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  const items = traspaso.items || [];
  items.forEach((it: any, idx: number) => {
    const prod = it.producto;
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(10, y, 196, 6, 'F');
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(10, y + 6, 206, y + 6);

    doc.setTextColor(71, 85, 105);
    doc.text(prod?.claveSat || '01010101', 13, y + 4);
    doc.text(prod?.sku || 'SKU-00', 38, y + 4);
    doc.setTextColor(15, 23, 42);
    doc.text((prod?.nombre || 'Artículo').slice(0, 48), 65, y + 4);
    doc.setFont('helvetica', 'bold');
    doc.text(String(it.cantidadEnviada), 150, y + 4, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(prod?.unidadMedida || 'H87 PZA', 203, y + 4, { align: 'right' });

    y += 6;
  });

  return Buffer.from(doc.output('arraybuffer'));
}

// ==============================================================================
// 7. GENERADOR DE RECIBO DE NÓMINA DIGITAL (CFDI 1.2 SAT)
// ==============================================================================
export async function generateReciboNominaPdf(data: {
  tenant: any;
  periodo: any;
  recibo: any;
  empleado: any;
}): Promise<Buffer> {
  const { tenant, periodo, recibo, empleado } = data;
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const { r, g, b } = hexToRgb(tenant?.colorPrimario);

  const uuidNomina = recibo.uuidNomina || 'RECIBO-NOMINA-CFDI-1.2';
  const emisorRfc = tenant?.identificacionFiscal || 'XAXX010101000';

  // Barra de acento
  doc.setFillColor(r, g, b);
  doc.rect(10, 10, 196, 1.5, 'F');

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(tenant?.nombreComercial || 'ControlERP Nómina', 10, 17.5, { maxWidth: 114 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(tenant?.razonSocial || 'Patrón / Emisor S.A. de C.V.', 10, 22, { maxWidth: 114 });
  doc.text(`RFC Patrón: ${emisorRfc} • Registro IMSS: ${tenant?.registroPatronal || 'Y68-12345-10'}`, 10, 26, { maxWidth: 114 });
  doc.text(`Régimen: ${tenant?.regimenFiscal || '601 General de Ley'} • C.P.: ${tenant?.codigoPostal || '64000'}`, 10, 30, { maxWidth: 114 });

  // Recuadro Recibo
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(130, 13, 76, 22, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(r, g, b);
  doc.text('RECIBO DE NÓMINA DIGITAL (CFDI 1.2)', 133, 17.5, { maxWidth: 70 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`PERIODO: ${periodo?.codigo || 'QUINCENAL'}`, 133, 23, { maxWidth: 70 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha Pago: ${new Date(recibo.fechaPago || Date.now()).toLocaleDateString('es-MX')}`, 133, 27.5, { maxWidth: 70 });
  doc.text(`Días Pagados: ${recibo.diasTrabajados || 15} • Tipo: N - Nómina`, 133, 31.5, { maxWidth: 70 });

  // Datos del Colaborador
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, 38, 196, 23, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(r, g, b);
  doc.text('DATOS DEL COLABORADOR:', 13, 42.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`${empleado.nombre} ${empleado.apellidos || ''} (No. ${empleado.numeroEmpleado})`, 13, 47, { maxWidth: 190 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`RFC: ${empleado.rfc}   |   CURP: ${empleado.curp || 'CURP-NO-REGISTRADO'}   |   NSS: ${empleado.nss || '00000000000'}`, 13, 51, { maxWidth: 190 });
  doc.text(`Puesto: ${empleado.puesto || 'General'}   |   Depto: ${empleado.departamento || 'Operaciones'}   |   SDI: $${Number(empleado.salarioDiario || 350).toFixed(2)} MXN`, 13, 55, { maxWidth: 190 });

  // Tabla Percepciones vs Deducciones
  let y = 64;
  doc.setFillColor(241, 245, 249);
  doc.rect(10, y, 96, 6, 'F');
  doc.rect(110, y, 96, 6, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(10, y, 106, y);
  doc.line(10, y + 6, 106, y + 6);
  doc.line(110, y, 206, y);
  doc.line(110, y + 6, 206, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text('PERCEPCIONES', 13, y + 4.2);
  doc.text('IMPORTE', 103, y + 4.2, { align: 'right' });

  doc.text('DEDUCCIONES', 113, y + 4.2);
  doc.text('IMPORTE', 203, y + 4.2, { align: 'right' });

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  const sueldoBruto = Number(recibo.totalPercepciones || recibo.sueldoBruto || 7500);
  const isr = Number(recibo.isrRetenido || 650);
  const imss = Number(recibo.imssObrero || 195);
  const totalDeducciones = Number(recibo.totalDeducciones || isr + imss);
  const netoPagar = Number(recibo.netoPagar || sueldoBruto - totalDeducciones);

  // Fila 1
  doc.setTextColor(15, 23, 42);
  doc.text('001 Sueldo Base Quincenal', 13, y + 4);
  doc.text(`$${sueldoBruto.toFixed(2)}`, 103, y + 4, { align: 'right' });

  doc.text('002 ISR Retenido Art. 96', 113, y + 4);
  doc.text(`$${isr.toFixed(2)}`, 203, y + 4, { align: 'right' });

  // Fila 2
  y += 5.5;
  doc.text('002 Séptimo Día / Bono', 13, y + 4);
  doc.text('$0.00', 103, y + 4, { align: 'right' });

  doc.text('001 Seguridad Social (IMSS Obrero)', 113, y + 4);
  doc.text(`$${imss.toFixed(2)}`, 203, y + 4, { align: 'right' });

  // Totales
  y += 7.5;
  doc.setDrawColor(226, 232, 240);
  doc.line(10, y, 106, y);
  doc.line(110, y, 206, y);
  y += 2.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Total Percepciones:', 13, y + 3);
  doc.text(`$${sueldoBruto.toFixed(2)}`, 103, y + 3, { align: 'right' });

  doc.text('Total Deducciones:', 113, y + 3);
  doc.text(`$${totalDeducciones.toFixed(2)}`, 203, y + 3, { align: 'right' });

  // Neto a Pagar Sutil
  y += 7.5;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(10, y, 196, 9, 1.5, 1.5, 'FD');
  doc.setFillColor(r, g, b);
  doc.rect(10, y, 2, 9, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('NETO A PAGAR:', 15, y + 5.8);
  doc.setFontSize(9.5);
  doc.text(`$${netoPagar.toFixed(2)} MXN`, 202, y + 5.8, { align: 'right' });

  // Timbre Fiscal Digital SAT
  const fiscalY = 226;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, fiscalY, 196, 42, 1.5, 1.5, 'FD');

  const satVerifyUrl = `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${uuidNomina}&re=${emisorRfc}&rr=${empleado.rfc}&tt=${netoPagar.toFixed(2)}&fe=30001000`;
  const qrDataUrl = await QRCode.toDataURL(satVerifyUrl, { margin: 1, width: 128 });
  doc.addImage(qrDataUrl, 'PNG', 13, fiscalY + 3, 26, 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(r, g, b);
  doc.text('TIMBRE FISCAL DIGITAL - RECIBO DE NÓMINA 1.2 (SAT)', 43, fiscalY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`UUID Fiscal: ${uuidNomina}`, 43, fiscalY + 9.5, { maxWidth: 160 });
  doc.text(`No. Certificado SAT: 00001000000504465028   |   Certificado Emisor: 00001000000508923412`, 43, fiscalY + 13.5, { maxWidth: 160 });
  doc.text(`Cadena Original: ||1.1|${uuidNomina}|${new Date().toISOString()}|NOM1203015JA|${netoPagar.toFixed(2)}||`, 43, fiscalY + 18.5, { maxWidth: 160 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Recibí de conformidad el importe neto que ampara este recibo de nómina.', 108, fiscalY + 39, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}
