export interface CashfreeCheckoutResult {
  error?: { message?: string };
  paymentDetails?: unknown;
  redirect?: boolean;
}

interface CashfreeInstance {
  checkout: (options: { paymentSessionId: string; redirectTarget: '_modal' | '_self' }) => Promise<CashfreeCheckoutResult | undefined>;
}

declare global {
  interface Window {
    Cashfree?: (config: { mode: 'sandbox' | 'production' }) => CashfreeInstance;
  }
}

let scriptPromise: Promise<void> | undefined;

/** Loads Cashfree's hosted checkout (UPI apps, UPI QR, cards) only when it is actually needed. */
export function loadCashfree(): Promise<void> {
  if (window.Cashfree) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;
      const timeout = window.setTimeout(() => {
        script.remove();
        scriptPromise = undefined;
        reject(new Error('Payment could not be loaded. Please try again.'));
      }, 15_000);
      script.onload = () => {
        window.clearTimeout(timeout);
        if (!window.Cashfree) {
          script.remove();
          scriptPromise = undefined;
          reject(new Error('Payment could not be loaded. Please try again.'));
          return;
        }
        resolve();
      };
      script.onerror = () => {
        window.clearTimeout(timeout);
        script.remove();
        scriptPromise = undefined;
        reject(new Error('Payment could not be loaded. Please try again.'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

/** Starts downloading the SDK in the background (errors are ignored; "Pay" will retry and report them). */
export function preloadCashfree(): void {
  void loadCashfree().catch(() => undefined);
}

/** Opens Cashfree checkout. Its result is not proof of payment; the server verifies after it closes. */
export async function openCashfreeCheckout(
  paymentSessionId: string,
  mode: 'sandbox' | 'production',
): Promise<CashfreeCheckoutResult | undefined> {
  await loadCashfree();
  if (!window.Cashfree) throw new Error('Payment could not be loaded. Please try again.');
  return window.Cashfree({ mode }).checkout({ paymentSessionId, redirectTarget: '_modal' });
}
