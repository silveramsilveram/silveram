import { createHash } from 'node:crypto';

export { verifyCashfreeWebhookSignature } from './signatures.js';

const API_VERSION = '2023-08-01';

export function cashfreeBaseUrl(config) {
  return config.cashfreeEnv === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
}

function headers(config) {
  return {
    'x-client-id': config.cashfreeAppId,
    'x-client-secret': config.cashfreeSecretKey,
    'x-api-version': API_VERSION,
    'Content-Type': 'application/json',
  };
}

const rupees = (paise) => Number((paise / 100).toFixed(2));
export const toPaise = (amount) => Math.round(Number(amount) * 100);

function providerError(message = 'The payment provider could not start checkout. Your stock is reserved temporarily; retry or contact the store.') {
  return Object.assign(new Error(message), { status: 503 });
}

/** Creates (or, on retry, re-reads) the Cashfree order whose id is our own order id. */
export async function createCashfreeOrder(config, order, identity) {
  const { shipping } = order;
  const customerKey = createHash('sha256').update(identity.email).digest('hex').slice(0, 24);
  const body = {
    order_id: order._id,
    order_amount: rupees(order.amountInPaise),
    order_currency: 'INR',
    customer_details: {
      customer_id: `c_${customerKey}`,
      customer_name: shipping.name.slice(0, 100),
      customer_email: identity.email,
      customer_phone: shipping.phone,
    },
    order_meta: {
      ...(config.storeUrl && { return_url: `${config.storeUrl}/#/order/${order._id}` }),
      ...(config.storeUrl.startsWith('https://') && { notify_url: `${config.storeUrl}/api/webhooks/cashfree` }),
    },
    order_expiry_time: new Date(order.reservationExpiresAt).toISOString(),
    order_note: 'Silveram jewellery order',
  };
  const response = await fetch(`${cashfreeBaseUrl(config)}/orders`, {
    method: 'POST',
    headers: headers(config),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 409) return getCashfreeOrder(config, order._id);
  if (!response.ok) {
    console.error('Cashfree create order failed:', response.status, (await response.text()).slice(0, 300));
    throw providerError();
  }
  const providerOrder = await response.json();
  if (toPaise(providerOrder.order_amount) !== order.amountInPaise || !providerOrder.payment_session_id) {
    throw providerError('The payment provider returned an invalid order.');
  }
  return providerOrder;
}

export async function getCashfreeOrder(config, orderId) {
  const response = await fetch(`${cashfreeBaseUrl(config)}/orders/${encodeURIComponent(orderId)}`, {
    headers: headers(config),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw providerError();
  return response.json();
}

/**
 * Asks Cashfree directly (never trusts the browser) whether this order has a successful payment
 * for exactly the expected amount. Returns the payment, or null.
 */
export async function findSuccessfulPayment(config, order) {
  const response = await fetch(`${cashfreeBaseUrl(config)}/orders/${encodeURIComponent(order.$id)}/payments`, {
    headers: headers(config),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return null;
  const payments = await response.json();
  if (!Array.isArray(payments)) return null;
  return payments.find((payment) =>
    payment.payment_status === 'SUCCESS' &&
    payment.payment_currency === 'INR' &&
    toPaise(payment.payment_amount) === order.amountInPaise) || null;
}

/** Maps Cashfree's payment_group to the channel we show customers. */
export function channelFor(paymentGroup) {
  if (paymentGroup === 'upi') return 'upi';
  if (typeof paymentGroup === 'string' && paymentGroup.includes('card')) return 'card';
  return undefined;
}
