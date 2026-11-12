const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

/** On by default; switch off with VITE_CHECKOUT_ENABLED=false. The API also needs STORE_LIVE_CHECKOUT=true. */
export const isCheckoutEnabled = import.meta.env.VITE_CHECKOUT_ENABLED !== 'false';
/** Cash on delivery: on by default, switch off with VITE_COD_ENABLED=false. Must match COD_ENABLED on the API. */
export const isCodEnabled = import.meta.env.VITE_COD_ENABLED !== 'false';
/** Cashfree (UPI / QR / cards). Keep in step with CASHFREE_ENABLED on the API. */
export const isCashfreeEnabled = import.meta.env.VITE_CASHFREE_ENABLED === 'true';
/** Dummy "test card" payment option. Keep in step with PAYMENT_TEST_MODE on the API. */
export const isTestPaymentEnabled = import.meta.env.VITE_TEST_PAYMENT_ENABLED === 'true';
export const isNewsletterEnabled = import.meta.env.VITE_NEWSLETTER_ENABLED === 'true';

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** A stalled connection fails after this long instead of leaving a spinner forever (function limit is 30s). */
const REQUEST_TIMEOUT_MS = 25_000;

/** Identical GETs made while one is already in flight share a single network request. */
const inFlightGets = new Map<string, Promise<unknown>>();

async function send<T>(path: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers,
      credentials: 'include',
      signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
    });
  } catch (error) {
    if (timeout.aborted) throw new ApiError('The server is taking too long to respond. Please try again.', 504);
    throw error;
  }

  if (!response.ok) {
    let message = 'The request could not be completed. Please try again.';
    try {
      const body: { error?: string } = await response.json();
      if (body.error) message = body.error;
    } catch {
      // The response may not contain JSON.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function apiRequest<T = void>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  if (method !== 'GET' || init.signal) return send<T>(path, init);

  const existing = inFlightGets.get(path);
  if (existing) return existing as Promise<T>;
  const request = send<T>(path, init).finally(() => inFlightGets.delete(path));
  inFlightGets.set(path, request);
  return request;
}
