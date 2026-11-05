import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'product'; slug: string }
  | { name: 'cart' }
  | { name: 'checkout' }
  | { name: 'account' }
  | { name: 'order'; id: string };

const PRODUCT_PREFIX = '#/product/';
const ORDER_PREFIX = '#/order/';
const clean = (value: string) => decodeURIComponent(value).replace(/[^a-z0-9._-]/gi, '');

export function parseRoute(hash: string): Route {
  try {
    if (hash.startsWith(PRODUCT_PREFIX)) {
      const slug = clean(hash.slice(PRODUCT_PREFIX.length)).replace(/[^a-z0-9-]/gi, '');
      if (slug) return { name: 'product', slug };
    }
    if (hash.startsWith(ORDER_PREFIX)) {
      const id = clean(hash.slice(ORDER_PREFIX.length));
      if (id) return { name: 'order', id };
    }
  } catch {
    return { name: 'home' };
  }
  if (hash === '#/cart') return { name: 'cart' };
  if (hash === '#/checkout') return { name: 'checkout' };
  if (hash === '#/account') return { name: 'account' };
  return { name: 'home' };
}

export const orderPath = (id: string) => `#/order/${id}`;

/**
 * Minimal hash router (no dependency, no server rewrites needed on Vercel).
 *   #/product/<slug>  → product page      #/cart      → bag
 *   #/checkout        → checkout          #/account   → sign in / orders
 *   #/order/<id>      → order confirmation
 *   anything else     → home; "#collection" etc. are in-page section anchors
 */
export function useHashRoute(): Route {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return parseRoute(hash);
}
