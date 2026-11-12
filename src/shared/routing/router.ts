import { useEffect, useMemo, useSyncExternalStore } from 'react';

/**
 * Tiny History-API router (no dependency).
 *
 * Why not hash URLs (`/#/product/x`)? Search engines ignore everything after `#`, so every page
 * looked like "/" and nothing but the home page could be indexed. Real paths (`/product/x`) can be
 * crawled, shared, bookmarked and given their own title/description. Vercel serves the SPA shell for
 * unknown paths (see `rewrites` in vercel.json) and pre-rendered HTML for indexable ones.
 *
 * URLs:
 *   /  /shop  /product/<slug>  /cart  /checkout  /checkout/payment  /order/<id>
 *   /signin  /signup  /account  /track  /policy/<id>
 */

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
  | { name: 'order'; id: string }
  | { name: 'notfound' };

const STATIC_ROUTES: Record<string, Route> = {
  '/': { name: 'home' },
  '/shop': { name: 'shop' },
  '/cart': { name: 'cart' },
  '/checkout': { name: 'checkout' },
  '/checkout/payment': { name: 'payment' },
  '/signin': { name: 'signin' },
  '/signup': { name: 'signup' },
  '/account': { name: 'account' },
  '/track': { name: 'track' },
};

/** Only these characters can appear in a slug / id, so a crafted URL can never reach the DOM or API. */
const SEGMENT = /^[a-z0-9][a-z0-9._-]{0,99}$/i;

export function parseRoute(pathname: string): Route {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const fixed = STATIC_ROUTES[path];
  if (fixed) return fixed;

  const [, first, second, ...rest] = path.split('/');
  if (second && rest.length === 0 && SEGMENT.test(second)) {
    if (first === 'product') return { name: 'product', slug: second.toLowerCase() };
    if (first === 'order') return { name: 'order', id: second };
    if (first === 'policy' && POLICY_IDS.includes(second)) return { name: 'policy', id: second as PolicyId };
  }
  return { name: 'notfound' };
}

export const orderPath = (id: string) => `/order/${id}`;
export const policyPath = (id: PolicyId) => `/policy/${id}`;

/** Old shared links / e-mails used `/#/shop`-style URLs: map them to the real path. */
export function legacyHashToPath(hash: string): string | null {
  if (!hash.startsWith('#/')) return null;
  const path = hash.slice(1);
  return parseRoute(path).name === 'notfound' ? null : path;
}

/** Call once before the first render: rewrites an old `/#/shop` URL to `/shop` in place. */
export function upgradeLegacyUrl() {
  const legacy = legacyHashToPath(window.location.hash);
  if (legacy) window.history.replaceState(null, '', legacy);
}

const NAVIGATE_EVENT = 'silveram:navigate';

/** Go to an in-app path (optionally with `#section`). Pass `replace` to avoid a back-button entry. */
export function navigate(to: string, { replace = false }: { replace?: boolean } = {}) {
  const url = new URL(to, window.location.origin);
  if (url.origin !== window.location.origin) {
    window.location.assign(to);
    return;
  }
  const target = `${url.pathname}${url.search}${url.hash}`;
  if (target !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history[replace ? 'replaceState' : 'pushState'](null, '', target);
  }
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener('hashchange', onChange);
  window.addEventListener(NAVIGATE_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener('hashchange', onChange);
    window.removeEventListener(NAVIGATE_EVENT, onChange);
  };
}

const getPath = () => window.location.pathname;
const getPathAndHash = () => `${window.location.pathname}${window.location.hash}`;

/** The current route. Re-renders only when the path changes. */
export function useRoute(): Route {
  const pathname = useSyncExternalStore(subscribe, getPath, () => '/');
  return useMemo(() => parseRoute(pathname), [pathname]);
}

/** `path#hash`: changes on every navigation, including in-page `#section` jumps. */
export function useLocationKey(): string {
  return useSyncExternalStore(subscribe, getPathAndHash, () => '/');
}

/** The current `#hash` (for highlighting the section link you are on). */
export function useHash(): string {
  const key = useLocationKey();
  return key.includes('#') ? key.slice(key.indexOf('#')) : '';
}

/**
 * Turns ordinary `<a href="/shop">` clicks into in-app navigation (no full reload), so no component
 * needs a special <Link>. Falls through to the browser for new tabs, modified clicks, downloads,
 * other origins, `/api` links and same-page `#anchors`.
 */
export function useLinkInterception() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith('/api/')) return;
      // Same page + #section: let the browser scroll to the anchor.
      if (url.pathname === window.location.pathname && url.hash) return;

      event.preventDefault();
      navigate(`${url.pathname}${url.search}${url.hash}`);
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}
