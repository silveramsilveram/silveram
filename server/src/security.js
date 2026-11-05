import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { createDocument, getAppwrite } from './platform/appwrite.js';

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function otpDigest(email, code, pepper) {
  return createHmac('sha256', pepper).update(`${email}:${code}`).digest('hex');
}

export function safeEqualHex(left, right) {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createOpaqueToken() {
  return randomBytes(32).toString('base64url');
}

export function createOtp() {
  return randomInt(0, 1000000).toString().padStart(6, '0');
}

export async function consumeRateLimit(identity, action, limit, windowMs) {
  const { databases, databaseId, collections } = getAppwrite();
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const id = createHash('sha256').update(`${action}:${identity}:${windowStart}`).digest('hex').slice(0, 36);
  try {
    await createDocument('rateLimits', id, {
      key: createHash('sha256').update(`${action}:${identity}`).digest('hex'),
      windowStart,
      count: 1,
    });
    return true;
  } catch (error) {
    if (error?.code !== 409) throw error;
  }

  try {
    const updated = await databases.incrementDocumentAttribute({
      databaseId,
      collectionId: collections.rateLimits,
      documentId: id,
      attribute: 'count',
      value: 1,
      max: limit,
    });
    return updated.count <= limit;
  } catch (error) {
    if (error?.code === 400) return false;
    throw error;
  }
}
