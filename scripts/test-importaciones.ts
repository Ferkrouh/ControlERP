import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import ExcelJS from 'exceljs-hardened';

async function main() {
  const root = resolve('.'); const dir = mkdtempSync(join(root, '.test-importaciones-'));
  const schema = join(dir, 'schema.prisma'); writeFileSync(schema, readFileSync(resolve('prisma/schema.prisma'), 'utf8'));
  writeFileSync(join(dir, 'test.db'), ''); process.env.DATABASE_URL = `file:${join(dir,'test.db').replaceAll('\\','/')}`;
  process.env.JWT_SECRET = 'test-only-isolated-import-secret-at-least32bytes';
  const { prisma } = await import('../src/lib/prisma');
  try {
    execFileSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'db','push','--schema',schema,'--skip-generate'], { env:process.env, stdio:'pipe' });
    const { previsualizarImportacion, confirmarImportacion, previsualizarStockInicial, plantilla } = await import('../src/lib/importaciones');
    const { confirmarAjuste } = await import('../src/lib/ajustes-inventario');
    let passed = 0; const check=async(name:string,fn:()=>Promise<void>)=>{await fn();passed++;console.log(`PASS ${name}`)};
    const tenant=await prisma.tenant.create({data:{nombreComercial:'Piloto',razonSocial:'Piloto',identificacionFiscal:randomUUID()}});
    const otro=await prisma.tenant.create({data:{nombreComercial:'Otra',razonSocial:'Otra',identificacionFiscal:randomUUID()}});
    const usuario=await prisma.usuario.create({data:{tenantId:tenant.id,nombre:'Admin',email:`${randomUUID()}@test.invalid`,passwordHash:'fixture',rol:'ADMIN'}});
    const actor={id:usuario.id,nombre:usuario.nombre,email:usuario.email,rol:'ADMIN' as const,tenantId:tenant.id};
    const archivo=(s:string,n='archivo.csv')=>new File([s],n,{type:'text/csv'});
    const pre=(f:File,t:'PRODUCTOS'|'PROVEEDORES'|'CLIENTES'='PRODUCTOS',m:'CREAR'|'ACTUALIZAR'='CREAR')=>previsualizarImportacion(f,t,m,tenant.id,actor);
    await check('plantillas incluyen cabeceras canónicas',async()=>{
      assert.ok(plantilla('PRODUCTOS').includes('sku,nombre'));assert.ok(plantilla('PROVEEDORES').includes('codigo,razonSocial'));
    });
    await check('productos con código de ceros iniciales crean sin stock',async()=>{
      const p=await pre(archivo('sku,nombre,unidadMedida,precioVenta,costoPromedio\n001,Tornillo,PZA,12.50,4.25\n'));
      assert.equal(p.confirmable,true);assert.equal(p.muestra[0].clave,'001');
      const r=await confirmarImportacion(p.loteId,p.hashArchivo,actor);assert.equal(r.resultado.procesados,1);
      const producto=await prisma.producto.findFirstOrThrow({where:{tenantId:tenant.id,sku:'001'}});
      assert.equal(producto.precioVenta,12.5);assert.equal(await prisma.existencia.count({where:{productoId:producto.id}}),0);
      assert.equal(await prisma.registroAuditoria.count({where:{tenantId:tenant.id,modulo:'IMPORTACIONES'}}),1);
      const replay=await confirmarImportacion(p.loteId,p.hashArchivo,actor);assert.equal(replay.repetida,true);
    });
    await check('duplicado del archivo y de BD impiden aplicar lote',async()=>{
      const p=await pre(archivo('sku,nombre,unidadMedida,precioVenta\n001,Uno,PZA,1\n001,Dos,PZA,2\n'));
      assert.equal(p.confirmable,false);assert.ok(p.errores.length>=1);
      await assert.rejects(()=>confirmarImportacion(p.loteId,p.hashArchivo,actor));
    });
    await check('archivo ya confirmado no se previsualiza otra vez',async()=>{
      await assert.rejects(()=>pre(archivo('sku,nombre,unidadMedida,precioVenta,costoPromedio\n001,Tornillo,PZA,12.50,4.25\n')));
    });
    await check('actualización obsoleta se rechaza sin aplicar',async()=>{
      const p=await pre(archivo('sku,nombre,unidadMedida,precioVenta\n001,Tornillo nuevo,PZA,20\n'),'PRODUCTOS','ACTUALIZAR');
      assert.equal(p.confirmable,true);await prisma.producto.update({where:{tenantId_sku:{tenantId:tenant.id,sku:'001'}},data:{precioVenta:15}});
      await assert.rejects(()=>confirmarImportacion(p.loteId,p.hashArchivo,actor));
      assert.equal((await prisma.producto.findUniqueOrThrow({where:{tenantId_sku:{tenantId:tenant.id,sku:'001'}}})).precioVenta,15);
    });
    await check('actualización explícita conserva columnas opcionales omitidas',async()=>{
      const p=await pre(archivo('sku,nombre,unidadMedida,precioVenta\n001,Tornillo revisado,PZA,20\n'),'PRODUCTOS','ACTUALIZAR');
      await confirmarImportacion(p.loteId,p.hashArchivo,actor);
      const producto=await prisma.producto.findUniqueOrThrow({where:{tenantId_sku:{tenantId:tenant.id,sku:'001'}}});
      assert.equal(producto.precioVenta,20);assert.equal(producto.costoPromedio,4.25);
    });
    await check('proveedor y cliente crean saldos y crédito en cero',async()=>{
      const proveedor=await pre(archivo('codigo,razonSocial,rfc,diasCredito\n0007,Proveedor Ágil,,30\n'),'PROVEEDORES');
      await confirmarImportacion(proveedor.loteId,proveedor.hashArchivo,actor);
      const cliente=await pre(archivo('codigo,razonSocial,diasCredito\n0008,Cliente Ágil,15\n'),'CLIENTES');
      await confirmarImportacion(cliente.loteId,cliente.hashArchivo,actor);
      assert.equal((await prisma.proveedor.findFirstOrThrow({where:{tenantId:tenant.id,codigo:'0007'}})).saldoPendiente,0);
      const c=await prisma.cliente.findFirstOrThrow({where:{tenantId:tenant.id,codigo:'0008'}});assert.equal(c.saldoActual,0);assert.equal(c.limiteCredito,0);
    });
    await check('empresa ajena y rol no autorizado se rechazan',async()=>{
      await assert.rejects(()=>previsualizarImportacion(archivo('sku,nombre,unidadMedida,precioVenta\nX,X,PZA,1'), 'PRODUCTOS','CREAR',otro.id,actor));
      await assert.rejects(()=>previsualizarImportacion(archivo('sku,nombre,unidadMedida,precioVenta\nX,X,PZA,1'), 'PRODUCTOS','CREAR',tenant.id,{...actor,rol:'ADMIN',tenantId:otro.id}));
    });
    await check('XLSX se lee sin ejecutar fórmula',async()=>{
      const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Productos');sheet.addRow(['sku','nombre','unidadMedida','precioVenta']);sheet.addRow(['0009','Tuerca','PZA',3]);
      const bytes=await book.xlsx.writeBuffer();const p=await pre(new File([bytes as BlobPart],'carga.xlsx'));
      assert.equal(p.confirmable,true);assert.equal(p.muestra[0].clave,'0009');
      const bad=new ExcelJS.Workbook(),h=bad.addWorksheet('Mala');h.addRow(['sku','nombre','unidadMedida','precioVenta']);h.addRow(['10',{formula:'1+1',result:2},'PZA',3]);
      const badBytes = await bad.xlsx.writeBuffer();
      await assert.rejects(()=>pre(new File([badBytes as BlobPart],'mala.xlsx')));
    });
    await check('CSV inválido, número mal formado y fórmula se rechazan',async()=>{
      await assert.rejects(()=>pre(archivo('sku,nombre,unidadMedida,precioVenta\n"X,Producto,PZA,2')));
      const p=await pre(archivo('sku,nombre,unidadMedida,precioVenta\nX,Producto,PZA,NaN\nY,=CMD(),PZA,2\n'));
      assert.equal(p.confirmable,false);assert.equal(p.errores.length,2);
    });
    await check('stock inicial masivo usa corte, Kardex e idempotencia',async()=>{
      const almacen=await prisma.almacen.create({data:{tenantId:tenant.id,codigo:'A1',nombre:'Principal'}});
      const archivoStock=archivo('almacenCodigo,sku,cantidad\nA1,001,12.5\n');
      const p=await previsualizarStockInicial(archivoStock,tenant.id,actor);
      assert.equal(p.total,1);assert.equal(p.almacen.id,almacen.id);
      const clave=randomUUID(),result=await confirmarAjuste(p.token,clave,actor);
      assert.equal(result.repetida,false);assert.equal((await confirmarAjuste(p.token,clave,actor)).repetida,true);
      assert.equal(await prisma.movimientoKardex.count({where:{tenantId:tenant.id,almacenId:almacen.id,tipoMovimiento:'INVENTARIO_INICIAL'}}),1);
      await assert.rejects(()=>previsualizarStockInicial(archivoStock,tenant.id,actor));
    });
    console.log(`${passed} escenarios aprobados. Base temporal; demo intacta.`);
  } finally {
    await prisma.$disconnect(); if (!resolve(dir).startsWith(root+'\\') && !resolve(dir).startsWith(root+'/')) throw new Error('Fuera del workspace');
    rmSync(dir,{recursive:true,force:true});
  }
}
main().catch(e=>{console.error(e);process.exitCode=1});
