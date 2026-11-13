import { createHash } from 'node:crypto';
import { z } from 'zod';

/** Silveram's business timezone is India Standard Time: UTC+05:30, no daylight saving. */
export const STORE_TIMEZONE = 'Asia/Kolkata';
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;
/** Longest date window any analytics/report endpoint accepts (keeps Appwrite scans bounded). */
export const MAX_RANGE_DAYS = 400;

const ymdPattern = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` (an India calendar date) -> epoch ms of 00:00 IST that day, or null if invalid. */
export function startOfDayIst(ymd) {
  if (!ymdPattern.test(ymd)) return null;
  const [year, month, day] = ymd.split('-').map(Number);
  const utc = Date.UTC(year, month - 1, day);
  const check = new Date(utc);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return utc - IST_OFFSET_MS;
}

/** Epoch ms -> `YYYY-MM-DD` in India time. */
export function ymdIst(ms) {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** First day (India time) of the month containing `ms`, as `YYYY-MM-01`. */
export function monthStartYmd(ms) {
  return `${ymdIst(ms).slice(0, 7)}-01`;
}

/** Default dashboard window: first day of the month five months ago .. today (six calendar months). */
export function defaultSixMonthRange(now = Date.now()) {
  const [year, month] = ymdIst(now).split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1 - 5, 1));
  return { from: start.toISOString().slice(0, 10), to: ymdIst(now) };
}

/**
 * Resolve `from`/`to` query dates (inclusive India calendar days) into a half-open epoch window
 * [fromMs, toMs). Throws a 400 error for malformed, reversed or oversized ranges.
 */
export function resolveRange(query, now = Date.now()) {
  const fallback = defaultSixMonthRange(now);
  const from = query.from || fallback.from;
  const to = query.to || fallback.to;
  const fromMs = startOfDayIst(from);
  const toStart = startOfDayIst(to);
  if (fromMs === null || toStart === null) throw Object.assign(new Error('Dates must be YYYY-MM-DD.'), { status: 400 });
  const toMs = toStart + DAY_MS;
  if (toMs <= fromMs) throw Object.assign(new Error('The end date must not be before the start date.'), { status: 400 });
  if ((toMs - fromMs) / DAY_MS > MAX_RANGE_DAYS) {
    throw Object.assign(new Error(`Choose a range of at most ${MAX_RANGE_DAYS} days.`), { status: 400 });
  }
  return { from, to, fromMs, toMs };
}

export const ymdSchema = z.string().regex(ymdPattern);
export const rangeQuerySchema = z.object({ from: ymdSchema.optional(), to: ymdSchema.optional() });
export const idSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/);

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

/** Deterministic, Appwrite-safe (<=36 chars) document id: the same inputs always give the same id. */
export function deterministicId(...parts) {
  return createHash('sha256').update(parts.map(String).join('\u0000')).digest('hex').slice(0, 36);
}

export function actorOf(req) {
  return req.user?.email || 'unknown';
}

export function clip(value, max) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text ? text.slice(0, max) : undefined;
}

export function httpError(status, message, code) {
  return Object.assign(new Error(message), { status, ...(code && { code }), expose: true });
}

/** Wrap an async route so rejections reach Express' error handler; `error.expose` errors are shown. */
export function route(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error?.expose && error.status) return res.status(error.status).json({ error: error.message, ...(error.code && typeof error.code === 'string' && { code: error.code }) });
      if (error?.code === 409 && !res.headersSent) {
        return res.status(409).json({ error: 'That record changed or already exists. Refresh and try again.' });
      }
      next(error);
    }
  };
}

/** Parse with zod, or answer 400 with a safe message. */
export function parse(schema, value, message = 'Check the request and try again.') {
  const result = schema.safeParse(value);
  if (!result.success) throw httpError(400, message);
  return result.data;
}

/**
 * CSRF / cross-site defence for cookie-authenticated, state-changing admin calls. Browsers always
 * send `Origin` on unsafe cross-origin requests, so an unsafe request must carry an Origin that is
 * either this API's own host or one of the exact allow-listed website origins. Safe methods pass.
 */
export function requireTrustedOrigin(config) {
  return (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    const sameOrigin = Boolean(origin) && origin === `https://${req.get('host')}`;
    if (origin && (sameOrigin || config.origins.includes(origin))) return next();
    return res.status(403).json({ error: 'This request did not come from the Silveram admin.' });
  };
}

/** Appwrite search/startsWith values: strip control characters and cap the length. */
export function cleanSearch(value) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 100);
}
