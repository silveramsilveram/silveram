import { z } from 'zod';
import { getDocument, listDocumentsPage, Query } from '../platform/appwrite.js';
import { listAllDocuments } from '../platform/paging.js';
import {
  cleanSearch, DAY_MS, httpError, idSchema, pageQuerySchema, parse, route, startOfDayIst, ymdSchema,
} from './common.js';
import { serializeOrder, serializeTransactionLite } from './orders.js';

const TYPES = ['payment', 'payment_attempt', 'cod_collection', 'cod_remittance', 'refund'];
const STATUSES = ['success', 'failed', 'pending', 'cancelled', 'refunded'];

const listSchema = pageQuerySchema.extend({
  status: z.enum(STATUSES).optional(),
  type: z.enum(TYPES).optional(),
  provider: z.enum(['cashfree', 'cod', 'test']).optional(),
  from: ymdSchema.optional(),
  to: ymdSchema.optional(),
  search: z.string().optional(),
  includeTest: z.enum(['true', 'false']).default('false'),
});

function serializeTransaction(row) {
  let meta = null;
  try {
    meta = row.metaJson ? JSON.parse(row.metaJson) : null;
  } catch {
    meta = null;
  }
  return {
    ...serializeTransactionLite(row),
    eventKey: row.eventKey,
    providerOrderId: row.providerOrderId || null,
    note: row.note || null,
    meta,
  };
}

export function registerTransactionRoutes(router) {
  router.get('/transactions', route(async (req, res) => {
    const input = parse(listSchema, req.query, 'Check the transaction filters.');
    const queries = [];
    if (input.status) queries.push(Query.equal('status', input.status));
    if (input.type) queries.push(Query.equal('type', input.type));
    if (input.provider) queries.push(Query.equal('provider', input.provider));
    if (input.includeTest === 'false' && input.provider !== 'test') queries.push(Query.equal('test', false));
    if (input.from) queries.push(Query.greaterThanEqual('occurredAt', startOfDayIst(input.from)));
    if (input.to) queries.push(Query.lessThan('occurredAt', startOfDayIst(input.to) + DAY_MS));
    const search = cleanSearch(input.search);
    if (search) {
      queries.push(Query.or([
        Query.equal('orderId', search),
        Query.equal('providerPaymentId', search),
        Query.equal('providerRefundId', search),
      ]));
    }
    const page = await listDocumentsPage('transactions', [
      ...queries,
      Query.orderDesc('occurredAt'),
      Query.limit(input.limit),
      Query.offset((input.page - 1) * input.limit),
    ]);
    return res.json({ data: page.documents.map(serializeTransaction), total: page.total, page: input.page, limit: input.limit });
  }));

  router.get('/transactions/:id', route(async (req, res) => {
    parse(idSchema, req.params.id, 'Transaction not found.');
    const row = await getDocument('transactions', req.params.id);
    if (!row) throw httpError(404, 'Transaction not found.');
    const order = await getDocument('orders', row.orderId);
    return res.json({ transaction: serializeTransaction(row), order: order ? serializeOrder(order) : null });
  }));

  // COD reconciliation worklist: cash still to collect, and cash collected but not yet remitted.
  router.get('/cod/outstanding', route(async (_req, res) => {
    const since = Date.now() - 400 * DAY_MS;
    const { documents, truncated } = await listAllDocuments('orders', [
      Query.equal('paymentMethod', 'cod'),
      Query.greaterThanEqual('createdAt', since),
      Query.equal('status', ['placed_cod', 'fulfilled']),
      Query.orderDesc('createdAt'),
    ], { maxDocuments: 2000 });
    const awaitingCollection = documents.filter((order) => !(order.codCollectedInPaise > 0));
    const heldNotRemitted = documents.filter((order) => order.codCollectedInPaise > 0 && !(order.codRemittedInPaise > 0));
    const total = (rows, pick) => rows.reduce((sum, row) => sum + pick(row), 0);
    return res.json({
      awaitingCollection: { totalInPaise: total(awaitingCollection, (o) => o.amountInPaise), orders: awaitingCollection.slice(0, 100).map((o) => serializeOrder(o)), count: awaitingCollection.length },
      heldNotRemitted: { totalInPaise: total(heldNotRemitted, (o) => o.codCollectedInPaise), orders: heldNotRemitted.slice(0, 100).map((o) => serializeOrder(o)), count: heldNotRemitted.length },
      truncated,
      note: 'Cash amounts are operator-recorded, not bank-verified.',
    });
  }));
}
