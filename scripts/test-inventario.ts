import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

async function main() {
  const root = resolve('.');
  const dir = mkdtempSync(join(root, '.test-inventario-'));
  const schema = join(dir, 'schema.prisma');
  writeFileSync(schema, readFileSync(resolve('prisma/schema.prisma'), 'utf8'));
  writeFileSync(join(dir, 'test.db'), '');
  process.env.DATABASE_URL = `file:${join(dir, 'test.db').replaceAll('\\', '/')}`;
  process.env.JWT_SECRET = 'test-only-isolated-inventory-secret-at-least32bytes';
  const { prisma } = await import('../src/lib/prisma');
  try {
    execFileSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'db', 'push', '--schema', schema, '--skip-generate'], { env: process.env, stdio: 'pipe' });
    const { NextRequest } = await import('next/server');
    const { signToken, COOKIE_NAME } = await import('../src/lib/auth');
    const { POST: ajustes } = await import('../src/app/api/inventarios/ajustes/route');
    const { POST: productosPost } = await import('../src/app/api/productos/route');
    const { POST: venta } = await import('../src/app/api/ventas/route');
    let passed=0; const check=async(name:string,fn:()=>Promise<void>)=>{await fn();passed++;console.log(`PASS ${name}`)};
    const fixture=async(stock=10)=>{
      const tenant=await prisma.tenant.create({data:{nombreComercial:'Prueba',razonSocial:'Prueba',identificacionFiscal:randomUUID()}});
      const almacen=await prisma.almacen.create({data:{tenantId:tenant.id,codigo:'A',nombre:'Almacén'}});
      const cliente=await prisma.cliente.create({data:{tenantId:tenant.id,codigo:'C',razonSocial:'Cliente'}});
      const producto=await prisma.producto.create({data:{tenantId:tenant.id,sku:'P',nombre:'Producto',costoPromedio:2,precioVenta:10}});
      if(stock)await prisma.existencia.create({data:{almacenId:almacen.id,productoId:producto.id,cantidad:stock}});
      const user=await prisma.usuario.create({data:{tenantId:tenant.id,nombre:'Admin',email:`${randomUUID()}@test.invalid`,passwordHash:'fixture',rol:'ADMIN'}});
      const token=await signToken({id:user.id,email:user.email,tenantId:tenant.id,rol:'ADMIN'});
      const request=(body:unknown,key=randomUUID())=>new NextRequest('http://test.invalid/api/inventarios/ajustes',{method:'POST',headers:{'Content-Type':'application/json',Cookie:`${COOKIE_NAME}=${token}`,'Idempotency-Key':key},body:JSON.stringify(body)});
      const previewBody={accion:'PREVISUALIZAR',almacenId:almacen.id,tipo:'CONTEO_FISICO',motivo:'CONTEO_FISICO',observaciones:'Conteo físico autorizado',items:[{productoId:producto.id,cantidadNueva:8}]};
      const preview=async(extra:Record<string,unknown>={})=>{const r=await ajustes(request({...previewBody,...extra}));assert.equal(r.status,200);return r.json()};
      const confirm=(token:string,key=randomUUID())=>ajustes(request({accion:'CONFIRMAR',token},key));
      const saldo=async()=>(await prisma.existencia.findUnique({where:{almacenId_productoId:{almacenId:almacen.id,productoId:producto.id}}}))?.cantidad??0;
      return {tenant,almacen,cliente,producto,user,request,previewBody,preview,confirm,saldo};
    };
    await check('alta de producto no permite stock inicial fuera del corte',async()=>{
      const f=await fixture();
      assert.equal((await productosPost(f.request({sku:'DIRECTO',nombre:'Directo',stockInicial:20}))).status,400);
      assert.equal(await prisma.producto.count({where:{tenantId:f.tenant.id,sku:'DIRECTO'}}),0);
      const r=await productosPost(f.request({sku:'SIN-STOCK',nombre:'Catálogo',precioVenta:12.5}));assert.equal(r.status,201);
      assert.equal(await prisma.existencia.count({where:{productoId:(await r.json()).id}}),0);
    });
    await check('previsualiza anterior, nuevo y diferencia sin escrituras',async()=>{
      const f=await fixture();const p=await f.preview();assert.deepEqual(p.partidas,[{productoId:f.producto.id,cantidadAnterior:10,cantidadNueva:8,diferencia:-2}]);
      assert.equal(await f.saldo(),10);assert.equal(await prisma.ajusteInventario.count({where:{tenantId:f.tenant.id}}),0);
    });
    await check('confirma ajuste y concilia Kardex, auditoría y stock',async()=>{
      const f=await fixture();const p=await f.preview();const r=await f.confirm(p.token);assert.equal(r.status,201);const a=await r.json();
      assert.equal(await f.saldo(),8);assert.equal(a.items[0].cantidadAnterior,10);assert.equal(a.items[0].cantidadAjustada,-2);
      assert.equal(await prisma.movimientoKardex.count({where:{folioReferencia:a.folio}}),1);
      assert.equal(await prisma.registroAuditoria.count({where:{tenantId:f.tenant.id,accion:'AJUSTE_STOCK'}}),1);
    });
    await check('reintento de la misma confirmación no duplica',async()=>{
      const f=await fixture();const p=await f.preview(),key=randomUUID();const first=await f.confirm(p.token,key);const a=await first.json();
      const second=await f.confirm(p.token,key);assert.equal(second.status,200);assert.equal(second.headers.get('Idempotency-Replayed'),'true');
      assert.equal((await second.json()).id,a.id);assert.equal(await f.saldo(),8);
    });
    await check('mismo token con otra clave o nueva vista obsoleta no reaplica',async()=>{
      const f=await fixture(),p=await f.preview();await f.confirm(p.token);assert.equal((await f.confirm(p.token)).status,409);
      const q=await f.preview({items:[{productoId:f.producto.id,cantidadNueva:7}]});const key=randomUUID();
      assert.equal((await f.confirm(q.token,key)).status,201);assert.equal((await f.confirm(p.token,key)).status,409);
    });
    await check('stock cambiado por venta impide aplicar conteo obsoleto',async()=>{
      const f=await fixture(),p=await f.preview();const token=f.request({clienteId:f.cliente.id,almacenId:f.almacen.id,tipoPago:'CONTADO',items:[{productoId:f.producto.id,cantidad:1,precioUnitario:10}]});
      const result=await venta(token);assert.equal(result.status,201);assert.equal((await f.confirm(p.token)).status,409);assert.equal(await f.saldo(),9);
    });
    await check('confirmaciones concurrentes de mismo corte aplican una sola vez',async()=>{
      const f=await fixture(),p=await f.preview(),key=randomUUID();const r=await Promise.all([f.confirm(p.token,key),f.confirm(p.token,key)]);
      assert.ok(r.every(x=>[200,201,409].includes(x.status)));assert.equal(await f.saldo(),8);
      assert.equal(await prisma.ajusteInventario.count({where:{tenantId:f.tenant.id}}),1);
    });
    await check('producto y almacén ajenos no se previsualizan',async()=>{
      const a=await fixture(),b=await fixture();assert.equal((await ajustes(a.request({...a.previewBody,almacenId:b.almacen.id}))).status,404);
      assert.equal((await ajustes(a.request({...a.previewBody,items:[{productoId:b.producto.id,cantidadNueva:1}]}))).status,404);
    });
    await check('rechaza NaN serializado, negativos, decimales excesivos y duplicados',async()=>{
      const f=await fixture();for(const v of [-1,null,'9',1.0000001,1e12])assert.equal((await ajustes(f.request({...f.previewBody,items:[{productoId:f.producto.id,cantidadNueva:v}]}))).status,400);
      assert.equal((await ajustes(f.request({...f.previewBody,items:[f.previewBody.items[0],f.previewBody.items[0]]}))).status,400);
    });
    await check('almacenista solo ajusta almacén asignado; encargado no ajusta',async()=>{
      const f=await fixture();await prisma.usuario.update({where:{id:f.user.id},data:{rol:'ALMACENISTA'}});
      assert.equal((await ajustes(f.request(f.previewBody))).status,403);
      await prisma.usuario.update({where:{id:f.user.id},data:{almacenAsignadoId:f.almacen.id}});assert.equal((await ajustes(f.request(f.previewBody))).status,200);
      await prisma.usuario.update({where:{id:f.user.id},data:{rol:'ENCARGADO'}});assert.equal((await ajustes(f.request(f.previewBody))).status,403);
    });
    await check('corte inicial solo en almacén virgen y no se repite',async()=>{
      const f=await fixture(0);const init={tipo:'INVENTARIO_INICIAL',motivo:'INVENTARIO_INICIAL',items:[{productoId:f.producto.id,cantidadNueva:50}]};
      const p=await f.preview(init);assert.equal((await f.confirm(p.token)).status,201);assert.equal(await f.saldo(),50);
      assert.equal((await ajustes(f.request({...f.previewBody,...init}))).status,409);
    });
    await check('corte inicial bloquea almacén con movimientos o stock preexistente',async()=>{
      const f=await fixture();assert.equal((await ajustes(f.request({...f.previewBody,tipo:'INVENTARIO_INICIAL',motivo:'INVENTARIO_INICIAL'}))).status,409);
    });
    await check('token alterado u otra empresa no aplica corte',async()=>{
      const a=await fixture(),b=await fixture(),p=await b.preview();assert.equal((await a.confirm(p.token)).status,404);
      assert.equal((await b.confirm(p.token.slice(0,-1)+'x')).status,400);assert.equal(await b.saldo(),10);
    });
    await check('diferencias de varias partidas se revierten juntas',async()=>{
      const f=await fixture(),other=await prisma.producto.create({data:{tenantId:f.tenant.id,sku:'P2',nombre:'Segundo',costoPromedio:1}});
      await prisma.existencia.create({data:{almacenId:f.almacen.id,productoId:other.id,cantidad:5}});
      const p=await f.preview({items:[{productoId:f.producto.id,cantidadNueva:8},{productoId:other.id,cantidadNueva:4}]});
      await prisma.existencia.update({where:{almacenId_productoId:{almacenId:f.almacen.id,productoId:other.id}},data:{cantidad:3}});
      assert.equal((await f.confirm(p.token)).status,409);assert.equal(await f.saldo(),10);
      assert.equal(await prisma.ajusteInventario.count({where:{tenantId:f.tenant.id}}),0);
    });
    await check('diferencia cero conserva evidencia sin movimiento Kardex artificial',async()=>{
      const f=await fixture(),p=await f.preview({items:[{productoId:f.producto.id,cantidadNueva:10}]});const a=await(await f.confirm(p.token)).json();
      assert.equal(a.items[0].cantidadAjustada,0);assert.equal(await prisma.movimientoKardex.count({where:{folioReferencia:a.folio}}),0);
    });
    console.log(`${passed} escenarios aprobados. Base temporal; demo intacta.`);
  } finally {
    await prisma.$disconnect();
    if (!resolve(dir).startsWith(root + '\\') && !resolve(dir).startsWith(root + '/')) throw new Error('Directorio de pruebas fuera de alcance');
    rmSync(dir, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
