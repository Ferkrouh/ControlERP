import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { RolUsuario } from '../src/lib/types';

async function main(){
  const root=resolve('.'),dir=mkdtempSync(join(root,'.test-catalogos-'));const schema=join(dir,'schema.prisma');
  writeFileSync(schema,readFileSync(resolve('prisma/schema.prisma'),'utf8'));writeFileSync(join(dir,'test.db'),'');
  process.env.DATABASE_URL=`file:${join(dir,'test.db').replaceAll('\\','/')}`;process.env.JWT_SECRET='test-only-catalogos-secret-at-least32bytes';
  const {prisma}=await import('../src/lib/prisma');
  try{
    execFileSync(process.execPath,[resolve('node_modules/prisma/build/index.js'),'db','push','--schema',schema,'--skip-generate'],{env:process.env,stdio:'pipe'});
    const {NextRequest}=await import('next/server');const {signToken,COOKIE_NAME}=await import('../src/lib/auth');
    const {POST:productoPost}=await import('../src/app/api/productos/route');
    const {POST:proveedorPost}=await import('../src/app/api/proveedores/route');
    const {POST:clientePost,PATCH:clientePatch}=await import('../src/app/api/clientes/route');
    const {GET:ventaGet}=await import('../src/app/api/ventas/[id]/route');
    const {GET:ventaPdf}=await import('../src/app/api/ventas/[id]/pdf/route');
    const {GET:cotPdf}=await import('../src/app/api/cotizaciones/[id]/pdf/route');
    const {GET:traspasoPdf}=await import('../src/app/api/traspasos/[id]/pdf/route');
    const {construirCsv}=await import('../src/lib/csv-seguro');
    let passed=0;const check=async(name:string,fn:()=>Promise<void>)=>{await fn();passed++;console.log(`PASS ${name}`)};
    const tenant=await prisma.tenant.create({data:{nombreComercial:'A',razonSocial:'A',identificacionFiscal:randomUUID()}});
    const otro=await prisma.tenant.create({data:{nombreComercial:'B',razonSocial:'B',identificacionFiscal:randomUUID()}});
    const almacen=await prisma.almacen.create({data:{tenantId:tenant.id,codigo:'A1',nombre:'Principal'}});
    const aislado=await prisma.almacen.create({data:{tenantId:tenant.id,codigo:'A2',nombre:'Otro'}});
    const destino=await prisma.almacen.create({data:{tenantId:tenant.id,codigo:'A3',nombre:'Destino'}});
    const cliente=await prisma.cliente.create({data:{tenantId:tenant.id,codigo:'C1',razonSocial:'Cliente'}});
    const producto=await prisma.producto.create({data:{tenantId:tenant.id,sku:'P1',nombre:'Producto',costoPromedio:4,precioVenta:10}});
    const venta=await prisma.venta.create({data:{tenantId:tenant.id,clienteId:cliente.id,almacenId:almacen.id,folio:'V1',subtotal:10,impuestos:1.6,total:11.6,usuarioId:'demo',usuarioNombre:'Operador',
      detalles:{create:{productoId:producto.id,cantidad:1,precioUnitario:10,costoUnitario:4,subtotal:10}}}});
    const cot=await prisma.cotizacion.create({data:{tenantId:tenant.id,clienteId:cliente.id,folio:'COT1',fechaVencimiento:new Date(Date.now()+86400000),subtotal:10,impuestos:1.6,total:11.6,usuarioId:'demo',usuarioNombre:'Operador',
      detalles:{create:{productoId:producto.id,cantidad:1,precioUnitario:10,subtotal:10}}}});
    const traspaso=await prisma.traspaso.create({data:{tenantId:tenant.id,folio:'TRA1',almacenOrigenId:almacen.id,almacenDestinoId:destino.id,
      items:{create:{productoId:producto.id,cantidadEnviada:2,cantidadRecibida:1}}}});
    const admin=await prisma.usuario.create({data:{tenantId:tenant.id,nombre:'Admin',email:`${randomUUID()}@test.invalid`,passwordHash:'fixture',rol:'ADMIN'}});
    const encargado=await prisma.usuario.create({data:{tenantId:tenant.id,nombre:'Encargado',email:`${randomUUID()}@test.invalid`,passwordHash:'fixture',rol:'ENCARGADO'}});
    const almacenista=await prisma.usuario.create({data:{tenantId:tenant.id,nombre:'Almacén',email:`${randomUUID()}@test.invalid`,passwordHash:'fixture',rol:'ALMACENISTA',almacenAsignadoId:aislado.id}});
    const token=async(user:typeof admin)=>signToken({id:user.id,email:user.email,tenantId:user.tenantId,rol:user.rol as RolUsuario});
    const req=async(user:typeof admin|undefined,method:string,body?:unknown,url='http://test.invalid/api')=>new NextRequest(url,{method,
      headers:{...(user?{Cookie:`${COOKIE_NAME}=${await token(user)}`}:{}),...(body?{'Content-Type':'application/json'}:{})},
      ...(body?{body:JSON.stringify(body)}:{})});
    await check('producto rechaza montos inválidos y no crea stock',async()=>{
      assert.equal((await productoPost(await req(admin,'POST',{sku:'X1',nombre:'Producto',precioVenta:-1}))).status,400);
      assert.equal((await productoPost(await req(admin,'POST',{sku:'X1',nombre:'Producto',stockInicial:3}))).status,400);
      const r=await productoPost(await req(admin,'POST',{sku:'X1',nombre:'Producto',precioVenta:12.5}));assert.equal(r.status,201);
      assert.equal(await prisma.existencia.count({where:{productoId:(await r.json()).id}}),0);
    });
    await check('proveedor genera código único y registra auditoría',async()=>{
      const r=await proveedorPost(await req(admin,'POST',{razonSocial:'Proveedor',email:''}));assert.equal(r.status,201);
      const p=await r.json();assert.match(p.codigo,/^PRV-/);
      assert.equal((await proveedorPost(await req(admin,'POST',{codigo:p.codigo,razonSocial:'Duplicado'}))).status,409);
      assert.equal(await prisma.registroAuditoria.count({where:{tenantId:tenant.id,modulo:'PROVEEDORES'}}),1);
    });
    await check('encargado crea cliente sin crédito pero no define límite',async()=>{
      assert.equal((await clientePost(await req(encargado,'POST',{razonSocial:'Con crédito',limiteCredito:100}))).status,403);
      const r=await clientePost(await req(encargado,'POST',{razonSocial:'Sin crédito',email:''}));assert.equal(r.status,201);
      assert.equal((await r.json()).limiteCredito,0);
    });
    await check('edición de crédito valida rol, número y deja auditoría atómica',async()=>{
      assert.equal((await clientePatch(await req(encargado,'PATCH',{id:cliente.id,limiteCredito:100}))).status,403);
      assert.equal((await clientePatch(await req(admin,'PATCH',{id:cliente.id,limiteCredito:-1}))).status,400);
      const r=await clientePatch(await req(admin,'PATCH',{id:cliente.id,limiteCredito:100}));assert.equal(r.status,200);
      assert.equal((await prisma.cliente.findUniqueOrThrow({where:{id:cliente.id}})).limiteCredito,100);
      assert.equal(await prisma.registroAuditoria.count({where:{tenantId:tenant.id,modulo:'CREDITO',accion:'EDITAR'}}),1);
    });
    await check('venta y PDFs comerciales niegan costo a almacenista',async()=>{
      const c={params:Promise.resolve({id:venta.id})};assert.equal((await ventaGet(await req(almacenista,'GET'),c)).status,403);
      assert.equal((await ventaPdf(await req(almacenista,'GET'),c)).status,403);
      assert.equal((await cotPdf(await req(almacenista,'GET'),{params:Promise.resolve({id:cot.id})})).status,403);
    });
    await check('guía de traspaso limita almacén y tenant',async()=>{
      const c={params:Promise.resolve({id:traspaso.id})};assert.equal((await traspasoPdf(await req(almacenista,'GET'),c)).status,403);
      await prisma.usuario.update({where:{id:almacenista.id},data:{almacenAsignadoId:almacen.id}});
      const r=await traspasoPdf(await req(almacenista,'GET'),c);assert.equal(r.status,200);assert.equal(r.headers.get('Content-Type'),'application/pdf');
      const otherAdmin=await prisma.usuario.create({data:{tenantId:otro.id,nombre:'Otro',email:`${randomUUID()}@test.invalid`,passwordHash:'fixture',rol:'ADMIN'}});
      assert.equal((await traspasoPdf(await req(otherAdmin,'GET'),c)).status,403);
    });
    await check('descargables requieren sesión',async()=>{
      assert.equal((await ventaPdf(await req(undefined,'GET'),{params:Promise.resolve({id:venta.id})})).status,401);
    });
    await check('CSV neutraliza fórmulas, comillas y saltos sin perder códigos',async()=>{
      const csv=construirCsv([['Código','Nombre'],['0001','=HYPERLINK("x")'],['0002','A,"B"\nC']]);
      assert.ok(csv.includes('"0001","\'=HYPERLINK(""x"")"'));
      assert.ok(csv.includes('"0002","A,""B""\nC"'));
    });
    console.log(`${passed} escenarios aprobados. Base temporal; demo intacta.`);
  }finally{await prisma.$disconnect();if(!resolve(dir).startsWith(root+'\\')&&!resolve(dir).startsWith(root+'/'))throw new Error('Fuera del workspace');rmSync(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1});
