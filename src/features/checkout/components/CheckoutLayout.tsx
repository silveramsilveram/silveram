import type { ReactNode } from 'react';
import { useCart } from '@/features/cart/context/CartContext';
import { formatINR } from '@/shared/lib/money';
import ImageSlot from '@/shared/ui/ImageSlot';
import { CheckIcon } from '@/shared/ui/icons';

const STEPS = ['Bag', 'Details', 'Payment', 'Confirmation'] as const;

/** Progress indicator shown on every checkout page. `current` is 0-based (0 = Bag). */
export function CheckoutSteps({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold uppercase tracking-[0.12em]" aria-label="Checkout progress">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex items-center gap-3" aria-current={active ? 'step' : undefined}>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[0.7rem] ${
                done || active ? 'bg-brand-primary text-surface-primary' : 'bg-surface-secondary text-text-muted'
              }`}
            >
              {done ? <CheckIcon size={14} /> : index + 1}
            </span>
            <span className={active ? 'text-brand-primary' : done ? 'text-text-secondary' : 'text-text-muted'}>{label}</span>
            {index < STEPS.length - 1 && <span className="hidden h-px w-6 bg-border sm:block" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

/** Page frame shared by the Details and Payment pages: heading, steps, content and order summary. */
export function CheckoutFrame({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  const { cart, subtotal } = useCart();
  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      <div className="page-container pb-20 pt-8 md:pb-28 md:pt-12">
        <CheckoutSteps current={step} />
        <h1 className="type-h1">{title}</h1>
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_24rem] lg:gap-14">
          <div>{children}</div>
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
            <a href="#/cart" className="mt-3 inline-block text-sm text-text-secondary underline underline-offset-4 hover:text-text-primary">
              Edit bag
            </a>
          </aside>
        </div>
      </div>
    </main>
  );
}
