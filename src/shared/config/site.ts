/**
 * Public store configuration. Everything here is safe for the browser bundle:
 * only VITE_* values are read, never server secrets.
 *
 * VITE_INSTAGRAM_URL   https://www.instagram.com/<handle>
 * VITE_CONTACT_EMAIL   public store e-mail address
 * VITE_WHATSAPP_NUMBER is read by features/whatsapp/config.ts
 */
function readInstagramUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || (host !== 'instagram.com' && host !== 'www.instagram.com')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function readEmail(raw: string | undefined): string | null {
  const value = raw?.trim();
  return value && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ? value : null;
}

/** Public business details. Env vars (VITE_*) override the instagram/e-mail defaults below. */
const STORE_ADDRESS = {
  lines: ['Pani Tanki, Main Rd', 'Beside Bank of Baroda, beside Meena Bazar Bridge', 'Rajendra Nagar'],
  locality: 'Motihari',
  region: 'Bihar',
  postalCode: '845401',
  country: 'IN',
} as const;

const STORE_CONTACT_EMAIL = 'silveramsilveram@gmail.com';
const STORE_CONTACT_PHONE = '+91 77669 11777';

const fullAddress = [...STORE_ADDRESS.lines, STORE_ADDRESS.locality, STORE_ADDRESS.region, STORE_ADDRESS.postalCode].join(', ');

export const SITE = {
  name: 'Silveram',
  legalName: 'Ranjan Jewer Mahal',
  ownerName: 'Aditya Ranjan',
  /** Canonical origin (the apex silveram.in redirects here). Override with VITE_SITE_URL. */
  url: (import.meta.env.VITE_SITE_URL?.trim() || 'https://www.silveram.in').replace(/\/+$/, ''),
  tagline: 'Timeless craft. Lasting meaning.',
  instagramUrl:
    readInstagramUrl(import.meta.env.VITE_INSTAGRAM_URL) ?? 'https://www.instagram.com/silveram__',
  instagramHandle: '@silveram__',
  address: STORE_ADDRESS,
  fullAddress,
  /** Opens Google Maps directions to the shop. */
  directionsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${'Ranjan Jewer Mahal'}, ${fullAddress}`)}`,
  /** The shop's Google share link. */
  googleListingUrl: 'https://share.google/5Q2kGLPzUP73IbaxY',
  contactPhone: STORE_CONTACT_PHONE,
  contactEmail: readEmail(import.meta.env.VITE_CONTACT_EMAIL) ?? STORE_CONTACT_EMAIL,
} as const;
