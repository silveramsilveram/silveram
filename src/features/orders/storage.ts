import type { Order } from './types';

/**
 * Guests have no account, so this device remembers the orders it placed
 * (reference + e-mail) to reopen them later. Everything is best-effort:
 * storage may be blocked, and the API remains the source of truth.
 */
const GUEST_KEY = 'silveram_guest_orders';
const LAST_KEY = 'silveram_last_order';
const CHECKOUT_REQUEST_KEY = 'silveram_checkout_request';
const MAX_GUEST_ORDERS = 5;

export interface GuestOrderRef {
  id: string;
  email: string;
}

interface CheckoutRequestRef {
  id: string;
  key: string;
}

function readCheckoutRequest(): CheckoutRequestRef | null {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(CHECKOUT_REQUEST_KEY) || 'null');
    if (
      parsed &&
      typeof parsed === 'object' &&
      'id' in parsed &&
      typeof parsed.id === 'string' &&
      'key' in parsed &&
      typeof parsed.key === 'string'
    ) {
      return { id: parsed.id, key: parsed.key };
    }
    return null;
  } catch {
    return null;
  }
}

/** Reuses an in-progress order after the payment provider returns to the storefront. */
export function getCheckoutRequestId(key: string): string {
  const saved = readCheckoutRequest();
  if (saved?.key === key) return saved.id;

  const id = crypto.randomUUID();
  try {
    sessionStorage.setItem(CHECKOUT_REQUEST_KEY, JSON.stringify({ id, key }));
  } catch {
    // The order still works; a blocked session store only prevents retrying the same request.
  }
  return id;
}

export function isActiveCheckoutOrder(id: string): boolean {
  return readCheckoutRequest()?.id === id;
}

export function clearCheckoutRequest(id: string): void {
  if (readCheckoutRequest()?.id !== id) return;
  try {
    sessionStorage.removeItem(CHECKOUT_REQUEST_KEY);
  } catch {
    // The completed order remains available from the API.
  }
}

export function getGuestOrders(): GuestOrderRef[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is GuestOrderRef =>
        !!entry && typeof entry.id === 'string' && typeof entry.email === 'string',
    );
  } catch {
    return [];
  }
}

export function rememberGuestOrder(ref: GuestOrderRef) {
  try {
    const next = [ref, ...getGuestOrders().filter((entry) => entry.id !== ref.id)].slice(0, MAX_GUEST_ORDERS);
    localStorage.setItem(GUEST_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: the order can still be found with reference + e-mail.
  }
}

export function saveLastOrder(order: Order) {
  try {
    sessionStorage.setItem(LAST_KEY, JSON.stringify(order));
  } catch {
    // Ignore.
  }
}

export function loadLastOrder(id: string): Order | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(LAST_KEY) || 'null') as Order | null;
    return parsed && parsed.id === id ? parsed : null;
  } catch {
    return null;
  }
}
