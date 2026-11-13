import { z } from 'zod';
import { listDocumentsPage, Query } from '../platform/appwrite.js';
import { listAllDocuments } from '../platform/paging.js';
import { TtlCache } from '../cache.js';
import { DAY_MS, IST_OFFSET_MS, parse, rangeQuerySchema, resolveRange, route, STORE_TIMEZONE } from './common.js';
import {
  customerStats, fulfilmentStats, METRIC_DEFINITIONS, paymentMix, productPerformance, salesSeries, shippingBreakdown,
  statusBreakdown, summarizeOrders,
} from './metrics.js';
import { serializeOrder } from './orders.js';

const MAX_ORDERS_SCANNED = 10_000;
const rangeCache = new TtlCache({ ttlMs: 45 * 1000, maxEntries: 40 });
const coverageCache = new TtlCache({ ttlMs: 5 * 60 * 1000, maxEntries: 4 });

/** Earliest stored order / ledger row, i.e. "Data available from …". */
async function coverage() {
  return coverageCache.getOrLoad('coverage', async () => {
    const [order, ledger] = await Promise.all([
      listDocumentsPage('orders', [Query.orderAsc('createdAt'), Query.limit(1)]),
      listDocumentsPage('transactions', [Query.orderAsc('occurredAt'), Query.limit(1)]).catch(() => ({ documents: [] })),
    ]);
    return { ordersSince: order.documents[0]?.createdAt ?? null, ledgerSince: ledger.documents[0]?.occurredAt ?? null };
  });
}

function loadOrders({ fromMs, toMs }) {
  return rangeCache.getOrLoad(`orders:${fromMs}:${toMs}`, () => listAllDocuments('orders', [
    Query.greaterThanEqual('createdAt', fromMs),
    Query.lessThan('createdAt', toMs),
    Query.orderAsc('createdAt'),
  ], { maxDocuments: MAX_ORDERS_SCANNED }));
}

function loadRefunds({ fromMs, toMs }) {
  return rangeCache.getOrLoad(`refunds:${fromMs}:${toMs}`, async () => {
    const { documents } = await listAllDocuments('transactions', [
      Query.equal('type', 'refund'),
      Query.equal('status', 'success'),
      Query.equal('test', false),
      Query.greaterThanEqual('occurredAt', fromMs),
      Query.lessThan('occurredAt', toMs),
    ], { maxDocuments: 2000 });
    return documents.reduce((sum, row) => sum + row.amountInPaise, 0);
  });
}

async function newCustomers({ fromMs, toMs }) {
  const page = await listDocumentsPage('customers', [
    Query.greaterThanEqual('createdAt', fromMs),
    Query.lessThan('createdAt', toMs),
    Query.limit(1),
  ]);
  return page.total;
}

function caveats(range, cover, scan) {
  const notes = [];
  if (cover.ordersSince === null) notes.push('There are no orders in the database yet.');
  else if (cover.ordersSince > range.fromMs) notes.push('Order data is available only from the first stored order; earlier periods are shown as unavailable, not zero.');
  if (cover.ledgerSince === null || cover.ledgerSince > range.fromMs) {
    notes.push('The payment ledger (COD cash, remittances, refunds) only contains events recorded since tracking began. Earlier refunds and COD cash are not in these figures.');
  }
  if (scan.truncated) notes.push(`More than ${MAX_ORDERS_SCANNED.toLocaleString('en-IN')} orders matched; only the first ${MAX_ORDERS_SCANNED.toLocaleString('en-IN')} were analysed.`);
  return notes;
}

async function context(query) {
  const range = resolveRange(parse(rangeQuerySchema, query, 'Dates must be YYYY-MM-DD.'));
  const [scan, cover] = await Promise.all([loadOrders(range), coverage()]);
  return {
    range, scan, cover, orders: scan.documents,
    meta: {
      range: { from: range.from, to: range.to, fromMs: range.fromMs, toMs: range.toMs, timezone: STORE_TIMEZONE },
      coverage: { ...cover, ordersAnalysed: scan.documents.length, truncated: scan.truncated },
      caveats: caveats(range, cover, scan),
    },
  };
}

const defaultGroup = (range) => ((range.toMs - range.fromMs) / DAY_MS > 92 ? 'month' : (range.toMs - range.fromMs) / DAY_MS > 31 ? 'week' : 'day');

export function registerAnalyticsRoutes(router, config) {
  router.get('/dashboard/summary', route(async (req, res) => {
    const { range, orders, cover, meta } = await context(req.query);
    const now = Date.now();
    const [refunds, customersNew, lowStock, overdue, upcoming] = await Promise.all([
      loadRefunds(range).catch(() => null),
      newCustomers(range),
      listDocumentsPage('products', [
        Query.isNull('deletedAt'), Query.equal('active', true), Query.lessThanEqual('stockQuantity', config.lowStockThreshold),
        Query.orderAsc('stockQuantity'), Query.limit(8),
      ]),
      listDocumentsPage('orders', [
        Query.lessThan('estimatedDeliveryAt', now), Query.notEqual('shippingStatus', 'delivered'),
        Query.equal('status', ['placed_cod', 'paid']), Query.orderAsc('estimatedDeliveryAt'), Query.limit(8),
      ]),
      listDocumentsPage('orders', [
        Query.greaterThanEqual('estimatedDeliveryAt', now), Query.lessThan('estimatedDeliveryAt', now + 7 * DAY_MS),
        Query.notEqual('shippingStatus', 'delivered'), Query.equal('status', ['placed_cod', 'paid']),
        Query.orderAsc('estimatedDeliveryAt'), Query.limit(8),
      ]),
    ]);
    const summary = summarizeOrders(orders);
    const groupBy = defaultGroup(range);
    return res.json({
      ...meta,
      definitions: METRIC_DEFINITIONS,
      kpis: {
        ...summary,
        refunds,
        netCollected: refunds === null ? null : summary.onlineCollections + summary.codCollected - refunds,
        newCustomers: customersNew,
        ...customerStats(orders),
        activeLowStock: lowStock.total,
      },
      groupBy,
      series: salesSeries(orders, { groupBy, fromMs: range.fromMs, toMs: range.toMs, coverageFromMs: cover.ordersSince }),
      pipeline: { status: statusBreakdown(orders), shipping: shippingBreakdown(orders) },
      paymentMix: paymentMix(orders),
      topProducts: productPerformance(orders, 5),
      fulfilment: fulfilmentStats(orders, now),
      lowStock: lowStock.documents.map((product) => ({
        id: product.$id, sku: product.sku, name: product.name, stockQuantity: product.stockQuantity,
      })),
      lowStockThreshold: config.lowStockThreshold,
      overdueOrders: overdue.documents.map((order) => serializeOrder(order, { now })),
      overdueTotal: overdue.total,
      upcomingDeliveries: upcoming.documents.map((order) => serializeOrder(order, { now })),
      recentOrders: [...orders].reverse().slice(0, 8).map((order) => serializeOrder(order, { now })),
    });
  }));

  const groupSchema = z.object({ groupBy: z.enum(['day', 'week', 'month']).optional() });

  router.get('/analytics/sales', route(async (req, res) => {
    const { range, orders, cover, meta } = await context(req.query);
    const groupBy = parse(groupSchema, req.query).groupBy || defaultGroup(range);
    const refunds = await loadRefunds(range).catch(() => null);
    const summary = summarizeOrders(orders);
    return res.json({
      ...meta,
      definitions: METRIC_DEFINITIONS,
      groupBy,
      summary: { ...summary, refunds, netCollected: refunds === null ? null : summary.onlineCollections + summary.codCollected - refunds },
      series: salesSeries(orders, { groupBy, fromMs: range.fromMs, toMs: range.toMs, coverageFromMs: cover.ordersSince }),
    });
  }));

  router.get('/analytics/orders', route(async (req, res) => {
    const { orders, meta } = await context(req.query);
    return res.json({
      ...meta,
      definitions: METRIC_DEFINITIONS,
      summary: summarizeOrders(orders),
      status: statusBreakdown(orders),
      shipping: shippingBreakdown(orders),
      paymentMix: paymentMix(orders),
    });
  }));

  router.get('/analytics/products', route(async (req, res) => {
    const { limit } = parse(z.object({ limit: z.coerce.number().int().min(1).max(100).default(20) }), req.query);
    const { orders, meta } = await context(req.query);
    const performance = productPerformance(orders, 500);
    const sold = new Set(performance.map((row) => row.productId));
    const active = await listDocumentsPage('products', [Query.isNull('deletedAt'), Query.equal('active', true), Query.limit(100)]);
    const slow = active.documents
      .filter((product) => !sold.has(product.$id))
      .slice(0, 20)
      .map((product) => ({ id: product.$id, sku: product.sku, name: product.name, stockQuantity: product.stockQuantity }));
    return res.json({
      ...meta,
      definitions: METRIC_DEFINITIONS,
      topProducts: performance.slice(0, limit),
      slowMoving: slow,
      slowMovingNote: 'Active products with no confirmed sale in this period (first 100 active products checked).',
    });
  }));

  router.get('/analytics/customers', route(async (req, res) => {
    const { range, orders, meta } = await context(req.query);
    return res.json({
      ...meta,
      definitions: METRIC_DEFINITIONS,
      newCustomers: await newCustomers(range),
      ...customerStats(orders),
    });
  }));

  router.get('/analytics/fulfilment', route(async (req, res) => {
    const { orders, meta } = await context(req.query);
    return res.json({ ...meta, definitions: METRIC_DEFINITIONS, ...fulfilmentStats(orders), summary: summarizeOrders(orders) });
  }));
}

export { IST_OFFSET_MS };
