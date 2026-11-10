import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Cashfree signs every webhook as base64(HMAC-SHA256(timestamp + rawBody, clientSecret)) and sends
 * it in `x-webhook-signature` together with `x-webhook-timestamp`.
 */
export function verifyCashfreeWebhookSignature(body, signature, timestamp, secret) {
  if (!Buffer.isBuffer(body) || !secret || typeof signature !== 'string' || typeof timestamp !== 'string') return false;
  if (!/^\d{1,16}$/.test(timestamp) || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(timestamp).update(body).digest();
  const received = Buffer.from(signature, 'base64');
  return received.length === expected.length && timingSafeEqual(received, expected);
}
