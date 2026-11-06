import assert from 'node:assert/strict';
import test, { after, before, mock } from 'node:test';
import cookieParser from 'cookie-parser';
import express from 'express';
import { Query } from 'node-appwrite';

// End-to-end check of guest/account checkout, test payments, order lookup and saved-bag e-mails,
// running the real Express routes against an in-memory stand-in for Appwrite and for Mailjet.
// Needs Node >= 22.3 (mock.module); the script in package.json passes the required flag.

const store = new Map(); // `${collection}/${id}` -> document
const sent = []; // captured e-mails

const key = (collection, id) => `${collection}/${id}`;
const docsOf = (collection) => [...store.entries()].filter(([k]) => k.startsWith(`${collection}/`)).map(([, v]) => v);
const conflict = () => Object.assign(new Error('exists'), { code: 409 });

function applyQueries(rows, queries) {
  let result = rows;
  let limit = Infinity;
  for (const raw of queries) {
    const q = JSON.parse(raw);
    const [value] = q.values ?? [];
    if (q.method === 'equal') result = result.filter((d) => d[q.attribute] === value);
    else if (q.method === 'lessThan') result = result.filter((d) => d[q.attribute] < value);
    else if (q.method === 'greaterThan') result = result.filter((d) => d[q.attribute] > value);
    else if (q.method === 'isNull') result = result.filter((d) => d[q.attribute] == null);
    else if (q.method === 'orderDesc') result = [...result].sort((a, b) => b[q.attribute] - a[q.attribute]);
    else if (q.method === 'limit') limit = value;
  }
  return result.slice(0, limit);
}

const fakeAppwrite = {
  Query,
  ID: { unique: () => crypto.randomUUID().slice(0, 20) },
  isNotFound: (error) => error?.code === 404,
  getAppwrite: () => ({
    databaseId: 'db',
    collections: { products: 'products', orders: 'orders', rateLimits: 'rateLimits' },
    databases: {
      updateDocument: async ({ collectionId, documentId, data }) => {
        const k = key(collectionId, documentId);
        store.set(k, { ...store.get(k), ...data });
      },
      incrementDocumentAttribute: async ({ collectionId, documentId, attribute, value, max }) => {
        const k = key(collectionId, documentId);
        const doc = store.get(k);
        if (doc[attribute] + value > max) throw Object.assign(new Error('max'), { code: 400 });
        doc[attribute] += value;
        return doc;
      },
    },
  }),
  getDocument: async (collection, id) => store.get(key(collection, id)) ?? null,
  createDocument: async (collection, id, data) => {
    if (store.has(key(collection, id))) throw conflict();
    const doc = { $id: id, ...data };
    store.set(key(collection, id), doc);
    return doc;
  },
  updateDocument: async (collection, id, data) => {
    const k = key(collection, id);
    if (!store.has(k)) throw Object.assign(new Error('missing'), { code: 404 });
    const doc = { ...store.get(k), ...data };
    store.set(k, doc);
    return doc;
  },
  deleteDocument: async (collection, id) => store.delete(key(collection, id)),
  listDocuments: async (collection, queries = []) => applyQueries(docsOf(collection), queries),
  findDocument: async (collection, field, value) => docsOf(collection).find((d) => d[field] === value) ?? null,
  runTransaction: async (work) => work('txn'),
};

const fakeMailer = { sendMail: async (message) => void sent.push(message) };

let server;
let base;
const config = {
  liveCheckout: true,
  codEnabled: true,
  razorpayEnabled: false,
  testPayments: true,
  storeName: 'Silveram',
  storeUrl: 'https://silveram.example',
  supportEmail: '',
  smtpFrom: 'Silveram <orders@silveram.example>',
};

before(async () => {
  mock.module(new URL('../src/platform/appwrite.js', import.meta.url).href, { namedExports: fakeAppwrite });
  mock.module(new URL('../src/mail/transport.js', import.meta.url).href, {
    namedExports: { getMailer: () => fakeMailer, mailConfigured: () => true },
  });
  const { createOrdersRouter } = await import('../src/routes/orders.js');
  const { createCartRouter } = await import('../src/routes/cart.js');
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/orders', createOrdersRouter(config));
  app.use('/api/cart', createCartRouter(config));
  app.use((error, _req, res, _next) => res.status(error?.status || 500).json({ error: error.message }));
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => server?.close());

function seed() {
  store.clear();
  sent.length = 0;
  store.set('products/product-1', {
    $id: 'product-1', sku: 'SV-001', name: 'Silver Frame', active: true, currency: 'INR',
    priceInPaise: 99900, stockQuantity: 5,
  });
}

const call = (path, body, headers = {}) =>
  fetch(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const customer = {
  name: 'Asha Rao', phone: '9876543210', address: '12 MG Road', city: 'Pune',
  state: 'Maharashtra', postalCode: '411001', country: 'IN',
};
const order = (id, extra = {}) => ({
  requestId: id, paymentMethod: 'test', paymentChannel: 'upi', guestEmail: 'Asha@Example.com', customer,
  items: [{ id: 'product-1', quantity: 2 }], ...extra,
});

test('guest checkout: order is stored, stock reserved, contact saved; paying by UPI e-mails the guest', async () => {
  seed();
  const res = await call('/orders', order('guest-upi-1'));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'pending_payment');
  assert.equal(body.order.guest, true);
  assert.equal(body.order.paymentChannel, 'upi');
  assert.equal(body.order.email, 'asha@example.com');
  assert.equal(body.amountInPaise, 199800);
  assert.equal(store.get('products/product-1').stockQuantity, 3);
  assert.equal(sent.length, 0);

  const contact = docsOf('customers')[0];
  assert.equal(contact.email, 'asha@example.com');
  assert.equal(contact.phone, '9876543210');
  assert.equal(contact.source, 'guest');

  const paid = await call('/orders/guest-upi-1/test-payment', { outcome: 'success', email: 'asha@example.com' });
  assert.equal(paid.status, 200);
  assert.equal((await paid.json()).order.status, 'paid');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'asha@example.com');
  assert.match(sent[0].subject, /order confirmed/);
  assert.match(sent[0].text, /simulated UPI payment/);
});

test('guest COD: order is placed immediately, stock held, full address + contact stored, e-mail sent', async () => {
  seed();
  const res = await call('/orders', order('guest-cod', {
    paymentMethod: 'cod',
    paymentChannel: undefined,
    customer: { ...customer, altPhone: '9123456780', landmark: 'Near the temple' },
  }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'placed_cod');
  assert.equal(body.order.paymentMethod, 'cod');
  assert.equal(body.order.guest, true);
  assert.equal(body.order.shipping.altPhone, '9123456780');
  assert.equal(body.order.shipping.landmark, 'Near the temple');
  assert.equal(body.amountInPaise, 199800);
  assert.equal(store.get('products/product-1').stockQuantity, 3);
  assert.equal(store.get('orders/guest-cod').reservationExpiresAt, undefined);

  const contact = docsOf('customers')[0];
  assert.equal(contact.phone, '9876543210');
  assert.equal(contact.altPhone, '9123456780');
  assert.equal(JSON.parse(contact.addressJson).postalCode, '411001');

  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /Cash on delivery/);
  assert.match(sent[0].text, /Landmark: Near the temple/);
});

test('COD is refused when switched off, and bad alternate numbers are rejected', async () => {
  seed();
  config.codEnabled = false;
  try {
    const off = await call('/orders', order('guest-cod-off', { paymentMethod: 'cod', paymentChannel: undefined }));
    assert.equal(off.status, 503);
  } finally {
    config.codEnabled = true;
  }
  const bad = await call('/orders', order('guest-cod-bad', {
    paymentMethod: 'cod', paymentChannel: undefined, customer: { ...customer, altPhone: '12345' },
  }));
  assert.equal(bad.status, 400);
  assert.equal(store.get('products/product-1').stockQuantity, 5);
});

test('guest checkout needs an e-mail address', async () => {
  seed();
  const res = await call('/orders', order('guest-noemail', { guestEmail: undefined }));
  assert.equal(res.status, 400);
});

test('repeating the same request does not create a second order or take more stock', async () => {
  seed();
  await call('/orders', order('guest-repeat'));
  const again = await call('/orders', order('guest-repeat'));
  assert.equal(again.status, 200);
  assert.equal(store.get('products/product-1').stockQuantity, 3);
  assert.equal(docsOf('orders').length, 1);
});

test('out-of-stock orders are refused', async () => {
  seed();
  const res = await call('/orders', order('guest-big', { items: [{ id: 'product-1', quantity: 9 }] }));
  assert.equal(res.status, 409);
  assert.equal(store.get('products/product-1').stockQuantity, 5);
});

test('guests can look an order up only with the matching e-mail', async () => {
  seed();
  await call('/orders', order('guest-lookup'));
  const ok = await call('/orders/lookup', { orderId: 'guest-lookup', email: 'ASHA@example.com' });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).order.id, 'guest-lookup');
  const wrong = await call('/orders/lookup', { orderId: 'guest-lookup', email: 'someone@else.com' });
  assert.equal(wrong.status, 404);
});

test('test payment: decline keeps the order reserved, success marks it paid and e-mails the guest', async () => {
  seed();
  const placed = await (await call('/orders', order('guest-test', { paymentMethod: 'test' }))).json();
  assert.equal(placed.status, 'pending_payment');
  assert.equal(sent.length, 0);

  const declined = await call('/orders/guest-test/test-payment', { outcome: 'declined', email: 'asha@example.com' });
  assert.equal(declined.status, 402);
  assert.equal(store.get('orders/guest-test').status, 'pending_payment');

  const stranger = await call('/orders/guest-test/test-payment', { outcome: 'success', email: 'x@y.com' });
  assert.equal(stranger.status, 404);

  const paid = await call('/orders/guest-test/test-payment', { outcome: 'success', email: 'asha@example.com' });
  assert.equal(paid.status, 200);
  assert.equal((await paid.json()).order.status, 'paid');
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /TEST ORDER/);
});

test('test payments are refused when test mode is off', async () => {
  seed();
  config.testPayments = false;
  try {
    const res = await call('/orders', order('guest-off', { paymentMethod: 'test' }));
    assert.equal(res.status, 503);
  } finally {
    config.testPayments = true;
  }
});

test('signed-in customer: order is tied to the account and listed; a guest cannot read it', async () => {
  seed();
  store.set('sessions/s1', {
    $id: 's1', tokenHash: (await import('../src/security.js')).hashToken('tok'),
    userId: 'user-1', email: 'member@example.com', expiresAt: Date.now() + 60_000,
  });
  const cookie = { Cookie: 'silveram_session=tok' };
  const placed = await (await call('/orders', order('member-1', { guestEmail: undefined }), cookie)).json();
  assert.equal(placed.order.guest, false);
  assert.equal(placed.order.email, 'member@example.com');

  const mine = await (await fetch(`${base}/orders`, { headers: cookie })).json();
  assert.equal(mine.orders.length, 1);
  assert.equal((await fetch(`${base}/orders/member-1`, { headers: cookie })).status, 200);
  assert.equal((await fetch(`${base}/orders/member-1`)).status, 401);
  assert.equal(docsOf('customers')[0].source, 'account');
});

test('saved bag: guest e-mail + phone are stored and the "bag saved" e-mail is sent once', async () => {
  seed();
  const first = await (await call('/cart/sync', {
    email: 'Buyer@Example.com', phone: '9123456780', name: 'Buyer', items: [{ id: 'product-1', quantity: 1 }],
  })).json();
  assert.equal(first.saved, true);
  assert.equal(first.emailed, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'buyer@example.com');
  assert.match(sent[0].subject, /bag is saved/);
  assert.match(sent[0].text, /Silver Frame/);

  const contact = docsOf('customers')[0];
  assert.equal(contact.phone, '9123456780');
  assert.deepEqual(JSON.parse(contact.cartJson), [{ id: 'product-1', quantity: 1 }]);

  const second = await (await call('/cart/sync', {
    email: 'buyer@example.com', items: [{ id: 'product-1', quantity: 2 }],
  })).json();
  assert.equal(second.emailed, false);
  assert.equal(sent.length, 1);
  assert.equal(docsOf('customers')[0].phone, '9123456780');
});

test('saved bag: a guest must give an e-mail address', async () => {
  seed();
  const res = await call('/cart/sync', { items: [{ id: 'product-1', quantity: 1 }] });
  assert.equal(res.status, 400);
});
