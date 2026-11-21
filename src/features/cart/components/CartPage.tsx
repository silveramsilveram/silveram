import { useEffect } from 'react';
import { MAX_ITEM_QUANTITY, useCart } from '@/features/cart/store/cartStore';
import ProductCard from '@/features/products/components/ProductCard';
import { PRODUCTS, productPath, getProductById } from '@/features/products/data/products';
import { buttonClasses } from '@/shared/ui/Button';
import ImageSlot from '@/shared/ui/ImageSlot';
import { MinusIcon, PlusIcon } from '@/shared/ui/icons';
import { isCheckoutEnabled } from '@/shared/lib/api';
import { formatINR } from '@/shared/lib/money';
import { setPageMeta } from '@/shared/lib/seo';

export default function CartPage() {
  const { cart, subtotal, itemCount, updateQuantity, removeItem } = useCart();

  useEffect(() => {
    setPageMeta({ title: 'Your bag | Silveram', description: 'Review the items in your Silveram bag.', noindex: true });
    window.scrollTo(0, 0);
  }, []);

  return (
    <main id="main-content" tabIndex={-1} className="scene scene-canvas focus:outline-none">
      <div className="page-container-wide pb-32 pt-8 md:pb-24 md:pt-12">
        <h1 className="ed-display">
          Your bag
          {itemCount > 0 && <span className="ml-3 font-sans text-lg text-text-muted">({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>}
        </h1>

        {cart.length === 0 ? (
          <div className="mt-8">
            <p className="ed-h3">Nothing here yet.</p>
            <p className="scene-body mt-3 max-w-md font-sans text-lg leading-relaxed">
              Pick a piece to start. You pay when it arrives.
            </p>
            <a href="/shop" className={buttonClasses('primary', 'lg', 'mt-6')}>
              View the collection
            </a>
            <div className="rule-dashed mt-10 grid gap-x-8 gap-y-12 pt-10 sm:grid-cols-2 lg:grid-cols-3">
              {PRODUCTS.slice(0, 3).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_24rem] lg:gap-16">
            <ul className="divide-y divide-dashed divide-[var(--scene-line)] border-y border-dashed border-[var(--scene-line)]" aria-label="Items in your bag">
              {cart.map((item) => {
                const product = getProductById(item.id);
                return (
                  <li key={item.id} className="flex gap-4 py-6 sm:gap-6">
                    <ImageSlot
                      src={item.image}
                      alt={item.imageAlt ?? item.name}
                      width={1}
                      height={1}
                      fit="contain"
                      placeholderLabel=""
                      className="w-24 shrink-0 rounded-[var(--radius-field)] sm:w-32"
                      sizes="128px"
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="ed-product">
                          {product ? (
                            <a href={productPath(product)} className="hover:underline underline-offset-4">
                              {item.name}
                            </a>
                          ) : (
                            item.name
                          )}
                        </h2>
                        <span className="type-body-lg font-semibold tabular-nums text-brand-primary">
                          {formatINR(item.price * item.quantity)}
                        </span>
                      </div>
                      <p className="type-caption text-text-muted">{formatINR(item.price)} each</p>
                      <div className="mt-auto flex items-center justify-between pt-4">
                        <div className="flex items-center rounded-[var(--radius-field)] border border-text-muted bg-surface-white">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="flex h-11 w-11 items-center justify-center text-text-secondary hover:bg-surface-secondary"
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            <MinusIcon size={14} />
                          </button>
                          <span className="w-10 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            disabled={item.quantity >= MAX_ITEM_QUANTITY}
                            className="flex h-11 w-11 items-center justify-center text-text-secondary hover:bg-surface-secondary disabled:opacity-40"
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            <PlusIcon size={14} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="min-h-11 px-2 text-sm text-text-muted underline underline-offset-4 hover:text-danger"
                          aria-label={`Remove ${item.name} from bag`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <aside aria-label="Order summary" className="frame-dashed h-fit p-6 lg:sticky lg:top-24">
              <h2 className="ed-h3">Summary</h2>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Items ({itemCount})</dt>
                  <dd className="tabular-nums">{formatINR(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Delivery charges</dt>
                  <dd>None added at checkout</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-4 text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular-nums text-brand-primary">{formatINR(subtotal)}</dd>
                </div>
              </dl>

              <div className="mt-6 space-y-3">
                {isCheckoutEnabled ? (
                  <a href="/checkout" className={buttonClasses('primary', 'lg', 'w-full')}>
                    Proceed to checkout
                  </a>
                ) : (
                  <p className="type-caption text-text-muted">Checkout is opening soon.</p>
                )}
                <ul className="space-y-1.5 border-t border-border pt-4 text-xs text-text-secondary">
                  <li>Cash on delivery: pay when your order arrives</li>
                  <li>Checkout as a guest, no account needed</li>
                  <li>Order confirmation sent by email</li>
                  <li className="text-text-muted">UPI &amp; card payments coming soon</li>
                </ul>
                <a href="/shop" className="block min-h-11 text-center text-sm leading-[2.75rem] text-text-secondary underline underline-offset-4 hover:text-text-primary">
                  Continue shopping
                </a>
              </div>
            </aside>
          </div>
        )}

        {cart.length > 0 && isCheckoutEnabled && (
          <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-border bg-surface-primary px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
            <div>
              <p className="text-xs text-text-muted">Total</p>
              <p className="text-lg font-semibold tabular-nums text-brand-primary">{formatINR(subtotal)}</p>
            </div>
            <a href="/checkout" className={buttonClasses('primary', 'lg', 'flex-1 max-w-56')}>
              Checkout
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
