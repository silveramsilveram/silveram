const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

export const isCheckoutEnabled = import.meta.env.VITE_CHECKOUT_ENABLED === 'true';
export const isRazorpayEnabled = import.meta.env.VITE_RAZORPAY_ENABLED === 'true';
/** Dummy "test card" payment option. Keep in step with PAYMENT_TEST_MODE on the API. */
export const isTestPaymentEnabled = import.meta.env.VITE_TEST_PAYMENT_ENABLED === 'true';
export const isNewsletterEnabled = import.meta.env.VITE_NEWSLETTER_ENABLED === 'true';

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiRequest<T = void>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let message = 'The request could not be completed. Please try again.';
    try {
      const body: { error?: string } = await response.json();
      if (body.error) message = body.error;
    } catch {
      // The response may not contain JSON.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
