import { useEffect } from 'react';
import { setPageMeta } from '@/shared/lib/seo';
import { useAuth, type AuthMode } from '../store/authStore';
import { getAuthEmail, takeAfterAuth } from '../redirect';
import AuthForm from './AuthForm';
import { navigate } from '@/shared/routing/router';

const COPY: Record<AuthMode, { title: string; lead: string; switchText: string; switchLabel: string; switchHref: string }> = {
  signin: {
    title: 'Sign in',
    lead: 'Enter your email and we will send you a one-time code. No password needed.',
    switchText: 'New to Silveram?',
    switchLabel: 'Create an account',
    switchHref: '/signup',
  },
  signup: {
    title: 'Create your account',
    lead: 'Save your orders and check out faster. We will email you a one-time code to confirm your address. No password needed.',
    switchText: 'Already have an account?',
    switchLabel: 'Sign in',
    switchHref: '/signin',
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
    if (user) navigate(takeAfterAuth());
  }, [user]);

  return (
    <main id="main-content" tabIndex={-1} className="scene scene-canvas focus:outline-none">
      <div className="page-container-wide grid gap-10 pb-20 pt-10 md:pb-28 md:pt-16 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <h1 className="ed-display">{copy.title}</h1>
          <p className="scene-body mt-5 max-w-md font-sans text-lg leading-relaxed">{copy.lead}</p>
        </div>
        <div className="frame-dashed max-w-xl p-6 md:p-9 lg:col-span-6 lg:col-start-7">
          <AuthForm key={mode} mode={mode} initialEmail={getAuthEmail()} />
          <p className="type-body rule-dashed mt-8 pt-6 text-text-secondary">
            {copy.switchText}{' '}
            <a href={copy.switchHref} className="font-medium text-brand-primary underline underline-offset-4">
              {copy.switchLabel}
            </a>
          </p>
          <p className="type-caption mt-3 text-text-muted">
            Just browsing or buying once? You can <a href="/shop" className="underline underline-offset-4">continue as a guest</a> at checkout.
          </p>
        </div>
      </div>
    </main>
  );
}
