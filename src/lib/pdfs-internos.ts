import { jsPDF } from 'jspdf';

type TenantDoc = { nombreComercial?: string | null; razonSocial?: string | null; colorPrimario?: string | null };
const valor = (v: unknown) => String(v ?? '').trim();
const dinero = (n: unknown) => new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN' }).format(Number(n) || 0);
function color(hex: unknown): [number,number,number] {
  const value=valor(hex);if(!/^#[0-9a-fA-F]{6}$/.test(value))return [30,64,175];
  return [parseInt(value.slice(1,3),16),parseInt(value.slice(3,5),16),parseInt(value.slice(5,7),16)];
}
function base(titulo:string,folio:string,fecha:unknown,tenant:TenantDoc) {
  const doc=new jsPDF({unit:'mm',format:'letter'}),accent=color(tenant?.colorPrimario);
  const header=()=>{
    doc.setFillColor(...accent);doc.rect(0,0,216,3,'F');
    doc.setTextColor(15,23,42);doc.setFont('helvetica','bold');doc.setFontSize(13);
    doc.text(valor(tenant?.nombreComercial)||'Empresa',12,16,{maxWidth:120});
    doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(71,85,105);
    doc.text(valor(tenant?.razonSocial),12,21,{maxWidth:120});
    doc.setTextColor(...accent);doc.setFont('helvetica','bold');doc.setFontSize(10);
    doc.text(titulo,204,16,{align:'right'});
    doc.setFont('courier','bold');doc.setFontSize(8);doc.text(folio,204,21,{align:'right'});
    doc.setDrawColor(203,213,225);doc.line(12,25,204,25);
    doc.setFont('helvetica','normal');doc.setTextColor(100,116,139);doc.setFontSize(7);
    const d=new Date(fecha as string);doc.text(`Fecha: ${Number.isNaN(d.getTime())?'—':d.toLocaleString('es-MX')}`,12,30);
  };
  const footer=()=>{
    doc.setDrawColor(226,232,240);doc.line(12,263,204,263);
    doc.setTextColor(100,116,139);doc.setFont('helvetica','normal');doc.setFontSize(7);
    doc.text('DOCUMENTO INTERNO · No es CFDI ni comprobante fiscal',12,268);
    doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`,204,268,{align:'right'});
  };
  header();return {doc,header,footer,accent};
}
function terminar(doc:jsPDF,footer:()=>void) {
  const paginas=doc.getNumberOfPages();for(let p=1;p<=paginas;p++){doc.setPage(p);footer();}
  return Buffer.from(doc.output('arraybuffer'));
}

export async function generarRemisionInterna(venta:any,tenant:TenantDoc,tipo:'VENTA'|'COTIZACION'='VENTA'):Promise<Buffer> {
  const {doc,header,footer,accent}=base(tipo==='VENTA'?'REMISIÓN DE VENTA':'COTIZACIÓN COMERCIAL',valor(venta.folio),venta.fecha,tenant);
  doc.setFillColor(248,250,252);doc.roundedRect(12,35,192,25,2,2,'F');
  doc.setTextColor(71,85,105);doc.setFont('helvetica','normal');doc.setFontSize(8);
  doc.text('Cliente',16,41);doc.text(tipo==='VENTA'?'Almacén':'Vigencia',130,41);
  doc.setTextColor(15,23,42);doc.setFont('helvetica','bold');doc.setFontSize(9);
  doc.text(valor(venta.cliente?.razonSocial)||'Público en general',16,47,{maxWidth:105});
  doc.text(tipo==='VENTA'?(valor(venta.almacen?.nombre)||'—'):(venta.fechaVencimiento?new Date(venta.fechaVencimiento).toLocaleDateString('es-MX'):'Según condiciones'),130,47,{maxWidth:68});
  doc.setFont('courier','normal');doc.setFontSize(8);doc.text(`Código: ${valor(venta.cliente?.codigo)||'—'}`,16,54);
  doc.setFont('helvetica','normal');doc.text(tipo==='VENTA'?`Condición: ${venta.tipoPago==='CREDITO'?'Crédito':'Contado'}`:'Propuesta sin compromiso fiscal',130,54);
  const tabla=(y:number)=>{doc.setFillColor(241,245,249);doc.rect(12,y,192,8,'F');doc.setFont('helvetica','bold');doc.setTextColor(51,65,85);doc.setFontSize(7);
    doc.text('SKU / DESCRIPCIÓN',16,y+5);doc.text('CANT.',137,y+5,{align:'right'});doc.text('P. UNIT.',169,y+5,{align:'right'});doc.text('IMPORTE',201,y+5,{align:'right'});return y+8;};
  let y=tabla(67);
  for(const it of venta.detalles||[]){
    const nombre=valor(it.producto?.nombre)||'Artículo';const lineas=doc.splitTextToSize(nombre,91).slice(0,3);
    const alto=Math.max(10,6+lineas.length*4);
    if(y+alto>251){doc.addPage();header();y=tabla(37);}
    doc.setFont('courier','normal');doc.setTextColor(...accent);doc.setFontSize(7);
    doc.text(valor(it.producto?.sku)||'—',16,y+4,{maxWidth:90});
    doc.setFont('helvetica','normal');doc.setTextColor(30,41,59);doc.setFontSize(8);doc.text(lineas,16,y+8);
    doc.setFont('courier','normal');doc.setFontSize(8);
    doc.text(valor(it.cantidad),137,y+5,{align:'right'});doc.text(dinero(it.precioUnitario),169,y+5,{align:'right'});
    doc.text(dinero(it.subtotal??Number(it.cantidad)*Number(it.precioUnitario)),201,y+5,{align:'right'});
    doc.setDrawColor(226,232,240);doc.line(12,y+alto,204,y+alto);y+=alto;
  }
  if(y+42>252){doc.addPage();header();y=38;}
  y+=7;doc.setFont('helvetica','normal');doc.setTextColor(71,85,105);doc.setFontSize(8);
  doc.text('Subtotal',165,y,{align:'right'});doc.text(dinero(venta.subtotal),201,y,{align:'right'});
  doc.text('Impuestos registrados',165,y+7,{align:'right'});doc.text(dinero(venta.impuestos),201,y+7,{align:'right'});
  doc.setFillColor(241,245,249);doc.roundedRect(128,y+11,76,12,2,2,'F');
  doc.setFont('helvetica','bold');doc.setTextColor(15,23,42);doc.text('TOTAL',133,y+19);doc.text(dinero(venta.total),200,y+19,{align:'right'});
  if(venta.observaciones){const notas=doc.splitTextToSize(`Observaciones: ${valor(venta.observaciones)}`,110).slice(0,3);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text(notas,12,y+8);}
  return terminar(doc,footer);
}

export async function generarCotizacionInterna(cotizacion:any,tenant:TenantDoc):Promise<Buffer>{
  return generarRemisionInterna(cotizacion,tenant,'COTIZACION');
}

export async function generarGuiaInterna(traspaso:any,tenant:TenantDoc):Promise<Buffer> {
  const {doc,header,footer,accent}=base('GUÍA INTERNA DE TRASPASO',valor(traspaso.folio),traspaso.fechaSolicitud,tenant);
  doc.setFillColor(248,250,252);doc.roundedRect(12,35,192,25,2,2,'F');
  doc.setFont('helvetica','normal');doc.setTextColor(71,85,105);doc.setFontSize(8);
  doc.text('Origen',16,41);doc.text('Destino',112,41);doc.text('Estado',16,52);
  doc.setFont('helvetica','bold');doc.setTextColor(15,23,42);doc.setFontSize(9);
  doc.text(valor(traspaso.almacenOrigen?.nombre)||'—',16,47,{maxWidth:90});
  doc.text(valor(traspaso.almacenDestino?.nombre)||'—',112,47,{maxWidth:90});
  doc.setFont('courier','bold');doc.setFontSize(8);doc.text(valor(traspaso.estado),45,52);
  const tabla=(y:number)=>{doc.setFillColor(241,245,249);doc.rect(12,y,192,8,'F');doc.setFont('helvetica','bold');doc.setTextColor(51,65,85);doc.setFontSize(7);
    doc.text('SKU / DESCRIPCIÓN',16,y+5);doc.text('ENVIADO',148,y+5,{align:'right'});doc.text('RECIBIDO',174,y+5,{align:'right'});doc.text('PENDIENTE',201,y+5,{align:'right'});return y+8;};
  let y=tabla(67);
  for(const it of traspaso.items||[]){
    const lineas=doc.splitTextToSize(valor(it.producto?.nombre)||'Artículo',91).slice(0,3);const alto=Math.max(10,6+lineas.length*4);
    if(y+alto>251){doc.addPage();header();y=tabla(37);}
    const enviada=Number(it.cantidadEnviada??it.cantidadSolicitada??0),recibida=Number(it.cantidadRecibida??0);
    doc.setFont('courier','normal');doc.setTextColor(...accent);doc.setFontSize(7);doc.text(valor(it.producto?.sku)||'—',16,y+4,{maxWidth:90});
    doc.setFont('helvetica','normal');doc.setTextColor(30,41,59);doc.setFontSize(8);doc.text(lineas,16,y+8);
    doc.setFont('courier','normal');doc.text(String(enviada),148,y+5,{align:'right'});doc.text(String(recibida),174,y+5,{align:'right'});
    doc.text(String(Math.max(0,enviada-recibida)),201,y+5,{align:'right'});
    doc.setDrawColor(226,232,240);doc.line(12,y+alto,204,y+alto);y+=alto;
  }
  if(y+20>252){doc.addPage();header();y=38;}
  doc.setFont('helvetica','normal');doc.setTextColor(71,85,105);doc.setFontSize(8);
  doc.text('La recepción parcial conserva el faltante como pendiente.',12,y+12);
  return terminar(doc,footer);
}
