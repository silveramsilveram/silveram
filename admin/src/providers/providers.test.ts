import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authProvider, clearIdentityCache } from './authProvider';
import { dataProvider, filtersToQuery, sortersToQuery } from './dataProvider';

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const me = { user: { id: 'u1', email: 'owner@silveram.in' }, permissions: ['admin'], apiVersion: 1, store: { timezone: 'Asia/Kolkata', utcOffsetMinutes: 330, currency: 'INR', lowStockThreshold: 3 }, schema: { ready: true, missing: [] } };

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  clearIdentityCache();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('auth provider', () => {
  it('only treats a session as signed in once the admin endpoint accepts it, always with cookies', async () => {
    fetchMock.mockResolvedValueOnce(json(200, me));
    expect(await authProvider.check()).toEqual({ authenticated: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/admin/me');
    expect(init.credentials).toBe('include');
    expect(init.headers.Authorization).toBeUndefined(); // no bearer tokens in JS
  });

  it('401 -> login, 403 -> terminal access-denied (no redirect loop), outage -> retry screen', async () => {
    fetchMock.mockResolvedValueOnce(json(401, { error: 'expired' }));
    expect(await authProvider.check()).toMatchObject({ authenticated: false, redirectTo: '/login' });
    clearIdentityCache();
    fetchMock.mockResolvedValueOnce(json(403, { error: 'no' }));
    expect(await authProvider.check()).toMatchObject({ authenticated: false, redirectTo: '/access-denied' });
    clearIdentityCache();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await authProvider.check()).toMatchObject({ authenticated: false, redirectTo: '/unavailable' });
    clearIdentityCache();
    fetchMock.mockResolvedValueOnce(json(503, { error: 'down' }));
    expect(await authProvider.check()).toMatchObject({ redirectTo: '/unavailable' });
  });

  it('a valid code from a non-admin e-mail ends the session and shows an error', async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { user: { id: 'u2', email: 'shopper@example.com' } })) // /auth/verify
      .mockResolvedValueOnce(json(403, { error: 'Administrator access is required.' })) // /admin/me
      .mockResolvedValueOnce(json(204)); // /auth/logout
    const result = await authProvider.login({ email: 'shopper@example.com', code: '123456' });
    expect(result.success).toBe(false);
    expect(result.error?.message).toMatch(/not an administrator/);
    expect(fetchMock.mock.calls[2][0]).toBe('/api/auth/logout');
  });

  it('logs in with the passwordless code and signs out through the API', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { user: me.user })).mockResolvedValueOnce(json(200, me));
    expect(await authProvider.login({ email: 'owner@silveram.in', code: '123456' })).toMatchObject({ success: true, redirectTo: '/' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ email: 'owner@silveram.in', code: '123456', mode: 'signin' });
    fetchMock.mockResolvedValueOnce(json(204));
    expect(await authProvider.logout({})).toMatchObject({ success: true, redirectTo: '/login' });
  });

  it('reports a wrong code with the server message', async () => {
    fetchMock.mockResolvedValueOnce(json(400, { error: 'That verification code is incorrect.' }));
    const result = await authProvider.login({ email: 'owner@silveram.in', code: '000000' });
    expect(result).toMatchObject({ success: false, error: { message: 'That verification code is incorrect.' } });
  });

  it('onError routes 401/403 sensibly', async () => {
    expect(await authProvider.onError({ statusCode: 401 })).toMatchObject({ logout: true, redirectTo: '/login' });
    expect(await authProvider.onError({ statusCode: 403 })).toMatchObject({ redirectTo: '/access-denied' });
    expect((await authProvider.onError({ statusCode: 500 })).redirectTo).toBeUndefined();
  });
});

describe('data provider', () => {
  it('maps Refine filters and sorters onto the API query', () => {
    expect(filtersToQuery([
      { field: 'status', operator: 'eq', value: ['paid', 'fulfilled'] },
      { field: 'search', operator: 'eq', value: 'asha' },
      { field: 'empty', operator: 'eq', value: '' },
      { field: 'none', operator: 'eq', value: [] },
    ])).toEqual({ status: 'paid,fulfilled', search: 'asha' });
    expect(sortersToQuery([{ field: 'amountInPaise', order: 'asc' }, { field: 'x', order: 'desc' }])).toEqual({ sort: 'amountInPaise', dir: 'asc' });
    expect(sortersToQuery([])).toEqual({});
  });

  it('getList pages on the server and keeps total plus extra fields', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: [{ id: 'a' }], total: 41, page: 2, limit: 25, trackingStartedAt: 5 }));
    const result = await dataProvider.getList({
      resource: 'orders', pagination: { currentPage: 2, pageSize: 25 }, filters: [{ field: 'status', operator: 'eq', value: 'paid' }], sorters: [{ field: 'createdAt', order: 'desc' }],
    });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/orders?page=2&limit=25&status=paid&sort=createdAt&dir=desc');
    expect(result.total).toBe(41);
    expect(result.data).toEqual([{ id: 'a' }]);
    expect((result as unknown as { trackingStartedAt: number }).trackingStartedAt).toBe(5);
  });

  it('getOne unwraps the API wrapper and merges order timeline and ledger rows', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { order: { id: 'o1', status: 'paid' }, timeline: [{ id: 't' }], transactions: [] }));
    const { data } = await dataProvider.getOne({ resource: 'orders', id: 'o1' });
    expect(data).toMatchObject({ id: 'o1', status: 'paid', timeline: [{ id: 't' }], transactions: [] });
  });

  it('errors carry the HTTP status for Refine, and unsupported operations are refused', async () => {
    fetchMock.mockResolvedValueOnce(json(403, { error: 'Administrator access is required.' }));
    await expect(dataProvider.getList({ resource: 'orders' })).rejects.toMatchObject({ statusCode: 403, message: 'Administrator access is required.' });
    await expect(dataProvider.update({ resource: 'orders', id: 'o1', variables: { status: 'paid' } })).rejects.toMatchObject({ statusCode: 405 });
    await expect(dataProvider.deleteOne({ resource: 'orders', id: 'o1' })).rejects.toMatchObject({ statusCode: 405 });
    await expect(dataProvider.getList({ resource: 'nope' })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('product delete is a DELETE to the soft-deactivation endpoint', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await dataProvider.deleteOne({ resource: 'products', id: 'p1' });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/products/admin/p1');
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  });
});
