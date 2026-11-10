import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { verifyCashfreeWebhookSignature } from '../src/payments/cashfree/signatures.js';

const secret = 'cashfree-test-secret';
const body = Buffer.from(JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: 'o1' } } }));
const timestamp = '1700000000000';
const signature = createHmac('sha256', secret).update(timestamp).update(body).digest('base64');

test('accepts a correctly signed Cashfree webhook', () => {
  assert.equal(verifyCashfreeWebhookSignature(body, signature, timestamp, secret), true);
});

test('rejects tampered body, timestamp, signature or secret', () => {
  assert.equal(verifyCashfreeWebhookSignature(Buffer.from('{}'), signature, timestamp, secret), false);
  assert.equal(verifyCashfreeWebhookSignature(body, signature, '1700000000001', secret), false);
  assert.equal(verifyCashfreeWebhookSignature(body, 'A'.repeat(43) + '=', timestamp, secret), false);
  assert.equal(verifyCashfreeWebhookSignature(body, signature, timestamp, 'other'), false);
  assert.equal(verifyCashfreeWebhookSignature(body, undefined, timestamp, secret), false);
  assert.equal(verifyCashfreeWebhookSignature(body, signature, timestamp, ''), false);
  assert.equal(verifyCashfreeWebhookSignature(body.toString(), signature, timestamp, secret), false);
});
