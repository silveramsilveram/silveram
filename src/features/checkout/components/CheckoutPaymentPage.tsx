import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCart } from '@/features/cart/context/CartContext';
import { rememberGuestOrder, saveLastOrder } from '@/features/orders/storage';
import type { Order } from '@/features/orders/types';
import { orderPath } from '@/shared/hooks/useHashRoute';
import { apiRequest, isCheckoutEnabled, isRazorpayEnabled, isTestPaymentEnabled } from '@/shared/lib/api';
import { formatINR } from '@/shared/lib/money';
import { setPageMeta } from '@/shared/lib/seo';
import Button, { buttonClasses } from '@/shared/ui/Button';
import { useCheckout } from '../context/CheckoutContext';
import { loadRazorpay } from '../lib/razorpay';
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

type PayOption = 'upi' | 'card' | 'razorpay';

interface OrderResponse {
  order: Order;
  orderId: string;
  amountInPaise: number;
  currency: 'INR';
  status: string;
  razorpayOrderId?: string;
  razorpayKeyId?: string;
}

const paymentAvailable = isRazorpayEnabled || isTestPaymentEnabled;

/** Checkout page 2 of 2: pick UPI / debit card / credit card and pay online. */
export default function CheckoutPaymentPage() {
  const { user } = useAuth();
  const { cart, subtotal, clearCart } = useCart();
  const { info, clearInfo } = useCheckout();

  const [option, setOption] = useState<PayOption>(isTestPaymentEnabled ? 'upi' : 'razorpay');
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
    if (isCheckoutEnabled && cart.length > 0 && !info) window.location.hash = '#/checkout';
  }, [cart.length, info]);

  if (!isCheckoutEnabled || cart.length === 0 || !info) {
    return (
      <main id="main-content" tabIndex={-1} className="page-container pb-24 pt-12 focus:outline-none">
        <h1 className="type-h1">Payment</h1>
        <p className="type-body-lg mt-4 text-text-secondary">
          {cart.length === 0 ? 'Your bag is empty.' : 'Please enter your delivery details first.'}
        </p>
        <a href={cart.length === 0 ? '#/shop' : '#/checkout'} className={buttonClasses('primary', 'lg', 'mt-8')}>
          {cart.length === 0 ? 'Shop the collection' : 'Enter details'}
        </a>
      </main>
    );
  }

  const email = user ? user.email : info.email;

  const requestIdFor = (key: string) => {
    if (requestRef.current.key !== key) requestRef.current = { key, id: crypto.randomUUID() };
    return requestRef.current.id;
  };

  const complete = (order: Order) => {
    saveLastOrder(order);
    if (order.guest) rememberGuestOrder({ id: order.id, email: order.email });
    clearCart();
    clearInfo();
    window.location.hash = orderPath(order.id);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !paymentAvailable) return;

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
      address: info.address,
      city: info.city,
      state: info.state,
      postalCode: info.postalCode,
      country: 'IN' as const,
    };
    const items = cart.map(({ id, quantity }) => ({ id, quantity }));
    const paymentMethod = option === 'razorpay' ? 'razorpay' : 'test';
    const paymentChannel = option === 'razorpay' ? undefined : option;
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

      if (placed.status === 'paid') {
        complete(placed.order);
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
      setError(reason instanceof Error ? reason.message : 'Unable to complete your payment. Please try again.');
      setBusy(false);
    }
  };

  const optionCard = (value: PayOption, title: string, detail: string) => (
    <label
      className={`flex cursor-pointer items-start gap-3 border p-4 ${
        option === value ? 'border-brand-primary bg-surface-white' : 'border-border'
      }`}
    >
      <input
        type="radio"
        name="payment"
        value={value}
        checked={option === value}
        onChange={() => {
          setOption(value);
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

  return (
    <CheckoutFrame step={2} title="Payment">
      <div className="mb-8 grid gap-4 border border-border bg-surface-white p-5 text-sm sm:grid-cols-2">
        <div>
          <p className="type-eyebrow text-text-muted">Contact</p>
          <p className="mt-1 break-all">{email}</p>
          <p>{info.phone}</p>
        </div>
        <div>
          <p className="type-eyebrow text-text-muted">Deliver to</p>
          <p className="mt-1">
            {info.fullName}, {info.address}, {info.city}, {info.state} {info.postalCode}
          </p>
        </div>
        <a href="#/checkout" className="text-text-secondary underline underline-offset-4 hover:text-text-primary sm:col-span-2">
          Change details
        </a>
      </div>

      {!paymentAvailable ? (
        <p className="border border-border bg-surface-white p-5 text-sm text-text-secondary" role="status">
          Online payments are being set up and will be available very soon. You have not been charged.
        </p>
      ) : (
        <form className="space-y-6" onSubmit={(event) => void submit(event)} noValidate>
          <fieldset className="space-y-3">
            <legend className="mb-3 text-lg font-medium">Pay online</legend>
            {isTestPaymentEnabled && optionCard('upi', 'UPI', 'Pay with any UPI app using your UPI ID')}
            {isTestPaymentEnabled && optionCard('card', 'Debit or credit card', 'Visa, Mastercard, RuPay')}
            {isRazorpayEnabled && optionCard('razorpay', 'UPI, debit card or credit card', 'Choose your method on the secure payment screen')}
          </fieldset>

          {option === 'upi' && <TestUpiPanel upiId={upiId} onChange={setUpiId} />}
          {option === 'card' && <TestCardPanel card={card} onChange={setCard} />}

          <div>
            <Button type="submit" size="lg" className="w-full sm:w-auto sm:min-w-72" disabled={busy}>
              {busy ? 'Processing payment…' : `Pay ${formatINR(subtotal)}${isTestPaymentEnabled && option !== 'razorpay' ? ' (test)' : ''}`}
            </Button>
            <p className="mt-4 min-h-5 text-sm text-danger" role="alert">
              {error}
            </p>
            <p className="type-caption text-text-muted">
              By paying you agree to Silveram’s <a href="#/policy/terms" className="underline underline-offset-4">terms</a> and{' '}
              <a href="#/policy/returns" className="underline underline-offset-4">return policy</a>.
            </p>
          </div>
        </form>
      )}
    </CheckoutFrame>
  );
}
