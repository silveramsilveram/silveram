import { useEffect, useState, type FormEvent } from 'react';
import Button from '@/shared/ui/Button';
import { ApiError } from '@/shared/lib/api';
import { setAuthEmail } from '../redirect';
import { useAuth, type AuthMode, type AuthUser } from '../context/AuthContext';

interface AuthFormProps {
  /** "signin" and "signup" are separate pages; each renders this form in its own mode. */
  mode: AuthMode;
  initialEmail?: string;
  onSuccess?: (user: AuthUser) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Passwordless sign-in / sign-up: the customer enters an e-mail, receives a six-digit code
 * (sent by the API through Mailjet) and confirms it. Accounts are stored in Appwrite.
 */
export default function AuthForm({ mode, initialEmail = '', onSuccess }: AuthFormProps) {
  const { requestCode, verifyCode } = useAuth();
  const [step, setStep] = useState<'details' | 'code'>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);
  const [noAccount, setNoAccount] = useState(false);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const sendCode = async () => {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) {
      setError('Enter a valid email address.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Enter your name to create an account.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await requestCode(normalized);
      setEmail(normalized);
      setStep('code');
      setResendSeconds(60);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to send your code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the six-digit code from your email.');
      return;
    }
    setBusy(true);
    setError('');
    setNoAccount(false);
    try {
      const user = await verifyCode({ email, code, mode, name: name.trim() || undefined });
      onSuccess?.(user);
    } catch (reason) {
      setNoAccount(mode === 'signin' && reason instanceof ApiError && reason.status === 404);
      setError(reason instanceof Error ? reason.message : 'That code could not be verified.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {step === 'details' ? (
        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void sendCode();
          }}
        >
          {mode === 'signup' && (
            <label className="block text-sm font-medium">
              Full name
              <input
                className="field mt-1.5"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                required
              />
            </label>
          )}
          <label className="block text-sm font-medium">
            Email address
            <input
              className="field mt-1.5"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              required
            />
          </label>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? 'Sending code…' : 'Email me a code'}
          </Button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={(event) => void confirm(event)}>
          <p className="type-body text-text-secondary">
            Enter the six-digit code sent to <strong className="text-text-primary">{email}</strong>. It expires in a few minutes.
          </p>
          <label className="block text-sm font-medium">
            Verification code
            <input
              className="field mt-1.5 text-center text-xl tracking-[0.4em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
          </label>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? 'Verifying…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
          {noAccount && (
            <a
              href="#/signup"
              onClick={() => setAuthEmail(email)}
              className="block min-h-11 border border-brand-primary text-center text-xs font-semibold uppercase leading-[2.75rem] tracking-[0.12em] text-brand-primary hover:bg-brand-primary hover:text-surface-primary"
            >
              Create an account with this email
            </a>
          )}
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="min-h-11 text-text-secondary underline underline-offset-4 hover:text-text-primary"
              onClick={() => {
                setStep('details');
                setCode('');
                setError('');
              }}
            >
              Change email
            </button>
            <button
              type="button"
              disabled={busy || resendSeconds > 0}
              onClick={() => void sendCode()}
              className="min-h-11 text-brand-primary underline underline-offset-4 disabled:text-text-muted disabled:no-underline"
            >
              {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}

      <p className="mt-4 min-h-5 text-sm text-danger" role="alert">
        {error}
      </p>
    </div>
  );
}
