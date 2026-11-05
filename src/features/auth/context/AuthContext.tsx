import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiRequest } from '@/shared/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export type AuthMode = 'signin' | 'signup';
type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  user: AuthUser | null;
  status: Status;
  requestCode: (email: string) => Promise<void>;
  verifyCode: (input: { email: string; code: string; mode: AuthMode; name?: string }) => Promise<AuthUser>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let active = true;
    apiRequest<{ user: AuthUser }>('/auth/me')
      .then(({ user: me }) => {
        if (!active) return;
        setUser(me);
        setStatus('signedIn');
      })
      .catch(() => {
        // Not signed in (401) or the API is unreachable: browse as a guest.
        if (active) setStatus('signedOut');
      });
    return () => {
      active = false;
    };
  }, []);

  const requestCode = useCallback(async (email: string) => {
    await apiRequest('/auth/otp', { method: 'POST', body: JSON.stringify({ email }) });
  }, []);

  const verifyCode = useCallback<AuthContextValue['verifyCode']>(async ({ email, code, mode, name }) => {
    const { user: me } = await apiRequest<{ user: AuthUser }>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code, mode, ...(name ? { name } : {}) }),
    });
    setUser(me);
    setStatus('signedIn');
    return me;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setStatus('signedOut');
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, requestCode, verifyCode, signOut }),
    [user, status, requestCode, verifyCode, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
