import { useRef } from 'react';
import { MAX_ITEM_QUANTITY, useCart } from '@/features/cart/context/CartContext';
import { BagIcon, CloseIcon, MinusIcon, PlusIcon } from '@/shared/ui/icons';
import Button from '@/shared/ui/Button';
import ImageSlot from '@/shared/ui/ImageSlot';
import { useDialog } from '@/shared/hooks/useDialog';
import { formatINR } from '@/shared/lib/money';
import { isCheckoutEnabled } from '@/shared/lib/api';

interface CartDrawerProps {
  onCheckout: () => void;
}

export default function CartDrawer({ onCheckout }: CartDrawerProps) {
  const { cart, itemCount, subtotal, isCartOpen, setIsCartOpen, updateQuantity, removeItem } = useCart();
  const panelRef = useRef<HTMLDivElement>(null);
  const close = () => setIsCartOpen(false);

  useDialog(isCartOpen, close, panelRef);

  if (!isCartOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-brand-primary/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
      onClick={close}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-md flex-col bg-surface-primary text-text-primary shadow-2xl focus:outline-none animate-in slide-in-from-right duration-300"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <h2 id="cart-drawer-title" className="type-h3 font-medium">
              Your bag
            </h2>
            {itemCount > 0 && (
              <span className="rounded-full bg-brand-primary px-2 py-0.5 text-xs font-semibold text-surface-primary">
                {itemCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-11 w-11 items-center justify-center rounded-[2px] text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
            aria-label="Close shopping bag"
          >
            <CloseIcon size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-secondary text-accent-silver">
                <BagIcon size={32} />
              </div>
              <p className="type-h3 font-medium">Your bag is empty</p>
              <p className="type-body mt-2 max-w-xs text-text-secondary">
                Explore the collection and add your favourite pieces.
              </p>
              <a
                href="#/shop"
                onClick={close}
                className="mt-6 inline-flex min-h-11 items-center rounded-[2px] border border-brand-primary px-6 text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary transition-colors hover:bg-brand-primary hover:text-surface-primary"
              >
                View collection
              </a>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {cart.map((item) => (
                <li key={item.id} className="flex gap-4 py-5">
                  <ImageSlot
                    src={item.image}
                    fallbackSrc={item.imageFallback}
                    alt={item.imageAlt ?? item.name}
                    width={1}
                    height={1}
                    fit="contain"
                    placeholderLabel=""
                    className="w-20 shrink-0 rounded-[2px] border border-border"
                    sizes="80px"
                  />
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="type-body font-medium">{item.name}</h3>
                      <span className="type-body font-semibold text-brand-primary tabular-nums">
                        {formatINR(item.price * item.quantity)}
                      </span>
                    </div>
                    <p className="type-caption text-text-muted">{formatINR(item.price)} each</p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center rounded-[2px] border border-border-strong bg-surface-white">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="flex h-9 w-9 items-center justify-center text-text-secondary transition-colors hover:bg-surface-secondary"
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          <MinusIcon size={14} />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-label={`Quantity ${item.quantity}`}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          disabled={item.quantity >= MAX_ITEM_QUANTITY}
                          className="flex h-9 w-9 items-center justify-center text-text-secondary transition-colors hover:bg-surface-secondary disabled:opacity-40"
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          <PlusIcon size={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="inline-flex min-h-9 items-center px-2 text-xs text-text-muted underline underline-offset-4 transition-colors hover:text-danger"
                        aria-label={`Remove ${item.name} from bag`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart.length > 0 && (
          <div className="space-y-4 border-t border-border bg-surface-secondary px-5 py-5 sm:px-6">
            <div className="flex items-baseline justify-between">
              <span className="type-body text-text-secondary">Subtotal</span>
              <span className="type-h3 font-semibold text-brand-primary tabular-nums">{formatINR(subtotal)}</span>
            </div>
            
            <div className="flex items-center justify-between border-y border-border/80 py-2.5 text-xs text-text-muted">
              <span>Prices shown in INR</span>
              <span>Cash on delivery</span>
            </div>

            {isCheckoutEnabled ? (
              <Button variant="primary" size="lg" className="w-full" onClick={onCheckout}>
                Proceed to checkout
              </Button>
            ) : (
              <p className="type-caption text-center text-text-muted">Checkout is opening soon.</p>
            )}
            <a
              href="#/cart"
              onClick={close}
              className="block min-h-11 w-full text-center text-sm leading-[2.75rem] text-text-secondary underline underline-offset-4 hover:text-text-primary"
            >
              View full bag
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
