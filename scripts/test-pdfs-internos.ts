import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { generateFacturaPdf, generateCotizacionPdf, generateCartaPortePdf } from '../src/lib/pdf-service';

async function main() {
  const root=resolve('.'),dir=mkdtempSync(join(root,'.test-pdfs-internos-'));
  try {
    const tenant={nombreComercial:'Distribuidora Piloto',razonSocial:'Distribuidora Piloto SA',colorPrimario:'#174A7E'};
    const productos=Array.from({length:47},(_,i)=>({producto:{sku:`000${i+1}`,nombre:`Material de demostración número ${i+1} con descripción extendida para comprobar la paginación`},
      cantidad:i+1,precioUnitario:12.5,subtotal:(i+1)*12.5,cantidadEnviada:i+1,cantidadRecibida:i}));
    const subtotal=productos.reduce((n,r)=>n+r.subtotal,0),impuestos=Math.round(subtotal*0.16*100)/100;
    const venta={folio:'VTA-PRUEBA-001',fecha:new Date(),cliente:{razonSocial:'Cliente de prueba',codigo:'0001'},almacen:{nombre:'Principal'},
      tipoPago:'CONTADO',detalles:productos,subtotal,impuestos,total:subtotal+impuestos};
    const cotizacion={...venta,folio:'COT-PRUEBA-001',fechaVencimiento:new Date(Date.now()+7*86400000)};
    const traspaso={folio:'TRA-PRUEBA-001',fechaSolicitud:new Date(),estado:'DESPACHADO',almacenOrigen:{nombre:'Principal'},
      almacenDestino:{nombre:'Sucursal'},items:productos};
    for(const [name,data,fn] of [
      ['remision.pdf',venta,generateFacturaPdf],['cotizacion.pdf',cotizacion,generateCotizacionPdf],
      ['guia-traspaso.pdf',traspaso,generateCartaPortePdf]
    ] as const){const bytes=await fn(data,tenant);assert.ok(bytes.subarray(0,4).toString()==='%PDF');assert.ok(bytes.length>3000);
      writeFileSync(join(dir,name),bytes);console.log(`PASS ${name}: ${bytes.length} bytes`);}
    console.log(`PDF_DIR=${dir}`);
  } finally {
    if(!process.argv.includes('--keep')){
      if(!resolve(dir).startsWith(root+'\\')&&!resolve(dir).startsWith(root+'/'))throw new Error('Fuera del workspace');
      rmSync(dir,{recursive:true,force:true});
    }
  }
}
main().catch(e=>{console.error(e);process.exitCode=1});
