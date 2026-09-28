import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

async function main() {
  const root = resolve('.'); const dir = mkdtempSync(join(root, '.test-cobranza-'));
  const schema = join(dir, 'schema.prisma'); writeFileSync(schema, readFileSync(resolve('prisma/schema.prisma'), 'utf8'));
  writeFileSync(join(dir, 'test.db'), '');
  process.env.DATABASE_URL = `file:${join(dir, 'test.db').replaceAll('\\', '/')}`;
  process.env.JWT_SECRET = 'test-only-isolated-collections-secret-at-least32bytes';
  const { prisma } = await import('../src/lib/prisma');
  try {
    execFileSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'db', 'push', '--schema', schema, '--skip-generate'], { env: process.env, stdio: 'pipe' });
    const { NextRequest } = await import('next/server');
    const { signToken, COOKIE_NAME } = await import('../src/lib/auth-token');
    const { POST: cargo, GET: listado } = await import('../src/app/api/cxc/route');
    const { GET: recibo } = await import('../src/app/api/cxc/[id]/rep/pdf/route');
    const { POST: venta } = await import('../src/app/api/ventas/route');
    const { POST: abono } = await import('../src/app/api/cxc/[id]/abono/route');
    let passed = 0;
    const check = async (name: string, fn: () => Promise<void>) => { await fn(); passed++; console.log(`PASS ${name}`); };
    const fixture = async () => {
      const tenant = await prisma.tenant.create({ data: { nombreComercial: 'Prueba', razonSocial: 'Prueba', identificacionFiscal: randomUUID() } });
      const cliente = await prisma.cliente.create({ data: { tenantId: tenant.id, codigo: 'C', razonSocial: 'Cliente', limiteCredito: 1000, diasCredito: 0 } });
      const user = await prisma.usuario.create({ data: { tenantId: tenant.id, nombre: 'Admin', email: `${randomUUID()}@test.invalid`, passwordHash: 'fixture', rol: 'ADMIN' } });
      const token = await signToken({ id: user.id, email: user.email, tenantId: tenant.id, rol: 'ADMIN' });
      const request = (body?: unknown, key: string = randomUUID(), method = 'POST') => new NextRequest('http://test.invalid/api/cxc', { method,
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key, Cookie: `${COOKIE_NAME}=${token}` },
        ...(method === 'GET' ? {} : { body: JSON.stringify(body) }) });
      const doc = async (montoTotal = 100) => {
        const res = await cargo(request({ clienteId: cliente.id, montoTotal })); assert.equal(res.status, 201); return res.json();
      };
      const pay = (id: string, monto = 30, key = randomUUID(), extra = {}) => abono(request({ monto, metodo: 'TRANSFERENCIA', referencia: 'SPEI', ...extra }, key), { params: Promise.resolve({ id }) });
      const saldo = async () => (await prisma.cliente.findUniqueOrThrow({ where: { id: cliente.id } })).saldoActual;
      const reconcile = async (id: string) => {
        const d = await prisma.cuentaPorCobrar.findUniqueOrThrow({ where: { id }, include: { pagos: true } });
        assert.equal(Math.round((d.pagos.reduce((s,p) => s+p.monto,0) + d.saldoPendiente)*100), Math.round(d.montoTotal*100)); return d;
      };
      return { tenant, cliente, user, request, doc, pay, saldo, reconcile };
    };
    await check('abono parcial y total concilian documento, cliente y auditoría', async () => {
      const f = await fixture(), d = await f.doc(); const res = await f.pay(d.id); assert.equal(res.status,200);
      assert.equal((await res.json()).nuevoSaldoPendiente,70); assert.equal(await f.saldo(),70); assert.equal((await f.reconcile(d.id)).estado,'PARCIAL');
      assert.equal((await f.pay(d.id,70)).status,200); assert.equal(await f.saldo(),0); assert.equal((await f.reconcile(d.id)).estado,'PAGADA');
      assert.equal(await prisma.registroAuditoria.count({where:{tenantId:f.tenant.id,accion:'ABONO'}}),2);
    });
    await check('reintento de abono y respuesta perdida no duplican', async () => {
      const f=await fixture(),d=await f.doc(),key=randomUUID(); const first=await f.pay(d.id,100,key); const result=await first.json();
      const replay=await f.pay(d.id,100,key); assert.equal(replay.status,200); assert.equal(replay.headers.get('Idempotency-Replayed'),'true');
      assert.equal((await replay.json()).pago.id,result.pago.id); assert.equal((await f.reconcile(d.id)).pagos.length,1); assert.equal(await f.saldo(),0);
    });
    await check('misma clave con monto o documento diferente se rechaza', async () => {
      const f=await fixture(),a=await f.doc(),b=await f.doc(),key=randomUUID(); await f.pay(a.id,30,key);
      assert.equal((await f.pay(a.id,31,key)).status,409); assert.equal((await f.pay(b.id,30,key)).status,409); assert.equal(await f.saldo(),170);
    });
    await check('abonos concurrentes al mismo documento no sobrepagan', async () => {
      const f=await fixture(),d=await f.doc(); const res=await Promise.all([f.pay(d.id,80),f.pay(d.id,80)]);
      assert.equal(res.filter(r=>r.status===200).length,1); assert.equal(res.filter(r=>r.status===409).length,1);
      assert.equal(await f.saldo(),20); await f.reconcile(d.id);
    });
    await check('misma solicitud concurrente registra un solo pago', async () => {
      const f=await fixture(),d=await f.doc(),key=randomUUID(); const res=await Promise.all([f.pay(d.id,30,key),f.pay(d.id,30,key)]);
      assert.ok(res.every(r=>[200,409].includes(r.status))); assert.ok(res.some(r=>r.status===200));
      assert.equal((await f.pay(d.id,30,key)).status,200); assert.equal((await f.reconcile(d.id)).pagos.length,1); assert.equal(await f.saldo(),70);
    });
    await check('diferentes documentos del cliente no pierden saldos', async () => {
      const f=await fixture(),a=await f.doc(),b=await f.doc(); const res=await Promise.all([f.pay(a.id,30),f.pay(b.id,40)]);
      for(let i=0;i<res.length;i++) if(res[i].status===409) assert.equal((await f.pay(i===0?a.id:b.id,i===0?30:40)).status,200);
      assert.ok(res.every(r=>[200,409].includes(r.status))); assert.equal(await f.saldo(),130); await f.reconcile(a.id); await f.reconcile(b.id);
    });
    await check('rechaza exceso, importes inválidos y métodos desconocidos', async () => {
      const f=await fixture(),d=await f.doc(); for(const monto of [0,-1,0.001,'10',null,1e13]) assert.equal((await f.pay(d.id,monto as number)).status,400);
      assert.equal((await f.pay(d.id,101)).status,409); assert.equal((await f.pay(d.id,10,randomUUID(),{metodo:'OTRO'})).status,400);
      assert.equal(await f.saldo(),100); assert.equal((await f.reconcile(d.id)).pagos.length,0);
    });
    await check('centavos y deuda vencida se cobran sin residuos', async () => {
      const f=await fixture(),d=await f.doc(0.3); await prisma.cuentaPorCobrar.update({where:{id:d.id},data:{estado:'VENCIDA'}});
      assert.equal((await f.pay(d.id,0.1)).status,200); assert.equal((await f.pay(d.id,0.2)).status,200);
      assert.equal(await f.saldo(),0); await f.reconcile(d.id);
    });
    await check('no reactiva créditos bloqueados, suspendidos o en revisión', async () => {
      for(const estadoCredito of ['BLOQUEADO','SUSPENDIDO','EN_REVISION']) {
        const f=await fixture(),d=await f.doc(); await prisma.cliente.update({where:{id:f.cliente.id},data:{estadoCredito}});
        assert.equal((await f.pay(d.id,100)).status,200); assert.equal((await prisma.cliente.findUniqueOrThrow({where:{id:f.cliente.id}})).estadoCredito,estadoCredito);
      }
    });
    await check('tenant ajeno y roles de consulta no pueden cobrar', async () => {
      const a=await fixture(),b=await fixture(),d=await b.doc(); assert.equal((await a.pay(d.id)).status,404);
      const res=await listado(a.request(undefined,randomUUID(),'GET')); assert.equal((await res.json()).length,0);
      for(const rol of ['AUDITOR','ALMACENISTA']) {await prisma.usuario.update({where:{id:b.user.id},data:{rol}});assert.equal((await b.pay(d.id)).status,403);}
      assert.equal(await b.saldo(),100);
    });
    await check('REP y módulo deshabilitado no crean pago ni solicitud', async () => {
      const f=await fixture(),d=await f.doc(); assert.equal((await f.pay(d.id,30,randomUUID(),{timbrarRep:true})).status,409);
      await prisma.tenant.update({where:{id:f.tenant.id},data:{moduloCxC:false}});assert.equal((await f.pay(d.id)).status,403);
      assert.equal(await prisma.solicitudCobranza.count({where:{tenantId:f.tenant.id}}),1);assert.equal(await f.saldo(),100);
    });
    await check('historial o saldo cliente inconsistentes exigen conciliación', async () => {
      const f=await fixture(),d=await f.doc(); await prisma.cuentaPorCobrar.update({where:{id:d.id},data:{saldoPendiente:90}});
      assert.equal((await f.pay(d.id)).status,409);await prisma.cuentaPorCobrar.update({where:{id:d.id},data:{saldoPendiente:100}});
      await prisma.cliente.update({where:{id:f.cliente.id},data:{saldoActual:1}});assert.equal((await f.pay(d.id)).status,409);
      assert.equal((await f.reconcile(d.id)).pagos.length,0);
    });
    await check('error al auditar revierte pago, saldos y solicitud', async () => {
      const f=await fixture(),d=await f.doc(); await prisma.$executeRawUnsafe(`CREATE TRIGGER fail_abono BEFORE INSERT ON RegistroAuditoria WHEN NEW.accion = 'ABONO' BEGIN SELECT RAISE(ABORT,'test'); END`);
      try {assert.equal((await f.pay(d.id)).status,500);assert.equal(await f.saldo(),100);assert.equal((await f.reconcile(d.id)).pagos.length,0);
        assert.equal(await prisma.solicitudCobranza.count({where:{tenantId:f.tenant.id}}),1);
      } finally {await prisma.$executeRawUnsafe('DROP TRIGGER fail_abono');}
    });
    await check('cargo manual exige clave y conserva días cero', async () => {
      const f=await fixture(),body={clienteId:f.cliente.id,montoTotal:100,diasCredito:0},key=randomUUID();
      assert.equal((await cargo(f.request(body,''))).status,400); const first=await cargo(f.request(body,key));assert.equal(first.status,201);const d=await first.json();
      const again=await cargo(f.request(body,key));assert.equal(again.status,200);assert.equal((await again.json()).id,d.id);
      assert.equal(new Date(d.fechaVencimiento).getTime()-new Date(d.fechaEmision).getTime()<=1000,true);assert.equal(await f.saldo(),100);
    });
    await check('cargos concurrentes respetan límite estricto y bloqueos', async () => {
      const f=await fixture();await prisma.cliente.update({where:{id:f.cliente.id},data:{limiteCredito:100}});
      const res=await Promise.all([cargo(f.request({clienteId:f.cliente.id,montoTotal:80})),cargo(f.request({clienteId:f.cliente.id,montoTotal:80}))]);
      assert.equal(res.filter(r=>r.status===201).length,1);assert.equal(await f.saldo(),80);
      await prisma.cliente.update({where:{id:f.cliente.id},data:{estadoCredito:'BLOQUEADO'}});assert.equal((await cargo(f.request({clienteId:f.cliente.id,montoTotal:1}))).status,409);
    });
    await check('cargo advierte exceso sin introducir bloqueo automático', async () => {
      const f=await fixture();await prisma.tenant.update({where:{id:f.tenant.id},data:{politicaBloqueoCredito:'ADVERTENCIA'}});
      await prisma.cliente.update({where:{id:f.cliente.id},data:{limiteCredito:1}});assert.equal((await cargo(f.request({clienteId:f.cliente.id,montoTotal:10}))).status,201);
      assert.equal((await prisma.cliente.findUniqueOrThrow({where:{id:f.cliente.id}})).estadoCredito,'ACTIVO');
    });
    await check('cargo y abono concurrentes conservan saldo combinado', async () => {
      const f=await fixture(),d=await f.doc();const key=randomUUID(),payKey=randomUUID(),body={clienteId:f.cliente.id,montoTotal:50};
      const res=await Promise.all([cargo(f.request(body,key)),f.pay(d.id,30,payKey)]);
      if(res[0].status===409)assert.ok([200,201].includes((await cargo(f.request(body,key))).status));
      if(res[1].status===409)assert.equal((await f.pay(d.id,30,payKey)).status,200);
      assert.equal(await f.saldo(),120);await f.reconcile(d.id);
    });
    await check('recibo interno aplica aislamiento por documento y pago', async () => {
      const f=await fixture(),other=await fixture(),d=await f.doc();const response=await f.pay(d.id);const pago=(await response.json()).pago;
      const get=(id: string,req=f.request(undefined,randomUUID(),'GET'))=>recibo(req,{params:Promise.resolve({id})});
      const pdf=await get(d.id);assert.equal(pdf.status,200);assert.equal(pdf.headers.get('Content-Type'),'application/pdf');
      const raw=Buffer.from(await pdf.arrayBuffer()).toString('latin1');assert.ok(raw.startsWith('%PDF'));assert.ok(raw.includes('SIN VALIDEZ FISCAL'));
      assert.ok(!raw.includes('TIMBRE FISCAL'));assert.equal((await get(pago.id)).status,200);
      assert.equal((await get(d.id,other.request(undefined,randomUUID(),'GET'))).status,404);
      assert.equal((await get(pago.id,other.request(undefined,randomUUID(),'GET'))).status,404);
    });
    await check('venta y abono concurrentes concilian cartera y stock', async () => {
      const f=await fixture(),d=await f.doc();const almacen=await prisma.almacen.create({data:{tenantId:f.tenant.id,codigo:'A',nombre:'A'}});
      const producto=await prisma.producto.create({data:{tenantId:f.tenant.id,sku:'P',nombre:'P',costoPromedio:1}});
      await prisma.existencia.create({data:{almacenId:almacen.id,productoId:producto.id,cantidad:10}});
      const body={clienteId:f.cliente.id,almacenId:almacen.id,tipoPago:'CREDITO',items:[{productoId:producto.id,cantidad:1,precioUnitario:10}]};
      const key=randomUUID(),payKey=randomUUID();const res=await Promise.all([venta(f.request(body,key)),f.pay(d.id,30,payKey)]);
      if(res[0].status===409)assert.ok([200,201].includes((await venta(f.request(body,key))).status));
      if(res[1].status===409)assert.equal((await f.pay(d.id,30,payKey)).status,200);
      assert.ok(res.every(r=>[200,201,409].includes(r.status)));assert.equal(await f.saldo(),81.6);await f.reconcile(d.id);
      assert.equal((await prisma.existencia.findFirstOrThrow({where:{almacenId:almacen.id}})).cantidad,9);
    });
    await check('cargos rechazan valores inválidos y referencias de otra empresa', async () => {
      const f=await fixture(),other=await fixture();
      for(const montoTotal of [0,-1,0.001,'100',null])assert.equal((await cargo(f.request({clienteId:f.cliente.id,montoTotal}))).status,400);
      assert.equal((await cargo(f.request({clienteId:other.cliente.id,montoTotal:10}))).status,404);
      assert.equal((await cargo(f.request({clienteId:f.cliente.id,montoTotal:10,diasCredito:-1}))).status,400);assert.equal(await f.saldo(),0);
    });
    await check('cliente conserva clave y cuerpo tras respuesta perdida', async () => {
      const { enviarAbono, leerAbonoPendiente }=await import('../src/lib/solicitud-cobranza-client');
      const storage=new Map<string,string>();const oldStorage=globalThis.sessionStorage,oldFetch=globalThis.fetch;
      Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)}});
      const f=await fixture(),d=await f.doc();let clave='';let perder=true;
      globalThis.fetch=async (_input,init)=>{const headers=new Headers(init?.headers);const actual=headers.get('Idempotency-Key')!;
        if(clave)assert.equal(actual,clave);clave=actual;const res=await abono(f.request(JSON.parse(String(init?.body)),actual),{params:Promise.resolve({id:d.id})});
        if(perder){perder=false;throw new Error('Respuesta perdida después del commit');}return res;};
      try{
        const body={monto:30,metodo:'TRANSFERENCIA',referencia:'',timbrarRep:false as const};
        await assert.rejects(enviarAbono('test',d.id,body));assert.ok(leerAbonoPendiente('test'));
        await assert.rejects(enviarAbono('test',d.id,{...body,monto:40}));
        const replay=await enviarAbono('test',d.id,body);assert.equal(replay.res.status,200);assert.equal(leerAbonoPendiente('test'),null);
        assert.equal((await f.reconcile(d.id)).pagos.length,1);assert.equal(await f.saldo(),70);
      }finally{globalThis.fetch=oldFetch;Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:oldStorage});}
    });
    console.log(`${passed} escenarios aprobados. Base temporal; demo intacta.`);
  } finally {
    await prisma.$disconnect();
    if (!resolve(dir).startsWith(root + '\\') && !resolve(dir).startsWith(root + '/')) throw new Error('Directorio de pruebas fuera de alcance');
    rmSync(dir, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
