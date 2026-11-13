import { z } from 'zod';
import {
  getDocument, incrementAttribute, listDocuments, listDocumentsPage, Query, runTransaction, updateDocument,
} from '../platform/appwrite.js';
import {
  actorOf, cleanSearch, clip, httpError, idSchema, pageQuerySchema, parse, route, startOfDayIst, DAY_MS, ymdSchema,
} from './common.js';
import {
  cancellationError, codCollectionError, codRemittanceError, isOverdue, ORDER_STATUSES, shippingStatusOf,
  SHIPPING_STATUSES, shippingTransitionError, statusAfterShipping, validateShippingDates,
} from './orderStateMachine.js';
import { recordInventoryMovement, recordOrderEvent, recordTransaction } from './ledger.js';

const GUEST_ID = 'guest';
const epoch = z.number().int().min(0).max(4_102_444_800_000);

function safeJson(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

/** Everything the admin may see about an order. Phone and full address only leave via the detail view. */
export function serializeOrder(order, { detail = false, now = Date.now() } = {}) {
  const items = safeJson(order.itemsJson, []);
  const shipping = safeJson(order.shippingJson, {});
  const base = {
    id: order.$id,
    email: order.email,
    guest: order.userId === GUEST_ID,
    status: order.status,
    shippingStatus: shippingStatusOf(order),
    paymentMethod: order.paymentMethod,
    paymentChannel: order.paymentChannel || null,
    amountInPaise: order.amountInPaise,
    currency: order.currency,
    itemCount: items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    lineCount: items.length,
    customerName: shipping.name || order.customerName || '',
    city: shipping.city || '',
    state: shipping.state || '',
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    expectedDispatchAt: order.expectedDispatchAt ?? null,
    dispatchedAt: order.dispatchedAt ?? null,
    estimatedDeliveryAt: order.estimatedDeliveryAt ?? null,
    deliveredAt: order.deliveredAt ?? null,
    carrier: order.carrier || null,
    trackingNumber: order.trackingNumber || null,
    trackingUrl: order.trackingUrl || null,
    codCollectedInPaise: order.codCollectedInPaise ?? 0,
    codRemittedInPaise: order.codRemittedInPaise ?? 0,
    overdue: isOverdue(order, now),
    isTest: order.paymentMethod === 'test',
  };
  if (!detail) return base;
  return {
    ...base,
    items,
    shipping,
    cashfreeOrderId: order.cashfreeOrderId || null,
    cashfreePaymentId: order.cashfreePaymentId || null,
    reservationExpiresAt: order.reservationExpiresAt ?? null,
    confirmationEmailSentAt: order.confirmationEmailSentAt ?? null,
    confirmationEmailAttempts: order.confirmationEmailAttempts ?? 0,
    cancellationRecordedAt: order.cancellationRecordedAt ?? null,
  };
}

export const listSchema = pageQuerySchema.extend({
  search: z.string().optional(),
  status: z.string().optional(),
  paymentMethod: z.enum(['cod', 'cashfree', 'test']).optional(),
  shippingStatus: z.enum(SHIPPING_STATUSES).optional(),
  from: ymdSchema.optional(),
  to: ymdSchema.optional(),
  deliveryFrom: ymdSchema.optional(),
  deliveryTo: ymdSchema.optional(),
  overdue: z.enum(['true', 'false']).optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'amountInPaise', 'estimatedDeliveryAt']).default('createdAt'),
  dir: z.enum(['asc', 'desc']).default('desc'),
});

const orderIdLooksValid = (text) => /^[A-Za-z0-9][A-Za-z0-9._-]{5,35}$/.test(text);

export function listQueries(input, now) {
  const queries = [];
  const statuses = input.status ? input.status.split(',').filter((status) => ORDER_STATUSES.includes(status)) : [];
  if (input.status && statuses.length === 0) throw httpError(400, 'Choose a valid order status.');
  if (statuses.length) queries.push(Query.equal('status', statuses));
  if (input.paymentMethod) queries.push(Query.equal('paymentMethod', input.paymentMethod));
  if (input.shippingStatus && input.shippingStatus !== 'pending') queries.push(Query.equal('shippingStatus', input.shippingStatus));
  if (input.from) queries.push(Query.greaterThanEqual('createdAt', startOfDayIst(input.from)));
  if (input.to) queries.push(Query.lessThan('createdAt', startOfDayIst(input.to) + DAY_MS));
  if (input.deliveryFrom) queries.push(Query.greaterThanEqual('estimatedDeliveryAt', startOfDayIst(input.deliveryFrom)));
  if (input.deliveryTo) queries.push(Query.lessThan('estimatedDeliveryAt', startOfDayIst(input.deliveryTo) + DAY_MS));
  if (input.overdue === 'true') {
    queries.push(Query.lessThan('estimatedDeliveryAt', now));
    queries.push(Query.notEqual('shippingStatus', 'delivered'));
    if (!statuses.length) queries.push(Query.equal('status', ['placed_cod', 'paid', 'fulfilled']));
  }
  return queries;
}

function matchesFilters(order, input) {
  if (input.status && !input.status.split(',').includes(order.status)) return false;
  if (input.paymentMethod && order.paymentMethod !== input.paymentMethod) return false;
  if (input.shippingStatus && shippingStatusOf(order) !== input.shippingStatus) return false;
  if (input.from && order.createdAt < startOfDayIst(input.from)) return false;
  if (input.to && order.createdAt >= startOfDayIst(input.to) + DAY_MS) return false;
  return true;
}

/** Timeline = recorded audit events plus facts the order document itself proves (never invented). */
export function buildTimeline(order, events) {
  const entries = events.map((event) => ({
    id: event.$id,
    type: event.type,
    at: event.createdAt,
    actor: event.actor,
    actorType: event.actorType,
    fromStatus: event.fromStatus || null,
    toStatus: event.toStatus || null,
    note: event.note || null,
    detail: safeJson(event.detailJson, null),
    source: 'recorded',
  }));
  const has = (type) => entries.some((entry) => entry.type === type);
  const derived = (type, at, note) => entries.push({
    id: `derived-${type}`, type, at, actor: 'system', actorType: 'system', fromStatus: null, toStatus: null, note, detail: null, source: 'order_record',
  });
  if (!has('order_placed')) derived('order_placed', order.createdAt, null);
  if (order.confirmationEmailSentAt && !has('confirmation_email_sent')) derived('confirmation_email_sent', order.confirmationEmailSentAt, null);
  if (order.cancellationRecordedAt && !has('order_cancelled')) derived('order_cancelled', order.cancellationRecordedAt, 'Recorded on the order before event tracking began.');
  return entries.sort((a, b) => a.at - b.at);
}

async function loadOrder(id) {
  parse(idSchema, id, 'Order not found.');
  const order = await getDocument('orders', id);
  if (!order) throw httpError(404, 'Order not found.');
  return order;
}

async function eventsFor(orderId) {
  return listDocuments('orderEvents', [Query.equal('orderId', orderId), Query.orderAsc('createdAt'), Query.limit(100)]);
}

function staleCheck(order, ifUpdatedAt) {
  if (ifUpdatedAt !== undefined && ifUpdatedAt !== order.updatedAt) {
    throw httpError(409, 'This order changed since you opened it. Refresh and try again.');
  }
}

export function registerOrderRoutes(router) {
  router.get('/orders', route(async (req, res) => {
    const input = parse(listSchema, req.query, 'Check the order filters.');
    const now = Date.now();
    const search = cleanSearch(input.search);
    const offset = (input.page - 1) * input.limit;
    const order = input.dir === 'asc' ? Query.orderAsc(input.sort) : Query.orderDesc(input.sort);
    let queries = listQueries(input, now);

    if (search) {
      if (orderIdLooksValid(search)) {
        const exact = await getDocument('orders', search);
        if (exact) {
          const rows = matchesFilters(exact, input) ? [exact] : [];
          return res.json({ data: rows.map((row) => serializeOrder(row, { now })), total: rows.length, page: 1, limit: input.limit });
        }
      }
      if (search.includes('@')) queries = [...queries, Query.startsWith('email', search.toLowerCase())];
      else if (/^\d{10}$/.test(search)) queries = [...queries, Query.equal('customerPhone', search)];
      else queries = [...queries, Query.search('customerName', search)];
    }
    const page = await listDocumentsPage('orders', [...queries, order, Query.limit(input.limit), Query.offset(offset)]);
    return res.json({
      data: page.documents.map((row) => serializeOrder(row, { now })),
      total: page.total,
      page: input.page,
      limit: input.limit,
    });
  }));

  router.get('/orders/:id', route(async (req, res) => {
    const order = await loadOrder(req.params.id);
    const [events, transactions] = await Promise.all([
      eventsFor(order.$id),
      listDocuments('transactions', [Query.equal('orderId', order.$id), Query.orderAsc('occurredAt'), Query.limit(100)]),
    ]);
    return res.json({
      order: serializeOrder(order, { detail: true }),
      timeline: buildTimeline(order, events),
      transactions: transactions.map(serializeTransactionLite),
    });
  }));

  router.get('/orders/:id/timeline', route(async (req, res) => {
    const order = await loadOrder(req.params.id);
    return res.json({ data: buildTimeline(order, await eventsFor(order.$id)) });
  }));

  // Legacy single-purpose endpoint, kept for compatibility: marks an accepted/paid order fulfilled.
  router.patch('/orders/:id/status', route(async (req, res) => {
    const { status } = parse(z.object({ status: z.literal('fulfilled') }).strict(), req.body, 'Choose a supported order status.');
    const existing = await loadOrder(req.params.id);
    if (!['placed_cod', 'paid'].includes(existing.status)) {
      throw httpError(409, 'Only placed or paid orders can be marked fulfilled.');
    }
    await runTransaction(async (transactionId) => {
      await updateDocument('orders', existing.$id, { status, updatedAt: Date.now() }, transactionId);
      await recordOrderEvent({
        orderId: existing.$id, type: 'status_changed', fromStatus: existing.status, toStatus: status, actor: actorOf(req), idKey: `status:${existing.status}:${status}`,
      }, transactionId);
    });
    return res.json({ order: serializeOrder(await getDocument('orders', existing.$id), { detail: true }) });
  }));

  // COD cancellation: restores stock exactly once. The deterministic "claim" event is created first
  // inside the transaction, so a concurrent or repeated cancel conflicts and rolls back whole.
  router.post('/orders/:id/cancel', route(async (req, res) => {
    parse(z.object({ note: z.string().trim().max(300).optional() }).strict(), req.body ?? {});
    const existing = await loadOrder(req.params.id);
    const problem = cancellationError(existing);
    if (problem) throw httpError(409, problem);
    const items = safeJson(existing.itemsJson, []);
    const actor = actorOf(req);
    try {
      await runTransaction(async (transactionId) => {
        await recordOrderEvent({
          orderId: existing.$id, type: 'order_cancelled', fromStatus: existing.status, toStatus: 'cancelled', actor,
          note: req.body?.note, idKey: 'cancel',
        }, transactionId);
        for (const item of items) {
          const product = await getDocument('products', item.productId);
          if (!product) throw new Error(`Cannot restore stock: product ${item.productId} is missing.`);
          await incrementAttribute('products', product.$id, 'stockQuantity', item.quantity, transactionId);
          await recordInventoryMovement({
            productId: product.$id, sku: product.sku, productName: product.name, type: 'cancellation_restore',
            delta: item.quantity, orderId: existing.$id, reason: 'COD order cancelled', actor, idKey: `cancel:${existing.$id}`,
          }, transactionId);
        }
        const now = Date.now();
        await updateDocument('orders', existing.$id, { status: 'cancelled', cancellationRecordedAt: now, updatedAt: now }, transactionId);
      });
    } catch (error) {
      if (error?.code === 409) {
        throw httpError(409, 'The order changed while cancellation was being processed. Refresh and try again.');
      }
      throw error;
    }
    return res.json({ success: true, orderId: existing.$id });
  }));

  const fulfilmentSchema = z.object({
    shippingStatus: z.enum(SHIPPING_STATUSES).optional(),
    expectedDispatchAt: epoch.nullable().optional(),
    estimatedDeliveryAt: epoch.nullable().optional(),
    dispatchedAt: epoch.optional(),
    deliveredAt: epoch.optional(),
    carrier: z.string().trim().max(60).nullable().optional(),
    trackingNumber: z.string().trim().max(80).nullable().optional(),
    trackingUrl: z.string().trim().max(300).nullable().optional()
      .refine((value) => {
        if (!value) return true;
        try {
          const url = new URL(value);
          return url.protocol === 'https:' && !url.username && !url.password;
        } catch {
          return false;
        }
      }, 'Tracking links must be https URLs.'),
    note: z.string().trim().max(300).optional(),
    ifUpdatedAt: epoch.optional(),
  }).strict();

  router.patch('/orders/:id/fulfilment', route(async (req, res) => {
    const input = parse(fulfilmentSchema, req.body, 'Check the shipping fields and dates.');
    const order = await loadOrder(req.params.id);
    staleCheck(order, input.ifUpdatedAt);
    const now = Date.now();
    const current = shippingStatusOf(order);
    const target = input.shippingStatus && input.shippingStatus !== current ? input.shippingStatus : null;
    if (target) {
      const problem = shippingTransitionError(order, target);
      if (problem) throw httpError(409, problem);
    }
    if (!target && (input.dispatchedAt !== undefined || input.deliveredAt !== undefined)) {
      throw httpError(400, 'Actual dispatch and delivery times are recorded when you move the shipment forward.');
    }
    const touchesPlan = ['expectedDispatchAt', 'estimatedDeliveryAt', 'carrier', 'trackingNumber', 'trackingUrl'].some((key) => input[key] !== undefined);
    if (!target && touchesPlan && !['placed_cod', 'paid', 'fulfilled'].includes(order.status)) {
      throw httpError(409, 'Shipping details can only be set on accepted or paid orders.');
    }

    const patch = {};
    const rank = (status) => SHIPPING_STATUSES.indexOf(status);
    if (target) {
      patch.shippingStatus = target;
      if (rank(target) >= rank('dispatched') && !order.dispatchedAt) patch.dispatchedAt = input.dispatchedAt ?? now;
      if (target === 'delivered') patch.deliveredAt = input.deliveredAt ?? now;
      if (input.dispatchedAt !== undefined && order.dispatchedAt) throw httpError(400, 'Dispatch time is already recorded.');
      const nextStatus = statusAfterShipping(order, target);
      if (nextStatus !== order.status) patch.status = nextStatus;
    }
    for (const key of ['expectedDispatchAt', 'estimatedDeliveryAt']) {
      if (input[key] !== undefined) patch[key] = input[key];
    }
    for (const key of ['carrier', 'trackingNumber', 'trackingUrl']) {
      if (input[key] !== undefined) patch[key] = clip(input[key], 300) ?? null;
    }
    if (Object.keys(patch).length === 0) throw httpError(400, 'Nothing to update.');

    const merged = { ...order, ...patch };
    const dateProblem = validateShippingDates(order, {
      expectedDispatchAt: merged.expectedDispatchAt,
      dispatchedAt: merged.dispatchedAt,
      estimatedDeliveryAt: merged.estimatedDeliveryAt,
      deliveredAt: merged.deliveredAt,
    }, now);
    if (dateProblem) throw httpError(400, dateProblem);

    const actor = actorOf(req);
    await runTransaction(async (transactionId) => {
      await updateDocument('orders', order.$id, { ...patch, updatedAt: now }, transactionId);
      if (target) {
        await recordOrderEvent({
          orderId: order.$id, type: 'shipping_status_changed', fromStatus: current, toStatus: target, actor, note: input.note,
          detail: patch.status ? { orderStatus: patch.status } : undefined, idKey: `ship:${current}:${target}`,
        }, transactionId);
      }
      const changedPlan = Object.keys(patch).filter((key) => !['shippingStatus', 'status', 'dispatchedAt', 'deliveredAt'].includes(key));
      if (changedPlan.length) {
        await recordOrderEvent({
          orderId: order.$id, type: 'shipping_details_updated', actor, note: target ? undefined : input.note,
          detail: Object.fromEntries(changedPlan.map((key) => [key, patch[key]])), idKey: `plan:${now}`,
        }, transactionId);
      }
    });
    return res.json({ order: serializeOrder(await getDocument('orders', order.$id), { detail: true }) });
  }));

  router.post('/orders/:id/shipping-events', route(async (req, res) => {
    const { note } = parse(z.object({ note: z.string().trim().min(1).max(300) }).strict(), req.body, 'Write a short shipping note.');
    const order = await loadOrder(req.params.id);
    await recordOrderEvent({ orderId: order.$id, type: 'shipping_note', actor: actorOf(req), note });
    return res.status(201).json({ success: true });
  }));

  const cashSchema = z.object({
    at: epoch.optional(),
    reference: z.string().trim().max(120).optional(),
    note: z.string().trim().max(300).optional(),
    ifUpdatedAt: epoch.optional(),
  }).strict();

  // Full-amount COD cash recording only: partial collections are not a supported workflow.
  router.post('/orders/:id/cod-collection', route(async (req, res) => {
    const input = parse(cashSchema, req.body ?? {}, 'Check the collection details.');
    const order = await loadOrder(req.params.id);
    staleCheck(order, input.ifUpdatedAt);
    const problem = codCollectionError(order);
    if (problem) throw httpError(409, problem);
    const now = Date.now();
    const at = input.at ?? now;
    if (at > now + 5 * 60 * 1000) throw httpError(400, 'The collection time cannot be in the future.');
    if (at < (order.dispatchedAt || order.createdAt)) throw httpError(400, 'Cash cannot be collected before the order was dispatched.');
    const actor = actorOf(req);
    await runTransaction(async (transactionId) => {
      await recordTransaction({
        eventKey: `cod-collection:${order.$id}`, orderId: order.$id, provider: 'cod', type: 'cod_collection', status: 'success',
        amountInPaise: order.amountInPaise, occurredAt: at, source: 'admin', actor, reconciliation: 'operator_recorded',
        reference: input.reference, note: input.note, now,
      }, transactionId);
      await updateDocument('orders', order.$id, { codCollectedInPaise: order.amountInPaise, updatedAt: now }, transactionId);
      await recordOrderEvent({
        orderId: order.$id, type: 'cod_collected', actor, note: input.note, detail: { amountInPaise: order.amountInPaise, reference: clip(input.reference, 120) },
        idKey: 'cod-collected', now,
      }, transactionId);
    });
    return res.status(201).json({ order: serializeOrder(await getDocument('orders', order.$id), { detail: true }) });
  }));

  router.post('/orders/:id/cod-remittance', route(async (req, res) => {
    const input = parse(cashSchema, req.body ?? {}, 'Check the remittance details.');
    const order = await loadOrder(req.params.id);
    staleCheck(order, input.ifUpdatedAt);
    const problem = codRemittanceError(order);
    if (problem) throw httpError(409, problem);
    const now = Date.now();
    const at = input.at ?? now;
    if (at > now + 5 * 60 * 1000) throw httpError(400, 'The remittance time cannot be in the future.');
    const ledger = await listDocuments('transactions', [Query.equal('orderId', order.$id), Query.equal('type', 'cod_collection'), Query.limit(1)]);
    if (ledger[0] && at < ledger[0].occurredAt) throw httpError(400, 'Cash cannot be remitted before it was collected.');
    const actor = actorOf(req);
    await runTransaction(async (transactionId) => {
      await recordTransaction({
        eventKey: `cod-remittance:${order.$id}`, orderId: order.$id, provider: 'cod', type: 'cod_remittance', status: 'success',
        amountInPaise: order.codCollectedInPaise, occurredAt: at, source: 'admin', actor, reconciliation: 'operator_recorded',
        reference: input.reference, note: input.note, now,
      }, transactionId);
      await updateDocument('orders', order.$id, { codRemittedInPaise: order.codCollectedInPaise, updatedAt: now }, transactionId);
      await recordOrderEvent({
        orderId: order.$id, type: 'cod_remitted', actor, note: input.note, detail: { amountInPaise: order.codCollectedInPaise, reference: clip(input.reference, 120) },
        idKey: 'cod-remitted', now,
      }, transactionId);
    });
    return res.status(201).json({ order: serializeOrder(await getDocument('orders', order.$id), { detail: true }) });
  }));
}

export function serializeTransactionLite(row) {
  return {
    id: row.$id,
    orderId: row.orderId,
    provider: row.provider,
    type: row.type,
    status: row.status,
    amountInPaise: row.amountInPaise,
    currency: row.currency,
    channel: row.channel || null,
    occurredAt: row.occurredAt,
    recordedAt: row.recordedAt,
    source: row.source,
    actor: row.actor,
    reconciliation: row.reconciliation,
    reference: row.reference || null,
    providerPaymentId: row.providerPaymentId || null,
    providerRefundId: row.providerRefundId || null,
    test: row.test === true,
  };
}
