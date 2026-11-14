/**
 * Money is integer paise everywhere except the rupee text box. Conversion parses the typed text
 * digit by digit, so there is never a floating point multiplication (19.99 * 100 = 1998.9999...).
 */
const RUPEES = /^\d{1,8}(\.\d{1,2})?$/;

/** "1,299.5" / "1299" -> 129950 / 129900. Returns null for anything that is not a valid amount. */
export function rupeesToPaise(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const text = String(input).trim().replace(/,/g, '').replace(/^₹\s*/, '');
  if (!RUPEES.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** 129950 -> "1299.50" (plain, for editing in a text box). */
export function paiseToRupeesInput(paise: number): string {
  const abs = Math.abs(paise);
  return `${paise < 0 ? '-' : ''}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** 129950 -> "₹1,299.50" using Indian digit grouping. */
export function formatPaise(paise: number | null | undefined): string {
  if (paise === null || paise === undefined || !Number.isFinite(paise)) return '—';
  const abs = Math.abs(Math.round(paise));
  const rupees = Math.trunc(abs / 100).toLocaleString('en-IN');
  return `${paise < 0 ? '-' : ''}₹${rupees}.${String(abs % 100).padStart(2, '0')}`;
}

const trim = (value: number) => String(Math.round(value * 100) / 100);

/** Short form for chart axes: 1250000 paise -> "₹12.5K"; 12500000 paise -> "₹1.25L". */
export function formatPaiseCompact(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 10_000_000) return `₹${trim(rupees / 10_000_000)}Cr`;
  if (rupees >= 100_000) return `₹${trim(rupees / 100_000)}L`;
  if (rupees >= 1000) return `₹${trim(rupees / 1000)}K`;
  return `₹${Math.round(rupees)}`;
}
