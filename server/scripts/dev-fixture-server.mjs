/**
 * DEVELOPMENT ONLY. DEMO DATA, NOT SILVERAM DATA.
 *
 * Starts the real admin API routers on an in-memory stand-in for Appwrite, pre-filled with made-up
 * orders, products and ledger rows, so the admin UI can be exercised and screenshotted without
 * touching production. It signs every request in as a demo administrator. Never deploy this file;
 * nothing here is imported by the real API.
 *
 *   node --experimental-test-module-mocks server/scripts/dev-fixture-server.mjs
 *   ADMIN_DEV_API_TARGET=http://localhost:4010 npm --prefix admin run dev
 */
import { mock } from 'node:test';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import cookieParser from 'cookie-parser';
import express from 'express';
import { createMemoryAppwrite } from '../test/helpers/memory-appwrite.js';

if (process.env.NODE_ENV === 'production') throw new Error('The demo fixture server must never run in production.');

const mem = createMemoryAppwrite();
const src = (file) => pathToFileURL(resolve(import.meta.dirname, '../src', file)).href;
mock.module(src('platform/appwrite.js'), { namedExports: mem.named });
mock.module(src('mail/transport.js'), { namedExports: { getMailer: () => null, mailConfigured: () => true } });

const config = {
  origins: ['http://localhost:3100'], adminEmails: new Set(['demo-admin@example.com']), lowStockThreshold: 3, isProduction: false,
  liveCheckout: true, codEnabled: true, cashfreeEnabled: true, cashfreeEnv: 'sandbox', cashfreeSecretKey: 'demo', testPayments: false,
  productImageHosts: new Set(), cloudinaryCloudName: '', cloudinaryApiKey: '', cloudinaryApiSecret: '', cloudinaryRootFolder: 'silveram',
};

const hash = (text) => createHash('sha256').update(text).digest('hex');
const DAY = 86_400_000;
const now = Date.now();
mem.seed('sessions', 'demo', { tokenHash: hash('demo-token'), userId: 'demo-admin', email: 'demo-admin@example.com', expiresAt: now + 30 * DAY });

const products = [
  ['p1', 'DEMO-RING-01', 'Demo Plain Ring', 'ring', 129900, 12], ['p2', 'DEMO-NECK-02', 'Demo Chain Necklace', 'necklace', 349900, 2],
  ['p3', 'DEMO-EAR-03', 'Demo Stud Earrings', 'earring', 89900, 0], ['p4', 'DEMO-BANG-04', 'Demo Bangle Pair', 'bangle', 249900, 7],
  ['p5', 'DEMO-FRAME-05', 'Demo Silver Frame', 'frame', 199900, 4], ['p6', 'DEMO-BRAC-06', 'Demo Charm Bracelet', 'bracelet', 159900, 9],
];
for (const [id, sku, name, category, price, stock] of products) {
  mem.seed('products', id, { sku, name, description: 'Demo product used for UI testing only.', category, priceInPaise: price, currency: 'INR', stockQuantity: stock, imagesJson: '[]', active: id !== 'p6', createdAt: now - 200 * DAY, updatedAt: now - 3 * DAY });
}

const cities = [['Pune', 'Maharashtra'], ['Patna', 'Bihar'], ['Motihari', 'Bihar'], ['Delhi', 'Delhi'], ['Kolkata', 'West Bengal']];
const names = ['Asha Rao', 'Vikram Sen', 'Meera Joshi', 'Rohan Das', 'Priya Nair', 'Kabir Shah', 'Isha Gupta'];
const statuses = ['placed_cod', 'paid', 'fulfilled', 'fulfilled', 'cancelled', 'pending_payment', 'paid', 'expired', 'fulfilled', 'placed_cod'];
for (let i = 0; i < 46; i += 1) {
  const [, sku, pname, , price] = products[i % 5];
  const qty = (i % 3) + 1;
  const status = statuses[i % statuses.length];
  const cod = i % 3 !== 1;
  const [city, state] = cities[i % cities.length];
  const createdAt = now - (i * 4 + 1) * DAY * 0.9 - (i % 5) * 3_600_000;
  const delivered = status === 'fulfilled' && i % 2 === 0;
  const name = names[i % names.length];
  mem.seed('orders', `demo-order-${String(i + 1).padStart(3, '0')}`, {
    userId: 'guest', email: `${name.split(' ')[0].toLowerCase()}${i % 4}@example.com`, status: !cod && status === 'placed_cod' ? 'paid' : status,
    paymentMethod: cod ? 'cod' : 'cashfree', ...(cod ? {} : { paymentChannel: i % 2 ? 'upi' : 'card' }), amountInPaise: price * qty, currency: 'INR',
    itemsJson: JSON.stringify([{ productId: products[i % 5][0], sku, name: pname, quantity: qty, unitPriceInPaise: price, lineTotalInPaise: price * qty }]),
    shippingJson: JSON.stringify({ name, phone: `98${String(10000000 + i * 1337).slice(0, 8)}`, address: `${i + 4} Demo Street`, city, state, postalCode: '800001', country: 'IN' }),
    customerName: name, customerPhone: `98${String(10000000 + i * 1337).slice(0, 8)}`, createdAt, updatedAt: createdAt + 3_600_000, confirmationEmailAttempts: 0,
    ...(status === 'fulfilled' ? { shippingStatus: delivered ? 'delivered' : 'dispatched', dispatchedAt: createdAt + DAY, estimatedDeliveryAt: createdAt + 4 * DAY, ...(delivered ? { deliveredAt: createdAt + 3 * DAY } : {}) } : {}),
    ...(status === 'placed_cod' && i % 4 === 0 ? { estimatedDeliveryAt: now - 2 * DAY } : {}),
    ...(cod && delivered ? { codCollectedInPaise: price * qty, ...(i % 4 === 0 ? { codRemittedInPaise: price * qty } : {}) } : {}),
  });
}
mem.seed('transactions', 'tx1', { eventKey: 'demo-1', orderId: 'demo-order-002', provider: 'cashfree', type: 'payment', status: 'success', amountInPaise: 349900, currency: 'INR', channel: 'upi', occurredAt: now - 6 * DAY, recordedAt: now - 6 * DAY, source: 'webhook', actor: 'system:cashfree-webhook', reconciliation: 'provider_verified', test: false });
mem.seed('transactions', 'tx2', { eventKey: 'demo-2', orderId: 'demo-order-007', provider: 'cashfree', type: 'payment_attempt', status: 'failed', amountInPaise: 89900, currency: 'INR', channel: 'card', occurredAt: now - 5 * DAY, recordedAt: now - 5 * DAY, source: 'webhook', actor: 'system:cashfree-webhook', reconciliation: 'provider_reported', test: false });
mem.seed('transactions', 'tx3', { eventKey: 'demo-3', orderId: 'demo-order-004', provider: 'cod', type: 'cod_collection', status: 'success', amountInPaise: 249900, currency: 'INR', occurredAt: now - 3 * DAY, recordedAt: now - 3 * DAY, source: 'admin', actor: 'demo-admin@example.com', reconciliation: 'operator_recorded', reference: 'DEMO-RECEIPT-1', test: false });
mem.seed('productPriceHistory', 'ph1', { productId: 'p1', sku: 'DEMO-RING-01', productName: 'Demo Plain Ring', previousPriceInPaise: 119900, newPriceInPaise: 129900, currency: 'INR', changedAt: now - 9 * DAY, changedBy: 'demo-admin@example.com', reason: 'Demo revision' });
mem.seed('inventoryMovements', 'mv1', { productId: 'p2', sku: 'DEMO-NECK-02', productName: 'Demo Chain Necklace', type: 'restock', delta: 5, quantityBefore: 0, quantityAfter: 5, reason: 'Demo restock', actor: 'demo-admin@example.com', createdAt: now - 8 * DAY });
for (let i = 0; i < 12; i += 1) {
  mem.seed('customers', `c${i}`, { email: `${names[i % 7].split(' ')[0].toLowerCase()}${i % 4}@example.com`, name: names[i % 7], phone: `98${String(10000000 + i * 1337).slice(0, 8)}`, source: i % 3 ? 'guest' : 'account', createdAt: now - (i * 15 + 2) * DAY, updatedAt: now, lastOrderAt: now - i * 5 * DAY });
}

const { createAdminRouter } = await import(src('routes/admin.js'));
const { createProductsRouter } = await import(src('routes/products.js'));
const app = express();
app.use(cookieParser());
app.use((req, _res, next) => { req.cookies.silveram_session ||= 'demo-token'; next(); }); // demo: always signed in
app.use(express.json());
app.get('/api/auth/me', (_req, res) => res.json({ user: { id: 'demo-admin', email: 'demo-admin@example.com' } }));
app.post('/api/auth/logout', (_req, res) => res.status(204).end());
app.use('/api/admin', createAdminRouter(config));
app.use('/api/products', createProductsRouter(config));
app.use((error, _req, res, _next) => { console.error(error); res.status(error?.status || 500).json({ error: error.message }); });
const port = Number(process.env.PORT || 4010);
app.listen(port, () => console.log(`DEMO fixture API (not real data) on http://localhost:${port}`));
