import assert from 'node:assert/strict';
import test from 'node:test';
import { csvCell, rupees, toCsv } from '../src/admin/csv.js';
import {
  DAY_MS, defaultSixMonthRange, IST_OFFSET_MS, resolveRange, startOfDayIst, ymdIst,
} from '../src/admin/common.js';
import {
  codCollectionError, codRemittanceError, isOverdue, shippingTransitionError, statusAfterShipping, validateShippingDates,
  cancellationError,
} from '../src/admin/orderStateMachine.js';
import {
  bucketKey, customerStats, fulfilmentStats, paymentMix, productPerformance, salesSeries, summarizeOrders,
} from '../src/admin/metrics.js';
import { APPWRITE_SCHEMA } from '../src/platform/appwrite-schema.js';

const order = (over = {}) => ({
  $id: 'o1', email: 'a@x.in', status: 'placed_cod', paymentMethod: 'cod', amountInPaise: 100000, createdAt: Date.UTC(2026, 5, 10, 8),
  itemsJson: JSON.stringify([{ productId: 'p1', sku: 'S1', name: 'Ring', quantity: 2, unitPriceInPaise: 50000, lineTotalInPaise: 100000 }]),
  shippingJson: '{}', ...over,
});

test('IST dates: midnight boundaries are computed in India time, not UTC', () => {
  // 2026-06-10 00:00 IST is 2026-06-09 18:30 UTC.
  assert.equal(startOfDayIst('2026-06-10'), Date.UTC(2026, 5, 9, 18, 30));
  // 18:29 UTC on the 9th is still the 9th in India; 18:30 UTC is the 10th.
  assert.equal(ymdIst(Date.UTC(2026, 5, 9, 18, 29)), '2026-06-09');
  assert.equal(ymdIst(Date.UTC(2026, 5, 9, 18, 30)), '2026-06-10');
  assert.equal(startOfDayIst('2026-02-30'), null);
  assert.equal(startOfDayIst('nope'), null);
  assert.equal(IST_OFFSET_MS, 19_800_000);
});

test('date ranges are inclusive of the end day, validated and bounded', () => {
  const range = resolveRange({ from: '2026-01-01', to: '2026-01-31' });
  assert.equal(range.toMs - range.fromMs, 31 * DAY_MS);
  assert.throws(() => resolveRange({ from: '2026-02-01', to: '2026-01-01' }), /end date/);
  assert.throws(() => resolveRange({ from: '2024-01-01', to: '2026-01-01' }), /at most/);
  assert.throws(() => resolveRange({ from: 'x', to: 'y' }), /YYYY-MM-DD/);
});

test('default window is six calendar months ending today (India time)', () => {
  const now = Date.UTC(2026, 10, 14, 10); // 14 Nov 2026
  assert.deepEqual(defaultSixMonthRange(now), { from: '2026-06-01', to: '2026-11-14' });
});

test('money converts between rupees and paise exactly', () => {
  assert.equal(csvCell(rupees(123450)), '1234.50');
  assert.equal(csvCell(rupees(5)), '0.05');
  assert.equal(csvCell(rupees(-500)), '-5.00');
  assert.equal(csvCell(rupees(2147483647)), '21474836.47');
});

test('CSV cells cannot start a spreadsheet formula', () => {
  for (const evil of ['=1+1', '+SUM(A1)', '-2+3', '@cmd', '\t=1', '\r=1']) {
    // (a cell holding a carriage return is also quoted, so look past the opening quote)
    assert.ok(csvCell(evil).replace(/^"/, '').startsWith("'"), `${JSON.stringify(evil)} must be neutralised`);
  }
  assert.equal(csvCell(-5), '-5'); // real numbers are untouched
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.equal(csvCell('bell\u0007'), 'bell');
  const csv = toCsv([{ header: 'Name', value: (r) => r.n }], [{ n: '=HYPERLINK("x")' }]);
  assert.match(csv, /\r\n"'=HYPERLINK/); // neutralised, then quoted because it contains quotes
});

test('shipping can only move forward, and only for shippable orders', () => {
  assert.equal(shippingTransitionError(order(), 'packed'), null);
  assert.match(shippingTransitionError(order({ shippingStatus: 'dispatched' }), 'packed'), /forward/);
  assert.match(shippingTransitionError(order(), 'delivered'), /dispatched/);
  assert.match(shippingTransitionError(order({ status: 'pending_payment', paymentMethod: 'cashfree' }), 'packed'), /waiting for payment/);
  assert.match(shippingTransitionError(order({ status: 'cancelled' }), 'packed'), /Only accepted/);
  assert.match(shippingTransitionError(order({ paymentMethod: 'test', status: 'paid' }), 'packed'), /Test/);
  assert.match(shippingTransitionError(order({ shippingStatus: 'delivered', status: 'fulfilled' }), 'packed'), /already marked delivered/);
  assert.match(shippingTransitionError(order(), 'teleported'), /supported/);
});

test('dispatching moves an accepted order to fulfilled (the storefront meaning), earlier steps do not', () => {
  assert.equal(statusAfterShipping(order(), 'packed'), 'placed_cod');
  assert.equal(statusAfterShipping(order(), 'dispatched'), 'fulfilled');
  assert.equal(statusAfterShipping(order({ status: 'paid' }), 'delivered'), 'fulfilled');
  assert.equal(statusAfterShipping(order({ status: 'cancelled' }), 'dispatched'), 'cancelled');
});

test('shipping dates must be sensible', () => {
  const o = order();
  const now = o.createdAt + 5 * DAY_MS;
  assert.match(validateShippingDates(o, { expectedDispatchAt: now, estimatedDeliveryAt: now - 1 }, now), /after the estimated/);
  assert.match(validateShippingDates(o, { dispatchedAt: o.createdAt - 1 }, now), /before the order/);
  assert.match(validateShippingDates(o, { dispatchedAt: now + DAY_MS }, now), /future/);
  assert.match(validateShippingDates(o, { dispatchedAt: now - 1000, deliveredAt: now - 2000 }, now), /after delivery/);
  assert.equal(validateShippingDates(o, { expectedDispatchAt: now, estimatedDeliveryAt: now + DAY_MS }, now), null);
});

test('overdue = promised date passed, still open; delivered/cancelled never overdue', () => {
  const now = Date.UTC(2026, 5, 20);
  assert.equal(isOverdue(order({ estimatedDeliveryAt: now - 1 }), now), true);
  assert.equal(isOverdue(order({ estimatedDeliveryAt: now + 1 }), now), false);
  assert.equal(isOverdue(order({ estimatedDeliveryAt: now - 1, shippingStatus: 'delivered', status: 'fulfilled' }), now), false);
  assert.equal(isOverdue(order({ estimatedDeliveryAt: now - 1, status: 'cancelled' }), now), false);
  assert.equal(isOverdue(order(), now), false);
});

test('COD cash rules: after dispatch, full amount once, remit only collected cash', () => {
  const cod = order({ shippingStatus: 'dispatched', status: 'fulfilled' });
  assert.match(codCollectionError(order()), /dispatched/);
  assert.equal(codCollectionError(cod), null);
  assert.match(codCollectionError({ ...cod, codCollectedInPaise: 100000 }), /already/);
  assert.match(codCollectionError({ ...cod, paymentMethod: 'cashfree' }), /cash-on-delivery/);
  assert.match(codRemittanceError(cod), /Record the cash collection/);
  assert.equal(codRemittanceError({ ...cod, codCollectedInPaise: 100000 }), null);
  assert.match(codRemittanceError({ ...cod, codCollectedInPaise: 100000, codRemittedInPaise: 100000 }), /already/);
  assert.match(cancellationError(cod), /Only unfulfilled/);
  assert.match(cancellationError(order({ codCollectedInPaise: 1 })), /already recorded/);
  assert.equal(cancellationError(order()), null);
});

test('financial summary: pending, cancelled, expired and test orders are never sales; COD is owed, not received', () => {
  const orders = [
    order({ $id: 'cod-open' }),
    order({ $id: 'cod-collected', status: 'fulfilled', codCollectedInPaise: 100000, codRemittedInPaise: 40000 }),
    order({ $id: 'online-paid', paymentMethod: 'cashfree', status: 'paid', amountInPaise: 250000 }),
    order({ $id: 'online-pending', paymentMethod: 'cashfree', status: 'pending_payment', amountInPaise: 999999 }),
    order({ $id: 'cancelled', status: 'cancelled' }),
    order({ $id: 'expired', paymentMethod: 'cashfree', status: 'expired' }),
    order({ $id: 'review', paymentMethod: 'cashfree', status: 'payment_review' }),
    order({ $id: 'test', paymentMethod: 'test', status: 'paid', amountInPaise: 777777 }),
  ];
  const s = summarizeOrders(orders);
  assert.equal(s.ordersPlaced, 7);
  assert.equal(s.testOrdersExcluded, 1);
  assert.equal(s.confirmedOrders, 3);
  assert.equal(s.grossOrderValue, 100000 + 100000 + 250000);
  assert.equal(s.onlineCollections, 250000, 'pending Cashfree payment must not count as collected');
  assert.equal(s.codOrderValue, 200000);
  assert.equal(s.codCollected, 100000);
  assert.equal(s.codAwaiting, 100000);
  assert.equal(s.codRemitted, 40000);
  assert.equal(s.codHeldBeforeRemittance, 60000);
  assert.equal(s.unitsSold, 6);
  assert.equal(s.averageOrderValue, Math.round(450000 / 3));
  assert.equal(s.cancelledOrders, 1);
  assert.equal(s.paymentReviewOrders, 1);
});

test('refunded orders stay confirmed sales; refunds come from the ledger, not the label', () => {
  const s = summarizeOrders([order({ paymentMethod: 'cashfree', status: 'refunded', amountInPaise: 90000 })]);
  assert.equal(s.confirmedOrders, 1);
  assert.equal(s.onlineCollections, 90000);
  assert.equal('refunds' in s, false);
});

test('payment mix keeps test payments out of revenue', () => {
  const mix = paymentMix([
    order({ paymentMethod: 'cashfree', paymentChannel: 'upi', status: 'paid' }),
    order({ paymentMethod: 'cashfree', paymentChannel: 'card', status: 'paid' }),
    order({ paymentMethod: 'cod' }),
    order({ paymentMethod: 'test', status: 'paid' }),
  ]);
  const test_ = mix.find((row) => row.key === 'test');
  assert.equal(test_.grossOrderValue, 0);
  assert.equal(test_.excludedFromRevenue, true);
  assert.equal(mix.find((row) => row.key === 'cashfree:upi').grossOrderValue, 100000);
});

test('product performance uses the order-time snapshots and sums to 100%', () => {
  const rows = productPerformance([
    order({ itemsJson: JSON.stringify([{ productId: 'p1', sku: 'A', name: 'A', quantity: 1, lineTotalInPaise: 300 }, { productId: 'p2', sku: 'B', name: 'B', quantity: 2, lineTotalInPaise: 100 }]) }),
    order({ $id: 'o2', status: 'cancelled' }),
  ]);
  assert.deepEqual(rows.map((r) => [r.productId, r.units, r.grossValue]), [['p1', 1, 300], ['p2', 2, 100]]);
  assert.equal(Math.round(rows.reduce((sum, r) => sum + r.share, 0) * 100), 100);
});

test('sales series: months before the first order are unavailable (null), not zero', () => {
  const from = startOfDayIst('2026-01-01');
  const to = startOfDayIst('2026-04-01');
  const first = Date.UTC(2026, 1, 10);
  const series = salesSeries([order({ createdAt: first, status: 'paid', paymentMethod: 'cashfree' })], { groupBy: 'month', fromMs: from, toMs: to, coverageFromMs: first });
  assert.deepEqual(series.map((p) => p.key), ['2026-01', '2026-02', '2026-03']);
  assert.equal(series[0].available, false);
  assert.equal(series[0].grossOrderValue, null);
  assert.equal(series[1].available, true);
  assert.equal(series[1].grossOrderValue, 100000);
  assert.equal(series[2].grossOrderValue, 0, 'a covered month with no orders is a real zero');
  const none = salesSeries([], { groupBy: 'day', fromMs: from, toMs: from + 2 * DAY_MS, coverageFromMs: null });
  assert.ok(none.every((p) => p.available === false));
});

test('bucket keys follow India time and Monday weeks', () => {
  assert.equal(bucketKey(Date.UTC(2026, 5, 9, 18, 31), 'day'), '2026-06-10');
  assert.equal(bucketKey(Date.UTC(2026, 5, 10), 'week'), '2026-06-08'); // Wednesday -> Monday 8th
  assert.equal(bucketKey(Date.UTC(2026, 5, 30, 18, 31), 'month'), '2026-07');
});

test('fulfilment stats only use real timestamps; no data gives null, not zero', () => {
  assert.equal(fulfilmentStats([]).onTimeRate, null);
  const createdAt = Date.UTC(2026, 5, 1);
  const stats = fulfilmentStats([
    order({ createdAt, status: 'fulfilled', shippingStatus: 'delivered', dispatchedAt: createdAt + 3_600_000 * 24, deliveredAt: createdAt + 3_600_000 * 72, estimatedDeliveryAt: createdAt + 3_600_000 * 96 }),
    order({ $id: 'late', createdAt, status: 'fulfilled', shippingStatus: 'delivered', dispatchedAt: createdAt + 3_600_000 * 24, deliveredAt: createdAt + 3_600_000 * 120, estimatedDeliveryAt: createdAt + 3_600_000 * 96 }),
  ]);
  assert.equal(stats.onTimeRate, 0.5);
  assert.equal(stats.avgHoursToDispatch, 24);
  assert.equal(stats.avgHoursToDelivery, 96);
});

test('repeat rate counts customers with two or more confirmed orders', () => {
  const stats = customerStats([order({ email: 'a@x.in' }), order({ $id: 'b', email: 'a@x.in' }), order({ $id: 'c', email: 'b@x.in' }), order({ $id: 'd', email: 'c@x.in', status: 'cancelled' })]);
  assert.equal(stats.customersWithOrders, 2);
  assert.equal(stats.repeatRate, 0.5);
});

test('schema is additive: every pre-existing attribute and index is still defined, new indexes use real attributes', () => {
  const preExisting = {
    products: ['sku', 'name', 'description', 'category', 'priceInPaise', 'currency', 'stockQuantity', 'imageUrl', 'imagesJson', 'active', 'createdAt', 'updatedAt', 'deletedAt'],
    orders: ['userId', 'email', 'status', 'paymentMethod', 'paymentChannel', 'amountInPaise', 'currency', 'itemsJson', 'shippingJson', 'createdAt', 'updatedAt', 'confirmationEmailAttempts', 'confirmationEmailSentAt', 'reservationExpiresAt', 'cashfreeOrderId', 'cashfreePaymentId', 'cancellationRecordedAt'],
    customers: ['email', 'name', 'phone', 'altPhone', 'addressJson', 'userId', 'source', 'cartJson', 'cartUpdatedAt', 'cartEmailSentAt', 'lastOrderAt', 'createdAt', 'updatedAt'],
  };
  for (const [collection, attributes] of Object.entries(preExisting)) {
    const defined = APPWRITE_SCHEMA[collection].attributes.map(([name]) => name);
    for (const name of attributes) assert.ok(defined.includes(name), `${collection}.${name} must remain`);
  }
  for (const [collection, definition] of Object.entries(APPWRITE_SCHEMA)) {
    const names = definition.attributes.map(([name]) => name);
    assert.equal(new Set(names).size, names.length, `${collection}: duplicate attribute`);
    const indexKeys = definition.indexes.map(([key]) => key);
    assert.equal(new Set(indexKeys).size, indexKeys.length, `${collection}: duplicate index key`);
    for (const [key, type, attributes] of definition.indexes) {
      assert.ok(['key', 'unique', 'fulltext'].includes(type), `${collection}.${key} type`);
      for (const attribute of attributes) assert.ok(names.includes(attribute), `${collection}.${key} uses unknown ${attribute}`);
    }
    for (const [name, type, required, size] of definition.attributes) {
      if (type === 'string') assert.ok(size > 0 && size <= 16383, `${collection}.${name} size`);
      assert.ok(['string', 'integer', 'boolean'].includes(type));
      // New attributes on live collections must be optional so existing documents stay valid.
      if (collection === 'orders' && !preExisting.orders.includes(name)) assert.equal(required, false, `orders.${name} must be optional`);
    }
  }
});
