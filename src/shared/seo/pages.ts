/**
 * Single source of truth for everything search engines and social networks see about a page.
 *
 * It is used in two places, so what a crawler reads in the static HTML and what the browser shows
 * after React starts can never drift apart:
 *   1. React pages call `applyPageSeo(...)` (src/shared/lib/seo.ts) when they mount.
 *   2. `scripts/prerender.mjs` calls `listIndexablePages()` at build time to write one static HTML
 *      file per page, plus sitemap.xml.
 *
 * Only facts that exist in the catalogue are emitted (no invented ratings, stock or reviews).
 */
import { POLICIES, type Policy } from '@/features/policies/data/policies';
import { PRODUCTS, productPath, type Product } from '@/features/products/data/products';
import { SITE } from '@/shared/config/site';

export type JsonLd = Record<string, unknown>;

export interface SeoPage {
  /** Site-relative path, always starting with "/". */
  path: string;
  title: string;
  description: string;
  /** Absolute or site-relative image for link previews. */
  image?: string;
  /** Keep out of search results (private, draft or transactional pages). */
  noindex?: boolean;
  jsonLd: JsonLd[];
  /** Plain-HTML fallback content for crawlers/readers that do not run JavaScript. */
  fallbackHtml?: string;
}

export const absoluteUrl = (path: string): string => new URL(path, `${SITE.url}/`).toString();

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

const DEFAULT_IMAGE = '/images/products/silver-frame-01.webp';
const productImage = (product: Product): string =>
  product.images[0]?.fallbackSrc ?? product.images[0]?.src ?? DEFAULT_IMAGE;

// ---------------------------------------------------------------------------------------------
// JSON-LD (schema.org) builders
// ---------------------------------------------------------------------------------------------

export function organizationJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'JewelryStore',
    '@id': `${SITE.url}/#store`,
    name: SITE.legalName,
    alternateName: SITE.name,
    url: SITE.url,
    logo: absoluteUrl('/favicon.svg'),
    image: absoluteUrl(DEFAULT_IMAGE),
    telephone: SITE.contactPhone.replace(/\s/g, ''),
    email: SITE.contactEmail,
    sameAs: [SITE.instagramUrl],
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.address.lines.join(', '),
      addressLocality: SITE.address.locality,
      addressRegion: SITE.address.region,
      postalCode: SITE.address.postalCode,
      addressCountry: SITE.address.country,
    },
    hasMap: SITE.directionsUrl,
    areaServed: 'IN',
    currenciesAccepted: 'INR',
  };
}

export function websiteJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    name: SITE.name,
    url: SITE.url,
    inLanguage: 'en-IN',
    publisher: { '@id': `${SITE.url}/#store` },
  };
}

export function breadcrumbJsonLd(trail: Array<{ name: string; path: string }>): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Emitted only for real (non-placeholder) products that have a price. */
export function productJsonLd(product: Product): JsonLd | null {
  if (product.isPlaceholder || product.price === null) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${absoluteUrl(productPath(product))}#product`,
    name: product.name,
    sku: product.sku,
    ...(product.description && { description: product.description }),
    ...(product.images.length > 0 && {
      image: product.images.map((image) => absoluteUrl(image.fallbackSrc ?? image.src)),
    }),
    ...(product.material && { material: product.material }),
    category: product.categoryLabel,
    brand: { '@type': 'Brand', name: SITE.name },
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(productPath(product)),
      price: product.price,
      priceCurrency: 'INR',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${SITE.url}/#store` },
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Per-page SEO
// ---------------------------------------------------------------------------------------------

const links = (items: Array<{ href: string; label: string }>): string =>
  `<ul>${items.map((item) => `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a></li>`).join('')}</ul>`;

export function homeSeo(): SeoPage {
  return {
    path: '/',
    title: `${SITE.name} | Silver jewellery & gifting`,
    description:
      'Silveram: devotional silver-finish frames, patterned silver kada and a peacock statement ring, chosen for gifting and celebration. Cash on delivery across India.',
    image: DEFAULT_IMAGE,
    jsonLd: [organizationJsonLd(), websiteJsonLd()],
    fallbackHtml:
      `<h1>${escapeHtml(SITE.name)}: silver jewellery and gifting</h1>` +
      '<p>Devotional silver-finish frames, patterned silver kada and a peacock statement ring, chosen for gifting and celebration. Cash on delivery across India.</p>' +
      links([
        { href: '/shop', label: 'Shop all pieces' },
        ...PRODUCTS.map((product) => ({ href: productPath(product), label: product.name })),
      ]),
  };
}

export function shopSeo(): SeoPage {
  return {
    path: '/shop',
    title: `Shop silver frames, kada & rings | ${SITE.name}`,
    description:
      'Shop the Silveram collection: devotional silver-finish frames, patterned silver kada and a peacock statement ring. Cash on delivery across India.',
    image: DEFAULT_IMAGE,
    jsonLd: [
      breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }]),
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: PRODUCTS.map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: absoluteUrl(productPath(product)),
          name: product.name,
        })),
      },
    ],
    fallbackHtml:
      '<h1>Shop all</h1>' +
      `<p>${PRODUCTS.length} pieces, each chosen for gifting, festivals and everyday celebration.</p>` +
      links(PRODUCTS.map((product) => ({ href: productPath(product), label: product.name }))),
  };
}

export function productSeo(product: Product): SeoPage {
  const description =
    product.shortDescription ?? product.description?.slice(0, 155) ?? `${product.name} from the ${SITE.name} silver collection.`;
  const price = product.price === null ? '' : `<p>Price: ₹${product.price.toLocaleString('en-IN')}</p>`;
  return {
    path: productPath(product),
    title: `${product.name} | ${SITE.name}`,
    description,
    image: productImage(product),
    jsonLd: [
      productJsonLd(product),
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Shop', path: '/shop' },
        { name: product.name, path: productPath(product) },
      ]),
    ].filter((entry): entry is JsonLd => entry !== null),
    fallbackHtml:
      `<h1>${escapeHtml(product.name)}</h1>` +
      `<p>${escapeHtml(product.description ?? description)}</p>${price}` +
      links([{ href: '/shop', label: 'Back to the collection' }]),
  };
}

/** Policy text is still marked "draft" for legal review: keep drafts out of search until approved. */
export function policySeo(policy: Policy): SeoPage {
  return {
    path: `/policy/${policy.id}`,
    title: `${policy.title} | ${SITE.name}`,
    description: `${policy.title} for ${SITE.name}.`,
    noindex: policy.draft,
    jsonLd: [],
    fallbackHtml: `<h1>${escapeHtml(policy.title)}</h1>${policy.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}`,
  };
}

/** Transactional / private pages: never indexed, never shared as previews. */
export function privateSeo(title: string, description: string): Omit<SeoPage, 'path'> {
  return { title: `${title} | ${SITE.name}`, description, noindex: true, jsonLd: [] };
}

/** Every page that gets its own static HTML file and (unless noindex) a sitemap entry. */
export function listIndexablePages(): SeoPage[] {
  return [
    homeSeo(),
    shopSeo(),
    ...PRODUCTS.map(productSeo),
    ...Object.values(POLICIES).map(policySeo),
  ];
}
