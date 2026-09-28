import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

async function main() {
  const root = resolve('.');
  const dir = mkdtempSync(join(root, '.test-ventas-'));
  const schema = join(dir, 'schema.prisma');
  writeFileSync(schema, readFileSync(resolve('prisma/schema.prisma'), 'utf8'));
  writeFileSync(join(dir, 'test.db'), '');
  process.env.DATABASE_URL = `file:${join(dir, 'test.db').replaceAll('\\', '/')}`;
  process.env.JWT_SECRET = 'test-only-isolated-sales-secret-at-least32bytes';
  const { prisma } = await import('../src/lib/prisma');
  try {
    execFileSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'db', 'push', '--schema', schema, '--skip-generate'], { env: process.env, stdio: 'pipe' });
    const { NextRequest } = await import('next/server');
    const { signToken, COOKIE_NAME } = await import('../src/lib/auth');
    const { POST } = await import('../src/app/api/ventas/route');
    const { POST: caja } = await import('../src/app/api/pos/turno/route');
    const { calcularMontos } = await import('../src/lib/ventas');
    let passed = 0;
    const check = async (name: string, fn: () => Promise<void>) => { await fn(); passed++; console.log(`PASS ${name}`); };
    const fixture = async () => {
      const tenant = await prisma.tenant.create({ data: { nombreComercial: 'Prueba', razonSocial: 'Prueba', identificacionFiscal: randomUUID() } });
      const almacen = await prisma.almacen.create({ data: { tenantId: tenant.id, codigo: 'ALM', nombre: 'Almacén' } });
      const cliente = await prisma.cliente.create({ data: { tenantId: tenant.id, codigo: 'CLI', razonSocial: 'Cliente', limiteCredito: 150, diasCredito: 0 } });
      const producto = await prisma.producto.create({ data: { tenantId: tenant.id, sku: 'SKU', nombre: 'Producto', costoPromedio: 2, precioVenta: 10 } });
      await prisma.existencia.create({ data: { almacenId: almacen.id, productoId: producto.id, cantidad: 10 } });
      const user = await prisma.usuario.create({ data: { tenantId: tenant.id, nombre: 'Admin', email: `${randomUUID()}@test.invalid`, rol: 'ADMIN', passwordHash: 'fixture' } });
      const token = await signToken({ id: user.id, email: user.email, tenantId: tenant.id, rol: 'ADMIN' });
      const request = (body: unknown, clave: string = randomUUID()) => new NextRequest('http://test.invalid/api/ventas', { method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: `${COOKIE_NAME}=${token}`, 'Idempotency-Key': clave }, body: JSON.stringify(body) });
      const body = { clienteId: cliente.id, almacenId: almacen.id, tipoPago: 'CONTADO', observaciones: '',
        items: [{ productoId: producto.id, cantidad: 1, precioUnitario: 10 }] };
      const venta = (extra: Record<string, unknown> = {}, clave: string = randomUUID()) => POST(request({ ...body, ...extra }, clave));
      const stock = async () => (await prisma.existencia.findUniqueOrThrow({ where: { almacenId_productoId: { almacenId: almacen.id, productoId: producto.id } } })).cantidad;
      return { tenant, almacen, cliente, producto, user, request, body, venta, stock };
    };
    await check('contado concilia stock, detalle, Kárdex y auditoría', async () => {
      const f = await fixture(); const res = await f.venta(); assert.equal(res.status, 201); const v = await res.json();
      assert.equal(v.total, 11.6); assert.equal(v.cxcId, null); assert.equal(await f.stock(), 9);
      assert.equal(await prisma.ventaDetalle.count({ where: { ventaId: v.id } }), 1);
      assert.equal(await prisma.movimientoKardex.count({ where: { folioReferencia: v.folio } }), 1);
      assert.equal(await prisma.registroAuditoria.count({ where: { tenantId: f.tenant.id, modulo: 'VENTAS' } }), 1);
    });
    await check('crédito genera cartera y respeta cero días', async () => {
      const f = await fixture(); const res = await f.venta({ tipoPago: 'CREDITO' }); assert.equal(res.status, 201); const v = await res.json();
      const cxc = await prisma.cuentaPorCobrar.findUniqueOrThrow({ where: { id: v.cxcId } });
      assert.equal(cxc.saldoPendiente, v.total); assert.ok(Math.abs(cxc.fechaVencimiento.getTime() - Date.now()) < 10000);
      assert.equal((await prisma.cliente.findUniqueOrThrow({ where: { id: f.cliente.id } })).saldoActual, v.total);
    });
    await check('rechaza almacén, cliente y producto ajenos', async () => {
      const f = await fixture(); const otro = await fixture();
      for (const extra of [{ almacenId: otro.almacen.id }, { clienteId: otro.cliente.id }, { items: [{ productoId: otro.producto.id, cantidad: 1, precioUnitario: 10 }] }]) {
        assert.equal((await f.venta(extra)).status, 404);
      }
      assert.equal(await f.stock(), 10); assert.equal(await otro.stock(), 10);
    });
    await check('tenant del cuerpo no permite cambiar empresa', async () => {
      const f = await fixture(); const otro = await fixture(); const res = await f.venta({ tenantId: otro.tenant.id });
      assert.equal(res.status, 201); assert.equal((await res.json()).tenantId, f.tenant.id);
    });
    await check('rechaza importes, cantidades y pago inválidos', async () => {
      const f = await fixture();
      for (const item of [{ cantidad: -1, precioUnitario: 10 }, { cantidad: 0, precioUnitario: 10 },
        { cantidad: 1, precioUnitario: -1 }, { cantidad: 1, precioUnitario: 1.001 },
        { cantidad: 1.0000001, precioUnitario: 10 }, { cantidad: 'NaN', precioUnitario: 10 }, { cantidad: 1, precioUnitario: null }]) {
        assert.equal((await f.venta({ items: [{ productoId: f.producto.id, ...item }] })).status, 400);
      }
      assert.equal((await f.venta({ tipoPago: 'DESCONOCIDO' })).status, 400);
      assert.equal(await f.stock(), 10);
    });
    await check('rechaza partidas duplicadas y clave ausente', async () => {
      const f = await fixture(); assert.equal((await f.venta({ items: [f.body.items[0], f.body.items[0]] })).status, 400);
      assert.equal((await f.venta({}, '')).status, 400);
    });
    await check('reintento devuelve venta original sin efectos', async () => {
      const f = await fixture(); const clave = randomUUID(); const first = await f.venta({}, clave); const v = await first.json();
      const res = await f.venta({}, clave); assert.equal(res.status, 200); assert.equal((await res.json()).id, v.id);
      assert.equal(res.headers.get('Idempotency-Replayed'), 'true'); assert.equal(await f.stock(), 9);
      assert.equal(await prisma.venta.count({ where: { tenantId: f.tenant.id } }), 1);
    });
    await check('misma clave con contenido distinto devuelve conflicto', async () => {
      const f = await fixture(); const clave = randomUUID(); assert.equal((await f.venta({}, clave)).status, 201);
      const res = await f.venta({ observaciones: 'otra venta' }, clave); assert.equal(res.status, 409);
      assert.equal((await res.json()).solicitudRechazada, false); assert.equal(await f.stock(), 9);
    });
    await check('misma clave puede usarse en dos empresas', async () => {
      const a = await fixture(); const b = await fixture(); const clave = randomUUID();
      assert.equal((await a.venta({}, clave)).status, 201); assert.equal((await b.venta({}, clave)).status, 201);
    });
    await check('solicitud concurrente con misma clave no duplica', async () => {
      const f = await fixture(); const clave = randomUUID(); const results = await Promise.all([f.venta({}, clave), f.venta({}, clave)]);
      assert.ok(results.some(r => r.status === 201)); assert.ok(results.every(r => [200, 201, 409].includes(r.status)));
      assert.equal(await f.stock(), 9); assert.equal(await prisma.venta.count({ where: { tenantId: f.tenant.id } }), 1);
      assert.equal((await f.venta({}, clave)).status, 200);
    });
    await check('dos ventas disputan el último stock', async () => {
      const f = await fixture(); await prisma.existencia.updateMany({ where: { almacenId: f.almacen.id }, data: { cantidad: 1 } });
      const results = await Promise.all([f.venta(), f.venta()]); assert.equal(results.filter(r => r.status === 201).length, 1);
      assert.equal(results.filter(r => r.status === 409).length, 1); assert.equal(await f.stock(), 0);
    });
    await check('ventas concurrentes no superan crédito estricto', async () => {
      const f = await fixture(); await prisma.cliente.update({ where: { id: f.cliente.id }, data: { limiteCredito: 15 } });
      const results = await Promise.all([f.venta({ tipoPago: 'CREDITO' }), f.venta({ tipoPago: 'CREDITO' })]);
      assert.equal(results.filter(r => r.status === 201).length, 1); assert.equal(results.filter(r => r.status === 409).length, 1);
      assert.equal((await prisma.cliente.findUniqueOrThrow({ where: { id: f.cliente.id } })).saldoActual, 11.6);
    });
    await check('bloqueos de crédito se preservan', async () => {
      const f = await fixture();
      for (const estadoCredito of ['BLOQUEADO', 'SUSPENDIDO', 'EN_REVISION']) {
        await prisma.cliente.update({ where: { id: f.cliente.id }, data: { estadoCredito } });
        assert.equal((await f.venta({ tipoPago: 'CREDITO' })).status, 409);
      }
      assert.equal(await f.stock(), 10);
    });
    await check('política advertencia permite crédito y no bloquea manualmente', async () => {
      const f = await fixture(); await prisma.tenant.update({ where: { id: f.tenant.id }, data: { politicaBloqueoCredito: 'ADVERTENCIA' } });
      await prisma.cliente.update({ where: { id: f.cliente.id }, data: { limiteCredito: 1 } });
      const res = await f.venta({ tipoPago: 'CREDITO' });
      assert.equal(res.status, 201); assert.ok((await res.json()).advertenciaCredito);
      assert.equal((await prisma.cliente.findUniqueOrThrow({ where: { id: f.cliente.id } })).estadoCredito, 'ACTIVO');
    });
    await check('módulos de crédito deshabilitados no emiten cartera', async () => {
      const f = await fixture(); await prisma.tenant.update({ where: { id: f.tenant.id }, data: { moduloCredito: false } });
      assert.equal((await f.venta({ tipoPago: 'CREDITO' })).status, 403); assert.equal(await f.stock(), 10);
    });
    await check('fallo de segunda partida revierte venta, crédito y clave', async () => {
      const f = await fixture(); const p = await prisma.producto.create({ data: { tenantId: f.tenant.id, sku: 'SIN', nombre: 'Sin stock' } });
      const res = await f.venta({ tipoPago: 'CREDITO', items: [...f.body.items, { productoId: p.id, cantidad: 1, precioUnitario: 1 }] });
      assert.equal(res.status, 409); assert.equal(await f.stock(), 10);
      assert.equal(await prisma.venta.count({ where: { tenantId: f.tenant.id } }), 0);
      assert.equal(await prisma.cuentaPorCobrar.count({ where: { tenantId: f.tenant.id } }), 0);
      assert.equal(await prisma.solicitudVenta.count({ where: { tenantId: f.tenant.id } }), 0);
      assert.equal((await prisma.cliente.findUniqueOrThrow({ where: { id: f.cliente.id } })).saldoActual, 0);
    });
    await check('redondeo por partida e IVA en centavos', async () => {
      assert.deepEqual(calcularMontos([{ productoId: 'a', cantidad: 0.5, precioUnitario: 2.01 }]), { partidas: [1.01], subtotal: 1.01, impuestos: 0.16, total: 1.17 });
      assert.equal(calcularMontos([{ productoId: 'a', cantidad: 3, precioUnitario: 0.1 }]).subtotal, 0.3);
    });
    await check('apertura concurrente no abre dos cajas', async () => {
      const f = await fixture(); const body = { accion: 'ABRIR', almacenId: f.almacen.id, montoApertura: 100 };
      const results = await Promise.all([caja(f.request(body)), caja(f.request(body))]);
      assert.equal(results.filter(r => r.status === 201).length, 1); assert.equal(results.filter(r => r.status === 409).length, 1);
    });
    await check('POS contabiliza efectivo y repetición una vez; cierre concilia', async () => {
      const f = await fixture(); const opened = await caja(f.request({ accion: 'ABRIR', almacenId: f.almacen.id, montoApertura: 100 }));
      const turno = (await opened.json()).turno; const clave = randomUUID(); const pos = { turnoId: turno.id, metodo: 'EFECTIVO', recibido: 20 };
      assert.equal((await f.venta({ pos }, clave)).status, 201); assert.equal((await f.venta({ pos }, clave)).status, 200);
      const res = await caja(f.request({ accion: 'CERRAR', turnoId: turno.id, montoCierre: 111.6 }));
      assert.equal(res.status, 200); const data = await res.json(); assert.equal(data.resumen.totalVentas, 11.6); assert.equal(data.resumen.diferencia, 0);
      assert.equal((await f.venta({ pos })).status, 409); assert.equal((await f.venta({ pos }, clave)).status, 200);
      assert.equal(await f.stock(), 9);
    });
    await check('POS registra tarjeta y transferencia en servidor', async () => {
      const f = await fixture(); const res = await caja(f.request({ accion: 'ABRIR', almacenId: f.almacen.id })); const turno = (await res.json()).turno;
      for (const metodo of ['TARJETA', 'TRANSFERENCIA']) assert.equal((await f.venta({ pos: { turnoId: turno.id, metodo, recibido: 11.6 } })).status, 201);
      const actual = await prisma.turnoCajaPOS.findUniqueOrThrow({ where: { id: turno.id } });
      assert.equal(actual.totalTarjeta, 11.6); assert.equal(actual.totalTransfer, 11.6); assert.equal(actual.totalVentas, 23.2); assert.equal(actual.totalEfectivo, 0);
    });
    await check('caja y turno ajenos no se operan', async () => {
      const f = await fixture(); const otro = await fixture(); const res = await caja(otro.request({ accion: 'ABRIR', almacenId: otro.almacen.id }));
      const turno = (await res.json()).turno;
      assert.equal((await caja(f.request({ accion: 'ABRIR', almacenId: otro.almacen.id }))).status, 404);
      assert.equal((await caja(f.request({ accion: 'CERRAR', turnoId: turno.id, montoCierre: 0 }))).status, 409);
      assert.equal((await f.venta({ pos: { turnoId: turno.id, metodo: 'EFECTIVO', recibido: 20 } })).status, 409);
    });
    await check('POS rechaza efectivo insuficiente y módulo deshabilitado', async () => {
      const f = await fixture(); const res = await caja(f.request({ accion: 'ABRIR', almacenId: f.almacen.id })); const turno = (await res.json()).turno;
      assert.equal((await f.venta({ pos: { turnoId: turno.id, metodo: 'EFECTIVO', recibido: 1 } })).status, 400);
      await prisma.tenant.update({ where: { id: f.tenant.id }, data: { moduloPos: false } });
      assert.equal((await f.venta({ pos: { turnoId: turno.id, metodo: 'EFECTIVO', recibido: 20 } })).status, 403);
      assert.equal(await f.stock(), 10);
    });
    await check('rol auditor no emite venta y token inválido no autentica', async () => {
      const f = await fixture(); await prisma.usuario.update({ where: { id: f.user.id }, data: { rol: 'AUDITOR' } }); assert.equal((await f.venta()).status, 403);
      const request = new NextRequest('http://test.invalid', { method: 'POST', headers: { Cookie: `${COOKIE_NAME}=invalid` }, body: '{}' });
      assert.equal((await POST(request)).status, 401);
    });
    await check('cantidades fraccionarias no dejan residuo ni falso insuficiente', async () => {
      const f = await fixture(); await prisma.existencia.updateMany({ where: { almacenId: f.almacen.id }, data: { cantidad: 0.3 } });
      for (let n = 0; n < 3; n++) assert.equal((await f.venta({ items: [{ productoId: f.producto.id, cantidad: 0.1, precioUnitario: 10 }] })).status, 201);
      assert.equal(await f.stock(), 0);
    });
    await check('POS con stock insuficiente revierte también totales de caja', async () => {
      const f = await fixture(); const opened = await caja(f.request({ accion: 'ABRIR', almacenId: f.almacen.id })); const turno = (await opened.json()).turno;
      assert.equal((await f.venta({ pos: { turnoId: turno.id, metodo: 'EFECTIVO', recibido: 200 }, items: [{ productoId: f.producto.id, cantidad: 11, precioUnitario: 10 }] })).status, 409);
      assert.equal((await prisma.turnoCajaPOS.findUniqueOrThrow({ where: { id: turno.id } })).totalVentas, 0);
      assert.equal(await f.stock(), 10);
    });
    await check('cierre concurrente con venta conserva conciliación', async () => {
      const f = await fixture(); const opened = await caja(f.request({ accion: 'ABRIR', almacenId: f.almacen.id })); const turno = (await opened.json()).turno;
      const results = await Promise.all([f.venta({ pos: { turnoId: turno.id, metodo: 'EFECTIVO', recibido: 20 } }),
        caja(f.request({ accion: 'CERRAR', turnoId: turno.id, montoCierre: 0 }))]);
      assert.ok(results.every(r => [200, 201, 409].includes(r.status)));
      const actual = await prisma.turnoCajaPOS.findUniqueOrThrow({ where: { id: turno.id } });
      const ventas = await prisma.venta.findMany({ where: { tenantId: f.tenant.id } });
      assert.equal(actual.totalVentas, ventas.reduce((s, v) => s + v.total, 0));
      if (actual.estado === 'CERRADO') assert.equal(actual.diferencia, actual.totalEfectivo === 0 ? 0 : -actual.totalEfectivo);
    });
    await check('respuesta perdida se recupera desde solicitud persistida sin duplicar', async () => {
      const f = await fixture(); const store = new Map<string, string>();
      const anteriorStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
      Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
        getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value), removeItem: (key: string) => store.delete(key),
      } });
      const originalFetch = globalThis.fetch;
      try {
        const { enviarSolicitudVenta, leerVentaPendiente } = await import('../src/lib/solicitud-venta-client');
        let perderRespuesta = true; let llamadas = 0;
        globalThis.fetch = (async (_url: unknown, options: RequestInit) => {
          llamadas++;
          const headers = new Headers(options.headers);
          const res = await POST(f.request(JSON.parse(options.body as string), headers.get('Idempotency-Key')!));
          if (perderRespuesta) { perderRespuesta = false; throw new Error('Respuesta perdida tras commit'); }
          return res;
        }) as typeof fetch;
        await assert.rejects(enviarSolicitudVenta('prueba', f.body), /Respuesta perdida/);
        assert.deepEqual(leerVentaPendiente('prueba')?.body, f.body);
        await assert.rejects(enviarSolicitudVenta('prueba', { ...f.body, observaciones: 'otro intento' }), /pendiente/);
        assert.equal(llamadas, 1);
        const resultado = await enviarSolicitudVenta('prueba', leerVentaPendiente('prueba')!.body);
        assert.equal(resultado.res.status, 200); assert.equal(leerVentaPendiente('prueba'), null);
        assert.equal(await f.stock(), 9); assert.equal(await prisma.venta.count({ where: { tenantId: f.tenant.id } }), 1);
      } finally {
        globalThis.fetch = originalFetch;
        if (anteriorStorage) Object.defineProperty(globalThis, 'sessionStorage', anteriorStorage);
        else Reflect.deleteProperty(globalThis, 'sessionStorage');
      }
    });
    console.log(`${passed} escenarios aprobados. Base temporal; demo intacta.`);
  } finally {
    await prisma.$disconnect();
    if (!resolve(dir).startsWith(root + '\\') && !resolve(dir).startsWith(root + '/')) throw new Error('Directorio de pruebas fuera de alcance');
    rmSync(dir, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
