import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/store/authStore';
import { useCart } from '@/features/cart/store/cartStore';
import { useCheckout } from '@/features/checkout/context/CheckoutContext';
import { WhatsAppButton } from '@/features/whatsapp';
import { formatINR } from '@/shared/lib/money';
import { setPageMeta } from '@/shared/lib/seo';
import { buttonClasses } from '@/shared/ui/Button';
import { CheckIcon } from '@/shared/ui/icons';
import { fetchMyOrder, lookupGuestOrder, resumeCashfreePayment, verifyCashfreePayment } from '../api';
import { clearCheckoutRequest, getGuestOrders, isActiveCheckoutOrder, loadLastOrder, saveLastOrder } from '../storage';
import { PAYMENT_LABEL, STATUS_LABEL, type Order } from '../types';
import OrderLookupForm from './OrderLookupForm';
import { openCashfreeCheckout } from '@/features/checkout/lib/cashfree';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; order: Order }
  | { kind: 'needsLookup' };

const money = (paise: number) => formatINR(paise / 100);

function paymentText(order: Order): string {
  const channel = order.paymentChannel === 'upi' ? 'UPI' : order.paymentChannel === 'card' ? 'Card' : '';
  if (order.paymentMethod === 'test') return `Test payment${channel ? ` (${channel})` : ''} - no money charged`;
  if (order.paymentMethod === 'cod') return PAYMENT_LABEL.cod;
  if (order.status === 'pending_payment') return 'Cashfree - awaiting payment';
  return channel ? `Paid online by ${channel}` : PAYMENT_LABEL.cashfree;
}

export default function OrderPage({ orderId }: { orderId: string }) {
  const { user, status: authStatus } = useAuth();
  const { clearCart } = useCart();
  const { clearInfo } = useCheckout();
  const updateOrder = (order: Order) => {
    if (order.status === 'paid' || order.status === 'placed_cod') {
      clearCheckoutRequest(order.id);
      clearCart();
      clearInfo();
    }
    setState({ kind: 'ready', order });
  };
  const [state, setState] = useState<LoadState>(() => {
    const cached = loadLastOrder(orderId);
    return cached ? { kind: 'ready', order: cached } : { kind: 'loading' };
  });

  useEffect(() => {
    setPageMeta({ title: 'Your order | Silveram', description: 'Your Silveram order details.', noindex: true });
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (authStatus === 'loading') return;
    let active = true;
    const show = (order: Order, email?: string) => {
      saveLastOrder(order);
      if (isActiveCheckoutOrder(order.id) && (order.status === 'paid' || order.status === 'placed_cod')) {
        clearCheckoutRequest(order.id);
        clearCart();
        clearInfo();
      }
      if (active) setState({ kind: 'ready', order });
      // Returned from a UPI app / redirect before the payment was confirmed: ask the server to re-check.
      if (order.paymentMethod === 'cashfree' && order.status === 'pending_payment') {
        void (async () => {
          for (let attempt = 0; attempt < 10 && active; attempt += 1) {
            try {
              const checked = await verifyCashfreePayment(order.id, email);
              saveLastOrder(checked);
              if (active) setState({ kind: 'ready', order: checked });
              if (checked.status === 'paid') return;
            } catch {
              // Provider settlement and verification can lag; keep the pending order visible.
            }
            if (attempt < 9) await new Promise((resolve) => window.setTimeout(resolve, 2000));
          }
        })();
      }
    };
    const fallback = () => {
      if (active) setState((current) => (current.kind === 'ready' ? current : { kind: 'needsLookup' }));
    };

    (async () => {
      if (user) {
        try {
          show(await fetchMyOrder(orderId));
          return;
        } catch {
          // Not one of this account's orders: it may be a guest order from this device.
        }
      }
      const remembered = getGuestOrders().find((entry) => entry.id === orderId);
      if (remembered) {
        try {
          show(await lookupGuestOrder(orderId, remembered.email), remembered.email);
          return;
        } catch {
          // Fall through to the manual lookup form.
        }
      }
      fallback();
    })();

    return () => {
      active = false;
    };
  }, [orderId, user, authStatus, clearCart, clearInfo]);

  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      <div className="page-container pb-20 pt-8 md:pb-28 md:pt-12">
        {state.kind === 'loading' && (
          <p className="type-body text-text-secondary" role="status">
            Loading your order…
          </p>
        )}

        {state.kind === 'needsLookup' && (
          <div className="max-w-md">
            <h1 className="type-h1">Find your order</h1>
            <p className="type-body mt-3 text-text-secondary">
              Enter the order reference and the email address you used at checkout.
            </p>
            <div className="mt-6">
              <OrderLookupForm initialOrderId={orderId} />
            </div>
          </div>
        )}

        {state.kind === 'ready' && (
          <OrderDetails
            order={state.order}
            canRetryPayment={state.order.paymentMethod === 'cashfree' &&
              state.order.status === 'pending_payment'}
            onOrderUpdate={updateOrder}
          />
        )}
      </div>
    </main>
  );
}

function OrderDetails({
  order,
  canRetryPayment,
  onOrderUpdate,
}: {
  order: Order;
  canRetryPayment: boolean;
  onOrderUpdate: (order: Order) => void;
}) {
  const status = STATUS_LABEL[order.status];
  const justPlaced = Date.now() - order.createdAt < 10 * 60 * 1000;
  const confirmed = order.status === 'placed_cod' || order.status === 'paid';
  const [resumingPayment, setResumingPayment] = useState(false);
  const [resumeError, setResumeError] = useState('');

  const resumePayment = async () => {
    if (resumingPayment) return;
    setResumingPayment(true);
    setResumeError('');
    try {
      const resumed = await resumeCashfreePayment(order.id, order.guest ? order.email : undefined);
      if (resumed.paid || resumed.order.status === 'paid') {
        saveLastOrder(resumed.order);
        onOrderUpdate(resumed.order);
        return;
      }
      if (!resumed.cashfreePaymentSessionId) {
        throw new Error('The payment provider did not return a session. Please contact the store.');
      }
      const checkoutResult = await openCashfreeCheckout(
        resumed.cashfreePaymentSessionId,
        resumed.cashfreeMode ?? 'production',
      );
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          const checked = await verifyCashfreePayment(order.id, order.guest ? order.email : undefined);
          saveLastOrder(checked);
          if (checked.status === 'paid') {
            onOrderUpdate(checked);
            return;
          }
        } catch {
          // Keep checking: provider settlement can lag after the checkout modal closes.
        }
        if (attempt < 7) await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }
      setResumeError(
        checkoutResult?.error
          ? 'Cashfree could not complete checkout. If money was deducted, do not pay again; the order will update when confirmed, or contact the store.'
          : 'Payment is not confirmed yet. If money was deducted, do not pay again; wait for confirmation or contact the store.',
      );
    } catch (reason) {
      setResumeError(reason instanceof Error ? reason.message : 'Unable to resume payment. Please contact the store.');
    } finally {
      setResumingPayment(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        {confirmed && justPlaced && (
          <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-surface-primary">
            <CheckIcon size={28} />
          </span>
        )}
        <h1 className="type-h1">{confirmed && justPlaced ? 'Thank you for your order' : 'Your order'}</h1>
        <p className="type-body-lg mt-3 text-text-secondary">
          {order.guest
            ? `We have emailed your confirmation to ${order.email}.`
            : `A confirmation has been emailed to ${order.email}.`}
        </p>
      </div>

      {order.paymentMethod === 'test' && (
        <p className="mt-6 border border-dashed border-brand-primary/50 bg-surface-white p-4 text-center text-sm">
          This was a <strong>test order</strong> with a simulated payment. No money was charged.
        </p>
      )}

      <dl className="mt-8 grid gap-4 border border-border bg-surface-white p-6 text-sm sm:grid-cols-3">
        <div>
          <dt className="type-eyebrow text-text-muted">Reference</dt>
          <dd className="mt-1 break-all font-mono">{order.id}</dd>
        </div>
        <div>
          <dt className="type-eyebrow text-text-muted">Placed on</dt>
          <dd className="mt-1">
            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </dd>
        </div>
        <div>
          <dt className="type-eyebrow text-text-muted">Status</dt>
          <dd className="mt-1 font-semibold text-brand-primary">{status.label}</dd>
        </div>
        <p className="text-text-secondary sm:col-span-3">{status.detail}</p>
      </dl>

      {canRetryPayment && (
        <section className="mt-6 border border-border bg-surface-white p-5">
          <h2 className="font-semibold">Payment is still pending</h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            If you completed payment, do not pay again; this order will update when Cashfree confirms it.
            If you did not complete payment, resume this order to try again without creating another order.
          </p>
          <button
            type="button"
            className={buttonClasses('secondary', 'md', 'mt-4')}
            onClick={() => void resumePayment()}
            disabled={resumingPayment}
          >
            {resumingPayment ? 'Reconnecting to Cashfree…' : 'Resume payment'}
          </button>
          <p className="mt-2 min-h-5 text-sm text-danger" role="alert">{resumeError}</p>
        </section>
      )}

      {order.status === 'placed_cod' && (
        <section aria-labelledby="next-heading" className="mt-8 border border-border bg-surface-white p-6">
          <h2 id="next-heading" className="type-h3">What happens next</h2>
          <ol className="mt-4 space-y-4 text-sm">
            {[
              ['Order placed', 'We have received your order.', true],
              ['We confirm with you', `We may call ${order.shipping.phone} to confirm your address.`, false],
              ['Dispatched', 'Your parcel is packed and handed to the courier.', false],
              ['Delivered, pay in cash', `Pay ${money(order.amountInPaise)} to the delivery partner.`, false],
            ].map(([title, detail, done]) => (
              <li key={String(title)} className="flex gap-3">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] ${done ? 'bg-brand-primary text-surface-primary' : 'border border-border-strong text-text-muted'}`}>
                  {done ? '✓' : ''}
                </span>
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="text-text-muted">{detail}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-text-muted">
            Save your order reference <span className="font-mono">{order.id}</span> and your email to track this order any time.{' '}
            <a href="/track" className="underline underline-offset-4">Track order</a>
          </p>
        </section>
      )}

      <section aria-labelledby="items-heading" className="mt-8">
        <h2 id="items-heading" className="type-h3">
          Items
        </h2>
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {order.items.map((item) => (
            <li key={item.productId} className="flex items-start justify-between gap-4 py-4 text-sm">
              <span>
                <span className="font-medium">{item.name}</span>
                <span className="block text-text-muted">
                  {item.sku} × {item.quantity} · {money(item.unitPriceInPaise)} each
                </span>
              </span>
              <span className="tabular-nums">{money(item.lineTotalInPaise)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex justify-between text-base font-semibold">
          <span>Total</span>
          <span className="tabular-nums text-brand-primary">{money(order.amountInPaise)}</span>
        </p>
      </section>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <section aria-labelledby="ship-heading">
          <h2 id="ship-heading" className="type-eyebrow text-text-muted">
            Delivering to
          </h2>
          <address className="mt-2 text-sm not-italic leading-relaxed">
            {order.shipping.name}
            <br />
            {order.shipping.address}
            {order.shipping.landmark && (
              <>
                <br />
                Landmark: {order.shipping.landmark}
              </>
            )}
            <br />
            {order.shipping.city}, {order.shipping.state} {order.shipping.postalCode}
            <br />
            India · {order.shipping.phone}
            {order.shipping.altPhone ? `, ${order.shipping.altPhone}` : ''}
          </address>
        </section>
        <section aria-labelledby="pay-heading">
          <h2 id="pay-heading" className="type-eyebrow text-text-muted">
            Payment
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            {paymentText(order)}
          </p>
          {order.paymentMethod === 'cod' && order.status === 'placed_cod' && (
            <p className="mt-2 border border-border bg-surface-white p-3 text-sm leading-relaxed">
              Please keep <strong>{money(order.amountInPaise)}</strong> in cash ready for the delivery partner. We may call you to confirm your order.
            </p>
          )}
        </section>
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <a href="/shop" className={buttonClasses('primary', 'lg')}>
          Continue shopping
        </a>
        <WhatsAppButton
          message={`Hello Silveram,\n\nI have a question about my order ${order.id}.`}
          variant="secondary"
          size="lg"
        >
          Questions about this order? Chat with us
        </WhatsAppButton>
      </div>
    </div>
  );
}
