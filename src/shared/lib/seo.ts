import { absoluteUrl, type JsonLd, type SeoPage } from '@/shared/seo/pages';

/**
 * Runtime <head> updates for client-side navigation. The first load of each public page already has
 * the right tags baked into its static HTML (scripts/prerender.mjs); these functions keep the tab
 * title, canonical URL and social tags correct as the customer moves around without a reload.
 */
const JSON_LD_ATTRIBUTE = 'data-structured-data';

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attribute, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

export type PageMeta = Pick<SeoPage, 'title' | 'description' | 'image' | 'noindex'> & {
  /** Site-relative path for the canonical link. Defaults to the current path. */
  path?: string;
};

export function setPageMeta({ title, description, path, image, noindex = false }: PageMeta) {
  document.title = title;
  // A previous page's structured data must never leak onto this one (applyPageSeo re-adds its own).
  setStructuredData(null);
  setMeta('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
  setMeta('meta[name="description"]', 'name', 'description', description);
  setMeta('meta[property="og:title"]', 'property', 'og:title', title);
  setMeta('meta[property="og:description"]', 'property', 'og:description', description);
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
  const url = absoluteUrl(path ?? window.location.pathname);
  setMeta('meta[property="og:url"]', 'property', 'og:url', url);
  setCanonical(url);
  const imageUrl = absoluteUrl(image ?? '/images/products/silver-frame-01.webp');
  setMeta('meta[property="og:image"]', 'property', 'og:image', imageUrl);
  setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);
}

/** Replace the page's JSON-LD blocks (pass null/[] to clear). Only pass factual data. */
export function setStructuredData(data: JsonLd | JsonLd[] | null) {
  document.head.querySelectorAll(`script[${JSON_LD_ATTRIBUTE}]`).forEach((el) => el.remove());
  // The static HTML already carried a JSON-LD block for this page: drop it so there are no duplicates.
  document.head.querySelectorAll('script[type="application/ld+json"][data-prerendered]').forEach((el) => el.remove());
  for (const entry of data ? [data].flat() : []) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute(JSON_LD_ATTRIBUTE, '');
    script.textContent = JSON.stringify(entry);
    document.head.appendChild(script);
  }
}

/** Apply a full SEO page definition (title, description, canonical, previews, JSON-LD). */
export function applyPageSeo(page: Omit<SeoPage, 'path'> & { path?: string }) {
  setPageMeta(page);
  setStructuredData(page.jsonLd);
}
