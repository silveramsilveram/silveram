import { createDocument, updateDocument } from '../platform/appwrite.js';
import { clip, deterministicId } from './common.js';

/**
 * Writers for the immutable admin collections. Every row gets a deterministic document id derived
 * from what happened, so a retried request, a replayed webhook or a double click can never create
 * a second row: the second attempt hits a 409 and is treated as "already recorded".
 */

async function createOnce(collection, id, data, transactionId) {
  try {
    return { created: true, doc: await createDocument(collection, id, data, transactionId) };
  } catch (error) {
    if (error?.code === 409 && !transactionId) return { created: false, doc: null };
    throw error;
  }
}

export function recordOrderEvent({ orderId, type, fromStatus, toStatus, actor, actorType = 'admin', note, detail, idKey, now = Date.now() }, transactionId) {
  const id = deterministicId('event', orderId, type, idKey ?? `${now}:${Math.random()}`);
  return createOnce('orderEvents', id, {
    orderId,
    type,
    ...(fromStatus && { fromStatus }),
    ...(toStatus && { toStatus }),
    actor: clip(actor, 254) || 'system',
    actorType,
    ...(clip(note, 300) && { note: clip(note, 300) }),
    ...(detail && { detailJson: JSON.stringify(detail).slice(0, 1000) }),
    createdAt: now,
  }, transactionId);
}

export function recordInventoryMovement({
  productId, sku, productName, type, delta, quantityBefore, quantityAfter, orderId, reason, actor, idKey, now = Date.now(),
}, transactionId) {
  const id = deterministicId('movement', productId, type, orderId ?? '', idKey ?? `${now}:${Math.random()}`);
  return createOnce('inventoryMovements', id, {
    productId,
    sku: String(sku).slice(0, 64),
    productName: String(productName).slice(0, 160),
    type,
    delta,
    ...(Number.isInteger(quantityBefore) && { quantityBefore }),
    ...(Number.isInteger(quantityAfter) && { quantityAfter }),
    ...(orderId && { orderId }),
    ...(clip(reason, 200) && { reason: clip(reason, 200) }),
    actor: clip(actor, 254) || 'system',
    createdAt: now,
  }, transactionId);
}

export function recordPriceChange({
  productId, sku, productName, previousPriceInPaise, newPriceInPaise, actor, reason, now = Date.now(),
}, transactionId) {
  const id = deterministicId('price', productId, now, Math.random());
  return createOnce('productPriceHistory', id, {
    productId,
    sku: String(sku).slice(0, 64),
    productName: String(productName).slice(0, 160),
    ...(Number.isInteger(previousPriceInPaise) && { previousPriceInPaise }),
    newPriceInPaise,
    currency: 'INR',
    changedAt: now,
    changedBy: clip(actor, 254) || 'unknown',
    ...(clip(reason, 200) && { reason: clip(reason, 200) }),
  }, transactionId);
}

/**
 * Append a ledger row. `eventKey` is the idempotency identity (for example
 * `cashfree-payment:<cf_payment_id>`): the same key is only ever stored once.
 */
export function recordTransaction({
  eventKey, orderId, provider, type, status, amountInPaise, channel, providerOrderId, providerPaymentId,
  providerRefundId, occurredAt, source, actor, reconciliation, reference, note, meta, test = false, now = Date.now(),
}, transactionId) {
  return createOnce('transactions', deterministicId('transaction', eventKey), {
    eventKey: String(eventKey).slice(0, 120),
    orderId,
    provider,
    type,
    status,
    amountInPaise,
    currency: 'INR',
    ...(channel && { channel }),
    ...(providerOrderId && { providerOrderId: String(providerOrderId).slice(0, 100) }),
    ...(providerPaymentId && { providerPaymentId: String(providerPaymentId).slice(0, 100) }),
    ...(providerRefundId && { providerRefundId: String(providerRefundId).slice(0, 100) }),
    occurredAt: occurredAt ?? now,
    recordedAt: now,
    source,
    actor: clip(actor, 254) || 'system',
    reconciliation,
    ...(clip(reference, 120) && { reference: clip(reference, 120) }),
    ...(clip(note, 300) && { note: clip(note, 300) }),
    ...(meta && { metaJson: JSON.stringify(meta).slice(0, 1000) }),
    test,
  }, transactionId);
}

/** Never let bookkeeping break a payment or checkout: log a diagnostic code only (no PII). */
export async function bestEffort(label, work) {
  try {
    return await work();
  } catch (error) {
    console.error(`${label} failed:`, error?.code ?? '', error?.type ?? '', error?.message || error);
    return null;
  }
}

/** Ledger rows for a payment the provider (or the trusted test gateway) has confirmed. */
export function paymentLedgerEntry(order, { provider, providerPaymentId, channel, occurredAt, source }) {
  const test = provider === 'test';
  return {
    eventKey: provider === 'cashfree' ? `cashfree-payment:${providerPaymentId}` : `test-payment:${order.$id}`,
    orderId: order.$id,
    provider,
    type: 'payment',
    status: 'success',
    amountInPaise: order.amountInPaise,
    channel: channel || order.paymentChannel,
    providerOrderId: order.cashfreeOrderId,
    providerPaymentId,
    occurredAt,
    source,
    actor: source === 'webhook' ? 'system:cashfree-webhook' : 'system:payment-verification',
    reconciliation: test ? 'test_only' : 'provider_verified',
    meta: test ? { note: 'Simulated test payment' } : undefined,
    test,
  };
}

/**
 * After a new order is stored: record the stock reservation in the movement history and copy the
 * customer's name/phone onto searchable order fields. Runs after checkout has committed and is
 * best-effort and idempotent, so a missing admin schema can never fail or double a checkout.
 */
export async function recordCheckoutBookkeeping(order) {
  let items = [];
  let shipping = {};
  try {
    items = JSON.parse(order.itemsJson);
    shipping = JSON.parse(order.shippingJson);
  } catch {
    return;
  }
  await bestEffort('Recording stock reservation', () => Promise.all(items.map((item) => recordInventoryMovement({
    productId: item.productId, sku: item.sku, productName: item.name, type: 'order_reservation', delta: -item.quantity,
    orderId: order.$id, reason: 'Order placed', actor: 'system:checkout', idKey: `reserve:${order.$id}`, now: order.createdAt,
  }))));
  if (!order.customerPhone && shipping.phone) {
    await bestEffort('Saving searchable customer fields', () => updateDocument('orders', order.$id, {
      customerName: String(shipping.name || '').slice(0, 100),
      customerPhone: String(shipping.phone).slice(0, 10),
    }));
  }
}

/** After expired reservations were released: record the stock that came back. */
export async function recordReleaseMovements(order) {
  let items = [];
  try {
    items = JSON.parse(order.itemsJson);
  } catch {
    return;
  }
  await bestEffort('Recording reservation release', () => Promise.all(items.map((item) => recordInventoryMovement({
    productId: item.productId, sku: item.sku, productName: item.name, type: 'reservation_release', delta: item.quantity,
    orderId: order.$id, reason: 'Payment window expired', actor: 'system:reservation-expiry', idKey: `release:${order.$id}`,
  }))));
}
