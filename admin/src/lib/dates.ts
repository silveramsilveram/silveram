/** Everything is shown in India Standard Time (UTC+05:30, no DST), whatever the viewer's laptop says. */
export const STORE_TIMEZONE = 'Asia/Kolkata';
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-IN', { timeZone: STORE_TIMEZONE, ...options });
const dateTime = fmt({ day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
const dateOnly = fmt({ day: '2-digit', month: 'short', year: 'numeric' });
const timeOnly = fmt({ hour: 'numeric', minute: '2-digit', hour12: true });

export const formatDateTime = (ms: number | null | undefined) => (ms ? dateTime.format(ms) : '—');
export const formatDate = (ms: number | null | undefined) => (ms ? dateOnly.format(ms) : '—');
export const formatTime = (ms: number | null | undefined) => (ms ? timeOnly.format(ms) : '—');

/** Epoch ms -> `YYYY-MM-DD` in India time. */
export const ymdIst = (ms: number) => new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);

/** `YYYY-MM-DD` (India calendar day) -> epoch ms of 00:00 IST, or null if invalid. */
export function startOfDayIst(ymd: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  const utc = Date.UTC(y, m - 1, d);
  const check = new Date(utc);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return utc - IST_OFFSET_MS;
}

/** Value of an `<input type="datetime-local">` (typed as India time) -> epoch ms. */
export function istInputToMs(value: string): number | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const day = startOfDayIst(match[1]);
  return day === null ? null : day + (Number(match[2]) * 60 + Number(match[3])) * 60_000;
}

/** Epoch ms -> `datetime-local` value in India time. */
export const msToIstInput = (ms: number) => new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 16);

export type RangePreset = '7d' | '30d' | '90d' | '6m' | 'ytd' | 'custom';
export interface DateRange { from: string; to: string }

/** Resolve a preset against `now` (injectable for tests). 6m = first of the month five months ago .. today. */
export function presetRange(preset: Exclude<RangePreset, 'custom'>, now = Date.now()): DateRange {
  const today = ymdIst(now);
  const [y, m, d] = today.split('-').map(Number);
  const back = (days: number) => new Date(Date.UTC(y, m - 1, d) - (days - 1) * DAY_MS).toISOString().slice(0, 10);
  switch (preset) {
    case '7d': return { from: back(7), to: today };
    case '30d': return { from: back(30), to: today };
    case '90d': return { from: back(90), to: today };
    case 'ytd': return { from: `${y}-01-01`, to: today };
    case '6m': return { from: new Date(Date.UTC(y, m - 1 - 5, 1)).toISOString().slice(0, 10), to: today };
  }
}

export function describeRange({ from, to }: DateRange): string {
  const f = startOfDayIst(from);
  const t = startOfDayIst(to);
  return f === null || t === null ? '' : `${formatDate(f)} – ${formatDate(t)}`;
}

export const hoursLabel = (hours: number | null) =>
  (hours === null ? '—' : hours < 48 ? `${Math.round(hours)} h` : `${Math.round((hours / 24) * 10) / 10} days`);
