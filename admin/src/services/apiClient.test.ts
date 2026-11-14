import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, buildUrl, download, request } from './apiClient';

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => vi.unstubAllGlobals());

describe('apiClient', () => {
  it('builds URLs and drops empty parameters', () => {
    expect(buildUrl('/admin/orders', { page: 2, search: '', status: undefined, paid: false })).toBe('/api/admin/orders?page=2&paid=false');
  });

  it('sends cookies, JSON bodies, and never an Authorization header', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));
    await request('/x', { method: 'POST', body: { a: 1 } });
    const init = fetchMock.mock.calls[0][1];
    expect(init.credentials).toBe('include');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.body).toBe('{"a":1}');
  });

  it('turns API errors into ApiError with the server message and status', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"error":"Order not found."}', { status: 404 }));
    await expect(request('/admin/orders/x')).rejects.toMatchObject({ name: 'ApiError', status: 404, message: 'Order not found.', network: false });
  });

  it('survives a non-JSON error page and an unreadable success body', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 502 }));
    await expect(request('/x')).rejects.toMatchObject({ status: 502, message: 'Something went wrong. Please try again.' });
    fetchMock.mockResolvedValueOnce(new Response('not json', { status: 200 }));
    await expect(request('/x')).rejects.toBeInstanceOf(ApiError);
  });

  it('reports a network failure distinctly and returns undefined for 204', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(request('/x')).rejects.toMatchObject({ network: true, status: 0 });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect(await request('/x')).toBeUndefined();
  });

  it('lets the caller cancel without it being reported as an error', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const pending = request('/slow', { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('reads export metadata from response headers', async () => {
    fetchMock.mockResolvedValueOnce(new Response('a,b\r\n', { status: 200, headers: { 'content-disposition': 'attachment; filename="silveram-orders-2026-06-10.csv"', 'x-export-rows': '12', 'x-export-truncated': 'true' } }));
    const result = await download('/admin/reports/orders.csv', { from: '2026-06-01' });
    expect(result).toMatchObject({ filename: 'silveram-orders-2026-06-10.csv', rows: 12, truncated: true });
  });
});
