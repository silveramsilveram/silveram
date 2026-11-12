import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { ApiError, apiRequest } from '@/shared/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export type AuthMode = 'signin' | 'signup';
type Status = 'loading' | 'signedOut' | 'signedIn';

/**
 * A non-secret hint of who was signed in last time (the real session is an httpOnly cookie).
 * It lets the header, checkout and account pages render instantly instead of waiting for
 * `/auth/me`; the server then confirms (or corrects) it in the background.
 */
const HINT_KEY = 'silveram_user_hint';

function readHint(): AuthUser | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(HINT_KEY) || 'null') as Partial<AuthUser> | null;
    return parsed && typeof parsed.id === 'string' && typeof parsed.email === 'string'
      ? { id: parsed.id, email: parsed.email, name: typeof parsed.name === 'string' ? parsed.name : '' }
      : null;
  } catch {
    return null;
  }
}

function writeHint(user: AuthUser | null) {
  try {
    if (user) sessionStorage.setItem(HINT_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(HINT_KEY);
  } catch {
    // Storage unavailable: the page just waits for the server answer.
  }
}

interface AuthState {
  user: AuthUser | null;
  status: Status;
  requestCode: (email: string) => Promise<void>;
  verifyCode: (input: { email: string; code: string; mode: AuthMode; name?: string }) => Promise<AuthUser>;
  signOut: () => Promise<void>;
}

const hint = readHint();

export const useAuthStore = create<AuthState>()((set) => ({
  user: hint,
  status: hint ? 'signedIn' : 'loading',

  requestCode: async (email) => {
    await apiRequest('/auth/otp', { method: 'POST', body: JSON.stringify({ email }) });
  },

  verifyCode: async ({ email, code, mode, name }) => {
    const { user } = await apiRequest<{ user: AuthUser }>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code, mode, ...(name ? { name } : {}) }),
    });
    writeHint(user);
    set({ user, status: 'signedIn' });
    return user;
  },

  signOut: async () => {
    // Clear the screen first: signing out should feel instant even if the network is slow.
    writeHint(null);
    set({ user: null, status: 'signedOut' });
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // The cookie is cleared by the server when reachable; the UI is already signed out.
    }
  },
}));

let restoring: Promise<void> | undefined;

/** Confirms the session once per page load. Safe to call repeatedly (it is de-duplicated). */
export function restoreSession(): Promise<void> {
  restoring ??= apiRequest<{ user: AuthUser }>('/auth/me').then(
    ({ user }) => {
      writeHint(user);
      useAuthStore.setState({ user, status: 'signedIn' });
    },
    (error: unknown) => {
      // 401 = genuinely signed out. A network blip must not log someone out of the UI.
      if (error instanceof ApiError && error.status !== 401 && useAuthStore.getState().user) return;
      writeHint(null);
      useAuthStore.setState({ user: null, status: 'signedOut' });
    },
  );
  return restoring;
}

/** Same shape as the old context hook; re-renders only when one of these fields changes. */
export function useAuth() {
  return useAuthStore(
    useShallow((state) => ({
      user: state.user,
      status: state.status,
      requestCode: state.requestCode,
      verifyCode: state.verifyCode,
      signOut: state.signOut,
    })),
  );
}
