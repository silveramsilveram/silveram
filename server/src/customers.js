import { createDocument, getDocument, updateDocument } from './platform/appwrite.js';
import { hashToken } from './security.js';

/**
 * One Appwrite document per e-mail address in the `customers` collection. It holds the contact
 * details collected at checkout (guests included), the last saved bag, and when we last e-mailed
 * about it. Orders themselves live in `orders`; this is the contact book / saved-bag record.
 */
export const CART_EMAIL_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function customerId(email) {
  return hashToken(email.trim().toLowerCase()).slice(0, 36);
}

function contactFields(existing, { email, name, phone, altPhone, address, userId, source }) {
  return {
    email,
    ...(name ? { name: name.slice(0, 100) } : {}),
    ...(phone ? { phone } : {}),
    ...(altPhone ? { altPhone } : {}),
    // Last delivery address, so support can see it and repeat orders are quick to place.
    ...(address ? { addressJson: JSON.stringify(address).slice(0, 1000) } : {}),
    ...(userId ? { userId } : {}),
    // Once someone has an account, they stay an account holder.
    source: existing?.source === 'account' || source === 'account' ? 'account' : 'guest',
  };
}

async function save(id, existing, fields) {
  const now = Date.now();
  if (existing) return updateDocument('customers', id, { ...fields, updatedAt: now });
  try {
    return await createDocument('customers', id, { createdAt: now, updatedAt: now, ...fields });
  } catch (error) {
    if (error?.code !== 409) throw error;
    // Lost a race with a concurrent request for the same e-mail: update instead.
    return updateDocument('customers', id, { ...fields, updatedAt: now });
  }
}

/** Create or update the contact record (name/phone are only ever filled in, never blanked). */
export async function upsertCustomer(contact, extra = {}) {
  const id = customerId(contact.email);
  const existing = await getDocument('customers', id);
  const doc = await save(id, existing, { ...contactFields(existing, contact), ...extra });
  return { id, doc, existing };
}

/**
 * Save the customer's current bag. Returns `{ shouldEmail }`: true when a "your bag is saved"
 * message is due (bag not empty and none sent in the last CART_EMAIL_INTERVAL_MS).
 */
export async function recordCart(contact, lines) {
  const now = Date.now();
  const { existing } = await upsertCustomer(contact, {
    cartJson: JSON.stringify(lines.map(({ id, quantity }) => ({ id, quantity }))),
    cartUpdatedAt: now,
  });
  const shouldEmail = lines.length > 0 && now - (existing?.cartEmailSentAt || 0) > CART_EMAIL_INTERVAL_MS;
  return { shouldEmail, id: customerId(contact.email) };
}

export async function markCartEmailSent(id) {
  await updateDocument('customers', id, { cartEmailSentAt: Date.now() });
}

/** After an order: remember the phone/name used and empty the saved bag. */
export async function recordCustomerOrder(contact) {
  await upsertCustomer(contact, { cartJson: '', cartUpdatedAt: Date.now(), lastOrderAt: Date.now() });
}
