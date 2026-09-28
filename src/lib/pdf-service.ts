import { jsPDF } from 'jspdf';
import { generarRemisionInterna, generarCotizacionInterna, generarGuiaInterna } from './pdfs-internos';

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
// 1. Remisión interna; se conserva el nombre exportado para compatibilidad.
// ==============================================================================
export async function generateFacturaPdf(venta: any, tenant: any): Promise<Buffer> {
  return generarRemisionInterna(venta, tenant);
}

// ==============================================================================
// 2. Cotización comercial interna.
// ==============================================================================
export async function generateCotizacionPdf(cotizacion: any, tenant: any): Promise<Buffer> {
  return generarCotizacionInterna(cotizacion, tenant);
}

// ==============================================================================
// 3. REP fiscal fuera del piloto; nunca generar un documento simulado.
// ==============================================================================
export async function generateRepPdf(_pago: any, _cxc: any, _tenant: any): Promise<Buffer> {
  throw new Error('REP fiscal no disponible sin PAC');
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
  doc.text(tenant?.razonSocial || 'Razón social no registrada', 40, y, { align: 'center', maxWidth: 72 });
  y += 3.5;
  if (tenant?.identificacionFiscal) doc.text(`RFC: ${tenant.identificacionFiscal}`, 40, y, { align: 'center' });
  y += 3.5;
  doc.text(`Sucursal: ${venta.almacen?.nombre || venta.almacen || 'Mostrador Principal'}`, 40, y, { align: 'center' });
  y += 3.5;
  const contactoTicket = [tenant?.codigoPostal ? `C.P. ${tenant.codigoPostal}` : null, tenant?.telefono ? `Tel: ${tenant.telefono}` : null].filter(Boolean).join(' • ');
  if (contactoTicket) doc.text(contactoTicket, 40, y, { align: 'center' });

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

  // Mensaje de Cierre
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('¡GRACIAS POR SU COMPRA!', 40, y, { align: 'center' });
  y += 3.2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Documento interno de control de venta', 40, y, { align: 'center' });
  y += 2.8;
  doc.text('No es un CFDI ni comprobante fiscal', 40, y, { align: 'center' });

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
  doc.text(tenant?.razonSocial || 'Razón social no registrada', 10, 22, { maxWidth: 114 });
  const datosContacto = [
    tenant?.identificacionFiscal ? `RFC: ${tenant.identificacionFiscal}` : null,
    tenant?.telefono ? `Tel: ${tenant.telefono}` : null,
  ].filter(Boolean).join(' • ');
  if (datosContacto) doc.text(datosContacto, 10, 26, { maxWidth: 114 });

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
// 6. Guía interna de traspaso; no es Carta Porte fiscal.
// ==============================================================================
export async function generateCartaPortePdf(traspaso: any, tenant: any): Promise<Buffer> {
  return generarGuiaInterna(traspaso, tenant);
}

// ==============================================================================
// 7. CFDI de nómina fuera del piloto; nunca generar un documento simulado.
// ==============================================================================
export async function generateReciboNominaPdf(_data: { tenant: any; periodo: any; recibo: any; empleado: any }): Promise<Buffer> {
  throw new Error('CFDI de nómina no disponible sin PAC');
}
