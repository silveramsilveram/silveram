/**
 * WhatsApp configuration. The store's public WhatsApp number is the default;
 * VITE_WHATSAPP_NUMBER (Indian mobile, e.g. 9XXXXXXXXX or 919XXXXXXXXX) overrides it.
 * If the value is invalid the UI shows a "contact pending" state instead of a broken link.
 */
export function normalizeWhatsAppNumber(raw: string | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (/^[6-9]\d{9}$/.test(digits)) return `91${digits}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return digits;
  return null;
}

const DEFAULT_WHATSAPP_NUMBER = '7766911777';

export const WHATSAPP_NUMBER = normalizeWhatsAppNumber(import.meta.env.VITE_WHATSAPP_NUMBER?.trim() || DEFAULT_WHATSAPP_NUMBER);

/** Number formatted for display, e.g. "+91 77669 11777". */
export const WHATSAPP_DISPLAY = WHATSAPP_NUMBER ? `+91 ${WHATSAPP_NUMBER.slice(2, 7)} ${WHATSAPP_NUMBER.slice(7)}` : null;
export const isWhatsAppConfigured = WHATSAPP_NUMBER !== null;
