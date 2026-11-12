/**
 * Remembers where to send the customer after they sign in or create an account
 * (for example back to checkout). Best effort: falls back to the account page.
 */
const KEY = 'silveram_after_auth';
const EMAIL_KEY = 'silveram_auth_email';
/** Same-site paths only (never `//host` or a full URL), so the redirect cannot be abused. */
const SAFE = /^\/(?!\/)[a-z0-9/_-]*$/i;

export function setAfterAuth(hash: string) {
  try {
    if (SAFE.test(hash)) sessionStorage.setItem(KEY, hash);
  } catch {
    // Ignore.
  }
}

export function takeAfterAuth(): string {
  try {
    const value = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return value && SAFE.test(value) ? value : '/account';
  } catch {
    return '/account';
  }
}

/** Carries an already-typed email from the sign-in page to the sign-up page and back. */
export function setAuthEmail(email: string) {
  try {
    sessionStorage.setItem(EMAIL_KEY, email);
  } catch {
    // Ignore.
  }
}

export function getAuthEmail(): string {
  try {
    return sessionStorage.getItem(EMAIL_KEY) || '';
  } catch {
    return '';
  }
}
