import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

interface CartContextType {
  cart: CartItem[];
  itemCount: number;
  subtotal: number;
  /** `goToBag` redirects to the bag page after adding (Amazon / Flipkart style). */
  addToCart: (product: Product, goToBag?: boolean, quantity?: number) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  toastMessage: string | null;
  liveAnnouncement: string;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = 'silveram_cart_items';

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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(loadCart);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(cart.map(({ id, quantity }) => ({ id, quantity }))),
      );
    } catch {
      // Storage unavailable or full: the bag simply won't persist.
    }
  }, [cart]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const announce = useCallback((message: string) => {
    setToastMessage(message);
    setLiveAnnouncement(message);
  }, []);

  const addToCart = useCallback(
    (product: Product, goToBag = false, quantity = 1) => {
      const qty = Math.max(1, Math.min(MAX_ITEM_QUANTITY, Math.floor(quantity)));
      const next = toCartItem(product, qty);
      if (!next) {
        announce(`${product.name} has no price yet and cannot be added to the bag.`);
        return;
      }
      const existing = cart.find((item) => item.id === product.id);
      if (existing && existing.quantity >= MAX_ITEM_QUANTITY) {
        announce(`Maximum ${MAX_ITEM_QUANTITY} of each item per order`);
        if (goToBag) window.location.hash = '#/cart';
        return;
      }
      setCart((prev) =>
        prev.some((item) => item.id === product.id)
          ? prev.map((item) =>
              item.id === product.id
                ? { ...item, quantity: Math.min(MAX_ITEM_QUANTITY, item.quantity + qty) }
                : item,
            )
          : [...prev, next],
      );
      announce(`${product.name} added to bag`);
      if (goToBag) window.location.hash = '#/cart';
    },
    [cart, announce],
  );

  const updateQuantity = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev.flatMap((item) => {
        if (item.id !== id) return [item];
        const quantity = Math.min(MAX_ITEM_QUANTITY, item.quantity + delta);
        return quantity > 0 ? [{ ...item, quantity }] : [];
      }),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const value = useMemo<CartContextType>(
    () => ({
      cart,
      itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
      addToCart,
      updateQuantity,
      removeItem,
      clearCart,
      toastMessage,
      liveAnnouncement,
    }),
    [cart, addToCart, updateQuantity, removeItem, clearCart, toastMessage, liveAnnouncement],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
