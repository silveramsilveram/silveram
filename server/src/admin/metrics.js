import { DAY_MS, IST_OFFSET_MS, startOfDayIst, ymdIst } from './common.js';
import { CONFIRMED_STATUSES, isOverdue, isTestOrder, ONLINE_PAID_STATUSES, shippingStatusOf } from './orderStateMachine.js';

/**
 * Financial definitions (also shown to admins in the dashboard "Definitions" panel).
 * All money is integer paise. Test-payment orders are excluded from every real-money figure.
 */
export const METRIC_DEFINITIONS = {
  ordersPlaced: 'Every real (non-test) order created in the period, whatever its status, including unpaid, cancelled and expired ones.',
  confirmedOrders: 'Orders that count as a sale: accepted cash on delivery, paid online, fulfilled, or later refunded. Cancelled, expired, unpaid and payment-review orders are not sales.',
  grossOrderValue: 'Sum of the order totals of confirmed orders, as snapshotted when the order was placed. It is the value of what was sold, not cash received.',
  onlineCollections: 'Order totals of Cashfree orders whose payment the server confirmed (status paid, fulfilled or refunded). A pending payment is never counted. Refunds are shown separately.',
  codOrderValue: 'Order totals of accepted cash-on-delivery orders. This is money owed to Silveram, not money received.',
  codCollected: 'Cash an operator recorded as collected from the customer, for orders placed in the period. Operator-entered, not bank-verified.',
  codAwaiting: 'COD order value minus cash recorded as collected.',
  codRemitted: 'Collected COD cash an operator recorded as handed over to Silveram. Operator-entered, not bank-verified.',
  refunds: 'Refunds that Cashfree confirmed by signed webhook and that the ledger recorded, dated by refund time. A "refunded" order label without a ledger row is not counted.',
  netCollected: 'Online collections + COD cash recorded as collected - recorded refunds. Only as complete as the ledger; see data coverage.',
  averageOrderValue: 'Gross order value divided by confirmed orders.',
  unitsSold: 'Item quantities on confirmed orders.',
  repeatRate: 'Share of customers (by e-mail) with a confirmed order in the period who had two or more in the period. A customer who bought before the period only once is not counted as repeat.',
};

export const isRealOrder = (order) => !isTestOrder(order);
export const isConfirmed = (order) => isRealOrder(order) && CONFIRMED_STATUSES.has(order.status);

const parseItems = (order) => {
  try {
    const items = JSON.parse(order.itemsJson || '[]');
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
};

export const unitsOf = (order) => parseItems(order).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

const codValueOf = (order) => (order.paymentMethod === 'cod' && ['placed_cod', 'fulfilled'].includes(order.status) ? order.amountInPaise : 0);
const onlinePaidOf = (order) => (order.paymentMethod === 'cashfree' && ONLINE_PAID_STATUSES.has(order.status) ? order.amountInPaise : 0);

export function summarizeOrders(orders) {
  const real = orders.filter(isRealOrder);
  const confirmed = real.filter(isConfirmed);
  const sum = (rows, pick) => rows.reduce((total, row) => total + pick(row), 0);
  const grossOrderValue = sum(confirmed, (order) => order.amountInPaise);
  const codOrderValue = sum(real, codValueOf);
  const codCollected = sum(real.filter((order) => order.paymentMethod === 'cod'), (order) => order.codCollectedInPaise || 0);
  const codRemitted = sum(real.filter((order) => order.paymentMethod === 'cod'), (order) => order.codRemittedInPaise || 0);
  const count = (status) => real.filter((order) => order.status === status).length;
  return {
    ordersPlaced: real.length,
    testOrdersExcluded: orders.length - real.length,
    confirmedOrders: confirmed.length,
    grossOrderValue,
    onlineCollections: sum(real, onlinePaidOf),
    codOrderValue,
    codCollected,
    codAwaiting: Math.max(0, codOrderValue - codCollected),
    codRemitted,
    codHeldBeforeRemittance: Math.max(0, codCollected - codRemitted),
    unitsSold: sum(confirmed, unitsOf),
    averageOrderValue: confirmed.length ? Math.round(grossOrderValue / confirmed.length) : null,
    cancelledOrders: count('cancelled'),
    cancelledValue: sum(real.filter((order) => order.status === 'cancelled'), (order) => order.amountInPaise),
    expiredOrders: count('expired'),
    pendingPaymentOrders: count('pending_payment'),
    paymentReviewOrders: count('payment_review'),
    refundedOrders: count('refunded'),
    cancellationRate: real.length ? count('cancelled') / real.length : null,
    expiryRate: real.filter((order) => order.paymentMethod !== 'cod').length
      ? count('expired') / real.filter((order) => order.paymentMethod !== 'cod').length
      : null,
  };
}

export function statusBreakdown(orders) {
  const counts = new Map();
  for (const order of orders.filter(isRealOrder)) counts.set(order.status, (counts.get(order.status) || 0) + 1);
  return [...counts].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
}

export function shippingBreakdown(orders) {
  const counts = new Map();
  for (const order of orders.filter(isConfirmed)) {
    const status = shippingStatusOf(order);
    counts.set(status, (counts.get(status) || 0) + 1);
  }
  return [...counts].map(([status, count]) => ({ status, count }));
}

/** COD / Cashfree UPI / Cashfree card; test payments are reported apart and never as revenue. */
export function paymentMix(orders) {
  const rows = new Map();
  for (const order of orders) {
    const test = isTestOrder(order);
    const key = test ? 'test' : order.paymentMethod === 'cashfree' ? `cashfree:${order.paymentChannel || 'other'}` : order.paymentMethod;
    const row = rows.get(key) || { key, method: test ? 'test' : order.paymentMethod, channel: order.paymentChannel || null, orders: 0, confirmedOrders: 0, grossOrderValue: 0, excludedFromRevenue: test };
    row.orders += 1;
    if (!test && CONFIRMED_STATUSES.has(order.status)) {
      row.confirmedOrders += 1;
      row.grossOrderValue += order.amountInPaise;
    }
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.grossOrderValue - a.grossOrderValue);
}

export function productPerformance(orders, limit = 20) {
  const rows = new Map();
  let total = 0;
  for (const order of orders.filter(isConfirmed)) {
    const seen = new Set();
    for (const item of parseItems(order)) {
      const row = rows.get(item.productId) || { productId: item.productId, sku: item.sku, name: item.name, units: 0, orders: 0, grossValue: 0 };
      row.units += Number(item.quantity) || 0;
      row.grossValue += Number(item.lineTotalInPaise) || 0;
      if (!seen.has(item.productId)) row.orders += 1;
      seen.add(item.productId);
      total += Number(item.lineTotalInPaise) || 0;
      rows.set(item.productId, row);
    }
  }
  return [...rows.values()]
    .map((row) => ({ ...row, share: total ? row.grossValue / total : 0 }))
    .sort((a, b) => b.grossValue - a.grossValue)
    .slice(0, limit);
}

/** Bucket id of a timestamp in India time: day `YYYY-MM-DD`, week = Monday's date, month `YYYY-MM`. */
export function bucketKey(ms, groupBy) {
  const ymd = ymdIst(ms);
  if (groupBy === 'day') return ymd;
  if (groupBy === 'month') return ymd.slice(0, 7);
  const date = new Date(`${ymd}T00:00:00Z`);
  const weekday = (date.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(date.getTime() - weekday * DAY_MS).toISOString().slice(0, 10);
}

function bucketStartMs(key, groupBy) {
  return startOfDayIst(groupBy === 'month' ? `${key}-01` : key);
}

function nextBucketStartMs(startMs, groupBy) {
  if (groupBy === 'day') return startMs + DAY_MS;
  if (groupBy === 'week') return startMs + 7 * DAY_MS;
  const shifted = new Date(startMs + IST_OFFSET_MS);
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 1) - IST_OFFSET_MS;
}

/**
 * Sales series with one point per bucket across the whole window. A bucket that ended before the
 * earliest stored order is `available: false` with null values: "no data exists" is not "zero".
 */
export function salesSeries(orders, { groupBy, fromMs, toMs, coverageFromMs }) {
  const points = new Map();
  let cursor = bucketStartMs(bucketKey(fromMs, groupBy), groupBy);
  while (cursor < toMs) {
    const key = bucketKey(cursor, groupBy);
    const end = nextBucketStartMs(cursor, groupBy);
    const available = coverageFromMs !== null && coverageFromMs !== undefined && end > coverageFromMs;
    points.set(key, {
      key,
      startsAt: cursor,
      available,
      ordersPlaced: available ? 0 : null,
      confirmedOrders: available ? 0 : null,
      grossOrderValue: available ? 0 : null,
      onlineCollections: available ? 0 : null,
      codOrderValue: available ? 0 : null,
      unitsSold: available ? 0 : null,
    });
    cursor = end;
  }
  for (const order of orders.filter(isRealOrder)) {
    const point = points.get(bucketKey(order.createdAt, groupBy));
    if (!point?.available) continue;
    point.ordersPlaced += 1;
    if (CONFIRMED_STATUSES.has(order.status)) {
      point.confirmedOrders += 1;
      point.grossOrderValue += order.amountInPaise;
      point.unitsSold += unitsOf(order);
    }
    point.onlineCollections += onlinePaidOf(order);
    point.codOrderValue += codValueOf(order);
  }
  return [...points.values()];
}

export function fulfilmentStats(orders, now = Date.now()) {
  const confirmed = orders.filter(isConfirmed);
  const dispatched = confirmed.filter((order) => order.dispatchedAt);
  const delivered = confirmed.filter((order) => order.deliveredAt);
  const withPromise = delivered.filter((order) => order.estimatedDeliveryAt);
  const average = (rows, pick) => (rows.length ? Math.round(rows.reduce((sum, row) => sum + pick(row), 0) / rows.length) : null);
  return {
    awaitingDispatch: confirmed.filter((order) => ['pending', 'processing', 'packed'].includes(shippingStatusOf(order))).length,
    inTransit: confirmed.filter((order) => ['dispatched', 'out_for_delivery'].includes(shippingStatusOf(order))).length,
    delivered: delivered.length,
    overdue: confirmed.filter((order) => isOverdue(order, now)).length,
    avgHoursToDispatch: average(dispatched, (order) => (order.dispatchedAt - order.createdAt) / 3_600_000),
    avgHoursToDelivery: average(delivered, (order) => (order.deliveredAt - order.createdAt) / 3_600_000),
    dispatchSample: dispatched.length,
    deliverySample: delivered.length,
    onTimeRate: withPromise.length
      ? withPromise.filter((order) => order.deliveredAt <= order.estimatedDeliveryAt).length / withPromise.length
      : null,
    onTimeSample: withPromise.length,
  };
}

export function customerStats(orders) {
  const perCustomer = new Map();
  for (const order of orders.filter(isConfirmed)) {
    perCustomer.set(order.email, (perCustomer.get(order.email) || 0) + 1);
  }
  const customers = perCustomer.size;
  const repeat = [...perCustomer.values()].filter((count) => count >= 2).length;
  return { customersWithOrders: customers, repeatCustomers: repeat, repeatRate: customers ? repeat / customers : null };
}
