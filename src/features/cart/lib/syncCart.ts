import { useEffect } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCart, type CartItem } from '@/features/cart/context/CartContext';
import { apiRequest, isCheckoutEnabled } from '@/shared/lib/api';

interface SyncInput {
  /** Guests only: signed-in customers are identified by their session. */
  email?: string;
  name?: string;
  phone?: string;
  cart: CartItem[];
}

/**
 * Saves the bag against the customer's e-mail in Appwrite; the API then e-mails them a link back
 * to it (at most once every few hours). Best effort: failures never disturb shopping.
 */
export function syncCart({ email, name, phone, cart }: SyncInput): Promise<void> {
  if (!isCheckoutEnabled || cart.length === 0) return Promise.resolve();
  return apiRequest('/cart/sync', {
    method: 'POST',
    body: JSON.stringify({
      ...(email ? { email } : {}),
      ...(name ? { name } : {}),
      ...(phone ? { phone } : {}),
      items: cart.map(({ id, quantity }) => ({ id, quantity })),
    }),
  }).then(
    () => undefined,
    () => undefined,
  );
}

/** Signed-in customers: keep the saved bag in step with the bag on screen. */
export function useSignedInCartSync() {
  const { user } = useAuth();
  const { cart } = useCart();

  useEffect(() => {
    if (!user || cart.length === 0) return;
    const timer = window.setTimeout(() => void syncCart({ cart }), 2000);
    return () => window.clearTimeout(timer);
  }, [user, cart]);
}
