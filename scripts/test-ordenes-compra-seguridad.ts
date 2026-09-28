import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

async function main() {
  const root = resolve('.');
  const dir = mkdtempSync(join(root, '.test-compras-seguridad-'));
  const schema = join(dir, 'schema.prisma');
  writeFileSync(schema, readFileSync(resolve('prisma/schema.prisma'), 'utf8'));
  writeFileSync(join(dir, 'test.db'), '');
  process.env.DATABASE_URL = `file:${join(dir, 'test.db').replaceAll('\\', '/')}`;
  process.env.JWT_SECRET = 'test-only-purchase-security-secret-32-bytes';
  const { prisma } = await import('../src/lib/prisma');

  try {
    execFileSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'db', 'push', '--schema', schema, '--skip-generate'], { env: process.env, stdio: 'pipe' });
    const { NextRequest } = await import('next/server');
    const { signToken, COOKIE_NAME } = await import('../src/lib/auth');
    const { POST: recibir } = await import('../src/app/api/ordenes-compra/[id]/recibir/route');
    const { GET: ordenesGet } = await import('../src/app/api/ordenes-compra/route');
    const { GET: almacenesGet } = await import('../src/app/api/almacenes/route');
    const { GET: ajustesGet } = await import('../src/app/api/inventarios/ajustes/route');

    const tenant = await prisma.tenant.create({ data: { nombreComercial: 'Prueba compras', razonSocial: 'Prueba compras', identificacionFiscal: randomUUID() } });
    const almacenAsignado = await prisma.almacen.create({ data: { tenantId: tenant.id, codigo: 'A1', nombre: 'Asignado' } });
    const otroAlmacen = await prisma.almacen.create({ data: { tenantId: tenant.id, codigo: 'A2', nombre: 'Otro' } });
    const proveedor = await prisma.proveedor.create({ data: { tenantId: tenant.id, codigo: 'P1', razonSocial: 'Proveedor', diasCredito: 30 } });
    const producto = await prisma.producto.create({ data: { tenantId: tenant.id, sku: 'SKU1', nombre: 'Producto', costoPromedio: 12.5 } });
    await prisma.existencia.create({ data: { almacenId: almacenAsignado.id, productoId: producto.id, cantidad: 1 } });
    const usuario = await prisma.usuario.create({ data: { tenantId: tenant.id, nombre: 'Almacenista', email: `${randomUUID()}@test.invalid`, passwordHash: 'fixture', rol: 'ALMACENISTA', almacenAsignadoId: almacenAsignado.id } });
    const admin = await prisma.usuario.create({ data: { tenantId: tenant.id, nombre: 'Admin', email: `${randomUUID()}@test.invalid`, passwordHash: 'fixture', rol: 'ADMIN' } });
    const token = await signToken({ id: usuario.id, email: usuario.email, rol: 'ALMACENISTA', tenantId: tenant.id });
    const adminToken = await signToken({ id: admin.id, email: admin.email, rol: 'ADMIN', tenantId: tenant.id });
    const request = (url: string, method = 'GET', body?: unknown, actor: 'ALMACENISTA' | 'ADMIN' = 'ALMACENISTA') => new NextRequest(`http://test.invalid${url}`, {
      method,
      headers: { Cookie: `${COOKIE_NAME}=${actor === 'ADMIN' ? adminToken : token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const orden = async (almacenId = almacenAsignado.id) => prisma.ordenCompra.create({
      data: {
        tenantId: tenant.id, proveedorId: proveedor.id, almacenDestinoId: almacenId,
        folio: `OC-${randomUUID()}`, subtotal: 62.5, impuestos: 10, total: 72.5,
        estado: 'AUTORIZADA', usuarioId: usuario.id, usuarioNombre: usuario.nombre,
        items: { create: { productoId: producto.id, cantidadSolicitada: 5, costoUnitario: 12.5, subtotal: 62.5 } },
      },
      include: { items: true },
    });
    const callReceive = (id: string, itemsRecibidos: unknown) => recibir(
      request(`/api/ordenes-compra/${id}/recibir`, 'POST', { itemsRecibidos }),
      { params: Promise.resolve({ id }) },
    );
    const stock = async (almacenId: string) => (await prisma.existencia.findUnique({ where: { almacenId_productoId: { almacenId, productoId: producto.id } } }))?.cantidad ?? 0;
    const expectNoPurchaseEffects = async (orderId: string, expectedStock: number, expectedReceived: number) => {
      assert.equal(await stock(almacenAsignado.id), expectedStock);
      assert.equal((await prisma.ordenCompraItem.findFirstOrThrow({ where: { ordenCompraId: orderId } })).cantidadRecibida, expectedReceived);
      assert.equal(await prisma.compra.count({ where: { tenantId: tenant.id } }), 0);
      assert.equal(await prisma.cuentaPorPagar.count({ where: { tenantId: tenant.id } }), 0);
      assert.equal(await prisma.movimientoKardex.count({ where: { tenantId: tenant.id } }), 0);
    };

    let passed = 0;
    const check = async (name: string, fn: () => Promise<void>) => { await fn(); passed++; console.log(`PASS ${name}`); };

    await check('almacenista no recibe en un almacén distinto al asignado', async () => {
      const oc = await orden(otroAlmacen.id);
      const response = await callReceive(oc.id, [{ productoId: producto.id, cantidad: 1 }]);
      assert.equal(response.status, 403);
      assert.equal(await stock(otroAlmacen.id), 0);
      await expectNoPurchaseEffects(oc.id, 1, 0);
    });

    await check('rechaza sobre-recepción y conserva el faltante sin efectos', async () => {
      const oc = await orden();
      const response = await callReceive(oc.id, [{ productoId: producto.id, cantidad: 5.01 }]);
      assert.equal(response.status, 400);
      await expectNoPurchaseEffects(oc.id, 1, 0);
    });

    await check('rechaza partida desconocida, duplicada y cantidad inválida', async () => {
      const oc = await orden();
      for (const items of [
        [{ productoId: randomUUID(), cantidad: 1 }],
        [{ productoId: producto.id, cantidad: 1 }, { productoId: producto.id, cantidad: 1 }],
        [{ productoId: producto.id, cantidad: Number.NaN }],
        [],
      ]) {
        const response = await callReceive(oc.id, items);
        assert.ok([400, 409].includes(response.status));
        await expectNoPurchaseEffects(oc.id, 1, 0);
      }
    });

    await check('permite recepción parcial y deja saldo pendiente; luego completa la OC', async () => {
      const oc = await orden();
      const first = await callReceive(oc.id, [{ productoId: producto.id, cantidad: 2 }]);
      assert.equal(first.status, 200);
      assert.equal((await first.json()).resultado.nuevoEstadoOC, 'RECIBIDA_PARCIAL');
      assert.equal(await stock(almacenAsignado.id), 3);
      assert.equal((await prisma.ordenCompraItem.findFirstOrThrow({ where: { ordenCompraId: oc.id } })).cantidadRecibida, 2);
      const second = await callReceive(oc.id, [{ productoId: producto.id, cantidad: 3 }]);
      assert.equal(second.status, 200);
      assert.equal((await second.json()).resultado.nuevoEstadoOC, 'RECIBIDA_TOTAL');
      assert.equal(await stock(almacenAsignado.id), 6);
    });

    await check('recepciones concurrentes no exceden la cantidad autorizada', async () => {
      const oc = await orden();
      const stockAntes = await stock(almacenAsignado.id);
      const comprasAntes = await prisma.compra.count({ where: { tenantId: tenant.id } });
      const cxpAntes = await prisma.cuentaPorPagar.count({ where: { tenantId: tenant.id } });
      const movimientosAntes = await prisma.movimientoKardex.count({ where: { tenantId: tenant.id } });
      const results = await Promise.all([
        callReceive(oc.id, [{ productoId: producto.id, cantidad: 4 }]),
        callReceive(oc.id, [{ productoId: producto.id, cantidad: 4 }]),
      ]);
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
      assert.equal(await stock(almacenAsignado.id), stockAntes + 4);
      assert.equal((await prisma.ordenCompraItem.findFirstOrThrow({ where: { ordenCompraId: oc.id } })).cantidadRecibida, 4);
      assert.equal(await prisma.compra.count({ where: { tenantId: tenant.id } }), comprasAntes + 1);
      assert.equal(await prisma.cuentaPorPagar.count({ where: { tenantId: tenant.id } }), cxpAntes + 1);
      assert.equal(await prisma.movimientoKardex.count({ where: { tenantId: tenant.id } }), movimientosAntes + 1);
    });

    await check('las lecturas de almacén omiten campos de costo para ALMACENISTA', async () => {
      const oc = await orden();
      const adjustment = await prisma.ajusteInventario.create({
        data: { tenantId: tenant.id, almacenId: almacenAsignado.id, folio: `AJ-${randomUUID()}`, tipo: 'CONTEO_FISICO', motivo: 'CONTEO_FISICO', usuarioId: usuario.id, usuarioNombre: usuario.nombre,
          items: { create: { productoId: producto.id, cantidadAnterior: 1, cantidadAjustada: 0, cantidadNueva: 1, costoUnitario: 12.5 } } },
      });
      const [ordersResponse, warehousesResponse, adjustmentsResponse] = await Promise.all([
        ordenesGet(request('/api/ordenes-compra')),
        almacenesGet(request('/api/almacenes')),
        ajustesGet(request('/api/inventarios/ajustes')),
      ]);
      const orders = await ordersResponse.json();
      const warehouses = await warehousesResponse.json();
      const adjustments = await adjustmentsResponse.json();
      const orderJson = orders.find((x: any) => x.id === oc.id);
      const warehouseJson = warehouses.find((x: any) => x.id === almacenAsignado.id);
      const adjustmentJson = adjustments.find((x: any) => x.id === adjustment.id);
      assert.ok(orderJson);
      for (const key of ['subtotal', 'impuestos', 'total']) assert.equal(key in orderJson, false);
      for (const key of ['costoUnitario', 'subtotal']) assert.equal(key in orderJson.items[0], false);
      assert.equal('costoPromedio' in orderJson.items[0].producto, false);
      assert.equal('costoPromedio' in warehouseJson.existencias[0].producto, false);
      assert.equal('costoUnitario' in adjustmentJson.items[0], false);
      assert.equal('costoPromedio' in adjustmentJson.items[0].producto, false);
      const [adminOrders, adminWarehouses, adminAdjustments] = await Promise.all([
        ordenesGet(request('/api/ordenes-compra', 'GET', undefined, 'ADMIN')),
        almacenesGet(request('/api/almacenes', 'GET', undefined, 'ADMIN')),
        ajustesGet(request('/api/inventarios/ajustes', 'GET', undefined, 'ADMIN')),
      ]);
      const adminOrder = (await adminOrders.json()).find((x: any) => x.id === oc.id);
      const adminWarehouse = (await adminWarehouses.json()).find((x: any) => x.id === almacenAsignado.id);
      const adminAdjustment = (await adminAdjustments.json()).find((x: any) => x.id === adjustment.id);
      assert.equal(adminOrder.total, 72.5);
      assert.equal(adminOrder.items[0].costoUnitario, 12.5);
      assert.equal(adminWarehouse.existencias[0].producto.costoPromedio, 12.5);
      assert.equal(adminAdjustment.items[0].costoUnitario, 12.5);
    });

    console.log(`${passed} escenarios aprobados. Base temporal; demo intacta.`);
  } finally {
    await prisma.$disconnect();
    if (!resolve(dir).startsWith(root + '\\') && !resolve(dir).startsWith(root + '/')) throw new Error('Directorio de pruebas fuera del workspace');
    rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
