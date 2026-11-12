import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/features/auth/store/authStore';
import { useCart } from '@/features/cart/store/cartStore';
import { rememberGuestOrder, saveLastOrder } from '@/features/orders/storage';
import type { Order } from '@/features/orders/types';
import { orderPath, navigate } from '@/shared/routing/router';
import { apiRequest, isCashfreeEnabled, isCheckoutEnabled, isCodEnabled, isTestPaymentEnabled } from '@/shared/lib/api';
import { formatINR } from '@/shared/lib/money';
import { setPageMeta } from '@/shared/lib/seo';
import Button, { buttonClasses } from '@/shared/ui/Button';
import { useCheckout } from '../context/CheckoutContext';
import { openCashfreeCheckout } from '../lib/cashfree';
import { CheckoutFrame } from './CheckoutLayout';
import {
  DECLINE_CARD,
  DECLINE_UPI,
  SUCCESS_CARD,
  SUCCESS_UPI,
  TestCardPanel,
  TestUpiPanel,
  validateTestCard,
  validateTestUpi,
  type TestCard,
} from './TestCardPanel';

type PayOption = 'cod' | 'upi' | 'card' | 'cashfree';

interface OrderResponse {
  order: Order;
  orderId: string;
  amountInPaise: number;
  currency: 'INR';
  status: string;
  cashfreePaymentSessionId?: string;
  cashfreeMode?: 'sandbox' | 'production';
}

/** Online payment (UPI / cards) is not approved yet: it shows as "Coming soon" until a gateway is switched on. */
const onlineAvailable = isCashfreeEnabled || isTestPaymentEnabled;

/** Checkout page 2 of 2: choose how to pay. Cash on delivery is primary; UPI and cards are coming soon. */
export default function CheckoutPaymentPage() {
  const { user } = useAuth();
  const { cart, subtotal, clearCart } = useCart();
  const { info, clearInfo } = useCheckout();

  const [option, setOption] = useState<PayOption>(isCodEnabled ? 'cod' : isCashfreeEnabled ? 'cashfree' : 'upi');
  const [upiId, setUpiId] = useState(SUCCESS_UPI);
  const [card, setCard] = useState<TestCard>({ number: SUCCESS_CARD, expiry: '12/34', cvv: '123' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef({ key: '', id: '' });

  useEffect(() => {
    setPageMeta({ title: 'Payment | Silveram', description: 'Pay securely for your Silveram order.', noindex: true });
    window.scrollTo(0, 0);
  }, []);

  // Details come first: send people who land here directly back to page one.
  useEffect(() => {
    if (isCheckoutEnabled && cart.length > 0 && !info) navigate('/checkout');
  }, [cart.length, info]);

  if (!isCheckoutEnabled || cart.length === 0 || !info) {
    return (
      <main id="main-content" tabIndex={-1} className="page-container pb-24 pt-12 focus:outline-none">
        <h1 className="type-h1">Payment</h1>
        <p className="type-body-lg mt-4 text-text-secondary">
          {cart.length === 0 ? 'Your bag is empty.' : 'Please enter your delivery details first.'}
        </p>
        <a href={cart.length === 0 ? '/shop' : '/checkout'} className={buttonClasses('primary', 'lg', 'mt-8')}>
          {cart.length === 0 ? 'Shop the collection' : 'Enter details'}
        </a>
      </main>
    );
  }

  const email = user ? user.email : info.email;
  const canSubmit = option === 'cod' ? isCodEnabled : onlineAvailable;

  const requestIdFor = (key: string) => {
    if (requestRef.current.key !== key) requestRef.current = { key, id: crypto.randomUUID() };
    return requestRef.current.id;
  };

  const complete = (order: Order) => {
    saveLastOrder(order);
    if (order.guest) rememberGuestOrder({ id: order.id, email: order.email });
    clearCart();
    clearInfo();
    navigate(orderPath(order.id));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !canSubmit) return;

    if (option === 'upi') {
      const problem = validateTestUpi(upiId);
      if (problem) return setError(problem);
    } else if (option === 'card') {
      const problem = validateTestCard(card);
      if (problem) return setError(problem);
    }

    const customer = {
      name: info.fullName,
      phone: info.phone,
      ...(info.altPhone ? { altPhone: info.altPhone } : {}),
      address: info.address,
      ...(info.landmark ? { landmark: info.landmark } : {}),
      city: info.city,
      state: info.state,
      postalCode: info.postalCode,
      country: 'IN' as const,
    };
    const items = cart.map(({ id, quantity }) => ({ id, quantity }));
    const paymentMethod = option === 'cod' ? 'cod' : option === 'cashfree' ? 'cashfree' : 'test';
    const paymentChannel = option === 'upi' || option === 'card' ? option : undefined;
    const requestId = requestIdFor(JSON.stringify([paymentMethod, paymentChannel, email, customer, items]));

    setBusy(true);
    setError('');
    try {
      const placed = await apiRequest<OrderResponse>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          requestId,
          paymentMethod,
          ...(paymentChannel ? { paymentChannel } : {}),
          ...(user ? {} : { guestEmail: email }),
          customer,
          items,
        }),
      });

      if (placed.status === 'placed_cod' || placed.status === 'paid') {
        complete(placed.order);
        return;
      }

      if (paymentMethod === 'cashfree') {
        if (!placed.cashfreePaymentSessionId) {
          throw new Error('The payment provider is not configured. Please contact the store.');
        }
        await openCashfreeCheckout(placed.cashfreePaymentSessionId, placed.cashfreeMode ?? 'production');
        // The popup closing is not proof of payment: the server asks Cashfree before confirming.
        const checked = await apiRequest<{ success: boolean; order: Order }>(
          `/orders/${encodeURIComponent(placed.orderId)}/verify-cashfree`,
          { method: 'POST', body: JSON.stringify(user ? {} : { email }) },
        );
        if (checked.success) {
          complete(checked.order);
          return;
        }
        setError('We have not received your payment yet. If money was deducted, do not pay again: it will confirm automatically, or contact the store. Otherwise you can try again.');
        setBusy(false);
        return;
      }

      if (paymentMethod === 'test') {
        const declined = option === 'upi' ? upiId.toLowerCase() === DECLINE_UPI : card.number === DECLINE_CARD;
        const result = await apiRequest<{ order: Order }>(`/orders/${encodeURIComponent(placed.orderId)}/test-payment`, {
          method: 'POST',
          body: JSON.stringify({ outcome: declined ? 'declined' : 'success', ...(user ? {} : { email }) }),
        });
        complete(result.order);
        return;
      }

      throw new Error('This payment method is not available.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to complete your payment. Please try again.');
      setBusy(false);
    }
  };

  const optionCard = (
    value: PayOption,
    title: string,
    detail: string,
    flags: { badge?: string; comingSoon?: boolean } = {},
  ) => (
    <label
      className={`flex items-start gap-3 border p-4 ${
        flags.comingSoon ? 'cursor-not-allowed bg-surface-secondary/60 opacity-70' : 'cursor-pointer'
      } ${option === value && !flags.comingSoon ? 'border-brand-primary bg-surface-white' : 'border-border'}`}
    >
      <input
        type="radio"
        name="payment"
        value={value}
        checked={option === value && !flags.comingSoon}
        disabled={flags.comingSoon}
        onChange={() => {
          setOption(value);
          setError('');
        }}
        className="mt-1 accent-brand-primary"
      />
      <span className="flex-1">
        <strong className="flex flex-wrap items-center gap-2 text-sm">
          {title}
          {flags.badge && (
            <span className="rounded-full bg-brand-primary px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-surface-primary">
              {flags.badge}
            </span>
          )}
          {flags.comingSoon && (
            <span className="rounded-full border border-border-strong px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-text-secondary">
              Coming soon
            </span>
          )}
        </strong>
        <span className="text-sm text-text-muted">{detail}</span>
      </span>
    </label>
  );

  return (
    <CheckoutFrame step={2} title="Payment">
      <div className="mb-8 grid gap-4 border border-border bg-surface-white p-5 text-sm sm:grid-cols-2">
        <div>
          <p className="type-eyebrow text-text-muted">Contact</p>
          <p className="mt-1 break-all">{email}</p>
          <p>
            {info.phone}
            {info.altPhone ? `, ${info.altPhone}` : ''}
          </p>
        </div>
        <div>
          <p className="type-eyebrow text-text-muted">Deliver to</p>
          <p className="mt-1">
            {info.fullName}, {info.address}
            {info.landmark ? `, near ${info.landmark}` : ''}, {info.city}, {info.state} {info.postalCode}
          </p>
        </div>
        <a href="/checkout" className="text-text-secondary underline underline-offset-4 hover:text-text-primary sm:col-span-2">
          Change details
        </a>
      </div>

      <form className="space-y-6" onSubmit={(event) => void submit(event)} noValidate>
        <fieldset className="space-y-3">
          <legend className="mb-3 text-lg font-medium">Choose how to pay</legend>

          {isCodEnabled && optionCard('cod', 'Cash on delivery', 'Pay in cash when your order arrives at your door.', { badge: 'Recommended' })}

          {isTestPaymentEnabled && optionCard('upi', 'UPI', 'Pay with any UPI app using your UPI ID')}
          {isTestPaymentEnabled && optionCard('card', 'Debit or credit card', 'Visa, Mastercard, RuPay')}
          {isCashfreeEnabled && optionCard('cashfree', 'UPI, QR code, debit or credit card', 'Pay securely with Cashfree: scan a QR, use any UPI app, or enter card details')}
          {!onlineAvailable && (
            <>
              {optionCard('upi', 'UPI', 'Google Pay, PhonePe, Paytm and other UPI apps', { comingSoon: true })}
              {optionCard('card', 'Debit or credit card', 'Visa, Mastercard, RuPay', { comingSoon: true })}
            </>
          )}
        </fieldset>

        {option === 'cod' && (
          <div className="border border-border bg-surface-white p-5 text-sm leading-relaxed text-text-secondary">
            <p className="font-medium text-text-primary">How cash on delivery works</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Place your order now. You pay nothing today.</li>
              <li>
                Pay <strong className="text-text-primary">{formatINR(subtotal)}</strong> in cash to the delivery partner when the parcel arrives.
              </li>
              <li>Please keep the exact amount ready. We may call you on {info.phone} to confirm your order.</li>
            </ul>
          </div>
        )}
        {option === 'upi' && onlineAvailable && <TestUpiPanel upiId={upiId} onChange={setUpiId} />}
        {option === 'card' && onlineAvailable && <TestCardPanel card={card} onChange={setCard} />}

        <div>
          <Button type="submit" size="lg" className="w-full sm:w-auto sm:min-w-72" disabled={busy || !canSubmit}>
            {busy
              ? option === 'cod'
                ? 'Placing your order…'
                : 'Processing payment…'
              : option === 'cod'
                ? `Place order · Pay ${formatINR(subtotal)} on delivery`
                : `Pay ${formatINR(subtotal)}${isTestPaymentEnabled && option !== 'cashfree' ? ' (test)' : ''}`}
          </Button>
          <p className="mt-4 min-h-5 text-sm text-danger" role="alert">
            {error}
          </p>
          <p className="type-caption text-text-muted">
            By placing your order you agree to Silveram’s{' '}
            <a href="/policy/terms" className="underline underline-offset-4">terms</a> and{' '}
            <a href="/policy/returns" className="underline underline-offset-4">return policy</a>.
          </p>
          <a href="/checkout" className="mt-2 inline-block min-h-11 text-sm leading-[2.75rem] text-text-secondary underline underline-offset-4 hover:text-text-primary">
            ← Back to delivery details
          </a>
        </div>
      </form>
    </CheckoutFrame>
  );
}
