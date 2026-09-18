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

  const entero = Math.floor(monto);
  const centavos = Math.round((monto - entero) * 100);
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
// 1. GENERADOR DE FACTURA CFDI 4.0 SAT (The Fintech Ledger)
// ==============================================================================
export async function generateFacturaPdf(venta: any, tenant: any): Promise<Buffer> {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const { r, g, b } = hexToRgb(tenant?.colorPrimario);

  const isTimbrada = venta.estadoFiscal === 'TIMBRADA';
  const uuid = venta.uuidFiscal || 'NO_TIMBRADA_PREFACTURA';
  const emisorRfc = tenant?.identificacionFiscal || 'XAXX010101000';
  const receptorRfc = venta.cliente?.rfc || 'XAXX010101000';

  // Barra de acento corporativo superior
  doc.setFillColor(r, g, b);
  doc.rect(10, 10, 196, 2, 'F');

  // Encabezado Emisor (Izquierda)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(tenant?.nombreComercial || 'ControlERP Enterprise', 12, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(tenant?.razonSocial || 'Distribuidora Mayorista S.A. de C.V.', 12, 24);
  doc.setFont('helvetica', 'bold');
  doc.text(`RFC: ${emisorRfc}`, 12, 28);
  doc.setFont('helvetica', 'normal');
  doc.text(`Régimen Fiscal: ${tenant?.regimenFiscal || '601 - General de Ley Personas Morales'}`, 48, 28);
  doc.text(`Lugar de Expedición: C.P. ${tenant?.codigoPostal || '64000'} • Sucursal: ${venta.almacen?.nombre || 'Almacén Central'}`, 12, 32);

  // Recuadro de Folio y Tipo Fiscal (Derecha)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(132, 14, 74, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(r, g, b);
  doc.text(isTimbrada ? 'FACTURA ELECTRÓNICA (CFDI 4.0)' : 'COMPROBANTE DE VENTA / REMISIÓN', 135, 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`FOLIO: ${venta.folio}`, 135, 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha Emisión: ${new Date(venta.fecha).toLocaleString('es-MX')}`, 135, 30);
  doc.text(`Efecto Comprobante: I - Ingreso | Moneda: MXN`, 135, 33.5);

  // Recuadro de Datos del Cliente / Receptor
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, 38, 196, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(r, g, b);
  doc.text('DATOS DEL RECEPTOR (CLIENTE)', 13, 43);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Razón Social: ${venta.cliente?.razonSocial || 'PÚBLICO EN GENERAL'}`, 13, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`RFC: ${receptorRfc} | Cód: ${venta.cliente?.codigo || 'CLI-001'} | C.P. Domicilio Fiscal: ${venta.cliente?.codigoPostal || '64000'}`, 13, 52);
  doc.text(`Régimen Fiscal: ${venta.cliente?.regimenFiscal || '612 - Personas Físicas con Actividades Empresariales'}`, 13, 56);
  doc.text(`Uso CFDI: G03 - Gastos en general | Método de Pago: ${venta.tipoPago === 'CREDITO' ? 'PPD - Parcialidades o Diferido' : 'PUE - Pago en una sola exhibición'} | Forma: ${venta.tipoPago === 'CREDITO' ? '99 - Por Definir' : '01 - Efectivo'}`, 13, 60);

  // Tabla de Conceptos / Partidas
  let y = 65;
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(10, y, 196, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('CLAVE SAT', 13, y + 4.5);
  doc.text('SKU / CÓD', 34, y + 4.5);
  doc.text('CANT', 56, y + 4.5);
  doc.text('UNIDAD', 68, y + 4.5);
  doc.text('DESCRIPCIÓN DEL ARTÍCULO', 84, y + 4.5);
  doc.text('P. UNITARIO', 152, y + 4.5, { align: 'right' });
  doc.text('IVA 16%', 176, y + 4.5, { align: 'right' });
  doc.text('IMPORTE', 203, y + 4.5, { align: 'right' });

  y += 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  const items = venta.detalles || [];
  items.forEach((it: any, idx: number) => {
    const prod = it.producto;
    const sub = Number(it.subtotal || it.cantidad * it.precioUnitario);
    const iva = Math.round(sub * 0.16 * 100) / 100;
    const desc = prod?.nombre || it.nombre || 'Artículo de Catálogo';

    // Fila con fondo alternado
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(10, y, 196, 6.5, 'F');
    }

    doc.setTextColor(71, 85, 105);
    doc.text(prod?.claveSat || '01010101', 13, y + 4.2);
    doc.text(prod?.sku || 'SKU-00', 34, y + 4.2);
    doc.setTextColor(15, 23, 42);
    doc.text(String(it.cantidad), 56, y + 4.2);
    doc.text(prod?.claveUnidadSat || 'H87 PZA', 68, y + 4.2);
    doc.text(desc.slice(0, 36), 84, y + 4.2);
    doc.text(`$${Number(it.precioUnitario).toFixed(2)}`, 152, y + 4.2, { align: 'right' });
    doc.text(`$${iva.toFixed(2)}`, 176, y + 4.2, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`$${sub.toFixed(2)}`, 203, y + 4.2, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += 6.5;
    if (y > 215) {
      doc.addPage();
      y = 15;
    }
  });

  // Totales y Resumen
  y += 2;
  doc.setDrawColor(226, 232, 240);
  doc.line(10, y, 206, y);
  y += 3;

  // Importe con Letra
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, y, 115, 24, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('IMPORTE CON LETRA:', 13, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(numeroALetras(Number(venta.total)), 13, y + 10, { maxWidth: 108 });

  if (venta.observaciones) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Observaciones: ${venta.observaciones}`, 13, y + 18, { maxWidth: 108 });
  }

  // Cuadro numérico de totales
  const totalSub = Number(venta.subtotal || Number(venta.total) / 1.16);
  const totalIva = Number(venta.impuestos || Number(venta.total) - totalSub);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', 164, y + 4, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`$${totalSub.toFixed(2)}`, 203, y + 4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('IVA Trasladado (16%):', 164, y + 9, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`$${totalIva.toFixed(2)}`, 203, y + 9, { align: 'right' });

  // Total Neto Destacado
  doc.setFillColor(r, g, b);
  doc.roundedRect(130, y + 12, 76, 8.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL NETO:', 134, y + 17.5);
  doc.text(`$${Number(venta.total).toFixed(2)} MXN`, 203, y + 17.5, { align: 'right' });

  // 5. Timbre Fiscal Digital SAT (Código QR y Sellos Criptográficos)
  const fiscalY = 224;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, fiscalY, 196, 44, 2, 2, 'FD');

  // URL oficial de verificación SAT
  const satVerifyUrl = `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${uuid}&re=${emisorRfc}&rr=${receptorRfc}&tt=${Number(venta.total).toFixed(2)}&fe=30001000`;
  const qrDataUrl = await QRCode.toDataURL(satVerifyUrl, { margin: 1, width: 128 });
  doc.addImage(qrDataUrl, 'PNG', 12, fiscalY + 2, 30, 30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(r, g, b);
  doc.text('TIMBRE FISCAL DIGITAL DEL SAT (CFDI 4.0)', 45, fiscalY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Folio Fiscal (UUID SAT): ${uuid}`, 45, fiscalY + 10.5);
  doc.text(`No. de Serie del Certificado del SAT: 00001000000504465028`, 45, fiscalY + 14.5);
  doc.text(`No. de Serie del Certificado del Emisor: 00001000000508923412`, 45, fiscalY + 18.5);
  doc.text(`Fecha y Hora de Certificación: ${new Date(venta.fecha).toISOString()}`, 45, fiscalY + 22.5);
  doc.text(`RFC Proveedor de Certificación: FIN1203015JA | Régimen: 601 General de Ley`, 45, fiscalY + 26.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Cadena Original del Complemento de Certificación Digital del SAT:', 45, fiscalY + 31);
  doc.setFont('helvetica', 'normal');
  doc.text(`||1.1|${uuid}|${new Date(venta.fecha).toISOString()}|FIN1203015JA|M0g4jK/1A9876543210x...||`, 45, fiscalY + 34, { maxWidth: 158 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(15, 23, 42);
  doc.text('Este documento es una representación impresa de un CFDI versión 4.0', 108, fiscalY + 41, { align: 'center' });

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

  // Barra de acento
  doc.setFillColor(r, g, b);
  doc.rect(10, 10, 196, 2, 'F');

  // Encabezado Emisor
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(tenant?.nombreComercial || 'ControlERP Enterprise', 12, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(tenant?.razonSocial || 'Distribuidora Mayorista S.A. de C.V.', 12, 24);
  doc.text(`RFC: ${tenant?.identificacionFiscal || 'XAXX010101000'} | Tel: ${tenant?.telefono || '(81) 8234-5678'}`, 12, 28);
  doc.text(`Email: ${tenant?.email || 'ventas@empresa.com'} • Web: ${tenant?.sitioWeb || 'www.empresa.com'}`, 12, 32);

  // Recuadro de Cotización (Derecha)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(132, 14, 74, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(r, g, b);
  doc.text('COTIZACIÓN / PRESUPUESTO', 135, 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`FOLIO: ${cotizacion.folio}`, 135, 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha Emisión: ${fechaExp.toLocaleDateString('es-MX')}`, 135, 30);
  doc.text(`Vigencia: ${cotizacion.vigenciaDias || 15} días (Hasta ${fechaVto.toLocaleDateString('es-MX')})`, 135, 33.5);

  // Datos del Prospecto / Cliente
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, 38, 196, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(r, g, b);
  doc.text('PROPUESTA COMERCIAL PREPARADA PARA:', 13, 43);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Cliente: ${cotizacion.cliente?.razonSocial || 'CLIENTE COMERCIAL'}`, 13, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`RFC: ${cotizacion.cliente?.rfc || 'XAXX010101000'} | Contacto: ${cotizacion.cliente?.contacto || 'Depto. de Compras'} | Tel: ${cotizacion.cliente?.telefono || 'S/N'}`, 13, 52);
  doc.text(`Asesor Comercial: ${cotizacion.usuarioNombre || 'Ejecutivo de Ventas'} | Condiciones: ${cotizacion.condicionesPago || 'Contado comercial / Sujeto a existencias'}`, 13, 56);

  // Tabla de Partidas
  let y = 64;
  doc.setFillColor(15, 23, 42);
  doc.rect(10, y, 196, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('SKU / CÓDIGO', 13, y + 4.5);
  doc.text('DESCRIPCIÓN DEL ARTÍCULO', 45, y + 4.5);
  doc.text('UNIDAD', 120, y + 4.5);
  doc.text('CANTIDAD', 140, y + 4.5, { align: 'right' });
  doc.text('P. UNITARIO', 172, y + 4.5, { align: 'right' });
  doc.text('SUBTOTAL', 203, y + 4.5, { align: 'right' });

  y += 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  const items = cotizacion.detalles || [];
  items.forEach((it: any, idx: number) => {
    const prod = it.producto;
    const sub = Number(it.subtotal || it.cantidad * it.precioUnitario);
    const desc = prod?.nombre || it.nombre || 'Artículo de Cotización';

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(10, y, 196, 6.5, 'F');
    }

    doc.setTextColor(71, 85, 105);
    doc.text(prod?.sku || 'SKU-00', 13, y + 4.2);
    doc.setTextColor(15, 23, 42);
    doc.text(desc.slice(0, 48), 45, y + 4.2);
    doc.text(prod?.unidadMedida || 'PZA', 120, y + 4.2);
    doc.text(String(it.cantidad), 140, y + 4.2, { align: 'right' });
    doc.text(`$${Number(it.precioUnitario).toFixed(2)}`, 172, y + 4.2, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`$${sub.toFixed(2)}`, 203, y + 4.2, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += 6.5;
    if (y > 205) {
      doc.addPage();
      y = 15;
    }
  });

  // Totales
  y += 2;
  doc.setDrawColor(226, 232, 240);
  doc.line(10, y, 206, y);
  y += 3;

  // Condiciones y Datos Bancarios (Izquierda)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, y, 115, 34, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(r, g, b);
  doc.text('DATOS PARA TRANSFERENCIA BANCARIA (SPEI):', 13, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Banco: BBVA México | Beneficiario: ${tenant?.razonSocial || tenant?.nombreComercial}`, 13, y + 10);
  doc.text(`Cuenta CLABE: 012 580 00123456789 0 | Sucursal: Monterrey`, 13, y + 14);
  doc.text(`Referencia de Pago: ${cotizacion.folio}`, 13, y + 18);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Notas: Precios sujetos a cambio sin previo aviso. Entrega sujeta a existencias.`, 13, y + 25);
  if (cotizacion.observaciones) {
    doc.text(`Obs: ${cotizacion.observaciones}`, 13, y + 29, { maxWidth: 108 });
  }

  // Totales numéricos (Derecha)
  const totalSub = Number(cotizacion.subtotal || 0);
  const totalIva = Number(cotizacion.impuestos || totalSub * 0.16);
  const totalNet = Number(cotizacion.total || totalSub + totalIva);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', 164, y + 4, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`$${totalSub.toFixed(2)}`, 203, y + 4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('IVA (16%):', 164, y + 9, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`$${totalIva.toFixed(2)}`, 203, y + 9, { align: 'right' });

  // Total Neto
  doc.setFillColor(r, g, b);
  doc.roundedRect(130, y + 12, 76, 8.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL COTIZADO:', 134, y + 17.5);
  doc.text(`$${totalNet.toFixed(2)} MXN`, 203, y + 17.5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(numeroALetras(totalNet), 130, y + 25, { maxWidth: 76 });

  // Firmas al pie
  const firmaY = 242;
  doc.setDrawColor(148, 163, 184);
  doc.line(25, firmaY, 85, firmaY);
  doc.line(135, firmaY, 195, firmaY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('ELABORADO POR ASESOR COMERCIAL', 55, firmaY + 4, { align: 'center' });
  doc.text('ACEPTACIÓN Y CONFORMIDAD DEL CLIENTE', 165, firmaY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
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

  const isTimbrado = pago.estadoFiscal === 'TIMBRADO';
  const uuidRep = pago.uuidRep || 'REP-PENDIENTE-CERTIFICACION';
  const emisorRfc = tenant?.identificacionFiscal || 'XAXX010101000';
  const receptorRfc = cxc?.cliente?.rfc || 'XAXX010101000';
  const montoPagado = Number(pago.monto || 0);

  // Barra de acento
  doc.setFillColor(r, g, b);
  doc.rect(10, 10, 196, 2, 'F');

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(tenant?.nombreComercial || 'ControlERP Enterprise', 12, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(tenant?.razonSocial || 'Distribuidora Mayorista S.A. de C.V.', 12, 24);
  doc.text(`RFC Emisor: ${emisorRfc} | Régimen: ${tenant?.regimenFiscal || '601 General de Ley'}`, 12, 28);
  doc.text(`Lugar de Expedición: C.P. ${tenant?.codigoPostal || '64000'} • Efecto: P - Pago`, 12, 32);

  // Recuadro REP
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(132, 14, 74, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(r, g, b);
  doc.text('RECIBO ELECTRÓNICO DE PAGO (REP 2.0)', 135, 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`FOLIO REP: ${pago.folioRep || `REP-${pago.id.slice(0, 8).toUpperCase()}`}`, 135, 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha Pago: ${new Date(pago.fecha).toLocaleString('es-MX')}`, 135, 30);
  doc.text(`Versión: CFDI 4.0 / Complemento Pagos 2.0`, 135, 33.5);

  // Receptor
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, 38, 196, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(r, g, b);
  doc.text('DATOS DEL RECEPTOR / CLIENTE', 13, 43);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Razón Social: ${cxc?.cliente?.razonSocial || 'PÚBLICO EN GENERAL'}`, 13, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`RFC: ${receptorRfc} | C.P. Fiscal: ${cxc?.cliente?.codigoPostal || '64000'} | Régimen: ${cxc?.cliente?.regimenFiscal || '612'}`, 13, 52);
  doc.text(`Uso CFDI: CP01 - Pagos | Domicilio: ${cxc?.cliente?.direccion || 'Domicilio Fiscal Registrado'}`, 13, 56);

  // Datos de la Transacción de Pago
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(10, 63, 196, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(r, g, b);
  doc.text('DETALLE DEL PAGO RECIBIDO', 13, 68);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Forma de Pago SAT: ${pago.metodoPago === 'TRANSFERENCIA' ? '03 - Transferencia electrónica' : pago.metodoPago === 'TARJETA' ? '04 - Tarjeta de crédito/débito' : '01 - Efectivo'}`, 13, 73);
  doc.text(`Moneda: MXN | Tipo de Cambio: 1.0000 | No. Operación / SPEI: ${pago.referencia || 'SPEI-9923841'}`, 13, 77);
  doc.text(`Banco Ordenante: BBVA Bancomer | Banco Beneficiario: Santander México (Cuenta: ***7890)`, 13, 81);

  // Tabla de Documentos Relacionados
  let y = 88;
  doc.setFillColor(15, 23, 42);
  doc.rect(10, y, 196, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('UUID FACTURA ORIGEN', 13, y + 4.5);
  doc.text('FOLIO FACTURA', 78, y + 4.5);
  doc.text('PARCIALIDAD', 110, y + 4.5);
  doc.text('IMP. SALDO ANT.', 142, y + 4.5, { align: 'right' });
  doc.text('IMP. PAGADO', 172, y + 4.5, { align: 'right' });
  doc.text('SALDO INSOLUTO', 203, y + 4.5, { align: 'right' });

  y += 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  const saldoAnterior = Number(cxc?.montoTotal || montoPagado);
  const saldoInsoluto = Math.max(0, saldoAnterior - montoPagado);

  doc.setTextColor(71, 85, 105);
  doc.text(cxc?.uuidFiscal || '4F8A9B2C-1E3D-4F5A-9B0C-1E2D3F4A5B6C', 13, y + 4.2);
  doc.setTextColor(15, 23, 42);
  doc.text(cxc?.folio || 'FAC-2026-0001', 78, y + 4.2);
  doc.text('1 de 1', 110, y + 4.2);
  doc.text(`$${saldoAnterior.toFixed(2)}`, 142, y + 4.2, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(`$${montoPagado.toFixed(2)}`, 172, y + 4.2, { align: 'right' });
  doc.setTextColor(15, 23, 42);
  doc.text(`$${saldoInsoluto.toFixed(2)}`, 203, y + 4.2, { align: 'right' });

  // Cuadro Total Pagado
  y += 10;
  doc.setFillColor(r, g, b);
  doc.roundedRect(120, y, 86, 9, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL ACREDITADO:', 124, y + 6);
  doc.text(`$${montoPagado.toFixed(2)} MXN`, 203, y + 6, { align: 'right' });

  // Timbre Fiscal Digital SAT (QR y Sellos)
  const fiscalY = 224;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, fiscalY, 196, 44, 2, 2, 'FD');

  const satVerifyUrl = `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${uuidRep}&re=${emisorRfc}&rr=${receptorRfc}&tt=${montoPagado.toFixed(2)}&fe=30001000`;
  const qrDataUrl = await QRCode.toDataURL(satVerifyUrl, { margin: 1, width: 128 });
  doc.addImage(qrDataUrl, 'PNG', 12, fiscalY + 2, 30, 30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(r, g, b);
  doc.text('TIMBRE FISCAL DIGITAL - COMPLEMENTO DE PAGO 2.0 (SAT)', 45, fiscalY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`UUID REP: ${uuidRep}`, 45, fiscalY + 10.5);
  doc.text(`Certificado SAT: 00001000000504465028 | Certificado Emisor: 00001000000508923412`, 45, fiscalY + 14.5);
  doc.text(`Fecha Timbrado: ${new Date(pago.fecha).toISOString()}`, 45, fiscalY + 18.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Cadena Original del Timbre Fiscal REP:', 45, fiscalY + 23);
  doc.setFont('helvetica', 'normal');
  doc.text(`||1.1|${uuidRep}|${new Date(pago.fecha).toISOString()}|PAG200101XYZ|${montoPagado.toFixed(2)}|MXN||`, 45, fiscalY + 26, { maxWidth: 158 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(15, 23, 42);
  doc.text('Este documento es una representación impresa de un CFDI versión 4.0 con Complemento de Pagos 2.0', 108, fiscalY + 41, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

// ==============================================================================
// 4. GENERADOR DE TICKET TÉRMICO POS (Formato 80mm en PDF de Alta Resolución)
// ==============================================================================
export async function generateTicketPosPdf(venta: any, tenant: any): Promise<Buffer> {
  const items = venta.detalles || venta.items || [];
  // Altura dinámica según cantidad de artículos
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
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(tenant?.nombreComercial || 'ControlERP', 40, y, { align: 'center' });

  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(tenant?.razonSocial || 'Distribuidora S.A. de C.V.', 40, y, { align: 'center' });
  y += 3.5;
  doc.text(`RFC: ${tenant?.identificacionFiscal || 'XAXX010101000'}`, 40, y, { align: 'center' });
  y += 3.5;
  doc.text(`Sucursal: ${venta.almacen?.nombre || venta.almacen || 'Mostrador Principal'}`, 40, y, { align: 'center' });
  y += 3.5;
  doc.text(`C.P. ${tenant?.codigoPostal || '64000'} • Tel: ${tenant?.telefono || '(81) 8123-4567'}`, 40, y, { align: 'center' });

  // Línea divisoria
  y += 3;
  doc.setDrawColor(148, 163, 184);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, y, 76, y);
  doc.setLineDashPattern([], 0);

  // Metadatos de Venta
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`TICKET: ${venta.folio}`, 4, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(new Date(venta.fecha || Date.now()).toLocaleString('es-MX'), 76, y, { align: 'right' });

  y += 3.5;
  doc.text(`Cajero: ${venta.cajero || venta.usuarioNombre || 'Usuario Mostrador'}`, 4, y);
  y += 3.5;
  doc.text(`Cliente: ${venta.cliente?.razonSocial || venta.cliente || 'PÚBLICO EN GENERAL'}`, 4, y);

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

    doc.text(`${it.cantidad}x ${desc.slice(0, 26)}`, 4, y);
    doc.text(`$${sub.toFixed(2)}`, 76, y, { align: 'right' });
    y += 4.5;
  });

  // Línea de totales
  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, y, 76, y);
  doc.setLineDashPattern([], 0);
  y += 4;

  const totalSub = Number(venta.subtotal || Number(venta.total) / 1.16);
  const totalIva = Number(venta.impuestos || Number(venta.total) - totalSub);
  const totalNet = Number(venta.total || 0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', 45, y, { align: 'right' });
  doc.text(`$${totalSub.toFixed(2)}`, 76, y, { align: 'right' });
  y += 3.5;

  doc.text('IVA (16%):', 45, y, { align: 'right' });
  doc.text(`$${totalIva.toFixed(2)}`, 76, y, { align: 'right' });
  y += 4.5;

  // Total destacado
  doc.setFillColor(15, 23, 42);
  doc.rect(4, y - 3, 72, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL:', 6, y + 1.5);
  doc.text(`$${totalNet.toFixed(2)} MXN`, 74, y + 1.5, { align: 'right' });
  y += 7.5;

  // Desglose de Pago
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Método de Pago: ${venta.tipoPago || 'EFECTIVO'}`, 4, y);
  y += 3.5;

  if (venta.pagoCon !== undefined && venta.pagoCon > 0) {
    doc.text(`Pago con: $${Number(venta.pagoCon).toFixed(2)}`, 4, y);
    doc.text(`Cambio: $${Number(venta.cambio || 0).toFixed(2)}`, 76, y, { align: 'right' });
    y += 4;
  }

  // QR de Verificación
  y += 2;
  const qrUrl = `https://controlerp.app/t/${venta.folio}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 96 });
  doc.addImage(qrDataUrl, 'PNG', 28, y, 24, 24);
  y += 26;

  // Mensaje de Cierre
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('¡GRACIAS POR SU COMPRA!', 40, y, { align: 'center' });
  y += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Comprobante simplificado de mostrador', 40, y, { align: 'center' });
  y += 3;
  doc.text('Para facturar solicítelo en caja o en línea con su folio', 40, y, { align: 'center' });

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
  doc.rect(10, 10, 196, 2, 'F');

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(tenant?.nombreComercial || 'ControlERP Enterprise', 12, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(tenant?.razonSocial || 'Distribuidora Mayorista S.A. de C.V.', 12, 24);
  doc.text(`RFC: ${tenant?.identificacionFiscal || 'XAXX010101000'} | Tel: ${tenant?.telefono || '(81) 8123-4567'}`, 12, 28);

  // Recuadro Estado de Cuenta
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(132, 14, 74, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(r, g, b);
  doc.text('ESTADO DE CUENTA Y CARTERA', 135, 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`CLIENTE: ${cliente.codigo || 'CLI-001'}`, 135, 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha Corte: ${now.toLocaleDateString('es-MX')}`, 135, 30);
  doc.text(`Moneda: Pesos Mexicanos (MXN)`, 135, 33.5);

  // Tarjetas KPI de Cartera
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, 38, 46, 16, 2, 2, 'FD');
  doc.roundedRect(60, 38, 46, 16, 2, 2, 'FD');
  doc.roundedRect(110, 38, 46, 16, 2, 2, 'FD');
  doc.roundedRect(160, 38, 46, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('LÍMITE DE CRÉDITO', 13, 43);
  doc.text('SALDO ADEUDADO', 63, 43);
  doc.text('CRÉDITO DISPONIBLE', 113, 43);
  doc.text('DÍAS DE GRACIA', 163, 43);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`$${limiteCredito.toFixed(2)}`, 13, 50);
  doc.setTextColor(saldoTotal > limiteCredito ? 225 : 15, saldoTotal > limiteCredito ? 29 : 23, saldoTotal > limiteCredito ? 72 : 42);
  doc.text(`$${saldoTotal.toFixed(2)}`, 63, 50);
  doc.setTextColor(5, 150, 105);
  doc.text(`$${disponible.toFixed(2)}`, 113, 50);
  doc.setTextColor(15, 23, 42);
  doc.text(`${cliente.diasCredito || 30} Días`, 163, 50);

  // Tabla de Facturas Pendientes
  let y = 60;
  doc.setFillColor(15, 23, 42);
  doc.rect(10, y, 196, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('FOLIO FACTURA', 13, y + 4.5);
  doc.text('FECHA EMISIÓN', 48, y + 4.5);
  doc.text('VENCIMIENTO', 82, y + 4.5);
  doc.text('DÍAS MORA', 115, y + 4.5);
  doc.text('MONTO TOTAL', 148, y + 4.5, { align: 'right' });
  doc.text('SALDO PENDIENTE', 178, y + 4.5, { align: 'right' });
  doc.text('ESTADO', 203, y + 4.5, { align: 'right' });

  y += 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  cxcList.forEach((c: any, idx: number) => {
    const vto = new Date(c.fechaVencimiento);
    const diffDays = Math.floor((now.getTime() - vto.getTime()) / (1000 * 60 * 60 * 24));
    const isVencida = diffDays > 0 && c.saldoPendiente > 0;

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(10, y, 196, 6.5, 'F');
    }

    doc.setTextColor(15, 23, 42);
    doc.text(c.folio || 'FAC-000', 13, y + 4.2);
    doc.setTextColor(71, 85, 105);
    doc.text(new Date(c.fechaEmision || c.fecha).toLocaleDateString('es-MX'), 48, y + 4.2);
    doc.text(vto.toLocaleDateString('es-MX'), 82, y + 4.2);
    doc.text(isVencida ? `${diffDays} d` : '0 d', 115, y + 4.2);
    doc.text(`$${Number(c.montoTotal).toFixed(2)}`, 148, y + 4.2, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`$${Number(c.saldoPendiente).toFixed(2)}`, 178, y + 4.2, { align: 'right' });

    if (isVencida) {
      doc.setTextColor(225, 29, 72);
      doc.text('EN MORA', 203, y + 4.2, { align: 'right' });
    } else {
      doc.setTextColor(5, 150, 105);
      doc.text('VIGENTE', 203, y + 4.2, { align: 'right' });
    }
    doc.setFont('helvetica', 'normal');

    y += 6.5;
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

  const uuidCP = traspaso.uuidCartaPorte || 'CP-3.1-AUTOTRANSPORTE-FEDERAL';

  // Barra de acento
  doc.setFillColor(r, g, b);
  doc.rect(10, 10, 196, 2, 'F');

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(tenant?.nombreComercial || 'ControlERP Logistics', 12, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`RFC: ${tenant?.identificacionFiscal || 'XAXX010101000'} | Traslado de Mercancías Carretero`, 12, 24);

  // Recuadro Folio
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(132, 14, 74, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(r, g, b);
  doc.text('CARTA PORTE 3.1 (TRASLADO)', 135, 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`FOLIO: ${traspaso.folio}`, 135, 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha Traslado: ${new Date(traspaso.fechaSolicitud).toLocaleString('es-MX')}`, 135, 30);
  doc.text(`Distancia: ${traspaso.distanciaKm || 45} Km | Tipo: T - Traslado`, 135, 33.5);

  // Datos del Vehículo y Operador
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, 38, 196, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(r, g, b);
  doc.text('DATOS DEL AUTOTRANSPORTE FEDERAL Y CHOFER:', 13, 43);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Vehículo / Modelo: ${traspaso.vehiculoModelo || 'Kenworth T680 2024'} | Placas: ${traspaso.vehiculoPlacas || 'P-991-NL'}`, 13, 48);
  doc.text(`Operador / Chofer: ${traspaso.operadorNombre || 'Juan Pérez González'} | RFC: ${traspaso.operadorRfc || 'PEGJ800101XYZ'}`, 13, 52);
  doc.text(`Licencia Federal: ${traspaso.operadorLicencia || 'LIC-NL-992384'} | Almacén Origen: ${traspaso.almacenOrigen?.nombre || 'Principal'} → Destino: ${traspaso.almacenDestino?.nombre || 'Sucursal'}`, 13, 56);

  // Tabla de Bienes Transportados
  let y = 65;
  doc.setFillColor(15, 23, 42);
  doc.rect(10, y, 196, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('CLAVE SAT', 13, y + 4.5);
  doc.text('SKU', 38, y + 4.5);
  doc.text('DESCRIPCIÓN DE MERCANCÍA', 65, y + 4.5);
  doc.text('CANTIDAD ENVIADA', 150, y + 4.5, { align: 'right' });
  doc.text('UNIDAD', 203, y + 4.5, { align: 'right' });

  y += 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  const items = traspaso.items || [];
  items.forEach((it: any, idx: number) => {
    const prod = it.producto;
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(10, y, 196, 6.5, 'F');
    }

    doc.setTextColor(71, 85, 105);
    doc.text(prod?.claveSat || '01010101', 13, y + 4.2);
    doc.text(prod?.sku || 'SKU-00', 38, y + 4.2);
    doc.setTextColor(15, 23, 42);
    doc.text((prod?.nombre || 'Artículo').slice(0, 48), 65, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(String(it.cantidadEnviada), 150, y + 4.2, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(prod?.unidadMedida || 'H87 PZA', 203, y + 4.2, { align: 'right' });

    y += 6.5;
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
  doc.rect(10, 10, 196, 2, 'F');

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(tenant?.nombreComercial || 'ControlERP Nómina', 12, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(tenant?.razonSocial || 'Patrón / Emisor S.A. de C.V.', 12, 24);
  doc.text(`RFC Patrón: ${emisorRfc} | Registro Patronal IMSS: ${tenant?.registroPatronal || 'Y68-12345-10'}`, 12, 28);
  doc.text(`Régimen Fiscal: ${tenant?.regimenFiscal || '601 General de Ley Personas Morales'} • C.P.: ${tenant?.codigoPostal || '64000'}`, 12, 32);

  // Recuadro Recibo
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(132, 14, 74, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(r, g, b);
  doc.text('RECIBO DE NÓMINA DIGITAL (CFDI 1.2)', 135, 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`PERIODO: ${periodo?.codigo || 'QUINCENAL'}`, 135, 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha Pago: ${new Date(recibo.fechaPago || Date.now()).toLocaleDateString('es-MX')}`, 135, 30);
  doc.text(`Días Pagados: ${recibo.diasTrabajados || 15} | Tipo: N - Nómina Ordinaria`, 135, 33.5);

  // Datos del Colaborador / Empleado
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, 38, 196, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(r, g, b);
  doc.text('DATOS DEL COLABORADOR:', 13, 43);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${empleado.nombre} ${empleado.apellidos || ''} (No. ${empleado.numeroEmpleado})`, 13, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`RFC: ${empleado.rfc} | CURP: ${empleado.curp || 'CURP-NO-REGISTRADO'} | NSS IMSS: ${empleado.nss || '00000000000'}`, 13, 52);
  doc.text(`Puesto: ${empleado.puesto || 'General'} | Depto: ${empleado.departamento || 'Operaciones'} | Salario Diario Integrado: $${Number(empleado.salarioDiario || 350).toFixed(2)} MXN`, 13, 56);
  doc.text(`Banco: ${empleado.banco || 'BBVA'} | Cuenta/CLABE: ${empleado.cuentaBancaria || '***9812'} | Régimen: 02 Sueldos y Salarios`, 13, 60);

  // Tabla Percepciones vs Deducciones (2 Columnas Paralelas)
  let y = 67;
  doc.setFillColor(15, 23, 42);
  doc.rect(10, y, 96, 6.5, 'F');
  doc.rect(110, y, 96, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('PERCEPCIONES', 13, y + 4.5);
  doc.text('IMPORTE', 103, y + 4.5, { align: 'right' });

  doc.text('DEDUCCIONES', 113, y + 4.5);
  doc.text('IMPORTE', 203, y + 4.5, { align: 'right' });

  y += 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  const sueldoBruto = Number(recibo.totalPercepciones || recibo.sueldoBruto || 7500);
  const isr = Number(recibo.isrRetenido || 650);
  const imss = Number(recibo.imssObrero || 195);
  const totalDeducciones = Number(recibo.totalDeducciones || isr + imss);
  const netoPagar = Number(recibo.netoPagar || sueldoBruto - totalDeducciones);

  // Fila 1
  doc.setTextColor(15, 23, 42);
  doc.text('001 Sueldo Base Quincenal', 13, y + 4.2);
  doc.text(`$${sueldoBruto.toFixed(2)}`, 103, y + 4.2, { align: 'right' });

  doc.text('002 ISR Retenido Art. 96', 113, y + 4.2);
  doc.text(`$${isr.toFixed(2)}`, 203, y + 4.2, { align: 'right' });

  // Fila 2
  y += 6;
  doc.text('002 Séptimo Día / Bono Asistencia', 13, y + 4.2);
  doc.text('$0.00', 103, y + 4.2, { align: 'right' });

  doc.text('001 Seguridad Social (IMSS Obrero)', 113, y + 4.2);
  doc.text(`$${imss.toFixed(2)}`, 203, y + 4.2, { align: 'right' });

  // Totales de percepción y deducción
  y += 8;
  doc.setDrawColor(226, 232, 240);
  doc.line(10, y, 106, y);
  doc.line(110, y, 206, y);
  y += 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Total Percepciones:', 13, y + 3);
  doc.text(`$${sueldoBruto.toFixed(2)}`, 103, y + 3, { align: 'right' });

  doc.text('Total Deducciones:', 113, y + 3);
  doc.text(`$${totalDeducciones.toFixed(2)}`, 203, y + 3, { align: 'right' });

  // Neto a Pagar
  y += 8;
  doc.setFillColor(r, g, b);
  doc.roundedRect(10, y, 196, 9.5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('NETO A PAGAR:', 15, y + 6.5);
  doc.text(`$${netoPagar.toFixed(2)} MXN`, 201, y + 6.5, { align: 'right' });

  // Timbre Fiscal Digital SAT
  const fiscalY = 224;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, fiscalY, 196, 44, 2, 2, 'FD');

  const satVerifyUrl = `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${uuidNomina}&re=${emisorRfc}&rr=${empleado.rfc}&tt=${netoPagar.toFixed(2)}&fe=30001000`;
  const qrDataUrl = await QRCode.toDataURL(satVerifyUrl, { margin: 1, width: 128 });
  doc.addImage(qrDataUrl, 'PNG', 12, fiscalY + 2, 30, 30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(r, g, b);
  doc.text('TIMBRE FISCAL DIGITAL - RECIBO DE NÓMINA 1.2 (SAT)', 45, fiscalY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`UUID Fiscal: ${uuidNomina}`, 45, fiscalY + 10.5);
  doc.text(`No. Certificado SAT: 00001000000504465028 | Certificado Emisor: 00001000000508923412`, 45, fiscalY + 14.5);
  doc.text(`Cadena Original: ||1.1|${uuidNomina}|${new Date().toISOString()}|NOM1203015JA|${netoPagar.toFixed(2)}||`, 45, fiscalY + 20, { maxWidth: 158 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(15, 23, 42);
  doc.text('Recibí de conformidad el importe neto que ampara este recibo de nómina.', 108, fiscalY + 41, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}
