import type { AuthProvider } from '@refinedev/core';
import type { AdminMe } from '@/types/api';
import { authApi } from '@/services/api';
import { ApiError } from '@/services/apiClient';

/**
 * Passwordless e-mail OTP, backed by the existing API. The session is an HTTP-only cookie the
 * browser keeps; nothing secret is stored here. A signed-in identity is NOT admin access: `check`
 * only succeeds when the server-side admin endpoint (`/admin/me`, which enforces the ADMIN_EMAILS
 * allow-list) accepts the session, and a 403 goes to a terminal "access denied" screen, never a loop.
 */
let cached: { me: AdminMe; at: number } | null = null;
let inflight: Promise<AdminMe> | null = null;
const FRESH_MS = 30_000;

export function clearIdentityCache() {
  cached = null;
  inflight = null;
}

export async function loadIdentity(force = false): Promise<AdminMe> {
  if (!force && cached && Date.now() - cached.at < FRESH_MS) return cached.me;
  inflight ??= authApi.me().then((me) => {
    cached = { me, at: Date.now() };
    return me;
  }).finally(() => { inflight = null; });
  return inflight;
}

export const authProvider: AuthProvider = {
  login: async ({ email, code }: { email: string; code: string }) => {
    try {
      await authApi.verifyOtp(email, code);
      clearIdentityCache();
      await loadIdentity(true);
      return { success: true, redirectTo: '/' };
    } catch (error) {
      const api = error instanceof ApiError ? error : null;
      if (api?.status === 403) {
        // The code was right, but this e-mail is not an administrator: end the session we just made.
        await authApi.logout().catch(() => undefined);
        clearIdentityCache();
        return { success: false, error: { name: 'AccessDenied', message: 'This e-mail address is not an administrator of Silveram.' } };
      }
      return { success: false, error: { name: 'LoginError', message: api?.message ?? 'Could not sign you in. Try again.' } };
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      clearIdentityCache();
    }
    return { success: true, redirectTo: '/login' };
  },

  check: async () => {
    try {
      await loadIdentity();
      return { authenticated: true };
    } catch (error) {
      const api = error instanceof ApiError ? error : null;
      if (api?.status === 401) return { authenticated: false, redirectTo: '/login', error: new Error('Please sign in.') };
      if (api?.status === 403) return { authenticated: false, redirectTo: '/access-denied', error: new Error('Administrator access is required.') };
      // Network failure or a 5xx: do not pretend the session is bad. Offer a retry screen.
      return { authenticated: false, redirectTo: '/unavailable', error: error instanceof Error ? error : new Error('Service unavailable.') };
    }
  },

  getIdentity: async () => {
    const me = await loadIdentity();
    return { id: me.user.id, name: me.user.email, email: me.user.email };
  },

  getPermissions: async () => (await loadIdentity()).permissions,

  onError: async (error) => {
    const status = (error as { statusCode?: number; status?: number })?.statusCode ?? (error as { status?: number })?.status;
    if (status === 401) {
      clearIdentityCache();
      return { logout: true, redirectTo: '/login' };
    }
    if (status === 403) return { logout: false, redirectTo: '/access-denied', error: error as Error };
    return { error: error as Error };
  },
};
