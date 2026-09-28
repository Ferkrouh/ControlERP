import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

async function main() {
  const dir = mkdtempSync(join(resolve('.'), '.test-traspasos-'));
  const schema = join(dir, 'schema.prisma');
  writeFileSync(schema, readFileSync(resolve('prisma/schema.prisma'), 'utf8'));
  process.env.DATABASE_URL = `file:${join(dir, 'test.db').replaceAll('\\', '/')}`;
  writeFileSync(join(dir, 'test.db'), '');
  process.env.JWT_SECRET = 'test-only-isolated-traspasos-secret-32-bytes';
  const { prisma } = await import('../src/lib/prisma');
  try {
  execFileSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'db', 'push', '--schema', schema, '--skip-generate'],
    { env: process.env, stdio: 'inherit' });
    const { NextRequest } = await import('next/server');
    const { signToken, COOKIE_NAME } = await import('../src/lib/auth');
    const { POST, GET } = await import('../src/app/api/traspasos/route');
    const { PATCH } = await import('../src/app/api/traspasos/[id]/route');
    const a = await prisma.tenant.create({ data: { nombreComercial: 'Prueba A', razonSocial: 'A', identificacionFiscal: 'TESTA' } });
    const b = await prisma.tenant.create({ data: { nombreComercial: 'Prueba B', razonSocial: 'B', identificacionFiscal: 'TESTB' } });
    const origen = await prisma.almacen.create({ data: { tenantId: a.id, codigo: 'O', nombre: 'Origen' } });
    const destino = await prisma.almacen.create({ data: { tenantId: a.id, codigo: 'D', nombre: 'Destino' } });
    const externo = await prisma.almacen.create({ data: { tenantId: b.id, codigo: 'E', nombre: 'Externo' } });
    const producto = await prisma.producto.create({ data: { tenantId: a.id, sku: 'SKU', nombre: 'Producto', costoPromedio: 10 } });
    const ajeno = await prisma.producto.create({ data: { tenantId: b.id, sku: 'SKU', nombre: 'Ajeno' } });
    await prisma.existencia.create({ data: { almacenId: origen.id, productoId: producto.id, cantidad: 20 } });
    const admin = await prisma.usuario.create({ data: { tenantId: a.id, nombre: 'Admin', email: 'admin@test.invalid', passwordHash: 'fixture', rol: 'ADMIN' } });
    const otro = await prisma.usuario.create({ data: { tenantId: b.id, nombre: 'Otro', email: 'otro@test.invalid', passwordHash: 'fixture', rol: 'ADMIN' } });
    const encargado = await prisma.usuario.create({ data: { tenantId: a.id, nombre: 'Encargado', email: 'enc@test.invalid', passwordHash: 'fixture', rol: 'ENCARGADO' } });
    const almacenista = await prisma.usuario.create({ data: { tenantId: a.id, nombre: 'Almacén', email: 'alm@test.invalid', passwordHash: 'fixture', rol: 'ALMACENISTA', almacenAsignadoId: destino.id } });
    const tokens = new Map<string, string>();
    for (const u of [admin, otro, encargado, almacenista]) tokens.set(u.id, await signToken({ id: u.id, email: u.email, rol: u.rol as 'ADMIN', tenantId: u.tenantId }));
    const request = (body: unknown, user = admin, method = 'POST') => new NextRequest('http://test.invalid/api/traspasos', {
      method, headers: { 'Content-Type': 'application/json', Cookie: `${COOKIE_NAME}=${tokens.get(user.id)}` },
      ...(method === 'GET' ? {} : { body: JSON.stringify(body) }) });
    const payload = { almacenOrigenId: origen.id, almacenDestinoId: destino.id,
      items: [{ productoId: producto.id, cantidadEnviada: 6 }] };
    let passed = 0;
    const check = async (name: string, fn: () => Promise<void>) => { await fn(); passed++; console.log(`PASS ${name}`); };
    await check('sin sesión no modifica datos', async () => {
      const res = await POST(new NextRequest('http://test.invalid', { method: 'POST', body: '{}' })); assert.equal(res.status, 401);
    });
    await check('validación cantidades y partidas duplicadas', async () => {
      for (const cantidad of [-1, 0, 'NaN', null]) assert.equal((await POST(request({ ...payload, items: [{ productoId: producto.id, cantidadEnviada: cantidad }] }))).status, 400);
      assert.equal((await POST(request({ ...payload, items: [payload.items[0], payload.items[0]] }))).status, 400);
    });
    await check('almacenes y productos ajenos rechazados', async () => {
      assert.equal((await POST(request({ ...payload, almacenDestinoId: externo.id }))).status, 400);
      assert.equal((await POST(request({ ...payload, items: [{ productoId: ajeno.id, cantidadEnviada: 1 }] }))).status, 400);
    });
    await check('Carta Porte simulada deshabilitada', async () => { assert.equal((await POST(request({ ...payload, requiereCartaPorte: true }))).status, 409); });
    const creado = await POST(request(payload)); assert.equal(creado.status, 201);
    const traspaso = await creado.json(); const item = traspaso.items[0];
    const patch = (body: unknown, user = admin, id = traspaso.id) => PATCH(request(body, user, 'PATCH'), { params: Promise.resolve({ id }) });
    const stock = async (almacenId: string) => (await prisma.existencia.findUnique({ where: { almacenId_productoId: { almacenId, productoId: producto.id } } }))?.cantidad ?? 0;
    await check('aislamiento tenant en operación', async () => { assert.equal((await patch({ accion: 'despachar' }, otro)).status, 404); });
    await check('encargado no despacha; almacenista respeta asignación', async () => {
      assert.equal((await patch({ accion: 'despachar' }, encargado)).status, 403);
      assert.equal((await patch({ accion: 'despachar' }, almacenista)).status, 403);
    });
    await check('despacho concurrente mueve stock una vez', async () => {
      const responses = await Promise.all([patch({ accion: 'despachar' }), patch({ accion: 'despachar' })]);
      assert.equal(responses.filter(r => r.status === 200).length, 1);
      assert.equal(responses.filter(r => r.status === 409).length, 1);
      assert.equal(await stock(origen.id), 14);
      assert.equal(await prisma.movimientoKardex.count({ where: { folioReferencia: traspaso.folio } }), 1);
    });
    await check('recepción exige todas las partidas y rango válido', async () => {
      for (const recepciones of [undefined, {}, { [item.id]: -1 }, { [item.id]: 7 }, { ajeno: 3 }]) {
        assert.equal((await patch({ accion: 'recibir', recepciones })).status, 400);
      }
      assert.equal(await stock(destino.id), 0);
    });
    await check('recepción parcial conserva faltante pendiente', async () => {
      const res = await patch({ accion: 'recibir', recepciones: { [item.id]: 2 } }, almacenista);
      assert.equal(res.status, 200); assert.equal((await res.json()).traspaso.estado, 'DESPACHADO'); assert.equal(await stock(destino.id), 2);
    });
    await check('repetir parcial no duplica stock ni Kárdex', async () => {
      assert.equal((await patch({ accion: 'recibir', recepciones: { [item.id]: 2 } })).status, 200);
      assert.equal(await stock(destino.id), 2); assert.equal(await prisma.movimientoKardex.count({ where: { folioReferencia: traspaso.folio } }), 2);
    });
    await check('no permite disminuir lo ya recibido', async () => { assert.equal((await patch({ accion: 'recibir', recepciones: { [item.id]: 1 } })).status, 400); });
    await check('cierre y reintento terminal conservan saldos', async () => {
      const res = await patch({ accion: 'recibir', recepciones: { [item.id]: 6 } });
      assert.equal(res.status, 200); assert.equal((await res.json()).traspaso.estado, 'RECIBIDO');
      assert.equal((await patch({ accion: 'recibir', recepciones: { [item.id]: 6 } })).status, 409);
      assert.equal(await stock(destino.id), 6); assert.equal(await stock(origen.id) + await stock(destino.id), 20);
    });
    await check('stock insuficiente revierte estado y auditoría', async () => {
      const res = await POST(request({ ...payload, items: [{ productoId: producto.id, cantidadEnviada: 100 }] }));
      const nuevo = await res.json(); assert.equal((await patch({ accion: 'despachar' }, admin, nuevo.id)).status, 409);
      assert.equal((await prisma.traspaso.findUniqueOrThrow({ where: { id: nuevo.id } })).estado, 'SOLICITADO');
      assert.equal(await prisma.movimientoKardex.count({ where: { folioReferencia: nuevo.folio } }), 0);
    });
    await check('consulta de almacenista oculta costo', async () => {
      const res = await GET(request(undefined, almacenista, 'GET'));
      assert.equal(res.status, 200); const lista = await res.json(); assert.equal('costoPromedio' in lista[0].items[0].producto, false);
    });
    await check('Kárdex y auditoría conciliados', async () => {
      const movimientos = await prisma.movimientoKardex.findMany({ where: { folioReferencia: traspaso.folio } });
      assert.deepEqual(movimientos.map(m => m.cantidad).sort((a, b) => a - b), [2, 4, 6]);
      assert.equal(await prisma.registroAuditoria.count({ where: { modulo: 'TRASPASOS', detalles: { startsWith: traspaso.folio } } }), 4);
    });
    await check('fallo en segunda partida revierte toda la salida', async () => {
      const segundo = await prisma.producto.create({ data: { tenantId: a.id, sku: 'SIN-STOCK', nombre: 'Sin stock' } });
      const res = await POST(request({ ...payload, items: [...payload.items, { productoId: segundo.id, cantidadEnviada: 1 }] }));
      const nuevo = await res.json(); assert.equal((await patch({ accion: 'despachar' }, admin, nuevo.id)).status, 409);
      assert.equal(await stock(origen.id), 14);
      assert.equal(await prisma.movimientoKardex.count({ where: { folioReferencia: nuevo.folio } }), 0);
      assert.equal((await prisma.traspaso.findUniqueOrThrow({ where: { id: nuevo.id } })).estado, 'SOLICITADO');
    });
    await check('recepciones parciales concurrentes no duplican entrada', async () => {
      const res = await POST(request(payload)); const nuevo = await res.json(); const partida = nuevo.items[0];
      assert.equal((await patch({ accion: 'despachar' }, admin, nuevo.id)).status, 200);
      const results = await Promise.all([1, 2].map(() => patch({ accion: 'recibir', recepciones: { [partida.id]: 2 } }, admin, nuevo.id)));
      assert.ok(results.some(r => r.status === 200)); assert.ok(results.every(r => r.status === 200 || r.status === 409));
      assert.equal(await stock(destino.id), 8);
      assert.equal(await prisma.movimientoKardex.count({ where: { folioReferencia: nuevo.folio, tipoMovimiento: 'TRASPASO_ENTRADA' } }), 1);
    });
    console.log(`${passed} escenarios aprobados. Base temporal; demo intacta.`);
  } finally {
    await prisma.$disconnect();
    // Solo elimina el directorio temporal creado por este proceso.
    if (!resolve(dir).startsWith(resolve('.') + '\\') && !resolve(dir).startsWith(resolve('.') + '/')) throw new Error('Ruta temporal fuera de alcance');
    rmSync(dir, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
