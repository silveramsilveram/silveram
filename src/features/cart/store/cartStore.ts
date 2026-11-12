import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { getProductById, type Product } from '@/features/products/data/products';

export const MAX_ITEM_QUANTITY = 10;

/** A bag line. Name, price and image always come from the catalogue, never from storage. */
export interface CartItem {
  id: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  imageFallback?: string;
  imageAlt?: string;
}

const STORAGE_KEY = 'silveram_cart_items';
const TOAST_MS = 3200;

function toCartItem(product: Product, quantity: number): CartItem | null {
  if (product.price === null) return null;
  const image = product.images[0];
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    price: product.price,
    quantity,
    image: image?.src,
    imageFallback: image?.fallbackSrc,
    imageAlt: image?.alt,
  };
}

/** Persist only { id, quantity }; rebuild everything else from the catalogue. */
function loadCart(): CartItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry: unknown) => {
      if (!entry || typeof entry !== 'object') return [];
      const { id, quantity } = entry as { id?: unknown; quantity?: unknown };
      if (
        typeof id !== 'string' ||
        typeof quantity !== 'number' ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > MAX_ITEM_QUANTITY
      ) {
        return [];
      }
      const product = getProductById(id);
      const item = product ? toCartItem(product, quantity) : null;
      return item ? [item] : [];
    });
  } catch {
    return [];
  }
}

/** Totals are computed once per change (O(n) on a tiny list) instead of on every render of every consumer. */
function withTotals(cart: CartItem[]) {
  let itemCount = 0;
  let subtotal = 0;
  for (const item of cart) {
    itemCount += item.quantity;
    subtotal += item.price * item.quantity;
  }
  return { cart, itemCount, subtotal };
}

interface CartState {
  cart: CartItem[];
  itemCount: number;
  subtotal: number;
  toastMessage: string | null;
  liveAnnouncement: string;
  /** `goToBag` redirects to the bag page after adding (Amazon / Flipkart style). */
  addToCart: (product: Product, goToBag?: boolean, quantity?: number) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useCartStore = create<CartState>()((set, get) => {
  const announce = (message: string) => {
    set({ toastMessage: message, liveAnnouncement: message });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toastMessage: null }), TOAST_MS);
  };

  return {
    ...withTotals(loadCart()),
    toastMessage: null,
    liveAnnouncement: '',

    addToCart: (product, goToBag = false, quantity = 1) => {
      const qty = Math.max(1, Math.min(MAX_ITEM_QUANTITY, Math.floor(quantity)));
      const next = toCartItem(product, qty);
      if (!next) {
        announce(`${product.name} has no price yet and cannot be added to the bag.`);
        return;
      }
      const { cart } = get();
      const existing = cart.find((item) => item.id === product.id);
      if (existing && existing.quantity >= MAX_ITEM_QUANTITY) {
        announce(`Maximum ${MAX_ITEM_QUANTITY} of each item per order`);
        if (goToBag) window.location.hash = '#/cart';
        return;
      }
      set(
        withTotals(
          existing
            ? cart.map((item) =>
                item.id === product.id
                  ? { ...item, quantity: Math.min(MAX_ITEM_QUANTITY, item.quantity + qty) }
                  : item,
              )
            : [...cart, next],
        ),
      );
      announce(`${product.name} added to bag`);
      if (goToBag) window.location.hash = '#/cart';
    },

    updateQuantity: (id, delta) =>
      set(({ cart }) =>
        withTotals(
          cart.flatMap((item) => {
            if (item.id !== id) return [item];
            const quantity = Math.min(MAX_ITEM_QUANTITY, item.quantity + delta);
            return quantity > 0 ? [{ ...item, quantity }] : [];
          }),
        ),
      ),

    removeItem: (id) => set(({ cart }) => withTotals(cart.filter((item) => item.id !== id))),

    clearCart: () => set(withTotals([])),
  };
});

// Persist only when the bag itself changes (not on every toast), and keep other tabs in step.
useCartStore.subscribe((state, previous) => {
  if (state.cart === previous.cart) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cart.map(({ id, quantity }) => ({ id, quantity }))));
  } catch {
    // Storage unavailable or full: the bag simply won't persist.
  }
});

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) useCartStore.setState(withTotals(loadCart()));
  });
}

/**
 * Backwards-compatible hook. Components re-render only when a field they actually read changes
 * (shallow compare), so e.g. a toast appearing no longer re-renders the whole checkout.
 */
export function useCart() {
  return useCartStore(
    useShallow((state) => ({
      cart: state.cart,
      itemCount: state.itemCount,
      subtotal: state.subtotal,
      addToCart: state.addToCart,
      updateQuantity: state.updateQuantity,
      removeItem: state.removeItem,
      clearCart: state.clearCart,
    })),
  );
}
