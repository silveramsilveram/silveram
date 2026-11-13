import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test, { after, before, beforeEach, mock } from 'node:test';
import cookieParser from 'cookie-parser';
import express from 'express';
import { createMemoryAppwrite } from './helpers/memory-appwrite.js';

// Runs the real admin, product, upload and webhook routers against an in-memory Appwrite whose
// transactions stage and validate writes the way Appwrite does. Needs Node >= 22.3 (mock.module).

const mem = createMemoryAppwrite();
const ADMIN_ORIGIN = 'https://admin.silveram.test';
const config = {
  origins: [ADMIN_ORIGIN, 'https://www.silveram.test'],
  adminEmails: new Set(['owner@silveram.test']),
  lowStockThreshold: 3,
  isProduction: false,
  liveCheckout: true,
  codEnabled: true,
  cashfreeEnabled: true,
  cashfreeEnv: 'sandbox',
  cashfreeSecretKey: 'cashfree-test-secret',
  cashfreeAppId: 'app',
  testPayments: false,
  productImageHosts: new Set(),
  cloudinaryCloudName: '',
  cloudinaryApiKey: '',
  cloudinaryApiSecret: '',
  cloudinaryRootFolder: 'silveram',
  adminEmailsCount: 1,
  storeUrl: 'https://www.silveram.test',
};

let server;
let base;
let resetCaches = () => {};
let hashToken; // imported after the Appwrite mock is installed, like every module that touches it

before(async () => {
  mock.module(new URL('../src/platform/appwrite.js', import.meta.url).href, { namedExports: mem.named });
  mock.module(new URL('../src/mail/transport.js', import.meta.url).href, {
    namedExports: { getMailer: () => null, mailConfigured: () => false },
  });
  ({ hashToken } = await import('../src/security.js'));
  const { resetAnalyticsCaches } = await import('../src/admin/analytics.js');
  const { resetInventoryCaches } = await import('../src/admin/inventory.js');
  resetCaches = () => { resetAnalyticsCaches(); resetInventoryCaches(); };
  const { createAdminRouter } = await import('../src/routes/admin.js');
  const { createProductsRouter } = await import('../src/routes/products.js');
  const { createUploadsRouter } = await import('../src/routes/uploads.js');
  const { createWebhookRouter } = await import('../src/routes/webhooks.js');
  const app = express();
  app.use(cookieParser());
  app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '1mb' }));
  app.use('/api/webhooks', createWebhookRouter(config));
  app.use(express.json());
  app.use('/api/admin', createAdminRouter(config));
  app.use('/api/products', createProductsRouter(config));
  app.use('/api/uploads', createUploadsRouter(config));
  app.use((error, req, res, _next) => {
    if (!error?.status) console.error('UNEXPECTED', req.method, req.path, error?.stack || error);
    res.status(error?.status || 500).json({ error: error.message });
  });
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => server?.close());

const T0 = Date.UTC(2026, 5, 10, 8); // 10 Jun 2026, 13:30 IST
const day = (n) => T0 + n * 24 * 60 * 60 * 1000;

beforeEach(() => {
  mem.clear();
  resetCaches();
  const future = Date.now() + 86_400_000;
  mem.seed('sessions', 's-admin', { tokenHash: hashToken('admin-token'), userId: 'u-admin', email: 'owner@silveram.test', expiresAt: future });
  mem.seed('sessions', 's-shopper', { tokenHash: hashToken('shopper-token'), userId: 'u-shopper', email: 'shopper@example.com', expiresAt: future });
  mem.seed('products', 'p1', {
    sku: 'SV-001', name: 'Silver Ring', description: 'd', category: 'ring', priceInPaise: 50000, currency: 'INR',
    stockQuantity: 10, imagesJson: '[]', active: true, createdAt: T0, updatedAt: T0,
  });
});

async function api(method, path, { body, token = 'admin-token', origin = ADMIN_ORIGIN, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(token && { Cookie: `silveram_session=${token}` }),
      ...(origin && { Origin: origin }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* csv or empty */ }
  return { status: response.status, json, text, headers: response.headers };
}

function addOrder(id, over = {}) {
  mem.seed('orders', id, {
    userId: 'guest', email: `${id}@example.com`, status: 'placed_cod', paymentMethod: 'cod', amountInPaise: 100000, currency: 'INR',
    itemsJson: JSON.stringify([{ productId: 'p1', sku: 'SV-001', name: 'Silver Ring', quantity: 2, unitPriceInPaise: 50000, lineTotalInPaise: 100000 }]),
    shippingJson: JSON.stringify({ name: 'Asha Rao', phone: '9876543210', address: '12 MG Road', city: 'Pune', state: 'Maharashtra', postalCode: '411001', country: 'IN' }),
    customerName: 'Asha Rao', customerPhone: '9876543210', createdAt: T0, updatedAt: T0, confirmationEmailAttempts: 0, ...over,
  });
}

const RANGE = 'from=2026-06-01&to=2026-06-30';

// ---------------------------------------------------------------- authorisation

const ADMIN_ROUTES = [
  ['GET', '/admin/me'], ['GET', '/admin/status'], ['GET', '/admin/dashboard/summary'],
  ['GET', '/admin/analytics/sales'], ['GET', '/admin/analytics/orders'], ['GET', '/admin/analytics/products'],
  ['GET', '/admin/analytics/customers'], ['GET', '/admin/analytics/fulfilment'],
  ['GET', '/admin/orders'], ['GET', '/admin/orders/o1'], ['GET', '/admin/orders/o1/timeline'],
  ['PATCH', '/admin/orders/o1/status', { status: 'fulfilled' }], ['POST', '/admin/orders/o1/cancel', {}],
  ['PATCH', '/admin/orders/o1/fulfilment', { shippingStatus: 'packed' }], ['POST', '/admin/orders/o1/shipping-events', { note: 'x' }],
  ['POST', '/admin/orders/o1/cod-collection', {}], ['POST', '/admin/orders/o1/cod-remittance', {}],
  ['GET', '/admin/transactions'], ['GET', '/admin/transactions/t1'], ['GET', '/admin/cod/outstanding'],
  ['GET', '/admin/inventory'], ['GET', '/admin/inventory/summary'], ['GET', '/admin/inventory/movements'],
  ['POST', '/admin/inventory/p1/adjust', { requestId: 'r1', type: 'restock', mode: 'delta', value: 1, reason: 'test' }],
  ['GET', '/admin/customers'], ['GET', '/admin/customers/c1'], ['GET', '/admin/customers/c1/orders'],
  ['GET', '/admin/products'], ['GET', '/admin/products/p1'], ['GET', '/admin/products/p1/price-history'], ['GET', '/admin/price-history'],
  ['GET', '/admin/reports'], ['GET', '/admin/reports/orders.csv'], ['GET', '/admin/reports/inventory.csv'],
  ['GET', '/products/admin'], ['POST', '/products/admin', {}], ['PATCH', '/products/admin/p1', { active: false }], ['DELETE', '/products/admin/p1'],
  ['POST', '/uploads/sign', { target: 'site', area: 'hero' }],
];

test('every admin route rejects anonymous visitors (401) and signed-in non-admins (403) without leaking data', async () => {
  addOrder('o1');
  for (const [method, path, body] of ADMIN_ROUTES) {
    const anonymous = await api(method, path, { body, token: null });
    assert.equal(anonymous.status, 401, `${method} ${path} anonymous`);
    const shopper = await api(method, path, { body, token: 'shopper-token' });
    assert.equal(shopper.status, 403, `${method} ${path} non-admin`);
    assert.doesNotMatch(shopper.text, /example\.com|9876543210|Silver Ring/, `${method} ${path} leaked data`);
  }
  assert.equal(mem.all('inventoryMovements').length, 0);
});

test('expired sessions are treated as signed out (401)', async () => {
  mem.seed('sessions', 's-old', { tokenHash: hashToken('old-token'), userId: 'u-admin', email: 'owner@silveram.test', expiresAt: Date.now() - 1000 });
  assert.equal((await api('GET', '/admin/me', { token: 'old-token' })).status, 401);
});

test('/admin/me returns minimal admin identity, store basics and schema readiness', async () => {
  const { status, json } = await api('GET', '/admin/me');
  assert.equal(status, 200);
  assert.deepEqual(json.user, { id: 'u-admin', email: 'owner@silveram.test' });
  assert.deepEqual(json.permissions, ['admin']);
  assert.equal(json.store.timezone, 'Asia/Kolkata');
  assert.equal(json.schema.ready, true);
  assert.ok(!JSON.stringify(json).includes('cashfree-test-secret'));
});

test('state-changing admin calls need a trusted Origin (CSRF defence); reads do not', async () => {
  addOrder('o1');
  const body = { note: 'hello' };
  assert.equal((await api('POST', '/admin/orders/o1/shipping-events', { body, origin: null })).status, 403);
  assert.equal((await api('POST', '/admin/orders/o1/shipping-events', { body, origin: 'https://evil.example' })).status, 403);
  assert.equal((await api('POST', '/admin/orders/o1/shipping-events', { body })).status, 201);
  assert.equal((await api('GET', '/admin/orders', { origin: null })).status, 200);
  assert.equal((await api('POST', '/products/admin', { body: {}, origin: null })).status, 403);
  assert.equal((await api('POST', '/uploads/sign', { body: { target: 'site', area: 'hero' }, origin: 'https://evil.example' })).status, 403);
});

test('admin status exposes readiness booleans and never a secret', async () => {
  const { json, text } = await api('GET', '/admin/status');
  assert.equal(json.integrations.cashfree.enabled, true);
  assert.equal(json.capabilities.refunds, false);
  assert.ok(!text.includes('cashfree-test-secret'));
});

// ---------------------------------------------------------------- products

const newProduct = { sku: 'SV-NEW', name: 'New Bangle', description: 'Plain.', category: 'bangle', priceInPaise: 120000, stockQuantity: 4, active: true };

test('creating a product records its first price and its opening stock together', async () => {
  const { status, json } = await api('POST', '/products/admin', { body: newProduct });
  assert.equal(status, 201);
  const id = json.product.id;
  const history = mem.all('productPriceHistory');
  assert.equal(history.length, 1);
  assert.equal(history[0].productId, id);
  assert.equal(history[0].newPriceInPaise, 120000);
  assert.equal(history[0].previousPriceInPaise, undefined);
  assert.equal(history[0].changedBy, 'owner@silveram.test');
  const movements = mem.all('inventoryMovements');
  assert.equal(movements.length, 1);
  assert.deepEqual([movements[0].type, movements[0].delta, movements[0].quantityAfter], ['initial_stock', 4, 4]);
});

test('a price change writes an immutable history row with the server-known actor', async () => {
  const { status } = await api('PATCH', '/products/admin/p1', { body: { priceInPaise: 65000, priceChangeReason: 'Festive revision' } });
  assert.equal(status, 200);
  assert.equal(mem.get('products', 'p1').priceInPaise, 65000);
  const [row] = mem.all('productPriceHistory');
  assert.deepEqual([row.previousPriceInPaise, row.newPriceInPaise, row.changedBy, row.reason], [50000, 65000, 'owner@silveram.test', 'Festive revision']);
  // An unchanged price adds nothing; a client cannot choose who made the change.
  await api('PATCH', '/products/admin/p1', { body: { priceInPaise: 65000, name: 'Silver Ring II' } });
  assert.equal(mem.all('productPriceHistory').length, 1);
  assert.equal((await api('PATCH', '/products/admin/p1', { body: { priceInPaise: 70000, changedBy: 'mallory@x.in' } })).status, 400);
  assert.equal(mem.get('products', 'p1').priceInPaise, 65000);
});

test('stock cannot be changed through the product form (it must go through Inventory with a reason)', async () => {
  assert.equal((await api('PATCH', '/products/admin/p1', { body: { stockQuantity: 99 } })).status, 400);
  assert.equal(mem.get('products', 'p1').stockQuantity, 10);
  assert.equal((await api('PATCH', '/products/admin/p1', { body: { stockQuantity: 10, name: 'Same stock ok' } })).status, 200);
});

test('product validation rejects bad prices and stock; delete is a soft deactivation that can be undone', async () => {
  for (const bad of [{ priceInPaise: 0 }, { priceInPaise: 10.5 }, { priceInPaise: -1 }, { stockQuantity: -1 }, { sku: '' }]) {
    assert.equal((await api('POST', '/products/admin', { body: { ...newProduct, ...bad } })).status, 400, JSON.stringify(bad));
  }
  assert.equal((await api('DELETE', '/products/admin/p1')).status, 204);
  assert.equal(mem.get('products', 'p1').active, false);
  assert.ok(mem.get('products', 'p1').deletedAt);
  assert.ok(mem.get('products', 'p1'), 'the document is kept');
  await api('PATCH', '/products/admin/p1', { body: { active: true } });
  assert.equal(mem.get('products', 'p1').deletedAt, null);
});

test('upload signing works for an admin session and never returns the Cloudinary secret', async () => {
  const configured = { ...config, cloudinaryCloudName: 'demo', cloudinaryApiKey: '123', cloudinaryApiSecret: 'super-secret-value' };
  const { createUploadsRouter } = await import('../src/routes/uploads.js');
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/uploads', createUploadsRouter(configured));
  const local = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  try {
    const url = `http://127.0.0.1:${local.address().port}/api/uploads/sign`;
    const headers = { 'Content-Type': 'application/json', Cookie: 'silveram_session=admin-token', Origin: ADMIN_ORIGIN };
    const ok = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ target: 'product', sku: 'SV-001' }) });
    const text = await ok.text();
    assert.equal(ok.status, 200);
    assert.match(text, /signature/);
    assert.ok(!text.includes('super-secret-value'));
    assert.match(JSON.parse(text).upload.folder || text, /products\/sv-001/);
  } finally {
    local.close();
  }
});

test('products list is paginated, filterable and searchable on the server; price history paginates', async () => {
  for (let i = 0; i < 7; i += 1) {
    mem.seed('products', `px${i}`, { sku: `PX-${i}`, name: `Bangle ${i}`, description: '', category: i % 2 ? 'ring' : 'bangle', priceInPaise: 1000 + i, currency: 'INR', stockQuantity: i, imagesJson: '[]', active: i !== 3, createdAt: T0 + i, updatedAt: T0 + i });
  }
  const first = (await api('GET', '/admin/products?limit=3&sort=priceInPaise&dir=asc')).json;
  assert.equal(first.data.length, 3);
  assert.equal(first.total, 8);
  const second = (await api('GET', '/admin/products?limit=3&page=2&sort=priceInPaise&dir=asc')).json;
  assert.notDeepEqual(first.data.map((p) => p.id), second.data.map((p) => p.id));
  assert.equal((await api('GET', '/admin/products?category=bangle')).json.total, 4);
  assert.equal((await api('GET', '/admin/products?active=false')).json.total, 1);
  assert.equal((await api('GET', '/admin/products?stock=out')).json.data[0].sku, 'PX-0');
  assert.equal((await api('GET', '/admin/products?search=PX-5')).json.data[0].sku, 'PX-5');
  assert.equal((await api('GET', '/admin/products?limit=500')).status, 400, 'page size is bounded');
  await api('PATCH', '/products/admin/p1', { body: { priceInPaise: 60000 } });
  const history = (await api('GET', '/admin/products/p1/price-history')).json;
  assert.equal(history.total, 1);
  assert.ok(history.trackingStartedAt > 0);
});

// ---------------------------------------------------------------- orders

test('orders are paginated, filtered and searched on the server', async () => {
  for (let i = 0; i < 9; i += 1) {
    addOrder(`order-a${i}`, {
      createdAt: day(i), email: i === 4 ? 'rita@example.com' : `buyer${i}@example.com`,
      status: i % 3 === 0 ? 'paid' : 'placed_cod', paymentMethod: i % 3 === 0 ? 'cashfree' : 'cod',
      amountInPaise: 10000 * (i + 1),
      ...(i === 6 && { customerName: 'Meera Joshi', customerPhone: '9000000006' }),
    });
  }
  const page1 = (await api('GET', '/admin/orders?limit=4&page=1')).json;
  assert.equal(page1.total, 9);
  assert.equal(page1.data.length, 4);
  assert.equal(page1.data[0].id, 'order-a8', 'newest first');
  const page3 = (await api('GET', '/admin/orders?limit=4&page=3')).json;
  assert.deepEqual(page3.data.map((o) => o.id), ['order-a0']);
  assert.equal((await api('GET', '/admin/orders?status=paid')).json.total, 3);
  assert.equal((await api('GET', '/admin/orders?paymentMethod=cod')).json.total, 6);
  assert.equal((await api('GET', `/admin/orders?from=2026-06-12&to=2026-06-13`)).json.total, 2);
  assert.equal((await api('GET', '/admin/orders?sort=amountInPaise&dir=asc&limit=1')).json.data[0].id, 'order-a0');
  assert.equal((await api('GET', '/admin/orders?search=order-a5')).json.data[0].id, 'order-a5');
  assert.equal((await api('GET', '/admin/orders?search=rita@exa')).json.data[0].id, 'order-a4');
  assert.equal((await api('GET', '/admin/orders?search=9000000006')).json.data[0].id, 'order-a6');
  assert.equal((await api('GET', '/admin/orders?search=Meera')).json.data[0].id, 'order-a6');
  assert.equal((await api('GET', '/admin/orders?status=bogus')).status, 400);
  assert.equal((await api('GET', '/admin/orders?sort=itemsJson')).status, 400);
  // The list never carries phone numbers or street addresses.
  assert.doesNotMatch((await api('GET', '/admin/orders')).text, /9876543210|MG Road/);
});

test('order detail shows the purchase-time prices, not the current catalogue price', async () => {
  addOrder('o1');
  mem.seed('products', 'p1', { ...mem.get('products', 'p1'), priceInPaise: 999999 });
  const { json } = await api('GET', '/admin/orders/o1');
  assert.equal(json.order.items[0].unitPriceInPaise, 50000);
  assert.equal(json.order.shipping.phone, '9876543210');
  assert.equal(json.timeline[0].type, 'order_placed');
  assert.equal(json.timeline[0].source, 'order_record');
  assert.equal((await api('GET', '/admin/orders/does-not-exist-1')).status, 404);
});

test('fulfilment: legal moves only, dates validated, dispatch marks the order fulfilled, events are audited', async () => {
  addOrder('o1');
  assert.equal((await api('PATCH', '/admin/orders/o1/fulfilment', { body: { shippingStatus: 'delivered' } })).status, 409, 'cannot skip dispatch');
  assert.equal((await api('PATCH', '/admin/orders/o1/fulfilment', { body: { shippingStatus: 'sent-by-pigeon' } })).status, 400);
  assert.equal((await api('PATCH', '/admin/orders/o1/fulfilment', { body: { status: 'paid' } })).status, 400, 'no arbitrary status from the browser');
  assert.equal((await api('PATCH', '/admin/orders/o1/fulfilment', { body: { expectedDispatchAt: day(5), estimatedDeliveryAt: day(2) } })).status, 400);
  assert.equal((await api('PATCH', '/admin/orders/o1/fulfilment', { body: { trackingUrl: 'http://insecure.example' } })).status, 400);

  const packed = await api('PATCH', '/admin/orders/o1/fulfilment', { body: { shippingStatus: 'packed', estimatedDeliveryAt: day(4), ifUpdatedAt: T0 } });
  assert.equal(packed.status, 200);
  assert.equal(packed.json.order.shippingStatus, 'packed');
  assert.equal(packed.json.order.status, 'placed_cod');
  assert.equal((await api('PATCH', '/admin/orders/o1/fulfilment', { body: { shippingStatus: 'processing' } })).status, 409, 'cannot go backwards');
  assert.equal((await api('PATCH', '/admin/orders/o1/fulfilment', { body: { carrier: 'X', ifUpdatedAt: T0 } })).status, 409, 'stale view is refused');

  const dispatched = await api('PATCH', '/admin/orders/o1/fulfilment', { body: { shippingStatus: 'dispatched', carrier: 'India Post', trackingNumber: 'EE123', trackingUrl: 'https://track.example/EE123' } });
  assert.equal(dispatched.json.order.status, 'fulfilled');
  assert.ok(dispatched.json.order.dispatchedAt);
  const delivered = await api('PATCH', '/admin/orders/o1/fulfilment', { body: { shippingStatus: 'delivered' } });
  assert.equal(delivered.status, 200);
  assert.ok(delivered.json.order.deliveredAt >= delivered.json.order.dispatchedAt);
  assert.equal((await api('PATCH', '/admin/orders/o1/fulfilment', { body: { shippingStatus: 'delivered' } })).status, 409);

  const types = mem.all('orderEvents').map((e) => e.type);
  assert.deepEqual(types.filter((t) => t === 'shipping_status_changed').length, 3);
  assert.ok(mem.all('orderEvents').every((e) => e.actor === 'owner@silveram.test'));
});

test('typing a tracking number alone never marks anything dispatched or delivered', async () => {
  addOrder('o1');
  const res = await api('PATCH', '/admin/orders/o1/fulfilment', { body: { carrier: 'DTDC', trackingNumber: 'T1' } });
  assert.equal(res.status, 200);
  assert.equal(res.json.order.shippingStatus, 'pending');
  assert.equal(res.json.order.deliveredAt, null);
  assert.equal(res.json.order.status, 'placed_cod');
});

test('unpaid, cancelled and test-payment orders cannot be shipped', async () => {
  addOrder('unpaid', { status: 'pending_payment', paymentMethod: 'cashfree' });
  addOrder('gone', { status: 'cancelled' });
  addOrder('fake', { status: 'paid', paymentMethod: 'test' });
  for (const id of ['unpaid', 'gone', 'fake']) {
    assert.equal((await api('PATCH', `/admin/orders/${id}/fulfilment`, { body: { shippingStatus: 'packed' } })).status, 409, id);
  }
});

test('the legacy fulfilled endpoint still works but only for placed or paid orders', async () => {
  addOrder('o1');
  addOrder('o2', { status: 'pending_payment', paymentMethod: 'cashfree' });
  assert.equal((await api('PATCH', '/admin/orders/o1/status', { body: { status: 'fulfilled' } })).status, 200);
  assert.equal((await api('PATCH', '/admin/orders/o2/status', { body: { status: 'fulfilled' } })).status, 409);
  assert.equal((await api('PATCH', '/admin/orders/o1/status', { body: { status: 'paid' } })).status, 400);
});

test('COD cancellation restores stock exactly once, even when requested twice at the same moment', async () => {
  addOrder('o1');
  mem.seed('products', 'p1', { ...mem.get('products', 'p1'), stockQuantity: 8 });
  const [a, b] = await Promise.all([api('POST', '/admin/orders/o1/cancel', { body: {} }), api('POST', '/admin/orders/o1/cancel', { body: {} })]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  assert.equal(mem.get('products', 'p1').stockQuantity, 10, '8 + the 2 reserved units, once');
  assert.equal(mem.get('orders', 'o1').status, 'cancelled');
  assert.equal(mem.all('inventoryMovements').filter((m) => m.type === 'cancellation_restore').length, 1);
  assert.equal((await api('POST', '/admin/orders/o1/cancel', { body: {} })).status, 409, 'a later retry changes nothing');
  assert.equal(mem.get('products', 'p1').stockQuantity, 10);
});

test('cancellation refuses paid, shipped and cash-collected orders and rolls back everything on failure', async () => {
  addOrder('paid', { status: 'paid', paymentMethod: 'cashfree' });
  addOrder('shipped', { status: 'fulfilled', shippingStatus: 'dispatched' });
  addOrder('cash', { codCollectedInPaise: 100000 });
  for (const id of ['paid', 'shipped', 'cash']) assert.equal((await api('POST', `/admin/orders/${id}/cancel`, { body: {} })).status, 409, id);
  addOrder('broken', { itemsJson: JSON.stringify([{ productId: 'missing', quantity: 1 }]) });
  const stockBefore = mem.get('products', 'p1').stockQuantity;
  assert.equal((await api('POST', '/admin/orders/broken/cancel', { body: {} })).status, 500);
  assert.equal(mem.get('orders', 'broken').status, 'placed_cod', 'a failed cancellation leaves the order untouched');
  assert.equal(mem.get('products', 'p1').stockQuantity, stockBefore);
  assert.equal(mem.all('orderEvents').length, 0);
});

// ---------------------------------------------------------------- COD cash

test('COD cash: collected only after dispatch, once, in full; remitted only after collection; order value is not cash', async () => {
  addOrder('o1');
  assert.equal((await api('POST', '/admin/orders/o1/cod-collection', { body: {} })).status, 409, 'before dispatch');
  await api('PATCH', '/admin/orders/o1/fulfilment', { body: { shippingStatus: 'dispatched' } });
  assert.equal((await api('POST', '/admin/orders/o1/cod-remittance', { body: {} })).status, 409, 'nothing collected yet');
  assert.equal((await api('POST', '/admin/orders/o1/cod-collection', { body: { amountInPaise: 1 } })).status, 400, 'amount is never client-chosen');
  assert.equal((await api('POST', '/admin/orders/o1/cod-collection', { body: { at: Date.now() + 86_400_000 } })).status, 400, 'not in the future');

  const analyticsBefore = (await api('GET', '/admin/analytics/sales?from=2026-06-01&to=2026-06-30')).json.summary;
  assert.equal(analyticsBefore.codOrderValue, 100000);
  assert.equal(analyticsBefore.codCollected, 0);
  assert.equal(analyticsBefore.codAwaiting, 100000);

  const collected = await api('POST', '/admin/orders/o1/cod-collection', { body: { reference: 'COURIER-77', note: 'Paid in cash' } });
  assert.equal(collected.status, 201);
  assert.equal(collected.json.order.codCollectedInPaise, 100000);
  assert.equal((await api('POST', '/admin/orders/o1/cod-collection', { body: {} })).status, 409, 'no duplicate collection');
  const [row] = mem.all('transactions');
  assert.deepEqual([row.type, row.provider, row.reconciliation, row.amountInPaise, row.actor], ['cod_collection', 'cod', 'operator_recorded', 100000, 'owner@silveram.test']);

  const outstanding = (await api('GET', '/admin/cod/outstanding')).json;
  assert.equal(outstanding.awaitingCollection.count, 0);
  assert.equal(outstanding.heldNotRemitted.totalInPaise, 100000);

  assert.equal((await api('POST', '/admin/orders/o1/cod-remittance', { body: { at: T0 } })).status, 400, 'not before collection');
  assert.equal((await api('POST', '/admin/orders/o1/cod-remittance', { body: { reference: 'UTR123' } })).status, 201);
  assert.equal((await api('POST', '/admin/orders/o1/cod-remittance', { body: {} })).status, 409);
  assert.equal(mem.all('transactions').length, 2);
  const summary = (await api('GET', '/admin/analytics/sales?from=2026-06-01&to=2026-06-30')).json.summary;
  assert.deepEqual([summary.codCollected, summary.codRemitted, summary.codAwaiting, summary.codHeldBeforeRemittance], [100000, 100000, 0, 0]);
});

test('cash cannot be recorded for online-paid orders', async () => {
  addOrder('o1', { status: 'paid', paymentMethod: 'cashfree', shippingStatus: 'dispatched' });
  assert.equal((await api('POST', '/admin/orders/o1/cod-collection', { body: {} })).status, 409);
});

// ---------------------------------------------------------------- inventory

test('inventory adjustments need a reason, never go negative, are idempotent and leave a movement', async () => {
  const adjust = (body) => api('POST', '/admin/inventory/p1/adjust', { body });
  const ok = { requestId: 'req-1', type: 'restock', mode: 'delta', value: 5, reason: 'New batch from workshop' };
  assert.equal((await adjust({ ...ok, reason: '' })).status, 400);
  assert.equal((await adjust({ ...ok, type: 'order_reservation' })).status, 400, 'system movement types cannot be forged');
  assert.equal((await adjust({ ...ok, value: 0 })).status, 400);
  const res = await adjust(ok);
  assert.equal(res.status, 200);
  assert.equal(mem.get('products', 'p1').stockQuantity, 15);
  assert.equal((await adjust(ok)).status, 409, 'the same request id cannot apply twice');
  assert.equal(mem.get('products', 'p1').stockQuantity, 15);
  assert.equal((await adjust({ requestId: 'req-2', type: 'correction', mode: 'delta', value: -16, reason: 'Count' })).status, 409, 'would go negative');
  assert.equal((await adjust({ requestId: 'req-3', type: 'correction', mode: 'set', value: 7, reason: 'Stock-take' })).status, 200);
  assert.equal(mem.get('products', 'p1').stockQuantity, 7);
  assert.equal((await adjust({ requestId: 'req-4', type: 'restock', mode: 'delta', value: -1, reason: 'oops' })).status, 400, 'a restock must add');
  const movements = (await api('GET', '/admin/inventory/movements?productId=p1')).json;
  assert.equal(movements.total, 2);
  assert.deepEqual(movements.data.map((m) => [m.type, m.delta, m.quantityBefore, m.quantityAfter, m.actor]).reverse(), [
    ['restock', 5, 10, 15, 'owner@silveram.test'],
    ['correction', -8, 15, 7, 'owner@silveram.test'],
  ]);
  assert.equal((await api('POST', '/admin/inventory/nope/adjust', { body: ok })).status, 404);
});

test('inventory views: low and out-of-stock filters, reserved units from unexpired pending payments', async () => {
  mem.seed('products', 'low', { sku: 'L', name: 'Low', description: '', category: 'ring', priceInPaise: 1, currency: 'INR', stockQuantity: 2, imagesJson: '[]', active: true, createdAt: T0, updatedAt: T0 });
  mem.seed('products', 'out', { sku: 'O', name: 'Out', description: '', category: 'ring', priceInPaise: 1, currency: 'INR', stockQuantity: 0, imagesJson: '[]', active: true, createdAt: T0, updatedAt: T0 });
  addOrder('hold', { status: 'pending_payment', paymentMethod: 'cashfree', reservationExpiresAt: Date.now() + 600_000 });
  addOrder('stale', { status: 'pending_payment', paymentMethod: 'cashfree', reservationExpiresAt: Date.now() - 600_000 });
  assert.deepEqual((await api('GET', '/admin/inventory?state=low')).json.data.map((p) => p.sku), ['L']);
  assert.deepEqual((await api('GET', '/admin/inventory?state=out')).json.data.map((p) => p.sku), ['O']);
  const all = (await api('GET', '/admin/inventory')).json.data;
  assert.equal(all.find((p) => p.id === 'p1').reservedQuantity, 2, 'only the unexpired hold counts');
  const summary = (await api('GET', '/admin/inventory/summary')).json;
  assert.deepEqual([summary.outOfStock, summary.lowStock], [1, 1]);
});

// ---------------------------------------------------------------- analytics

test('analytics: pending/cancelled/expired/test orders are never revenue; unavailable months are null, real zeros are zero', async () => {
  addOrder('cod', { createdAt: day(1) });
  addOrder('paid', { createdAt: day(2), paymentMethod: 'cashfree', status: 'paid', amountInPaise: 250000, paymentChannel: 'upi', cashfreePaymentId: '9' });
  addOrder('pending', { createdAt: day(3), paymentMethod: 'cashfree', status: 'pending_payment', amountInPaise: 999999 });
  addOrder('cancelled', { createdAt: day(4), status: 'cancelled' });
  addOrder('fake', { createdAt: day(5), paymentMethod: 'test', status: 'paid', amountInPaise: 777777 });
  const { json, status } = await api('GET', `/admin/dashboard/summary?from=2026-03-01&to=2026-06-30`);
  assert.equal(status, 200);
  const k = json.kpis;
  assert.equal(k.onlineCollections, 250000);
  assert.equal(k.grossOrderValue, 350000);
  assert.equal(k.codAwaiting, 100000);
  assert.equal(k.confirmedOrders, 2);
  assert.equal(k.testOrdersExcluded, 1);
  assert.equal(k.refunds, 0);
  assert.equal(json.groupBy, 'month');
  const [, april, may, june] = json.series;
  assert.equal(json.series.length, 4);
  assert.deepEqual([april.available, may.available], [false, false], 'before the first order: unavailable');
  assert.equal(april.grossOrderValue, null);
  assert.equal(june.grossOrderValue, 350000);
  assert.ok(json.caveats.some((c) => /unavailable, not zero/.test(c)));
  assert.equal(json.coverage.ordersSince, day(1));
  assert.ok(Object.keys(json.definitions).includes('netCollected'));
  assert.equal(json.paymentMix.find((m) => m.key === 'test').excludedFromRevenue, true);
});

test('analytics ranges are validated and bounded', async () => {
  assert.equal((await api('GET', '/admin/dashboard/summary?from=2026-06-30&to=2026-06-01')).status, 400);
  assert.equal((await api('GET', '/admin/dashboard/summary?from=2020-01-01&to=2026-06-01')).status, 400);
  assert.equal((await api('GET', '/admin/dashboard/summary?from=June&to=2026-06-01')).status, 400);
  assert.equal((await api('GET', '/admin/analytics/sales?groupBy=hour')).status, 400);
});

test('an empty database yields honest empty analytics, not invented numbers', async () => {
  mem.clear();
  mem.seed('sessions', 's-admin', { tokenHash: hashToken('admin-token'), userId: 'u-admin', email: 'owner@silveram.test', expiresAt: Date.now() + 86_400_000 });
  const { json } = await api('GET', `/admin/dashboard/summary?${RANGE}`);
  assert.equal(json.kpis.ordersPlaced, 0);
  assert.equal(json.kpis.averageOrderValue, null);
  assert.equal(json.coverage.ordersSince, null);
  assert.ok(json.series.every((p) => p.available === false && p.grossOrderValue === null));
  assert.ok(json.caveats.some((c) => /no orders/.test(c)));
});

test('fulfilment analytics only use recorded timestamps; overdue open orders are listed', async () => {
  addOrder('late', { createdAt: day(-20), estimatedDeliveryAt: day(-10), status: 'placed_cod' });
  addOrder('ontime', { createdAt: day(-20), status: 'fulfilled', shippingStatus: 'delivered', dispatchedAt: day(-19), deliveredAt: day(-16), estimatedDeliveryAt: day(-15) });
  const { json } = await api('GET', '/admin/dashboard/summary?from=2026-05-01&to=2026-06-30');
  assert.equal(json.overdueTotal, 1);
  assert.equal(json.overdueOrders[0].id, 'late');
  assert.equal(json.fulfilment.onTimeRate, 1);
  assert.equal(json.fulfilment.avgHoursToDelivery, 96);
});

// ---------------------------------------------------------------- customers & reports

test('customers: masked phone in the list, no saved bag or address there, full contact only in the detail', async () => {
  mem.seed('customers', 'c1', { email: 'asha@example.com', name: 'Asha Rao', phone: '9876543210', addressJson: JSON.stringify({ city: 'Pune' }), source: 'guest', cartJson: '[{"id":"p1","quantity":1}]', createdAt: T0, updatedAt: T0 });
  addOrder('o1', { email: 'asha@example.com' });
  addOrder('o2', { email: 'asha@example.com', status: 'cancelled', amountInPaise: 55555 });
  const list = await api('GET', '/admin/customers?search=Asha');
  assert.equal(list.json.data[0].phoneMasked, '••••••3210');
  assert.equal(list.json.data[0].lifetimeOrderValueInPaise, 100000, 'cancelled orders do not count');
  assert.equal(list.json.data[0].orderCount, 2);
  assert.doesNotMatch(list.text, /9876543210|cart|Pune/);
  const detail = (await api('GET', '/admin/customers/c1')).json.customer;
  assert.equal(detail.phone, '9876543210');
  assert.equal(JSON.stringify(detail).includes('cartJson'), false);
  assert.equal((await api('GET', '/admin/customers/c1/orders')).json.total, 2);
  assert.equal((await api('GET', '/admin/customers?search=asha@')).json.total, 1);
});

test('CSV exports: admin only, no personal data, formulas neutralised, bounded and unknown reports 404', async () => {
  addOrder('o1', { shippingJson: JSON.stringify({ name: '=cmd|calc', phone: '9876543210', address: '1 Secret Street', city: '=HYPERLINK("http://x")', state: 'MH' }) });
  const res = await api('GET', `/admin/reports/orders.csv?${RANGE}`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/csv/);
  assert.match(res.headers.get('content-disposition'), /attachment/);
  assert.doesNotMatch(res.text, /9876543210|Secret Street|example\.com|=cmd/);
  assert.match(res.text, /'=HYPERLINK/);
  assert.match(res.text, /1000\.00/);
  assert.equal((await api('GET', '/admin/reports/nothing.csv')).status, 404);
  assert.equal((await api('GET', '/admin/reports/product-sales.csv?from=2020-01-01&to=2026-01-01')).status, 400);
  const sales = await api('GET', `/admin/reports/product-sales.csv?${RANGE}`);
  assert.equal(sales.status, 200);
});

// ---------------------------------------------------------------- Cashfree webhooks & ledger

function webhook(event, { secret = config.cashfreeSecretKey, timestamp = '1760000000000' } = {}) {
  const body = Buffer.from(JSON.stringify(event));
  const signature = createHmac('sha256', secret).update(timestamp).update(body).digest('base64');
  return fetch(`${base}/webhooks/cashfree`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-webhook-signature': signature, 'x-webhook-timestamp': timestamp },
    body,
  });
}
const paymentEvent = (over = {}) => ({
  type: 'PAYMENT_SUCCESS_WEBHOOK',
  data: {
    order: { order_id: 'cf-order-1' },
    payment: { cf_payment_id: 5551, payment_status: 'SUCCESS', payment_amount: 2500, payment_currency: 'INR', payment_group: 'upi', payment_time: '2026-06-10T10:00:00+05:30', ...over },
  },
});

test('webhook: bad signatures are rejected; a verified payment is recorded once, replays change nothing', async () => {
  addOrder('w1', { paymentMethod: 'cashfree', status: 'pending_payment', amountInPaise: 250000, cashfreeOrderId: 'cf-order-1', reservationExpiresAt: Date.now() + 600_000 });
  assert.equal((await webhook(paymentEvent(), { secret: 'wrong' })).status, 400);
  assert.equal(mem.get('orders', 'w1').status, 'pending_payment');

  assert.equal((await webhook(paymentEvent())).status, 200);
  assert.equal(mem.get('orders', 'w1').status, 'paid');
  assert.equal(mem.all('transactions').length, 1);
  const [row] = mem.all('transactions');
  assert.deepEqual([row.type, row.status, row.amountInPaise, row.channel, row.reconciliation, row.test], ['payment', 'success', 250000, 'upi', 'provider_verified', false]);

  assert.equal((await webhook(paymentEvent())).status, 200, 'replay is accepted');
  assert.equal(mem.all('transactions').length, 1, 'and does not add a second ledger row');
  assert.equal(mem.all('webhookEvents').length, 1);
});

test('webhook: failed attempts are attempts, not collections; several attempts never double count a sale', async () => {
  addOrder('w1', { createdAt: day(1), paymentMethod: 'cashfree', status: 'pending_payment', amountInPaise: 250000, cashfreeOrderId: 'cf-order-1', reservationExpiresAt: Date.now() + 600_000 });
  await webhook(paymentEvent({ cf_payment_id: 1, payment_status: 'FAILED' }).data && { type: 'PAYMENT_FAILED_WEBHOOK', data: paymentEvent({ cf_payment_id: 1, payment_status: 'FAILED' }).data });
  await webhook({ type: 'PAYMENT_FAILED_WEBHOOK', data: paymentEvent({ cf_payment_id: 2, payment_status: 'FAILED' }).data });
  let summary = (await api('GET', '/admin/analytics/sales?from=2026-06-01&to=2026-06-30')).json.summary;
  assert.equal(summary.onlineCollections, 0, 'failed and pending attempts collect nothing');
  await webhook(paymentEvent({ cf_payment_id: 3 }));
  summary = (await api('GET', '/admin/analytics/sales?from=2026-06-01&to=2026-06-30')).json.summary;
  assert.equal(summary.onlineCollections, 250000);
  const byType = Object.groupBy(mem.all('transactions'), (t) => `${t.type}:${t.status}`);
  assert.equal(byType['payment_attempt:failed'].length, 2);
  assert.equal(byType['payment:success'].length, 1);
  const list = (await api('GET', '/admin/transactions?type=payment_attempt')).json;
  assert.equal(list.total, 2);
  assert.equal((await api('GET', '/admin/transactions?type=payment')).json.total, 1);
});

test('webhook: money taken for an expired order goes to payment review, flagged in the ledger', async () => {
  addOrder('w2', { paymentMethod: 'cashfree', status: 'expired', amountInPaise: 250000, cashfreeOrderId: 'cf-order-1' });
  await webhook(paymentEvent());
  assert.equal(mem.get('orders', 'w2').status, 'payment_review');
  assert.equal(mem.all('transactions')[0].reconciliation, 'needs_review');
});

test('refunds reduce net collected only once a verified refund is in the ledger', async () => {
  addOrder('w3', { createdAt: day(1), paymentMethod: 'cashfree', status: 'paid', amountInPaise: 250000, cashfreeOrderId: 'cf-order-1', cashfreePaymentId: '5551' });
  let k = (await api('GET', `/admin/dashboard/summary?${RANGE}`)).json.kpis;
  assert.equal(k.refunds, 0);
  assert.equal(k.netCollected, 250000);
  mem.seed('orders', 'w3', { ...mem.get('orders', 'w3'), status: 'refunded' });
  k = (await api('GET', `/admin/dashboard/summary?${RANGE}`)).json.kpis;
  assert.equal(k.netCollected, 250000, 'a "refunded" label without a ledger row subtracts nothing');
  await webhook({ type: 'REFUND_STATUS_WEBHOOK', data: { order: { order_id: 'cf-order-1' }, refund: { cf_refund_id: 'r1', refund_status: 'SUCCESS', refund_amount: 1000, processed_at: new Date().toISOString() } } });
  const range = `from=${new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)}&to=${new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}`;
  const sales = (await api('GET', `/admin/analytics/sales?${range}`)).json.summary;
  assert.equal(sales.refunds, 100000);
  const refundRows = mem.all('transactions').filter((t) => t.type === 'refund');
  assert.equal(refundRows.length, 1);
  assert.equal(refundRows[0].providerRefundId, 'r1');
});

test('transaction detail returns sanitised ledger data and the linked order', async () => {
  addOrder('w1', { paymentMethod: 'cashfree', status: 'pending_payment', amountInPaise: 250000, cashfreeOrderId: 'cf-order-1', reservationExpiresAt: Date.now() + 600_000 });
  await webhook(paymentEvent());
  const [row] = mem.all('transactions');
  const { json } = await api('GET', `/admin/transactions/${row.$id}`);
  assert.equal(json.transaction.type, 'payment');
  assert.equal(json.order.id, 'w1');
  assert.doesNotMatch(JSON.stringify(json), /cashfree-test-secret|"shipping":|9876543210/);
  assert.equal((await api('GET', '/admin/transactions/none')).status, 404);
});
