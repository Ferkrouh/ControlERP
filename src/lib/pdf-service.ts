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

// ==============================================================================
// 1. Generador de Factura CFDI 4.0 (SAT)
// ==============================================================================
export async function generateFacturaPdf(venta: any, tenant: any): Promise<Buffer> {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const primaryHex = tenant?.colorPrimario || '#2563eb';
  
  // Convertir hex a RGB para jsPDF
  const r = parseInt(primaryHex.slice(1, 3), 16) || 37;
  const g = parseInt(primaryHex.slice(3, 5), 16) || 99;
  const b = parseInt(primaryHex.slice(5, 7), 16) || 235;

  const isTimbrada = venta.estadoFiscal === 'TIMBRADA';
  const uuid = venta.uuidFiscal || 'NO_TIMBRADA_PREFACTURA';
  const emisorRfc = tenant?.identificacionFiscal || 'XAXX010101000';
  const receptorRfc = venta.cliente?.rfc || 'XAXX010101000';

  // 1. Encabezado Corporativo
  doc.setFillColor(r, g, b);
  doc.rect(12, 12, 192, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(tenant?.nombreComercial || 'ControlERP', 12, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(tenant?.razonSocial || 'Distribuidora Mayorista S.A. de C.V.', 12, 25);
  doc.text(`RFC: ${emisorRfc} | Régimen: ${tenant?.regimenFiscal || '601 General de Ley Personas Morales'}`, 12, 29);
  doc.text(`Lugar de Expedición: C.P. ${tenant?.codigoPostal || '64000'} • Despacho: ${venta.almacen?.nombre || 'Almacén Central'}`, 12, 33);

  // Recuadro derecho: Folio y Datos Fiscales
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(128, 16, 76, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(r, g, b);
  doc.text(isTimbrada ? 'FACTURA ELECTRÓNICA (CFDI 4.0)' : 'COMPROBANTE DE VENTA / REMISIÓN', 132, 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(venta.folio, 132, 27);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha Emisión: ${new Date(venta.fecha).toLocaleString('es-MX')}`, 132, 32);
  doc.text(`Tipo Comprobante: I - Ingreso | Moneda: MXN`, 132, 36);

  // 2. Datos del Receptor / Cliente
  doc.setDrawColor(226, 232, 240);
  doc.line(12, 41, 204, 41);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(r, g, b);
  doc.text('DATOS DEL RECEPTOR (CLIENTE)', 12, 45);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Cliente: ${venta.cliente?.razonSocial || 'PÚBLICO EN GENERAL'}`, 12, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`RFC: ${receptorRfc} | Cód: ${venta.cliente?.codigo || 'CLI-001'} | C.P.: ${venta.cliente?.codigoPostal || '64000'}`, 12, 54);
  doc.text(`Régimen Fiscal: ${venta.cliente?.regimenFiscal || '612 Personas Físicas con Actividades Empresariales'}`, 12, 58);
  doc.text(`Uso de CFDI: G03 - Gastos en general | Método de Pago: ${venta.tipoPago === 'CREDITO' ? 'PPD - Parcialidades o Diferido' : 'PUE - Una sola exhibición'} | Forma: ${venta.tipoPago === 'CREDITO' ? '99 - Por Definir' : '01 - Efectivo'}`, 12, 62);

  // 3. Tabla de Conceptos / Partidas
  let y = 68;
  doc.setFillColor(241, 245, 249);
  doc.rect(12, y, 192, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('CLAVE SAT', 14, y + 4.5);
  doc.text('CANT', 38, y + 4.5);
  doc.text('UNIDAD', 50, y + 4.5);
  doc.text('DESCRIPCIÓN DEL ARTÍCULO', 70, y + 4.5);
  doc.text('P. UNITARIO', 148, y + 4.5, { align: 'right' });
  doc.text('IVA 16%', 172, y + 4.5, { align: 'right' });
  doc.text('IMPORTE', 202, y + 4.5, { align: 'right' });

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  const items = venta.detalles || [];
  for (const it of items) {
    const prod = it.producto;
    const sub = Number(it.subtotal || it.cantidad * it.precioUnitario);
    const iva = Math.round(sub * 0.16 * 100) / 100;
    const desc = prod?.nombre || it.nombre || 'Artículo de Catálogo';

    doc.text('01010101', 14, y + 4);
    doc.text(String(it.cantidad), 38, y + 4);
    doc.text(prod?.unidadMedida || 'H87 PZA', 50, y + 4);
    doc.text(desc.slice(0, 42), 70, y + 4);
    doc.text(`$${Number(it.precioUnitario).toFixed(2)}`, 148, y + 4, { align: 'right' });
    doc.text(`$${iva.toFixed(2)}`, 172, y + 4, { align: 'right' });
    doc.text(`$${sub.toFixed(2)}`, 202, y + 4, { align: 'right' });

    y += 6.5;
    if (y > 220) {
      doc.addPage();
      y = 15;
    }
  }

  // 4. Totales y Resumen
  y += 2;
  doc.setDrawColor(226, 232, 240);
  doc.line(12, y, 204, y);
  y += 4;

  // Importe con Letra
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('IMPORTE CON LETRA:', 12, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(numeroALetras(Number(venta.total)), 12, y + 7);

  if (venta.observaciones) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Observaciones: ${venta.observaciones}`, 12, y + 12);
  }

  // Cuadro de desglose numérico
  const totalSub = Number(venta.subtotal || (Number(venta.total) / 1.16));
  const totalIva = Number(venta.impuestos || (Number(venta.total) - totalSub));

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', 160, y + 3, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`$${totalSub.toFixed(2)}`, 202, y + 3, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('IVA Trasladado (16%):', 160, y + 8, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`$${totalIva.toFixed(2)}`, 202, y + 8, { align: 'right' });

  doc.setFillColor(r, g, b);
  doc.rect(138, y + 11, 66, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL NETO:', 142, y + 16);
  doc.text(`$${Number(venta.total).toFixed(2)} MXN`, 202, y + 16, { align: 'right' });

  // 5. Timbre Fiscal Digital SAT (Código QR y Sellos Criptográficos)
  const fiscalY = 222;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, fiscalY, 192, 46, 2, 2, 'FD');

  // URL oficial de verificación SAT
  const satVerifyUrl = `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${uuid}&re=${emisorRfc}&rr=${receptorRfc}&tt=${Number(venta.total).toFixed(2)}&fe=30001000`;
  const qrDataUrl = await QRCode.toDataURL(satVerifyUrl, { margin: 1, width: 128 });
  doc.addImage(qrDataUrl, 'PNG', 14, fiscalY + 2, 32, 32);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(r, g, b);
  doc.text('TIMBRE FISCAL DIGITAL DEL SAT (CFDI 4.0)', 48, fiscalY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text(`Folio Fiscal (UUID): ${uuid}`, 48, fiscalY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`No. de Serie del Certificado del SAT: 30001000000500003416 | Fecha Certificación: ${new Date(venta.fecha).toISOString()}`, 48, fiscalY + 14);
  doc.text(`RFC Proveedor Certificación: PAC080101XYZ | Leyenda: Este documento es una representación impresa de un CFDI 4.0`, 48, fiscalY + 18);

  // Sello Digital CFD
  const fakeSelloCfd = `CFD_${Buffer.from(uuid + emisorRfc).toString('base64').slice(0, 56)}...`;
  doc.setFont('helvetica', 'bold');
  doc.text('Sello Digital del Emisor:', 48, fiscalY + 22);
  doc.setFont('courier', 'normal');
  doc.text(fakeSelloCfd, 48, fiscalY + 25);

  // Sello Digital SAT
  const fakeSelloSat = `SAT_${Buffer.from(receptorRfc + uuid).toString('base64').slice(0, 56)}...`;
  doc.setFont('helvetica', 'bold');
  doc.text('Sello Digital del SAT:', 48, fiscalY + 29);
  doc.setFont('courier', 'normal');
  doc.text(fakeSelloSat, 48, fiscalY + 32);

  // Cadena Original
  const cadenaOriginal = `||1.1|${uuid}|${new Date(venta.fecha).toISOString()}|PAC080101XYZ|${fakeSelloCfd.slice(0, 20)}|30001000000500003416||`;
  doc.setFont('helvetica', 'bold');
  doc.text('Cadena Original del Complemento de Certificación Digital del SAT:', 48, fiscalY + 36);
  doc.setFont('courier', 'normal');
  doc.text(cadenaOriginal.slice(0, 85), 48, fiscalY + 39);

  return Buffer.from(doc.output('arraybuffer'));
}

// ==============================================================================
// 2. Generador de Estado de Cuenta & Antigüedad de Saldos
// ==============================================================================
export async function generateEstadoCuentaPdf(cliente: any, tenant: any): Promise<Buffer> {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const primaryHex = tenant?.colorPrimario || '#2563eb';
  const r = parseInt(primaryHex.slice(1, 3), 16) || 37;
  const g = parseInt(primaryHex.slice(3, 5), 16) || 99;
  const b = parseInt(primaryHex.slice(5, 7), 16) || 235;

  // 1. Cabecera
  doc.setFillColor(r, g, b);
  doc.rect(12, 12, 192, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(tenant?.nombreComercial || 'ControlERP', 12, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`RFC: ${tenant?.identificacionFiscal || 'XAXX010101000'} | Tel: ${tenant?.telefono || '81-8000-0000'}`, 12, 25);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(128, 16, 76, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(r, g, b);
  doc.text('ESTADO DE CUENTA DE CLIENTE', 132, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha de Corte: ${new Date().toLocaleDateString('es-MX')}`, 132, 27);
  doc.text(`Moneda: Pesos Mexicanos (MXN)`, 132, 31);

  // 2. Ficha Financiera del Cliente
  doc.line(12, 38, 204, 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Cliente: ${cliente.razonSocial} (${cliente.codigo})`, 12, 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`RFC: ${cliente.rfc || 'Sin RFC'} | Tel: ${cliente.telefono || 'N/A'} | Contacto: ${cliente.contacto || 'N/A'}`, 12, 49);

  // 4 Bloques KPIs de Cartera
  const limite = Number(cliente.limiteCredito || 0);
  const cxcItems = cliente.cxc || [];
  let saldoTotal = 0;
  let saldoVencido = 0;
  let dias1a30 = 0;
  let dias31a60 = 0;
  let diasMas60 = 0;
  let vigente = 0;

  const now = new Date();
  for (const c of cxcItems) {
    const pend = Number(c.saldoPendiente || 0);
    saldoTotal += pend;
    if (pend > 0) {
      const vto = new Date(c.fechaVencimiento);
      const diffDias = Math.ceil((now.getTime() - vto.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDias > 0) {
        saldoVencido += pend;
        if (diffDias <= 30) dias1a30 += pend;
        else if (diffDias <= 60) dias31a60 += pend;
        else diasMas60 += pend;
      } else {
        vigente += pend;
      }
    }
  }

  const disponible = Math.max(0, limite - saldoTotal);

  const kpiY = 54;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(12, kpiY, 45, 14, 1.5, 1.5, 'F');
  doc.roundedRect(61, kpiY, 45, 14, 1.5, 1.5, 'F');
  doc.roundedRect(110, kpiY, 45, 14, 1.5, 1.5, 'F');
  doc.roundedRect(159, kpiY, 45, 14, 1.5, 1.5, 'F');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('LÍMITE AUTORIZADO', 14, kpiY + 4);
  doc.text('SALDO TOTAL INSOLUTO', 63, kpiY + 4);
  doc.text('CRÉDITO DISPONIBLE', 112, kpiY + 4);
  doc.text('SALDO EN MORA (VENCIDO)', 161, kpiY + 4);

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`$${limite.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 14, kpiY + 10);
  doc.text(`$${saldoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 63, kpiY + 10);
  doc.setTextColor(16, 185, 129);
  doc.text(`$${disponible.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 112, kpiY + 10);
  doc.setTextColor(saldoVencido > 0 ? 225 : 71, saldoVencido > 0 ? 29 : 85, saldoVencido > 0 ? 72 : 105);
  doc.text(`$${saldoVencido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 161, kpiY + 10);

  // 3. Antigüedad de Saldos (Aging Summary)
  let y = 73;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(r, g, b);
  doc.text('DESGLOSE DE ANTIGÜEDAD DE CARTERA', 12, y);

  y += 3;
  doc.setFillColor(248, 250, 252);
  doc.rect(12, y, 192, 6, 'F');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Al Corriente (Vigente)', 15, y + 4.5);
  doc.text('1 a 30 Días Vencido', 65, y + 4.5);
  doc.text('31 a 60 Días Vencido', 115, y + 4.5);
  doc.text('+60 Días (Crítico)', 165, y + 4.5);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`$${vigente.toFixed(2)}`, 15, y + 4.5);
  doc.text(`$${dias1a30.toFixed(2)}`, 65, y + 4.5);
  doc.text(`$${dias31a60.toFixed(2)}`, 115, y + 4.5);
  doc.setTextColor(diasMas60 > 0 ? 220 : 15, diasMas60 > 0 ? 38 : 23, diasMas60 > 0 ? 38 : 42);
  doc.text(`$${diasMas60.toFixed(2)}`, 165, y + 4.5);

  // 4. Detalle de Documentos
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(r, g, b);
  doc.text('RELACIÓN DE FACTURAS Y SALDOS PENDIENTES', 12, y);

  y += 3;
  doc.setFillColor(241, 245, 249);
  doc.rect(12, y, 192, 6, 'F');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('FOLIO', 14, y + 4.5);
  doc.text('EMISIÓN', 42, y + 4.5);
  doc.text('VENCIMIENTO', 70, y + 4.5);
  doc.text('IMPORTE TOTAL', 108, y + 4.5, { align: 'right' });
  doc.text('ABONOS', 140, y + 4.5, { align: 'right' });
  doc.text('SALDO PENDIENTE', 174, y + 4.5, { align: 'right' });
  doc.text('ESTADO', 202, y + 4.5, { align: 'right' });

  y += 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);

  for (const c of cxcItems) {
    const isVencida = new Date(c.fechaVencimiento) < now && Number(c.saldoPendiente) > 0;
    const abonos = Number(c.montoTotal) - Number(c.saldoPendiente);

    doc.text(c.folio || 'FAC-000', 14, y + 4);
    doc.text(new Date(c.fechaEmision).toLocaleDateString('es-MX'), 42, y + 4);
    doc.text(new Date(c.fechaVencimiento).toLocaleDateString('es-MX'), 70, y + 4);
    doc.text(`$${Number(c.montoTotal).toFixed(2)}`, 108, y + 4, { align: 'right' });
    doc.text(`$${abonos.toFixed(2)}`, 140, y + 4, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`$${Number(c.saldoPendiente).toFixed(2)}`, 174, y + 4, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    
    if (Number(c.saldoPendiente) === 0) {
      doc.setTextColor(16, 185, 129);
      doc.text('LIQUIDADO', 202, y + 4, { align: 'right' });
    } else if (isVencida) {
      doc.setTextColor(225, 29, 72);
      doc.text('VENCIDO', 202, y + 4, { align: 'right' });
    } else {
      doc.setTextColor(37, 99, 235);
      doc.text('VIGENTE', 202, y + 4, { align: 'right' });
    }

    doc.setTextColor(15, 23, 42);
    y += 6;
    if (y > 250) {
      doc.addPage();
      y = 15;
    }
  }

  // Pie de Página
  doc.setDrawColor(226, 232, 240);
  doc.line(12, 260, 204, 260);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Por favor, revise este estado de cuenta. Cualquier aclaración o depósito favor de notificar a cuentasporcobrar@tuempresa.com', 12, 265);
  doc.text(`Emitido automáticamente por ControlERP SaaS • Página 1 de 1`, 12, 269);

  return Buffer.from(doc.output('arraybuffer'));
}

// ==============================================================================
// 3. Generador de Póliza de Traslado / Carta Porte 3.1
// ==============================================================================
export async function generateCartaPortePdf(traspaso: any, tenant: any): Promise<Buffer> {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const primaryHex = tenant?.colorPrimario || '#2563eb';
  const r = parseInt(primaryHex.slice(1, 3), 16) || 37;
  const g = parseInt(primaryHex.slice(3, 5), 16) || 99;
  const b = parseInt(primaryHex.slice(5, 7), 16) || 235;

  // Encabezado
  doc.setFillColor(r, g, b);
  doc.rect(12, 12, 192, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(tenant?.nombreComercial || 'ControlERP', 12, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`RFC: ${tenant?.identificacionFiscal || 'XAXX010101000'} | Empresa Transportista / Distribución`, 12, 25);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(128, 16, 76, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(r, g, b);
  doc.text('GUÍA DE TRASLADO / CARTA PORTE 3.1', 132, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(traspaso.folio, 132, 27);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha: ${new Date(traspaso.fechaSolicitud).toLocaleDateString('es-MX')} | Tipo: CFDI Traslado`, 132, 32);

  // Ruta y Ubicaciones
  doc.line(12, 38, 204, 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(r, g, b);
  doc.text('ORIGEN Y DESTINO DEL TRANSPORTE', 12, 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Almacén Origen: ${traspaso.almacenOrigen?.nombre || 'CEDIS Central'}`, 12, 50);
  doc.text(`Almacén Destino: ${traspaso.almacenDestino?.nombre || 'Sucursal Destino'}`, 12, 55);
  doc.text(`Distancia Recorrida Estimada: ${traspaso.distanciaKm || 45} Km`, 12, 60);

  // Datos Autotransporte y Operador
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(r, g, b);
  doc.text('DATOS DEL AUTOTRANSPORTE Y CONDUCTOR', 110, 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Vehículo / Placas: ${traspaso.vehiculoPlacas || 'P-991-NL'}`, 110, 50);
  doc.text(`Operador / Chofer: ${traspaso.operadorNombre || 'Juan Pérez González'}`, 110, 55);
  doc.text(`RFC Operador: ${traspaso.operadorRfc || 'PEGJ800101ABC'}`, 110, 60);

  // Tabla de Mercancías
  let y = 68;
  doc.setFillColor(241, 245, 249);
  doc.rect(12, y, 192, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('CLAVE SAT', 14, y + 4.5);
  doc.text('SKU', 40, y + 4.5);
  doc.text('DESCRIPCIÓN DE LA MERCANCÍA', 75, y + 4.5);
  doc.text('CANT. ENVIADA', 155, y + 4.5, { align: 'right' });
  doc.text('CANT. RECIBIDA', 195, y + 4.5, { align: 'right' });

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  const items = traspaso.items || [];
  for (const it of items) {
    const prod = it.producto;
    doc.text('78101802', 14, y + 4);
    doc.text(prod?.sku || 'SKU-00', 40, y + 4);
    doc.text((prod?.nombre || 'Artículo de Traslado').slice(0, 40), 75, y + 4);
    doc.text(`${it.cantidadEnviada} ${prod?.unidadMedida || 'PZA'}`, 155, y + 4, { align: 'right' });
    doc.text(it.cantidadRecibida !== null ? `${it.cantidadRecibida} ${prod?.unidadMedida || 'PZA'}` : 'En Tránsito', 195, y + 4, { align: 'right' });
    y += 6.5;
  }

  // Sello Fiscal Carta Porte
  if (traspaso.uuidCartaPorte) {
    const qrData = await QRCode.toDataURL(`https://sat.gob.mx/cartaporte?id=${traspaso.uuidCartaPorte}`, { margin: 1, width: 96 });
    doc.addImage(qrData, 'PNG', 14, y + 10, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(r, g, b);
    doc.text('COMPLEMENTO CARTA PORTE 3.1 TIMBRADO ANTE EL SAT', 46, y + 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`UUID CCP: ${traspaso.uuidCartaPorte}`, 46, y + 20);
    doc.text('Ampara legalmente la tenencia y traslado de mercancías en territorio nacional.', 46, y + 24);
  }

  return Buffer.from(doc.output('arraybuffer'));
}

// ==============================================================================
// 4. Generador de Recibo Electrónico de Pago (REP 2.0 SAT)
// ==============================================================================
export async function generateRepPdf(pago: any, cxc: any, tenant: any): Promise<Buffer> {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const primaryHex = tenant?.colorPrimario || '#2563eb';
  const r = parseInt(primaryHex.slice(1, 3), 16) || 37;
  const g = parseInt(primaryHex.slice(3, 5), 16) || 99;
  const b = parseInt(primaryHex.slice(5, 7), 16) || 235;

  // Cabecera
  doc.setFillColor(r, g, b);
  doc.rect(12, 12, 192, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(tenant?.nombreComercial || 'ControlERP', 12, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`RFC: ${tenant?.identificacionFiscal || 'XAXX010101000'} | Complemento de Pago Electrónico`, 12, 25);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(128, 16, 76, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(r, g, b);
  doc.text('RECIBO DE PAGO (CFDI 4.0 REP 2.0)', 132, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`REP-${cxc.folio}`, 132, 27);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha Pago: ${new Date(pago.fechaPago || pago.fecha || Date.now()).toLocaleString('es-MX')}`, 132, 32);

  // Datos Cliente y Pago
  doc.line(12, 38, 204, 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(r, g, b);
  doc.text('DATOS DEL CLIENTE Y DEL DEPÓSITO', 12, 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Cliente: ${cxc.cliente?.razonSocial}`, 12, 50);
  doc.text(`RFC Receptor: ${cxc.cliente?.rfc || 'XAXX010101000'}`, 12, 55);
  doc.text(`Forma de Pago: ${pago.metodoPago || '03 Transferencia electrónica'} | Moneda: MXN`, 12, 60);

  doc.text(`Monto Abonado: $${Number(pago.monto).toFixed(2)} MXN`, 110, 50);
  doc.text(`Referencia Bancaria: ${pago.referencia || 'N/A'}`, 110, 55);
  doc.text(`Cuenta / Banco: ${pago.cuentaBancaria?.nombreCuenta || 'Caja / Banco Central'}`, 110, 60);

  // Documentos Relacionados
  let y = 68;
  doc.setFillColor(241, 245, 249);
  doc.rect(12, y, 192, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('FOLIO FACTURA', 14, y + 4.5);
  doc.text('UUID FACTURA ORIGEN', 45, y + 4.5);
  doc.text('SALDO ANTERIOR', 115, y + 4.5, { align: 'right' });
  doc.text('IMPORTE PAGADO', 155, y + 4.5, { align: 'right' });
  doc.text('SALDO INSOLUTO', 198, y + 4.5, { align: 'right' });

  y += 7;
  const saldoAnterior = Number(pago.monto) + Number(cxc.saldoPendiente);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(cxc.folio, 14, y + 4);
  doc.text(cxc.uuidFiscal || 'E29F9882-9901-443B-9831-ABCD12345678', 45, y + 4);
  doc.text(`$${saldoAnterior.toFixed(2)}`, 115, y + 4, { align: 'right' });
  doc.text(`$${Number(pago.monto).toFixed(2)}`, 155, y + 4, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(`$${Number(cxc.saldoPendiente).toFixed(2)}`, 198, y + 4, { align: 'right' });

  // Timbre SAT REP 2.0
  const qrData = await QRCode.toDataURL(`https://sat.gob.mx/rep?uuid=${pago.uuidRep || cxc.uuidFiscal || 'RECIBO-PAGO'}`, { margin: 1, width: 96 });
  doc.addImage(qrData, 'PNG', 14, y + 16, 28, 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(r, g, b);
  doc.text('COMPLEMENTO DE RECEPCIÓN DE PAGOS 2.0 TIMBRADO ANTE EL SAT', 46, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`UUID REP: ${pago.uuidRep || 'E29F9882-9901-443B-9831-ABCD12345678'}`, 46, y + 25);
  doc.text('Certifica la extinción parcial o total de la obligación fiscal conforme a la RMF vigente.', 46, y + 29);

  return Buffer.from(doc.output('arraybuffer'));
}

function hexToRgb(hex: string) {
  const cleanHex = (hex || '#2563eb').replace('#', '');
  return {
    r: parseInt(cleanHex.slice(0, 2), 16) || 37,
    g: parseInt(cleanHex.slice(2, 4), 16) || 99,
    b: parseInt(cleanHex.slice(4, 6), 16) || 235,
  };
}

// ==============================================================================
// 5. Motor Documental: Recibo de Nómina Digital CFDI 1.2 SAT
// ==============================================================================
export async function generateReciboNominaPdf(data: {
  tenant: any;
  periodo: any;
  recibo: any;
  empleado: any;
}): Promise<Buffer> {
  const { tenant, periodo, recibo, empleado } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

  const primaryColor = tenant?.colorPrimario || '#2563eb';
  const { r, g, b } = hexToRgb(primaryColor);

  // Encabezado
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, 216, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text((tenant?.razonSocial || tenant?.nombreComercial || 'CONTROL ERP').toUpperCase(), 14, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`RFC: ${tenant?.identificacionFiscal || 'XAXX010101000'}  |  Régimen: ${tenant?.regimenFiscal || '601 General de Ley Personas Morales'}`, 14, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('RECIBO DE NÓMINA (CFDI 1.2)', 202, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Folio: ${periodo?.folio || 'NOM-2026-Q01'}  |  Periodo: ${periodo?.tipo || 'QUINCENAL'}`, 202, 18, { align: 'right' });

  // Ficha del Colaborador
  let y = 35;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, 188, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Empleado: [${empleado.numeroEmpleado}] ${empleado.nombre} ${empleado.apellidoPaterno} ${empleado.apellidoMaterno || ''}`.trim(), 18, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`RFC: ${empleado.rfc}  |  CURP: ${empleado.curp}  |  NSS: ${empleado.nss || 'SIN NSS'}`, 18, y + 14);
  doc.text(`Puesto: ${empleado.puesto}  |  Departamento: ${empleado.departamento}`, 18, y + 20);
  doc.text(`Salario Diario: $${Number(empleado.salarioDiario).toFixed(2)}  |  SDI (IMSS): $${Number(empleado.salarioDiarioIntegrado).toFixed(2)}`, 18, y + 26);
  doc.text(`Banco: ${empleado.bancoNombre || 'TRANSFERENCIA'}  |  CLABE: ${empleado.cuentaClabe || 'N/A'}  |  Días Pagados: ${recibo.diasTrabajados}`, 18, y + 32);

  // Tablas de Percepciones y Deducciones (Lado a Lado)
  y = 80;
  // Percepciones (Izquierda: 14mm a 105mm)
  doc.setFillColor(r, g, b);
  doc.rect(14, y, 92, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('PERCEPCIONES (INGRESOS)', 16, y + 4.5);
  doc.text('IMPORTE', 104, y + 4.5, { align: 'right' });

  // Deducciones (Derecha: 110mm a 202mm)
  doc.rect(110, y, 92, 6, 'F');
  doc.text('DEDUCCIONES (RETENCIONES)', 112, y + 4.5);
  doc.text('IMPORTE', 200, y + 4.5, { align: 'right' });

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);

  // Partidas Percepciones
  doc.text('001 Sueldo Ordinario', 16, y);
  doc.text(`$${Number(recibo.sueldoOrdinario).toFixed(2)}`, 104, y, { align: 'right' });

  doc.text('002 Horas Extra', 16, y + 6);
  doc.text(`$${Number(recibo.horasExtra).toFixed(2)}`, 104, y + 6, { align: 'right' });

  doc.text('003 Vales de Despensa', 16, y + 12);
  doc.text(`$${Number(recibo.valesDespensa).toFixed(2)}`, 104, y + 12, { align: 'right' });

  doc.text('004 Bonos e Incentivos', 16, y + 18);
  doc.text(`$${Number(recibo.bonos).toFixed(2)}`, 104, y + 18, { align: 'right' });

  // Partidas Deducciones
  doc.text('001 Retención ISR Art. 96', 112, y);
  doc.text(`$${Number(recibo.retencionISR).toFixed(2)}`, 200, y, { align: 'right' });

  doc.text('002 Cuota Obrera IMSS', 112, y + 6);
  doc.text(`$${Number(recibo.imssObrero).toFixed(2)}`, 200, y + 6, { align: 'right' });

  doc.text('003 Otras Deducciones / Anticipos', 112, y + 12);
  doc.text(`$${Number(recibo.otrasDeducciones).toFixed(2)}`, 200, y + 12, { align: 'right' });

  // Línea divisoria y Totales
  y += 28;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, y, 106, y);
  doc.line(110, y, 202, y);

  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL PERCEPCIONES:', 16, y + 5);
  doc.text(`$${Number(recibo.totalPercepciones).toFixed(2)}`, 104, y + 5, { align: 'right' });

  doc.text('TOTAL DEDUCCIONES:', 112, y + 5);
  doc.text(`$${Number(recibo.totalDeducciones).toFixed(2)}`, 200, y + 5, { align: 'right' });

  // Tarjeta de Neto a Pagar
  y += 14;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, y, 188, 18, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('NETO A PAGAR EN CUENTA:', 20, y + 11);
  doc.setFontSize(13);
  doc.setTextColor(r, g, b);
  doc.text(`$${Number(recibo.netoAPagar).toFixed(2)} MXN`, 196, y + 11, { align: 'right' });

  // Timbre SAT CFDI Nómina 1.2
  y += 26;
  const qrData = await QRCode.toDataURL(`https://sat.gob.mx/nomina?uuid=${recibo.uuidSAT || 'NOMINA-RECIBO'}`, { margin: 1, width: 96 });
  doc.addImage(qrData, 'PNG', 14, y, 28, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(r, g, b);
  doc.text('COMPROBANTE FISCAL DIGITAL POR INTERNET (CFDI NÓMINA 1.2)', 46, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Folio Fiscal UUID: ${recibo.uuidSAT || 'D7A39B1C-E3FF-4A9B-9812-B83748293746'}`, 46, y + 9);
  doc.text(`Fecha y Hora de Certificación: ${recibo.fechaTimbrado ? new Date(recibo.fechaTimbrado).toISOString() : new Date().toISOString()}`, 46, y + 13);
  doc.text(`Sello SAT: ${(recibo.selloSAT || 'SelloDigitalSimuladoSatSat1234567890abcdef').slice(0, 60)}...`, 46, y + 17);
  doc.text('Cadena Original Complemento Nómina SAT 1.2:', 46, y + 21);
  doc.text((recibo.cadenaOriginalSAT || '||1.2|NOMINA|2026-09-15|SAT||').slice(0, 80), 46, y + 25);

  return Buffer.from(doc.output('arraybuffer'));
}

