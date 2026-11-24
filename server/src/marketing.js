import { createHmac, timingSafeEqual } from 'node:crypto';
import { createDocument, getDocument, updateDocument } from './platform/appwrite.js';
import { hashToken } from './security.js';

const CONTACT_ID = /^[a-f0-9]{36}$/;

export function marketingContactId(email) {
  return hashToken(email.trim().toLowerCase()).slice(0, 36);
}

export async function recordMarketingConsent(email, name) {
  const id = marketingContactId(email);
  const existing = await getDocument('marketingContacts', id);
  const now = Date.now();
  if (existing?.status === 'unsubscribed') {
    const contact = await updateDocument('marketingContacts', id, {
      ...(name && { name: name.slice(0, 100) }),
      status: 'subscribed',
      consentedAt: now,
      consentSource: 'newsletter',
      consentVersion: 'newsletter-v1',
      updatedAt: now,
    });
    return { contact, reOptedIn: true };
  }
  if (existing && existing.status !== 'subscribed') return { contact: existing, reOptedIn: false };
  if (existing) {
    const contact = await updateDocument('marketingContacts', id, {
      ...(name && { name: name.slice(0, 100) }), updatedAt: now,
    });
    return { contact, reOptedIn: false };
  }
  try {
    const contact = await createDocument('marketingContacts', id, {
      email,
      ...(name && { name: name.slice(0, 100) }),
      status: 'subscribed',
      consentedAt: now,
      consentSource: 'newsletter',
      consentVersion: 'newsletter-v1',
      createdAt: now,
      updatedAt: now,
    });
    return { contact, reOptedIn: false };
  } catch (error) {
    if (error?.code !== 409) throw error;
    const raced = await getDocument('marketingContacts', id);
    if (!raced) throw error;
    if (raced.status === 'unsubscribed') {
      const contact = await updateDocument('marketingContacts', id, {
        ...(name && { name: name.slice(0, 100) }),
        status: 'subscribed', consentedAt: now, consentSource: 'newsletter', consentVersion: 'newsletter-v1',
        updatedAt: now,
      });
      return { contact, reOptedIn: true };
    }
    if (raced.status !== 'subscribed') return { contact: raced, reOptedIn: false };
    const contact = await updateDocument('marketingContacts', id, {
      ...(name && { name: name.slice(0, 100) }), updatedAt: now,
    });
    return { contact, reOptedIn: false };
  }
}

export function createMarketingUnsubscribeToken(id, secret) {
  if (!CONTACT_ID.test(id)) throw new Error('Invalid marketing contact ID.');
  const signature = createHmac('sha256', secret).update(`silveram:marketing-unsubscribe:${id}`).digest('base64url');
  return `${id}.${signature}`;
}

export function verifyMarketingUnsubscribeToken(token, secret) {
  if (typeof token !== 'string') return null;
  const [id, signature, extra] = token.split('.');
  if (extra !== undefined || !CONTACT_ID.test(id || '') || !signature) return null;
  const expected = createHmac('sha256', secret).update(`silveram:marketing-unsubscribe:${id}`).digest('base64url');
  const suppliedBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes) ? id : null;
}

export async function markMarketingContactUnsubscribed(id) {
  const contact = await getDocument('marketingContacts', id);
  if (!contact) return null;
  if (contact.status === 'unsubscribed') return { contact, changed: false };
  const now = Date.now();
  const updated = await updateDocument('marketingContacts', id, {
    status: 'unsubscribed',
    lastUnsubscribedAt: now,
    updatedAt: now,
  });
  return { contact: updated, changed: true };
}
