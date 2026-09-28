import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

async function main() {
  const root = resolve('.'); const dir = mkdtempSync(join(root, '.test-cotizaciones-'));
  const schema = join(dir, 'schema.prisma'); writeFileSync(schema, readFileSync(resolve('prisma/schema.prisma'), 'utf8'));
  writeFileSync(join(dir, 'test.db'), '');
  process.env.DATABASE_URL = `file:${join(dir, 'test.db').replaceAll('\\', '/')}`;
  process.env.JWT_SECRET = 'test-only-isolated-quotes-secret-at-least32bytes';
  const { prisma } = await import('../src/lib/prisma');
  try {
    execFileSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'db', 'push', '--schema', schema, '--skip-generate'], { env: process.env, stdio: 'pipe' });
    const { NextRequest } = await import('next/server');
    const { signToken, COOKIE_NAME } = await import('../src/lib/auth-token');
    const { POST: crear } = await import('../src/app/api/cotizaciones/route');
    const { POST: convertir } = await import('../src/app/api/cotizaciones/[id]/convertir/route');
    const { GET, PUT, DELETE } = await import('../src/app/api/cotizaciones/[id]/route');
    const { POST: ventaDirecta } = await import('../src/app/api/ventas/route');
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
      const request = (body: unknown, method = 'POST', version?: string) => new NextRequest('http://test.invalid/api/cotizaciones', { method,
        headers: { 'Content-Type': 'application/json', Cookie: `${COOKIE_NAME}=${token}`, ...(version ? { 'If-Match': version } : {}) },
        ...(method === 'GET' || method === 'DELETE' ? {} : { body: JSON.stringify(body) }) });
      const items = [{ productoId: producto.id, cantidad: 2, precioUnitario: 10, descuento: 2 }];
      const body = { clienteId: cliente.id, vigenciaDias: 15, items };
      const res = await crear(request(body)); assert.equal(res.status, 201); const cot = await res.json();
      const ctx = (id = cot.id) => ({ params: Promise.resolve({ id }) });
      const conversion = { almacenId: almacen.id, tipoPago: 'CONTADO', version: cot.version };
      const convertirAhora = (extra: Record<string, unknown> = {}) => convertir(request({ ...conversion, ...extra }), ctx());
      const stock = async () => (await prisma.existencia.findUniqueOrThrow({ where: { almacenId_productoId: { almacenId: almacen.id, productoId: producto.id } } })).cantidad;
      return { tenant, almacen, cliente, producto, user, request, items, body, cot, ctx, conversion, convertirAhora, stock };
    };
    await check('conserva precios, descuento neto y total cotizado', async () => {
      const f = await fixture(); const res = await f.convertirAhora(); assert.equal(res.status, 200); const v = (await res.json()).venta;
      assert.equal(v.subtotal, 18); assert.equal(v.impuestos, 2.88); assert.equal(v.total, f.cot.total); assert.equal(await f.stock(), 8);
      const detalle = await prisma.ventaDetalle.findFirstOrThrow({ where: { ventaId: v.id } }); assert.equal(detalle.precioUnitario, 10); assert.equal(detalle.subtotal, 18);
      const c = await prisma.cotizacion.findUniqueOrThrow({ where: { id: f.cot.id } }); assert.equal(c.estado, 'CONVERTIDA'); assert.equal(c.ventaIdGenerada, v.id);
      assert.equal(await prisma.registroAuditoria.count({ where: { tenantId: f.tenant.id, accion: 'CONVERTIR' } }), 1);
    });
    await check('conversión a crédito devuelve CxC y concilia saldo', async () => {
      const f = await fixture(); const res = await f.convertirAhora({ tipoPago: 'CREDITO' }); assert.equal(res.status, 200); const v = (await res.json()).venta;
      assert.ok(v.cxcId); assert.equal((await prisma.cuentaPorCobrar.findUniqueOrThrow({ where: { id: v.cxcId } })).saldoPendiente, 20.88);
      assert.equal((await prisma.cliente.findUniqueOrThrow({ where: { id: f.cliente.id } })).saldoActual, 20.88);
    });
    await check('doble conversión y respuesta perdida recuperan la misma venta', async () => {
      const f = await fixture(); const first = await f.convertirAhora(); const v = (await first.json()).venta;
      const res = await f.convertirAhora(); assert.equal(res.status, 200); assert.equal((await res.json()).venta.id, v.id);
      assert.equal(res.headers.get('Idempotency-Replayed'), 'true'); assert.equal(await f.stock(), 8);
      assert.equal(await prisma.venta.count({ where: { tenantId: f.tenant.id } }), 1);
    });
    await check('reintento con otro almacén o pago se rechaza', async () => {
      const f = await fixture(); assert.equal((await f.convertirAhora()).status, 200);
      assert.equal((await f.convertirAhora({ tipoPago: 'CREDITO' })).status, 409);
      assert.equal((await f.convertirAhora({ almacenId: 'otro' })).status, 409); assert.equal(await f.stock(), 8);
    });
    await check('conversiones concurrentes no duplican stock ni cartera', async () => {
      const f = await fixture(); const results = await Promise.all([f.convertirAhora({ tipoPago: 'CREDITO' }), f.convertirAhora({ tipoPago: 'CREDITO' })]);
      assert.ok(results.some(r => r.status === 200)); assert.ok(results.every(r => [200, 409].includes(r.status)));
      assert.equal(await prisma.venta.count({ where: { tenantId: f.tenant.id } }), 1);
      assert.equal(await prisma.cuentaPorCobrar.count({ where: { tenantId: f.tenant.id } }), 1); assert.equal(await f.stock(), 8);
    });
    await check('cotización ajena no se consulta ni opera', async () => {
      const a = await fixture(); const b = await fixture();
      assert.equal((await GET(a.request(undefined, 'GET'), b.ctx())).status, 404);
      assert.equal((await convertir(a.request(b.conversion), b.ctx())).status, 404);
      assert.equal((await PUT(a.request({ version: b.cot.version, observaciones: 'ajena' }, 'PUT'), b.ctx())).status, 404);
      assert.equal((await DELETE(a.request(undefined, 'DELETE', b.cot.version), b.ctx())).status, 404);
    });
    await check('almacén ajeno se rechaza sin modificar propuesta', async () => {
      const a = await fixture(); const b = await fixture(); assert.equal((await a.convertirAhora({ almacenId: b.almacen.id })).status, 404);
      assert.equal((await prisma.cotizacion.findUniqueOrThrow({ where: { id: a.cot.id } })).estado, 'BORRADOR'); assert.equal(await a.stock(), 10);
    });
    await check('crédito excedido o bloqueado revierte conversión', async () => {
      const f = await fixture(); await prisma.cliente.update({ where: { id: f.cliente.id }, data: { limiteCredito: 1 } });
      assert.equal((await f.convertirAhora({ tipoPago: 'CREDITO' })).status, 409);
      await prisma.cliente.update({ where: { id: f.cliente.id }, data: { limiteCredito: 1000, estadoCredito: 'BLOQUEADO' } });
      assert.equal((await f.convertirAhora({ tipoPago: 'CREDITO' })).status, 409); assert.equal(await f.stock(), 10);
    });
    await check('stock insuficiente revierte estado, venta, CxC y solicitud', async () => {
      const f = await fixture(); await prisma.existencia.updateMany({ where: { almacenId: f.almacen.id }, data: { cantidad: 1 } });
      assert.equal((await f.convertirAhora({ tipoPago: 'CREDITO' })).status, 409);
      assert.equal((await prisma.cotizacion.findUniqueOrThrow({ where: { id: f.cot.id } })).estado, 'BORRADOR');
      assert.equal(await prisma.solicitudVenta.count({ where: { tenantId: f.tenant.id } }), 0);
      assert.equal(await prisma.venta.count({ where: { tenantId: f.tenant.id } }), 0);
      assert.equal(await prisma.cuentaPorCobrar.count({ where: { tenantId: f.tenant.id } }), 0);
    });
    await check('rechaza cotización vencida y rechazada', async () => {
      for (const extra of [{ estado: 'RECHAZADA' }, { fechaVencimiento: new Date(Date.now() - 1000) }]) {
        const f = await fixture(); await prisma.cotizacion.update({ where: { id: f.cot.id }, data: extra });
        const actual = await GET(f.request(undefined, 'GET'), f.ctx()); const c = await actual.json();
        assert.equal((await f.convertirAhora({ version: c.version })).status, 409); assert.equal(await f.stock(), 10);
      }
    });
    await check('cotización modificada invalida versión vista en conversión', async () => {
      const f = await fixture(); const edit = await PUT(f.request({ version: f.cot.version, observaciones: 'nueva revisión' }, 'PUT'), f.ctx());
      assert.equal(edit.status, 200); const nueva = (await edit.json()).cotizacion; assert.notEqual(nueva.version, f.cot.version);
      assert.equal((await f.convertirAhora()).status, 409); assert.equal((await f.convertirAhora({ version: nueva.version })).status, 200);
    });
    await check('edición obsoleta y DELETE sin precondición se rechazan', async () => {
      const f = await fixture(); assert.equal((await PUT(f.request({ version: f.cot.version, observaciones: 'primera' }, 'PUT'), f.ctx())).status, 200);
      assert.equal((await PUT(f.request({ version: f.cot.version, observaciones: 'perdida' }, 'PUT'), f.ctx())).status, 409);
      assert.equal((await DELETE(f.request(undefined, 'DELETE'), f.ctx())).status, 400);
      assert.equal((await DELETE(f.request(undefined, 'DELETE', f.cot.version), f.ctx())).status, 409);
    });
    await check('cotización convertida no se modifica ni elimina', async () => {
      const f = await fixture(); await f.convertirAhora();
      assert.equal((await PUT(f.request({ version: f.cot.version, observaciones: 'cambio' }, 'PUT'), f.ctx())).status, 409);
      assert.equal((await DELETE(f.request(undefined, 'DELETE', f.cot.version), f.ctx())).status, 409);
    });
    await check('edición concurrente con conversión no cambia la propuesta vendida', async () => {
      const f = await fixture(); const results = await Promise.all([f.convertirAhora(), PUT(f.request({ version: f.cot.version, items: [{ ...f.items[0], precioUnitario: 12 }] }, 'PUT'), f.ctx())]);
      assert.equal(results.filter(r => r.status === 200).length, 1); assert.equal(results.filter(r => r.status === 409).length, 1);
      const c = await prisma.cotizacion.findUniqueOrThrow({ where: { id: f.cot.id } });
      if (c.ventaIdGenerada) assert.equal((await prisma.venta.findUniqueOrThrow({ where: { id: c.ventaIdGenerada } })).total, c.total);
      else assert.equal(await f.stock(), 10);
    });
    await check('eliminación concurrente no deja venta huérfana', async () => {
      const f = await fixture(); const results = await Promise.all([f.convertirAhora(), DELETE(f.request(undefined, 'DELETE', f.cot.version), f.ctx())]);
      assert.ok(results.every(r => [200, 404, 409].includes(r.status)));
      const c = await prisma.cotizacion.findUnique({ where: { id: f.cot.id } }); const n = await prisma.venta.count({ where: { tenantId: f.tenant.id } });
      if (n) { assert.equal(c?.estado, 'CONVERTIDA'); assert.ok(c?.ventaIdGenerada); } else assert.equal(await f.stock(), 10);
    });
    await check('importes históricos inconsistentes exigen revisión', async () => {
      const f = await fixture(); await prisma.cotizacion.update({ where: { id: f.cot.id }, data: { total: 999 } });
      const actual = await GET(f.request(undefined, 'GET'), f.ctx()); const c = await actual.json();
      assert.equal((await f.convertirAhora({ version: c.version })).status, 409); assert.equal(await f.stock(), 10);
    });
    await check('creación y edición validan descuentos y referencias', async () => {
      const f = await fixture(); const otro = await fixture();
      for (const descuento of [-1, 21, 1.001]) assert.equal((await crear(f.request({ ...f.body, items: [{ ...f.items[0], descuento }] }))).status, 400);
      assert.equal((await PUT(f.request({ version: f.cot.version, clienteId: otro.cliente.id }, 'PUT'), f.ctx())).status, 404);
      assert.equal((await PUT(f.request({ version: f.cot.version, items: [{ ...f.items[0], productoId: otro.producto.id }] }, 'PUT'), f.ctx())).status, 404);
      assert.equal((await crear(f.request({ ...f.body, items: [f.items[0], f.items[0]] }))).status, 400);
    });
    await check('módulo y roles protegen conversión', async () => {
      const f = await fixture(); await prisma.tenant.update({ where: { id: f.tenant.id }, data: { moduloCotizaciones: false } }); assert.equal((await f.convertirAhora()).status, 403);
      await prisma.usuario.update({ where: { id: f.user.id }, data: { rol: 'AUDITOR' } }); assert.equal((await f.convertirAhora()).status, 403);
    });
    await check('sin descuento coincide con motor de venta directa', async () => {
      const f = await fixture(); const extra = { items: [{ ...f.items[0], descuento: 0 }] };
      const edit = await PUT(f.request({ version: f.cot.version, ...extra }, 'PUT'), f.ctx()); const c = (await edit.json()).cotizacion;
      const res = await f.convertirAhora({ version: c.version, tipoPago: 'CREDITO' }); const converted = (await res.json()).venta;
      const req = f.request({ clienteId: f.cliente.id, almacenId: f.almacen.id, tipoPago: 'CREDITO', items: extra.items }); req.headers.set('Idempotency-Key', randomUUID());
      const direct = await ventaDirecta(req); assert.equal(direct.status, 201); const v = await direct.json();
      assert.equal(converted.total, v.total); assert.equal(converted.impuestos, v.impuestos);
      assert.equal((await prisma.cliente.findUniqueOrThrow({ where: { id: f.cliente.id } })).saldoActual, v.total * 2);
    });
    await check('cambio de precio del catálogo no repricia la propuesta', async () => {
      const f = await fixture(); await prisma.producto.update({ where: { id: f.producto.id }, data: { precioVenta: 999 } });
      const result = await f.convertirAhora(); assert.equal(result.status, 200);
      const v = (await result.json()).venta; assert.equal(v.total, f.cot.total);
    });
    await check('eliminación vigente deja evidencia de auditoría', async () => {
      const f = await fixture(); assert.equal((await DELETE(f.request(undefined, 'DELETE', f.cot.version), f.ctx())).status, 200);
      assert.equal(await prisma.cotizacion.findUnique({ where: { id: f.cot.id } }), null);
      assert.equal(await prisma.registroAuditoria.count({ where: { tenantId: f.tenant.id, modulo: 'COTIZACIONES', accion: 'ELIMINAR' } }), 1);
      assert.equal(await f.stock(), 10);
    });
    await check('edición de propuesta aprobada requiere nueva revisión', async () => {
      const f = await fixture(); await prisma.cotizacion.update({ where: { id: f.cot.id }, data: { estado: 'APROBADA' } });
      const c = await (await GET(f.request(undefined, 'GET'), f.ctx())).json();
      const result = await PUT(f.request({ version: c.version, items: [{ ...f.items[0], descuento: 0 }] }, 'PUT'), f.ctx());
      assert.equal(result.status, 200); const nueva = (await result.json()).cotizacion;
      assert.equal(nueva.estado, 'BORRADOR'); assert.equal(nueva.total, 23.2); assert.notEqual(nueva.version, c.version);
    });
    console.log(`${passed} escenarios aprobados. Base temporal; demo intacta.`);
  } finally {
    await prisma.$disconnect();
    if (!resolve(dir).startsWith(root + '\\') && !resolve(dir).startsWith(root + '/')) throw new Error('Directorio de pruebas fuera de alcance');
    rmSync(dir, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
