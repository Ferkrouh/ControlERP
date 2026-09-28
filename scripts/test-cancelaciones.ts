import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

async function main() {
  const root = resolve('.');
  const dir = mkdtempSync(join(root, '.test-cancelaciones-'));
  const schema = join(dir, 'schema.prisma');
  writeFileSync(schema, readFileSync(resolve('prisma/schema.prisma'), 'utf8'));
  writeFileSync(join(dir, 'test.db'), '');
  process.env.DATABASE_URL = `file:${join(dir, 'test.db').replaceAll('\\', '/')}`;
  process.env.JWT_SECRET = 'test-only-isolated-cancellations-secret-at-least32bytes';
  const { prisma } = await import('../src/lib/prisma');
  try {
    execFileSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'db', 'push', '--schema', schema, '--skip-generate'], { env: process.env, stdio: 'pipe' });
    const { NextRequest } = await import('next/server');
    const { signToken, COOKIE_NAME } = await import('../src/lib/auth');
    const { POST: emitir, GET: listadoVentas } = await import('../src/app/api/ventas/route');
    const { GET, PUT, DELETE } = await import('../src/app/api/ventas/[id]/route');
    const { POST: abono } = await import('../src/app/api/cxc/[id]/abono/route');
    const { POST: caja } = await import('../src/app/api/pos/turno/route');
    const { GET: balanza } = await import('../src/app/api/reportes/balanza-cxc/route');
    const { GET: pdfVenta } = await import('../src/app/api/ventas/[id]/pdf/route');
    const { GET: mensual } = await import('../src/app/api/reportes/mensual/route');
    const { GET: notas } = await import('../src/app/api/reportes/notas-credito/route');
    let passed = 0;
    const check = async (name: string, fn: () => Promise<void>) => { await fn(); passed++; console.log(`PASS ${name}`); };
    const fixture = async () => {
      const tenant = await prisma.tenant.create({ data: { nombreComercial: 'Prueba', razonSocial: 'Prueba', identificacionFiscal: randomUUID() } });
      const almacen = await prisma.almacen.create({ data: { tenantId: tenant.id, codigo: 'A', nombre: 'Almacén' } });
      const cliente = await prisma.cliente.create({ data: { tenantId: tenant.id, codigo: 'C', razonSocial: 'Cliente', limiteCredito: 1000, diasCredito: 0 } });
      const producto = await prisma.producto.create({ data: { tenantId: tenant.id, sku: 'P', nombre: 'Producto', costoPromedio: 2 } });
      await prisma.existencia.create({ data: { almacenId: almacen.id, productoId: producto.id, cantidad: 10 } });
      const user = await prisma.usuario.create({ data: { tenantId: tenant.id, nombre: 'Admin', email: `${randomUUID()}@test.invalid`, passwordHash: 'fixture', rol: 'ADMIN' } });
      const token = await signToken({ id: user.id, email: user.email, tenantId: tenant.id, rol: 'ADMIN' });
      const request = (body: unknown, method = 'POST', key = randomUUID()) => new NextRequest('http://test.invalid/api/ventas', { method,
        headers: { 'Content-Type': 'application/json', Cookie: `${COOKIE_NAME}=${token}`, 'Idempotency-Key': key },
        ...(method === 'GET' ? {} : { body: JSON.stringify(body) }) });
      const saleBody = { clienteId: cliente.id, almacenId: almacen.id, tipoPago: 'CONTADO', items: [{ productoId: producto.id, cantidad: 2, precioUnitario: 10 }] };
      const sale = async (extra: Record<string, unknown> = {}) => {const r=await emitir(request({ ...saleBody, ...extra }));assert.equal(r.status,201);return r.json();};
      const ctx=(id:string)=>({params:Promise.resolve({id})});
      const cancel=(id:string,motivo='Error de captura confirmado',method='DELETE')=>DELETE(request({motivo},method),ctx(id));
      const stock=async()=> (await prisma.existencia.findUniqueOrThrow({where:{almacenId_productoId:{almacenId:almacen.id,productoId:producto.id}}})).cantidad;
      const saldo=async()=> (await prisma.cliente.findUniqueOrThrow({where:{id:cliente.id}})).saldoActual;
      return { tenant,almacen,cliente,producto,user,request,saleBody,sale,ctx,cancel,stock,saldo };
    };
    await check('cancelación contado conserva historial y reintegra stock una vez',async()=>{
      const f=await fixture(),v=await f.sale();assert.equal(await f.stock(),8);const res=await f.cancel(v.id);assert.equal(res.status,200);
      const actual=await prisma.venta.findUniqueOrThrow({where:{id:v.id},include:{detalles:true}});
      assert.equal(actual.estado,'CANCELADA');assert.equal(actual.detalles.length,1);assert.equal(actual.motivoCancelacion,'Error de captura confirmado');assert.equal(await f.stock(),10);
      assert.equal(await prisma.movimientoKardex.count({where:{folioReferencia:v.folio}}),2);
      assert.equal(await prisma.registroAuditoria.count({where:{tenantId:f.tenant.id,accion:'CANCELACION'}}),1);
    });
    await check('reintento idéntico no vuelve a reintegrar stock',async()=>{
      const f=await fixture(),v=await f.sale();await f.cancel(v.id);const res=await f.cancel(v.id);assert.equal(res.status,200);
      assert.equal(res.headers.get('Idempotency-Replayed'),'true');assert.equal(await f.stock(),10);
      assert.equal(await prisma.movimientoKardex.count({where:{folioReferencia:v.folio}}),2);
      assert.equal((await f.cancel(v.id,'Otro motivo diferente')).status,409);
    });
    await check('concurrencia de cancelaciones produce una sola reversa',async()=>{
      const f=await fixture(),v=await f.sale();const r=await Promise.all([f.cancel(v.id),f.cancel(v.id)]);
      assert.ok(r.every(x=>[200,409].includes(x.status)));assert.equal(await f.stock(),10);
      assert.equal(await prisma.movimientoKardex.count({where:{folioReferencia:v.folio,tipoMovimiento:'ENTRADA_CANCELACION_VENTA'}}),1);
    });
    await check('crédito sin pagos conserva CxC cancelada y saldo cliente',async()=>{
      const f=await fixture(),v=await f.sale({tipoPago:'CREDITO'});assert.equal(await f.saldo(),23.2);
      const res=await f.cancel(v.id);assert.equal(res.status,200);assert.equal(await f.saldo(),0);assert.equal(await f.stock(),10);
      const c=await prisma.cuentaPorCobrar.findUniqueOrThrow({where:{id:v.cxcId}});assert.equal(c.estado,'CANCELADA');assert.equal(c.saldoPendiente,0);
      assert.equal(c.montoTotal,23.2);assert.equal(await prisma.pagoCxC.count({where:{cxcId:c.id}}),0);
    });
    await check('CxC con abono impide cancelación y conserva pago',async()=>{
      const f=await fixture(),v=await f.sale({tipoPago:'CREDITO'});const pago=await abono(f.request({monto:5,metodo:'EFECTIVO'},'POST'),f.ctx(v.cxcId));assert.equal(pago.status,200);
      assert.equal((await f.cancel(v.id)).status,409);assert.equal(await f.stock(),8);assert.equal(await f.saldo(),18.2);
      assert.equal(await prisma.pagoCxC.count({where:{cxcId:v.cxcId}}),1);assert.equal((await prisma.venta.findUniqueOrThrow({where:{id:v.id}})).estado,'COMPLETADA');
    });
    await check('cobro simultáneo con cancelación nunca pierde pago',async()=>{
      const f=await fixture(),v=await f.sale({tipoPago:'CREDITO'});
      const r=await Promise.all([f.cancel(v.id),abono(f.request({monto:5,metodo:'EFECTIVO'},'POST'),f.ctx(v.cxcId))]);
      assert.ok(r.every(x=>[200,409].includes(x.status)));const c=await prisma.cuentaPorCobrar.findUniqueOrThrow({where:{id:v.cxcId},include:{pagos:true}});
      if(c.pagos.length){assert.equal(r[0].status,409);assert.equal(c.estado,'PARCIAL');assert.equal(await f.stock(),8);assert.equal(await f.saldo(),18.2);}
      else {assert.equal(c.estado,'CANCELADA');assert.equal(await f.stock(),10);assert.equal(await f.saldo(),0);}
    });
    await check('cancelación contra nueva venta conserva stock',async()=>{
      const f=await fixture(),v=await f.sale(),key=randomUUID();const results=await Promise.all([f.cancel(v.id),emitir(f.request(f.saleBody,'POST',key))]);
      assert.equal(results[0].status,200);if(results[1].status===409)assert.ok([200,201].includes((await emitir(f.request(f.saleBody,'POST',key))).status));
      assert.equal(await f.stock(),8);
      const kardex=await prisma.movimientoKardex.findMany({where:{tenantId:f.tenant.id,productoId:f.producto.id},orderBy:{fecha:'asc'}});
      assert.equal(kardex.length,3);
    });
    await check('si falta existencia se crea entrada sin saldo incorrecto',async()=>{
      const f=await fixture(),v=await f.sale();await prisma.existencia.deleteMany({where:{almacenId:f.almacen.id,productoId:f.producto.id}});
      assert.equal((await f.cancel(v.id)).status,200);assert.equal(await f.stock(),2);
    });
    await check('rechaza venta fiscal timbrada y venta POS',async()=>{
      const f=await fixture(),v=await f.sale();await prisma.venta.update({where:{id:v.id},data:{estadoFiscal:'TIMBRADA',uuidFiscal:randomUUID()}});
      assert.equal((await f.cancel(v.id)).status,409);assert.equal(await f.stock(),8);
      const w=await f.sale();await prisma.venta.update({where:{id:w.id},data:{turnoCajaId:randomUUID()}});
      assert.equal((await f.cancel(w.id)).status,409);assert.equal(await f.stock(),6);
    });
    await check('bloqueo de crédito no se reactiva y estado histórico queda',async()=>{
      const f=await fixture(),v=await f.sale({tipoPago:'CREDITO'});await prisma.cliente.update({where:{id:f.cliente.id},data:{estadoCredito:'BLOQUEADO'}});
      assert.equal((await f.cancel(v.id)).status,200);const cliente=await prisma.cliente.findUniqueOrThrow({where:{id:f.cliente.id}});
      assert.equal(cliente.estadoCredito,'BLOQUEADO');assert.equal(cliente.saldoActual,0);
    });
    await check('tenant ajeno y roles sin permiso no cancelan',async()=>{
      const a=await fixture(),b=await fixture(),v=await b.sale();assert.equal((await a.cancel(v.id)).status,404);
      assert.equal((await GET(a.request(undefined,'GET'),a.ctx(v.id))).status,404);
      for(const rol of ['ENCARGADO','AUDITOR','ALMACENISTA']){await prisma.usuario.update({where:{id:b.user.id},data:{rol}});assert.equal((await b.cancel(v.id)).status,403);}
      assert.equal(await b.stock(),8);
    });
    await check('motivo obligatorio y específico',async()=>{
      const f=await fixture(),v=await f.sale();for(const motivo of ['', 'corto', ' '.repeat(20)])assert.equal((await f.cancel(v.id,motivo)).status,400);
      assert.equal((await f.cancel(v.id)).status,200);
    });
    await check('PUT solo permite observaciones y audita',async()=>{
      const f=await fixture(),v=await f.sale({tipoPago:'CREDITO'});
      assert.equal((await PUT(f.request({observaciones:'Cambio',tipoPago:'CONTADO'}),f.ctx(v.id))).status,409);
      assert.equal((await PUT(f.request({tipoPago:'CREDITO'}),f.ctx(v.id))).status,400);
      const res=await PUT(f.request({observaciones:'Nota interna',tipoPago:'CREDITO'}),f.ctx(v.id));assert.equal(res.status,200);
      assert.equal((await res.json()).observaciones,'Nota interna');assert.equal((await prisma.cuentaPorCobrar.findUniqueOrThrow({where:{id:v.cxcId}})).saldoPendiente,23.2);
      assert.equal(await prisma.registroAuditoria.count({where:{tenantId:f.tenant.id,accion:'MODIFICACION'}}),1);
      assert.equal((await f.cancel(v.id)).status,200);assert.equal((await PUT(f.request({observaciones:'Posterior'}),f.ctx(v.id))).status,409);
    });
    await check('reportes y listado separan venta cancelada',async()=>{
      const f=await fixture(),v=await f.sale();await f.cancel(v.id);
      const list=await listadoVentas(f.request(undefined,'GET'));assert.equal((await list.json()).find((x:any)=>x.id===v.id).estado,'CANCELADA');
      const q='?mes='+String(new Date().getUTCMonth()+1).padStart(2,'0')+'&anio='+new Date().getUTCFullYear();
      const req=new NextRequest('http://test.invalid/api/reportes/mensual'+q,{headers:{Cookie:f.request(undefined,'GET').headers.get('Cookie')!}});
      const m=await mensual(req),n=await notas(req);assert.equal(m.status,200);assert.equal(n.status,200);
      assert.equal((await m.json()).totalVendido,0);assert.equal((await n.json()).rows.some((r:any)=>r.ventaId===v.id),true);
    });
    await check('PDF de venta cancelada no se emite como comprobante vigente',async()=>{
      const f=await fixture(),v=await f.sale();await f.cancel(v.id);
      assert.equal((await pdfVenta(f.request(undefined,'GET'),f.ctx(v.id))).status,409);
    });
    await check('venta POS real conserva turno y bloquea cancelación', async () => {
      const f=await fixture();const opened=await caja(f.request({accion:'ABRIR',almacenId:f.almacen.id,montoApertura:100}));assert.equal(opened.status,201);
      const turno=(await opened.json()).turno;const r=await emitir(f.request({...f.saleBody,pos:{turnoId:turno.id,metodo:'EFECTIVO',recibido:30}}));
      assert.equal(r.status,201);const v=await r.json();assert.equal(v.turnoCajaId,turno.id);
      assert.equal((await f.cancel(v.id)).status,409);assert.equal(await f.stock(),8);
      assert.equal((await prisma.turnoCajaPOS.findUniqueOrThrow({where:{id:turno.id}})).totalVentas,23.2);
    });
    await check('balanza excluye CxC cancelada y conserva documento en historial', async () => {
      const f=await fixture(),v=await f.sale({tipoPago:'CREDITO'});await f.cancel(v.id);
      const q='?mes='+String(new Date().getUTCMonth()+1).padStart(2,'0')+'&anio='+new Date().getUTCFullYear();
      const req=new NextRequest('http://test.invalid/api/reportes/balanza-cxc'+q,{headers:{Cookie:f.request(undefined,'GET').headers.get('Cookie')!}});
      const res=await balanza(req);assert.equal(res.status,200);const data=await res.json();
      assert.equal(JSON.stringify(data).includes(v.cxcId),false);
      assert.equal((await prisma.cuentaPorCobrar.findUniqueOrThrow({where:{id:v.cxcId}})).estado,'CANCELADA');
    });
    await check('cancelación conserva referencia desde cotización e idempotencia de venta', async () => {
      const f=await fixture(),key=randomUUID();const issued=await emitir(f.request(f.saleBody,'POST',key));const v=await issued.json();
      await f.cancel(v.id);const replay=await emitir(f.request(f.saleBody,'POST',key));assert.equal(replay.status,200);
      assert.equal((await replay.json()).id,v.id);assert.equal(await f.stock(),10);
    });
    await check('falla de Kárdex revierte estado, saldo, stock y CxC',async()=>{
      const f=await fixture(),v=await f.sale({tipoPago:'CREDITO'});
      await prisma.$executeRawUnsafe(`CREATE TRIGGER fail_cancel BEFORE INSERT ON MovimientoKardex WHEN NEW.tipoMovimiento = 'ENTRADA_CANCELACION_VENTA' BEGIN SELECT RAISE(ABORT,'test'); END`);
      try {assert.equal((await f.cancel(v.id)).status,500);assert.equal(await f.stock(),8);assert.equal(await f.saldo(),23.2);
        assert.equal((await prisma.venta.findUniqueOrThrow({where:{id:v.id}})).estado,'COMPLETADA');
        assert.equal((await prisma.cuentaPorCobrar.findUniqueOrThrow({where:{id:v.cxcId}})).saldoPendiente,23.2);
      } finally {await prisma.$executeRawUnsafe('DROP TRIGGER fail_cancel');}
    });
    await check('CxC histórica inconsistente impide reversa silenciosa',async()=>{
      const f=await fixture(),v=await f.sale({tipoPago:'CREDITO'});await prisma.cuentaPorCobrar.update({where:{id:v.cxcId},data:{saldoPendiente:1}});
      assert.equal((await f.cancel(v.id)).status,409);assert.equal(await f.stock(),8);assert.equal(await f.saldo(),23.2);
      assert.equal((await prisma.venta.findUniqueOrThrow({where:{id:v.id}})).estado,'COMPLETADA');
    });
    await check('edición concurrente y cancelación respetan estado final',async()=>{
      const f=await fixture(),v=await f.sale();const r=await Promise.all([f.cancel(v.id),PUT(f.request({observaciones:'Revisado'}),f.ctx(v.id))]);
      assert.equal(r[0].status,200);assert.ok([200,409].includes(r[1].status));assert.equal((await prisma.venta.findUniqueOrThrow({where:{id:v.id}})).estado,'CANCELADA');
      assert.equal(await f.stock(),10);
    });
    await check('ventas POS anteriores se detectan por auditoría de turno',async()=>{
      const f=await fixture(),v=await f.sale();const audit=await prisma.registroAuditoria.findFirstOrThrow({where:{tenantId:f.tenant.id,modulo:'VENTAS',accion:'VENTA'}});
      await prisma.registroAuditoria.update({where:{id:audit.id},data:{detalles:audit.detalles+', turno LEGACY'}});
      assert.equal((await f.cancel(v.id)).status,409);assert.equal(await f.stock(),8);
    });
    console.log(`${passed} escenarios aprobados. Base temporal; demo intacta.`);
  } finally {
    await prisma.$disconnect();
    if (!resolve(dir).startsWith(root + '\\') && !resolve(dir).startsWith(root + '/')) throw new Error('Directorio de pruebas fuera de alcance');
    rmSync(dir, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
