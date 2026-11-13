import { z } from 'zod';
import { Query } from '../platform/appwrite.js';
import { listAllDocuments } from '../platform/paging.js';
import { consumeRateLimit } from '../security.js';
import { actorOf, DAY_MS, httpError, parse, rangeQuerySchema, resolveRange, route, startOfDayIst, ymdSchema, ymdIst } from './common.js';
import { isoOrBlank, rupees, toCsv } from './csv.js';
import { productPerformance, unitsOf } from './metrics.js';
import { shippingStatusOf } from './orderStateMachine.js';
import { listQueries, listSchema as orderListSchema } from './orders.js';

const MAX_ROWS = 5000;
const HOUR = 60 * 60 * 1000;

const noPii = 'General reports leave out names, e-mail addresses, phone numbers and street addresses.';

const orderColumns = [
  { header: 'Order reference', value: (o) => o.$id },
  { header: 'Placed at (UTC ISO)', value: (o) => isoOrBlank(o.createdAt) },
  { header: 'Placed date (India)', value: (o) => ymdIst(o.createdAt) },
  { header: 'Status', value: (o) => o.status },
  { header: 'Shipping status', value: (o) => shippingStatusOf(o) },
  { header: 'Payment method', value: (o) => o.paymentMethod },
  { header: 'Payment channel', value: (o) => o.paymentChannel || '' },
  { header: 'Units', value: (o) => unitsOf(o) },
  { header: 'Order total (INR)', value: (o) => rupees(o.amountInPaise) },
  { header: 'City', value: (o) => { try { return JSON.parse(o.shippingJson).city || ''; } catch { return ''; } } },
  { header: 'State', value: (o) => { try { return JSON.parse(o.shippingJson).state || ''; } catch { return ''; } } },
  { header: 'Estimated delivery (UTC ISO)', value: (o) => isoOrBlank(o.estimatedDeliveryAt) },
  { header: 'Dispatched at (UTC ISO)', value: (o) => isoOrBlank(o.dispatchedAt) },
  { header: 'Delivered at (UTC ISO)', value: (o) => isoOrBlank(o.deliveredAt) },
  { header: 'Carrier (manual)', value: (o) => o.carrier || '' },
  { header: 'Tracking number (manual)', value: (o) => o.trackingNumber || '' },
  { header: 'COD recorded collected (INR)', value: (o) => rupees(o.codCollectedInPaise || 0) },
  { header: 'COD recorded remitted (INR)', value: (o) => rupees(o.codRemittedInPaise || 0) },
];

const reports = {
  orders: {
    schema: orderListSchema.omit({ page: true, limit: true, search: true, sort: true, dir: true }),
    async rows(input) {
      return listAllDocuments('orders', [...listQueries(input, Date.now()), Query.orderDesc('createdAt')], { maxDocuments: MAX_ROWS });
    },
    columns: orderColumns,
  },
  'product-sales': {
    schema: rangeQuerySchema,
    async rows(input) {
      const range = resolveRange(input);
      const scan = await listAllDocuments('orders', [
        Query.greaterThanEqual('createdAt', range.fromMs), Query.lessThan('createdAt', range.toMs),
      ], { maxDocuments: 10_000 });
      return { documents: productPerformance(scan.documents, 1000), truncated: scan.truncated };
    },
    columns: [
      { header: 'SKU', value: (r) => r.sku },
      { header: 'Product', value: (r) => r.name },
      { header: 'Units sold', value: (r) => r.units },
      { header: 'Orders', value: (r) => r.orders },
      { header: 'Gross line value (INR)', value: (r) => rupees(r.grossValue) },
      { header: 'Share of gross line value (%)', value: (r) => Math.round(r.share * 10000) / 100 },
    ],
  },
  transactions: {
    schema: z.object({
      from: ymdSchema.optional(), to: ymdSchema.optional(),
      type: z.enum(['payment', 'payment_attempt', 'cod_collection', 'cod_remittance', 'refund']).optional(),
      status: z.enum(['success', 'failed', 'pending', 'cancelled', 'refunded']).optional(),
      provider: z.enum(['cashfree', 'cod', 'test']).optional(),
    }),
    async rows(input) {
      const queries = [Query.equal('test', input.provider === 'test')];
      if (input.type) queries.push(Query.equal('type', input.type));
      if (input.status) queries.push(Query.equal('status', input.status));
      if (input.provider) queries.push(Query.equal('provider', input.provider));
      if (input.from) queries.push(Query.greaterThanEqual('occurredAt', startOfDayIst(input.from)));
      if (input.to) queries.push(Query.lessThan('occurredAt', startOfDayIst(input.to) + DAY_MS));
      return listAllDocuments('transactions', [...queries, Query.orderDesc('occurredAt')], { maxDocuments: MAX_ROWS });
    },
    columns: [
      { header: 'Transaction id', value: (t) => t.$id },
      { header: 'Order reference', value: (t) => t.orderId },
      { header: 'Occurred at (UTC ISO)', value: (t) => isoOrBlank(t.occurredAt) },
      { header: 'Provider', value: (t) => t.provider },
      { header: 'Type', value: (t) => t.type },
      { header: 'Status', value: (t) => t.status },
      { header: 'Amount (INR)', value: (t) => rupees(t.amountInPaise) },
      { header: 'Channel', value: (t) => t.channel || '' },
      { header: 'Provider payment id', value: (t) => t.providerPaymentId || '' },
      { header: 'Provider refund id', value: (t) => t.providerRefundId || '' },
      { header: 'Reconciliation', value: (t) => t.reconciliation },
      { header: 'Recorded by', value: (t) => (t.actor.startsWith('system:') ? t.actor : 'admin') },
    ],
  },
  cod: {
    schema: rangeQuerySchema,
    async rows(input) {
      const range = resolveRange(input);
      return listAllDocuments('orders', [
        Query.equal('paymentMethod', 'cod'), Query.equal('status', ['placed_cod', 'fulfilled']),
        Query.greaterThanEqual('createdAt', range.fromMs), Query.lessThan('createdAt', range.toMs), Query.orderDesc('createdAt'),
      ], { maxDocuments: MAX_ROWS });
    },
    columns: [
      ...orderColumns.slice(0, 5),
      { header: 'Order total (INR)', value: (o) => rupees(o.amountInPaise) },
      { header: 'Cash recorded collected (INR)', value: (o) => rupees(o.codCollectedInPaise || 0) },
      { header: 'Cash recorded remitted (INR)', value: (o) => rupees(o.codRemittedInPaise || 0) },
      { header: 'Awaiting collection (INR)', value: (o) => rupees(Math.max(0, o.amountInPaise - (o.codCollectedInPaise || 0))) },
      { header: 'Collected, not yet remitted (INR)', value: (o) => rupees(Math.max(0, (o.codCollectedInPaise || 0) - (o.codRemittedInPaise || 0))) },
    ],
  },
  inventory: {
    schema: z.object({}),
    async rows() {
      return listAllDocuments('products', [Query.isNull('deletedAt'), Query.orderAsc('name')], { maxDocuments: MAX_ROWS });
    },
    columns: [
      { header: 'SKU', value: (p) => p.sku },
      { header: 'Product', value: (p) => p.name },
      { header: 'Category', value: (p) => p.category },
      { header: 'Active', value: (p) => p.active === true },
      { header: 'Price (INR)', value: (p) => rupees(p.priceInPaise) },
      { header: 'Stock on hand', value: (p) => p.stockQuantity },
    ],
  },
  'stock-movements': {
    schema: rangeQuerySchema,
    async rows(input) {
      const range = resolveRange(input);
      return listAllDocuments('inventoryMovements', [
        Query.greaterThanEqual('createdAt', range.fromMs), Query.lessThan('createdAt', range.toMs), Query.orderDesc('createdAt'),
      ], { maxDocuments: MAX_ROWS });
    },
    columns: [
      { header: 'At (UTC ISO)', value: (m) => isoOrBlank(m.createdAt) },
      { header: 'SKU', value: (m) => m.sku },
      { header: 'Product', value: (m) => m.productName },
      { header: 'Type', value: (m) => m.type },
      { header: 'Change', value: (m) => m.delta },
      { header: 'Before', value: (m) => m.quantityBefore ?? '' },
      { header: 'After', value: (m) => m.quantityAfter ?? '' },
      { header: 'Order reference', value: (m) => m.orderId || '' },
      { header: 'Reason', value: (m) => m.reason || '' },
    ],
  },
};

export const REPORT_KINDS = Object.keys(reports);

export function registerReportRoutes(router) {
  router.get('/reports/:kind.csv', route(async (req, res) => {
    const report = reports[req.params.kind];
    if (!report) throw httpError(404, 'That report does not exist.');
    if (!(await consumeRateLimit(actorOf(req), 'admin-export', 30, HOUR))) {
      throw httpError(429, 'Too many exports. Please try again later.');
    }
    const input = parse(report.schema, req.query, 'Check the report filters.');
    const result = await report.rows(input);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="silveram-${req.params.kind}-${ymdIst(Date.now())}.csv"`,
      'Cache-Control': 'no-store',
      'X-Export-Rows': String(result.documents.length),
      'X-Export-Truncated': String(Boolean(result.truncated)),
      'X-Export-Notice': noPii,
    });
    return res.send(toCsv(report.columns, result.documents));
  }));

  router.get('/reports', (_req, res) => res.json({
    maxRows: MAX_ROWS,
    privacyNote: noPii,
    reports: REPORT_KINDS,
  }));
}
