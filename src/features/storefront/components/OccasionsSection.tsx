import { useRef, useState, type KeyboardEvent } from 'react';
import { useCart } from '@/features/cart/store/cartStore';
import ProductMedia from '@/features/products/components/ProductMedia';
import { getProductById, productPath } from '@/features/products/data/products';
import { nextRovingIndex } from '@/shared/hooks/useRovingIndex';
import { formatINR } from '@/shared/lib/money';
import Button, { buttonClasses } from '@/shared/ui/Button';
import Marquee from '@/shared/ui/Marquee';
import { OCCASIONS } from '../data/content';

/**
 * Occasion ticker and selector on a champagne scene. Choosing an occasion shows the piece whose own description
 * mentions it, with that exact phrase quoted from the product copy: a suggestion, never a new claim.
 * The chips are a radio group (arrow keys move between them).
 */
export default function OccasionsSection() {
  const { addToCart } = useCart();
  const options = OCCASIONS.options;
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const option = options[active];
  const product = getProductById(option.productId);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = nextRovingIndex(event, active, options.length);
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    refs.current[next]?.focus();
  };

  if (!product) return null;
  const canBuy = product.price !== null && !product.isPlaceholder;
  const image = product.images[option.imageIndex] ?? product.images[0];

  return (
    <section aria-labelledby="occasions-heading" className="scene scene-champagne py-14 md:py-20">
      <div className="page-container-wide">
        <Marquee items={OCCASIONS.ticker} label="Occasions for giving" />

        <div className="rule-dashed mt-10 grid items-start gap-10 pt-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <h2 id="occasions-heading" className="ed-h1">
              {OCCASIONS.heading}
            </h2>
            <div role="radiogroup" aria-label="Choose an occasion" onKeyDown={onKeyDown} className="mt-8 flex flex-wrap gap-3">
              {options.map((item, index) => (
                <button
                  key={item.id}
                  ref={(node) => {
                    refs.current[index] = node;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={index === active}
                  tabIndex={index === active ? 0 : -1}
                  onClick={() => setActive(index)}
                  className="chip"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div key={option.id} className="slide-in lg:col-span-6" role="status" aria-live="polite">
            <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,15rem)_1fr]">
              <div style={{ maxWidth: Math.min(image?.width ?? 480, 480) }}>
                <ProductMedia
                  product={product}
                  imageIndex={option.imageIndex}
                  allowFilm={false}
                  ratio="4 / 5"
                  sizes="240px"
                />
              </div>
              <div>
                <h3 className="ed-h3">{product.name}</h3>
                <p className="mt-1 font-sans text-lg font-semibold tabular-nums">
                  {product.price === null ? 'Price on request' : formatINR(product.price)}
                </p>
                <p className="ed-product ed-italic mt-4">“…{option.quote}.”</p>
                <p className="label-mono-sm mt-2">From the {product.name} description</p>
                <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <a href={productPath(product)} className={buttonClasses('primary', 'md')}>
                    View piece
                    <span className="sr-only">: {product.name}</span>
                  </a>
                  <Button
                    variant="secondary"
                    disabled={!canBuy}
                    onClick={() => addToCart(product, true)}
                    aria-label={`Add ${product.name} to bag`}
                  >
                    Add to bag
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
