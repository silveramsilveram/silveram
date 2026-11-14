/**
 * The one place the browser talks to the Silveram API. Same-origin `/api` (proxied in dev and by
 * Vercel in production) with `credentials: "include"`, so the HTTP-only session cookie rides along
 * and no token ever touches JavaScript or storage. Errors are normalised into ApiError.
 */
const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') || '/api';
const DEFAULT_TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  /** True when the request never got an HTTP answer (offline, DNS, timeout, blocked). */
  readonly network: boolean;

  constructor(message: string, status: number, options: { code?: string; network?: boolean } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = options.code;
    this.network = options.network ?? false;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export function buildUrl(path: string, query?: RequestOptions['query']): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const text = params.toString();
  return `${BASE}${path}${text ? `?${text}` : ''}`;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const onAbort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener('abort', onAbort, { once: true });
  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error; // the caller cancelled: not an error to report
    const timedOut = (error as { name?: string })?.name === 'TimeoutError' || controller.signal.reason?.name === 'TimeoutError';
    throw new ApiError(timedOut ? 'The server took too long to answer.' : 'Could not reach the server. Check your connection.', 0, { network: true });
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

async function readError(response: Response): Promise<ApiError> {
  let message = 'Something went wrong. Please try again.';
  let code: string | undefined;
  try {
    const json = (await response.json()) as { error?: unknown; code?: unknown };
    if (typeof json.error === 'string' && json.error) message = json.error;
    if (typeof json.code === 'string') code = json.code;
  } catch {
    // non-JSON error body (for example a gateway page): keep the generic message
  }
  return new ApiError(message, response.status, { code });
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);
  if (!response.ok) throw await readError(response);
  if (response.status === 204) return undefined as T;
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError('The server sent an unreadable answer.', response.status);
  }
}

/** Download a CSV report. Returns the blob plus the row count / truncation flags the server reports. */
export async function download(path: string, query: RequestOptions['query']): Promise<{ blob: Blob; filename: string; rows: number; truncated: boolean }> {
  const response = await send(path, { query, timeoutMs: 60_000 });
  if (!response.ok) throw await readError(response);
  const disposition = response.headers.get('content-disposition') ?? '';
  return {
    blob: await response.blob(),
    filename: /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'silveram-report.csv',
    rows: Number(response.headers.get('x-export-rows') ?? 0),
    truncated: response.headers.get('x-export-truncated') === 'true',
  };
}
