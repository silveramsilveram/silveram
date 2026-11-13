/**
 * Order lifecycle rules for the admin. Three separate dimensions are kept apart on purpose:
 *
 *  1. `status`         - the commerce/payment state owned by checkout, Cashfree webhooks and
 *                        cancellation (placed_cod, pending_payment, paid, fulfilled, cancelled,
 *                        expired, refunded, payment_review). Existing meaning is unchanged.
 *  2. `shippingStatus` - the physical shipment: pending -> processing -> packed -> dispatched ->
 *                        out_for_delivery -> delivered. Maintained manually by an operator;
 *                        there is no courier integration, so nothing here is "live tracking".
 *  3. COD cash         - recorded in the `transactions` ledger (collection, then remittance).
 *
 * Nothing here lets the browser pick an arbitrary status string: every transition is named.
 */

export const ORDER_STATUSES = [
  'placed_cod', 'pending_payment', 'paid', 'fulfilled', 'cancelled', 'expired', 'refunded', 'payment_review',
];

export const SHIPPING_STATUSES = ['pending', 'processing', 'packed', 'dispatched', 'out_for_delivery', 'delivered'];
const SHIPPING_RANK = Object.fromEntries(SHIPPING_STATUSES.map((status, index) => [status, index]));

/** Orders whose goods may be shipped: accepted COD, or payment confirmed. */
const SHIPPABLE_STATUSES = new Set(['placed_cod', 'paid', 'fulfilled']);

/** Orders that count as a confirmed sale (money collected or collectable). */
export const CONFIRMED_STATUSES = new Set(['placed_cod', 'paid', 'fulfilled', 'refunded']);

/** Paid online: Cashfree confirmed the payment, whether or not it has been shipped/refunded since. */
export const ONLINE_PAID_STATUSES = new Set(['paid', 'fulfilled', 'refunded']);

export const isTestOrder = (order) => order.paymentMethod === 'test';

export function shippingStatusOf(order) {
  return SHIPPING_STATUSES.includes(order.shippingStatus) ? order.shippingStatus : 'pending';
}

/** Why a shipping transition is not allowed, or null when it is. */
export function shippingTransitionError(order, to) {
  if (!SHIPPING_STATUSES.includes(to)) return 'Choose a supported shipping status.';
  if (order.paymentMethod === 'test') return 'Test-payment orders are not shipped.';
  if (!SHIPPABLE_STATUSES.has(order.status)) {
    return order.status === 'pending_payment'
      ? 'This order is still waiting for payment, so it cannot be shipped yet.'
      : 'Only accepted cash-on-delivery orders or paid orders can be shipped.';
  }
  const from = shippingStatusOf(order);
  if (from === 'delivered') return 'This order is already marked delivered.';
  if (SHIPPING_RANK[to] <= SHIPPING_RANK[from]) return 'Shipping can only move forward.';
  if (to === 'delivered' && SHIPPING_RANK[from] < SHIPPING_RANK.dispatched) {
    return 'Mark the order dispatched before delivered.';
  }
  return null;
}

/**
 * The commerce `status` an order takes when its shipping status changes. The storefront already
 * tells customers that `fulfilled` means "this order has been dispatched", so dispatching (or any
 * later step) moves an accepted COD or paid order to `fulfilled`. Earlier steps change nothing.
 */
export function statusAfterShipping(order, to) {
  if (SHIPPING_RANK[to] >= SHIPPING_RANK.dispatched && ['placed_cod', 'paid'].includes(order.status)) return 'fulfilled';
  return order.status;
}

const FIVE_MINUTES = 5 * 60 * 1000;

/** Returns an error message for impossible date combinations, or null. All values are epoch ms. */
export function validateShippingDates(order, dates, now = Date.now()) {
  const { expectedDispatchAt, dispatchedAt, estimatedDeliveryAt, deliveredAt } = dates;
  if (expectedDispatchAt && estimatedDeliveryAt && expectedDispatchAt > estimatedDeliveryAt) {
    return 'Expected dispatch cannot be after the estimated delivery date.';
  }
  if (dispatchedAt && dispatchedAt < order.createdAt) return 'Dispatch cannot be before the order was placed.';
  if (dispatchedAt && dispatchedAt > now + FIVE_MINUTES) return 'Dispatch time cannot be in the future.';
  if (deliveredAt && deliveredAt > now + FIVE_MINUTES) return 'Delivery time cannot be in the future.';
  if (dispatchedAt && deliveredAt && dispatchedAt > deliveredAt) return 'Dispatch cannot be after delivery.';
  if (estimatedDeliveryAt && estimatedDeliveryAt < order.createdAt) return 'The estimated delivery date cannot be before the order date.';
  return null;
}

/** Late = promised delivery date has passed, order is still open and shippable. */
export function isOverdue(order, now = Date.now()) {
  return Boolean(
    order.estimatedDeliveryAt &&
    order.estimatedDeliveryAt < now &&
    shippingStatusOf(order) !== 'delivered' &&
    ['placed_cod', 'paid', 'fulfilled'].includes(order.status),
  );
}

/** COD cash can only be recorded for COD orders that have left the shop and are still open or fulfilled. */
export function codCollectionError(order) {
  if (order.paymentMethod !== 'cod') return 'Cash collection applies to cash-on-delivery orders only.';
  if (!['placed_cod', 'fulfilled'].includes(order.status)) return 'This order is not an accepted cash-on-delivery order.';
  if (SHIPPING_RANK[shippingStatusOf(order)] < SHIPPING_RANK.dispatched) {
    return 'Record cash only after the order has been dispatched.';
  }
  if ((order.codCollectedInPaise || 0) > 0) return 'Cash for this order has already been recorded.';
  return null;
}

export function codRemittanceError(order) {
  if (order.paymentMethod !== 'cod') return 'Remittance applies to cash-on-delivery orders only.';
  if (!(order.codCollectedInPaise > 0)) return 'Record the cash collection before recording its remittance.';
  if ((order.codRemittedInPaise || 0) > 0) return 'This order has already been remitted.';
  return null;
}

export function cancellationError(order) {
  if (order.status !== 'placed_cod') return 'Only unfulfilled cash-on-delivery orders can be cancelled this way.';
  if ((order.codCollectedInPaise || 0) > 0) return 'Cash was already recorded for this order, so it cannot be cancelled here.';
  if (shippingStatusOf(order) === 'delivered') return 'A delivered order cannot be cancelled.';
  return null;
}
