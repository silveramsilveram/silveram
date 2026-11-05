import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCart } from '@/features/cart/context/CartContext';
import { syncCart } from '@/features/cart/lib/syncCart';
import { rememberGuestOrder, saveLastOrder } from '@/features/orders/storage';
import type { Order } from '@/features/orders/types';
import { WhatsAppButton, buildCartMessage } from '@/features/whatsapp';
import { orderPath } from '@/shared/hooks/useHashRoute';
import { apiRequest, isCheckoutEnabled, isRazorpayEnabled, isTestPaymentEnabled } from '@/shared/lib/api';
import { formatINR } from '@/shared/lib/money';
import { setPageMeta } from '@/shared/lib/seo';
import Button, { buttonClasses } from '@/shared/ui/Button';
import ImageSlot from '@/shared/ui/ImageSlot';
import { INDIAN_STATES } from '../data/states';
import { DECLINE_CARD, SUCCESS_CARD, TestCardPanel, validateTestCard, type TestCard } from './TestCardPanel';

type PaymentMethod = 'razorpay' | 'cod' | 'test';

interface OrderResponse {
  order: Order;
  orderId: string;
  amountInPaise: number;
  currency: 'INR';
  paymentMethod: PaymentMethod;
  status: string;
  razorpayOrderId?: string;
  razorpayKeyId?: string;
}

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  handler: (response: RazorpaySuccess) => void;
  modal: { ondismiss: () => void };
  theme: { color: string };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

let razorpayScriptPromise: Promise<void> | undefined;

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        razorpayScriptPromise = undefined;
        reject(new Error('Payment could not be loaded. Please try again.'));
      };
      document.head.appendChild(script);
    });
  }
  return razorpayScriptPromise;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Accepts 9XXXXXXXXX, +91 9XXXXXXXXX, 09XXXXXXXXX; returns the 10-digit number or ''. */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : '';
}

function SectionHeading({ step, children }: { step: number; children: string }) {
  return (
    <h2 className="flex items-center gap-3 text-lg font-medium">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary text-xs font-semibold text-surface-primary" aria-hidden="true">
        {step}
      </span>
      {children}
    </h2>
  );
}

export default function CheckoutPage() {
  const { user, status: authStatus, signOut, openAuth } = useAuth();
  const { cart, subtotal, clearCart } = useCart();

  const [guestEmail, setGuestEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [method, setMethod] = useState<PaymentMethod>(isTestPaymentEnabled ? 'test' : 'cod');
  const [card, setCard] = useState<TestCard>({ number: SUCCESS_CARD, expiry: '12/34', cvv: '123', name: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef({ key: '', id: '' });
  const finishedRef = useRef(false);

  useEffect(() => {
    setPageMeta({ title: 'Checkout | Silveram', description: 'Complete your Silveram order.', noindex: true });
    window.scrollTo(0, 0);
  }, []);

  // Prefill the name from the account once signed in.
  useEffect(() => {
    if (user?.name) setFullName((current) => current || user.name);
  }, [user]);

  const email = user ? user.email : guestEmail.trim().toLowerCase();

  /** A new request ID per distinct order, so editing details after a failed attempt never collides. */
  const requestIdFor = (key: string) => {
    if (requestRef.current.key !== key) requestRef.current = { key, id: crypto.randomUUID() };
    return requestRef.current.id;
  };

  /** Guests: as soon as we have their e-mail (and later phone) save it, with the bag, in Appwrite. */
  const captureGuestContact = () => {
    if (user || !EMAIL_PATTERN.test(email)) return;
    void syncCart({ email, name: fullName.trim() || undefined, phone: normalizePhone(phone) || undefined, cart });
  };

  const complete = (order: Order) => {
    finishedRef.current = true;
    saveLastOrder(order);
    if (order.guest) rememberGuestOrder({ id: order.id, email: order.email });
    clearCart();
    window.location.hash = orderPath(order.id);
  };

  const validate = (): string => {
    if (!user && !EMAIL_PATTERN.test(email)) return 'Enter a valid email address for your order confirmation.';
    if (!fullName.trim()) return 'Enter the recipient’s full name.';
    if (!normalizePhone(phone)) return 'Enter a valid 10-digit Indian mobile number.';
    if (!address.trim()) return 'Enter your delivery address.';
    if (!city.trim()) return 'Enter your city.';
    if (!state) return 'Select your state.';
    if (!/^\d{6}$/.test(postalCode)) return 'Enter a valid six-digit PIN code.';
    if (cart.length === 0) return 'Your bag is empty.';
    if (method === 'test') return validateTestCard(card);
    return '';
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    const customer = {
      name: fullName.trim(),
      phone: normalizePhone(phone),
      address: address.trim(),
      city: city.trim(),
      state,
      postalCode,
      country: 'IN' as const,
    };
    const items = cart.map(({ id, quantity }) => ({ id, quantity }));
    const requestId = requestIdFor(JSON.stringify([method, email, customer, items]));

    setBusy(true);
    setError('');
    try {
      const placed = await apiRequest<OrderResponse>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          requestId,
          paymentMethod: method,
          ...(user ? {} : { guestEmail: email }),
          customer,
          items,
        }),
      });

      if (placed.status === 'placed_cod' || placed.status === 'paid') {
        complete(placed.order);
        return;
      }

      if (method === 'test') {
        const outcome = card.number.replace(/\s/g, '') === DECLINE_CARD ? 'declined' : 'success';
        const result = await apiRequest<{ order: Order }>(`/orders/${encodeURIComponent(placed.orderId)}/test-payment`, {
          method: 'POST',
          body: JSON.stringify({ outcome, ...(user ? {} : { email }) }),
        });
        complete(result.order);
        return;
      }

      if (!placed.razorpayOrderId || !placed.razorpayKeyId) {
        throw new Error('The payment provider is not configured. Please contact the store.');
      }
      await loadRazorpay();
      if (!window.Razorpay) throw new Error('Payment could not be loaded. Please try again.');
      new window.Razorpay({
        key: placed.razorpayKeyId,
        amount: placed.amountInPaise,
        currency: placed.currency,
        name: 'Silveram',
        description: 'Jewellery order',
        order_id: placed.razorpayOrderId,
        prefill: { name: customer.name, email, contact: customer.phone },
        theme: { color: '#182D49' },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (payment) => {
          setBusy(true);
          try {
            const verified = await apiRequest<{ order?: Order }>(`/orders/${encodeURIComponent(placed.orderId)}/verify`, {
              method: 'POST',
              body: JSON.stringify({ ...payment, ...(user ? {} : { email }) }),
            });
            complete(verified.order ?? placed.order);
          } catch (reason) {
            setError(
              reason instanceof Error
                ? `${reason.message} Do not retry the payment; contact the store with your payment reference.`
                : 'Payment verification failed. Contact the store before retrying.',
            );
            setBusy(false);
          }
        },
      }).open();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to place your order. Please try again.');
      setBusy(false);
      return;
    }
    // Test / COD paths navigate away; keep the button disabled only while a redirect is in flight.
    if (finishedRef.current) return;
    if (method !== 'razorpay') setBusy(false);
  };

  if (!isCheckoutEnabled) {
    return (
      <main id="main-content" tabIndex={-1} className="page-container pb-24 pt-12 focus:outline-none">
        <h1 className="type-h1">Checkout</h1>
        <p className="type-body-lg mt-4 max-w-xl text-text-secondary">
          Online checkout is not open yet. Please place your order through WhatsApp and we will confirm it with you.
        </p>
        <div className="mt-8 max-w-sm">
          <WhatsAppButton
            message={buildCartMessage(cart.map(({ sku, name, price, quantity }) => ({ sku, name, price, quantity })))}
            size="lg"
            className="w-full"
          >
            Order via WhatsApp
          </WhatsAppButton>
        </div>
      </main>
    );
  }

  if (cart.length === 0) {
    return (
      <main id="main-content" tabIndex={-1} className="page-container pb-24 pt-12 focus:outline-none">
        <h1 className="type-h1">Checkout</h1>
        <p className="type-body-lg mt-4 text-text-secondary">Your bag is empty. Add a piece to begin.</p>
        <a href="#collection" className={buttonClasses('primary', 'lg', 'mt-8')}>
          View collection
        </a>
      </main>
    );
  }

  const methodOption = (value: PaymentMethod, title: string, detail: string) => (
    <label
      className={`flex cursor-pointer items-start gap-3 border p-4 ${
        method === value ? 'border-brand-primary bg-surface-white' : 'border-border'
      }`}
    >
      <input
        type="radio"
        name="payment"
        value={value}
        checked={method === value}
        onChange={() => {
          setMethod(value);
          setError('');
        }}
        className="mt-1 accent-brand-primary"
      />
      <span>
        <strong className="block text-sm">{title}</strong>
        <span className="text-sm text-text-muted">{detail}</span>
      </span>
    </label>
  );

  const buttonLabel = busy
    ? 'Processing…'
    : method === 'cod'
      ? `Place order · ${formatINR(subtotal)}`
      : method === 'test'
        ? `Pay ${formatINR(subtotal)} (test)`
        : `Continue to payment · ${formatINR(subtotal)}`;

  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      <div className="page-container pb-20 pt-8 md:pb-28 md:pt-12">
        <nav aria-label="Breadcrumb" className="type-caption mb-4 text-text-secondary">
          <a href="#/cart" className="underline underline-offset-4 hover:text-text-primary">
            ← Back to bag
          </a>
        </nav>
        <h1 className="type-h1">Checkout</h1>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_24rem] lg:gap-14">
          <form className="space-y-10" onSubmit={(event) => void submit(event)} noValidate>
            <section aria-labelledby="contact-heading" className="space-y-4">
              <div id="contact-heading">
                <SectionHeading step={1}>Contact</SectionHeading>
              </div>
              {user ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-surface-white p-4 text-sm">
                  <span>
                    Signed in as <strong>{user.email}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="min-h-11 text-text-secondary underline underline-offset-4 hover:text-text-primary"
                  >
                    Not you? Sign out
                  </button>
                </div>
              ) : (
                <>
                  <label className="block text-sm font-medium">
                    Email address
                    <input
                      className="field mt-1.5"
                      type="email"
                      autoComplete="email"
                      value={guestEmail}
                      onChange={(event) => setGuestEmail(event.target.value)}
                      onBlur={captureGuestContact}
                      maxLength={254}
                      required
                    />
                  </label>
                  <p className="type-caption text-text-muted">
                    You are checking out as a guest. We will email your order confirmation here, and save your bag to this address so you can come back to it.
                    {authStatus !== 'loading' && (
                      <>
                        {' '}Have an account?{' '}
                        <button type="button" className="underline underline-offset-4" onClick={() => openAuth('signin')}>
                          Sign in
                        </button>{' '}
                        or{' '}
                        <button type="button" className="underline underline-offset-4" onClick={() => openAuth('signup')}>
                          create one
                        </button>
                        .
                      </>
                    )}
                  </p>
                </>
              )}
            </section>

            <section aria-labelledby="delivery-heading" className="space-y-4">
              <div id="delivery-heading">
                <SectionHeading step={2}>Delivery address</SectionHeading>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Full name
                  <input className="field mt-1.5" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={100} required />
                </label>
                <label className="block text-sm font-medium">
                  Mobile number
                  <input className="field mt-1.5" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} onBlur={captureGuestContact} maxLength={16} placeholder="98765 43210" required />
                </label>
              </div>
              <label className="block text-sm font-medium">
                Address
                <textarea className="field mt-1.5 min-h-24 resize-y" autoComplete="street-address" value={address} onChange={(event) => setAddress(event.target.value)} maxLength={300} required />
              </label>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block text-sm font-medium">
                  City
                  <input className="field mt-1.5" autoComplete="address-level2" value={city} onChange={(event) => setCity(event.target.value)} maxLength={100} required />
                </label>
                <label className="block text-sm font-medium">
                  State
                  <select className="field mt-1.5" autoComplete="address-level1" value={state} onChange={(event) => setState(event.target.value)} required>
                    <option value="">Select…</option>
                    {INDIAN_STATES.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  PIN code
                  <input className="field mt-1.5" inputMode="numeric" autoComplete="postal-code" value={postalCode} onChange={(event) => setPostalCode(event.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} required />
                </label>
              </div>
              <p className="type-caption text-text-muted">Delivery within India only.</p>
            </section>

            <section aria-labelledby="payment-heading" className="space-y-4">
              <div id="payment-heading">
                <SectionHeading step={3}>Payment</SectionHeading>
              </div>
              <fieldset className="space-y-3">
                <legend className="sr-only">Payment method</legend>
                {isTestPaymentEnabled && methodOption('test', 'Card (test mode)', 'Simulated payment. No real money is charged.')}
                {isRazorpayEnabled && methodOption('razorpay', 'Pay online', 'Secure payment with Razorpay')}
                {methodOption('cod', 'Cash on delivery', 'Pay in cash when your order arrives')}
              </fieldset>
              {method === 'test' && <TestCardPanel card={card} onChange={setCard} />}
            </section>

            <div>
              <Button type="submit" size="lg" className="w-full sm:w-auto sm:min-w-72" disabled={busy}>
                {buttonLabel}
              </Button>
              <p className="mt-4 min-h-5 text-sm text-danger" role="alert">
                {error}
              </p>
              <p className="type-caption text-text-muted">
                By placing your order you agree to Silveram’s terms and policies, linked in the footer.
              </p>
            </div>
          </form>

          <aside aria-label="Order summary" className="h-fit border border-border bg-surface-white p-6 lg:sticky lg:top-24">
            <h2 className="type-h3">Order summary</h2>
            <ul className="mt-5 divide-y divide-border">
              {cart.map((item) => (
                <li key={item.id} className="flex gap-4 py-4">
                  <div className="relative">
                    <ImageSlot src={item.image} alt={item.imageAlt ?? item.name} width={1} height={1} fit="contain" placeholderLabel="" className="w-16 shrink-0 rounded-[2px] border border-border" sizes="64px" />
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-primary px-1 text-xs font-semibold text-surface-primary">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-3 text-sm">
                    <span className="font-medium">{item.name}</span>
                    <span className="tabular-nums">{formatINR(item.price * item.quantity)}</span>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-secondary">Subtotal</dt>
                <dd className="tabular-nums">{formatINR(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Delivery charges</dt>
                <dd>None added</dd>
              </div>
              <div className="flex justify-between pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums text-brand-primary">{formatINR(subtotal)}</dd>
              </div>
            </dl>
            <p className="type-caption mt-4 text-text-muted">The final amount is confirmed by Silveram when the order is placed.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
