import { useEffect } from 'react';
import { setPageMeta } from '@/shared/lib/seo';
import { useAuth, type AuthMode } from '../context/AuthContext';
import { getAuthEmail, takeAfterAuth } from '../redirect';
import AuthForm from './AuthForm';

const COPY: Record<AuthMode, { title: string; lead: string; switchText: string; switchLabel: string; switchHref: string }> = {
  signin: {
    title: 'Sign in',
    lead: 'Enter your email and we will send you a one-time code. No password needed.',
    switchText: 'New to Silveram?',
    switchLabel: 'Create an account',
    switchHref: '#/signup',
  },
  signup: {
    title: 'Create your account',
    lead: 'Save your orders and check out faster. We will email you a one-time code to confirm your address. No password needed.',
    switchText: 'Already have an account?',
    switchLabel: 'Sign in',
    switchHref: '#/signin',
  },
};

/** The sign-in and create-account pages (separate routes, one shared layout). */
export default function AuthPage({ mode }: { mode: AuthMode }) {
  const { user } = useAuth();
  const copy = COPY[mode];

  useEffect(() => {
    setPageMeta({ title: `${copy.title} | Silveram`, description: copy.lead, noindex: true });
    window.scrollTo(0, 0);
  }, [copy]);

  // Already signed in: nothing to do here.
  useEffect(() => {
    if (user) window.location.hash = takeAfterAuth();
  }, [user]);

  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      <div className="page-container pb-20 pt-10 md:pb-28 md:pt-16">
        <div className="mx-auto max-w-md">
          <h1 className="type-h1">{copy.title}</h1>
          <p className="type-body mb-8 mt-3 text-text-secondary">{copy.lead}</p>
          <AuthForm key={mode} mode={mode} initialEmail={getAuthEmail()} />
          <p className="type-body mt-8 border-t border-border pt-6 text-text-secondary">
            {copy.switchText}{' '}
            <a href={copy.switchHref} className="font-medium text-brand-primary underline underline-offset-4">
              {copy.switchLabel}
            </a>
          </p>
          <p className="type-caption mt-3 text-text-muted">
            Just browsing or buying once? You can <a href="#/shop" className="underline underline-offset-4">continue as a guest</a> at checkout.
          </p>
        </div>
      </div>
    </main>
  );
}
