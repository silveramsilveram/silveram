import { SITE } from '@/shared/config/site';
import { productImageUrl } from '@/shared/lib/cloudinary';

const JSON_LD_ID = 'structured-data';

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

export interface PageMeta {
  title: string;
  description: string;
  /** Path/hash appended to the site URL for the canonical link. */
  path?: string;
  /** Site-relative or absolute image URL for social previews. */
  image?: string;
}

export function setPageMeta({ title, description, path = '', image }: PageMeta) {
  document.title = title;
  setMeta('meta[name="description"]', 'name', 'description', description);
  setMeta('meta[property="og:title"]', 'property', 'og:title', title);
  setMeta('meta[property="og:description"]', 'property', 'og:description', description);
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
  const url = `${SITE.url}/${path}`;
  setMeta('meta[property="og:url"]', 'property', 'og:url', url);
  setCanonical(url);
  const imageUrl = new URL(
    image ?? productImageUrl('SV-001', 'silver-frame-01', 1200, '/images/products/silver-frame-01.webp'),
    SITE.url,
  ).toString();
  setMeta('meta[property="og:image"]', 'property', 'og:image', imageUrl);
  setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);
}

/** Inject (or clear, with null) a JSON-LD block. Only pass factual data. */
export function setStructuredData(data: Record<string, unknown> | null) {
  document.getElementById(JSON_LD_ID)?.remove();
  if (!data) return;
  const script = document.createElement('script');
  script.id = JSON_LD_ID;
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}
