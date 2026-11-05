import { useEffect, useState } from 'react';

export type PolicyId = 'shipping' | 'returns' | 'privacy' | 'terms';
const POLICY_IDS: readonly string[] = ['shipping', 'returns', 'privacy', 'terms'];

export type Route =
  | { name: 'home' }
  | { name: 'shop' }
  | { name: 'product'; slug: string }
  | { name: 'cart' }
  | { name: 'checkout' }
  | { name: 'payment' }
  | { name: 'signin' }
  | { name: 'signup' }
  | { name: 'account' }
  | { name: 'track' }
  | { name: 'policy'; id: PolicyId }
  | { name: 'order'; id: string };

const PRODUCT_PREFIX = '#/product/';
const ORDER_PREFIX = '#/order/';
const POLICY_PREFIX = '#/policy/';
const clean = (value: string) => decodeURIComponent(value).replace(/[^a-z0-9._-]/gi, '');

const STATIC_ROUTES: Record<string, Route> = {
  '#/shop': { name: 'shop' },
  '#/cart': { name: 'cart' },
  '#/checkout': { name: 'checkout' },
  '#/checkout/payment': { name: 'payment' },
  '#/signin': { name: 'signin' },
  '#/signup': { name: 'signup' },
  '#/account': { name: 'account' },
  '#/track': { name: 'track' },
};

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
    if (hash.startsWith(POLICY_PREFIX)) {
      const id = clean(hash.slice(POLICY_PREFIX.length));
      if (POLICY_IDS.includes(id)) return { name: 'policy', id: id as PolicyId };
    }
  } catch {
    return { name: 'home' };
  }
  return STATIC_ROUTES[hash] ?? { name: 'home' };
}

export const orderPath = (id: string) => `#/order/${id}`;
export const policyPath = (id: PolicyId) => `#/policy/${id}`;

/**
 * Minimal hash router (no dependency, no server rewrites needed on Vercel). Every step of the
 * shopping journey is its own page:
 *   #/shop  #/product/<slug>  #/cart  #/checkout (details)  #/checkout/payment
 *   #/order/<id>  #/signin  #/signup  #/account  #/track  #/policy/<id>
 * Anything else is the home page, where "#collection" etc. are in-page section anchors.
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
