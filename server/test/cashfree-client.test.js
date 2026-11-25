import assert from 'node:assert/strict';
import test from 'node:test';
import { findSuccessfulPayment } from '../src/payments/cashfree/client.js';

const config = {
  cashfreeEnv: 'sandbox',
  cashfreeAppId: 'test-app',
  cashfreeSecretKey: 'test-secret',
};
const order = { $id: 'order-1', amountInPaise: 12345 };

test('payment verification distinguishes provider errors from a completed payment attempt', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('unavailable', { status: 503 });
    await assert.rejects(findSuccessfulPayment(config, order), (error) => error.status === 503);

    globalThis.fetch = async () => Response.json([]);
    assert.equal(await findSuccessfulPayment(config, order), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('payment verification returns only exact-amount INR successes', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json([
      { payment_status: 'FAILED', payment_currency: 'INR', payment_amount: 123.45 },
      { payment_status: 'SUCCESS', payment_currency: 'INR', payment_amount: 123.44 },
      { payment_status: 'SUCCESS', payment_currency: 'INR', payment_amount: 123.45, cf_payment_id: 'cf-pay-1' },
    ]);

    const payment = await findSuccessfulPayment(config, order);
    assert.equal(payment.cf_payment_id, 'cf-pay-1');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
