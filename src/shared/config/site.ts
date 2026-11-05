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

export const SITE = {
  name: 'Silveram',
  url: 'https://silveram-peach.vercel.app',
  tagline: 'Timeless craft. Lasting meaning.',
  instagramUrl: readInstagramUrl(import.meta.env.VITE_INSTAGRAM_URL),
  contactEmail: readEmail(import.meta.env.VITE_CONTACT_EMAIL),
} as const;
