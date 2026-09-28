import { jsPDF } from 'jspdf';

type DatosRecibo = { pago: { id: string; fecha: Date; monto: number; metodo: string; referencia: string | null };
  folio: string; cliente: string; empresa: string; color?: string | null; saldoActual: number;
  saldos?: { saldoAnterior: number; nuevoSaldoPendiente: number } };
export function generarReciboInterno(datos: DatosRecibo): Buffer {
  const doc = new jsPDF(); const margen = 18, ancho = 174;
  const color = /^#[a-f0-9]{6}$/i.test(datos.color ?? '') ? datos.color! : '#0f172a';
  doc.setFillColor(color); doc.rect(0, 0, 210, 34, 'F'); doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text('RECIBO DE ABONO', margen, 16);
  doc.setFontSize(10); doc.text('DOCUMENTO INTERNO / SIN VALIDEZ FISCAL', margen, 25);
  let y = 47;
  const fila = (etiqueta: string, valor: string, mono = false) => {
    doc.setFont(mono ? 'courier' : 'helvetica', 'normal'); doc.setFontSize(11);
    const lineas = doc.splitTextToSize(valor, ancho) as string[];
    if (y + 12 > 268) { doc.addPage(); y = 22; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor('#64748b'); doc.text(etiqueta.toUpperCase(), margen, y); y += 7;
    doc.setFont(mono ? 'courier' : 'helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor('#0f172a');
    for (const linea of lineas) {
      if (y > 268) { doc.addPage(); y = 22; }
      doc.text(linea, margen, y); y += 6;
    }
    y += 5;
  };
  const dinero = (n: number) => `${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
  fila('Empresa', datos.empresa); fila('Cliente', datos.cliente);
  fila('Documento de cartera', datos.folio, true); fila('Identificador de pago', datos.pago.id, true);
  fila('Fecha del pago', new Date(datos.pago.fecha).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }));
  fila('Método', datos.pago.metodo); fila('Referencia', datos.pago.referencia || 'Sin referencia');
  fila('Abono recibido', dinero(datos.pago.monto), true);
  if (datos.saldos) {
    fila('Saldo del documento antes de este abono', dinero(datos.saldos.saldoAnterior), true);
    fila('Saldo del documento después de este abono', dinero(datos.saldos.nuevoSaldoPendiente), true);
  } else fila('Saldo actual del documento al emitir este recibo', dinero(datos.saldoActual), true);
  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina++) {
    doc.setPage(pagina); doc.setDrawColor('#cbd5e1'); doc.line(margen, 278, 192, 278);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor('#64748b');
    doc.text('Comprobante interno. No constituye CFDI ni complemento de pago REP.', margen, 284);
    doc.text(`${pagina} / ${paginas}`, 192, 290, { align: 'right' });
  }
  return Buffer.from(doc.output('arraybuffer'));
}
