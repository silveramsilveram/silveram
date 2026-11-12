import { useRef, useState, type KeyboardEvent } from 'react';
import ProductMedia from '@/features/products/components/ProductMedia';
import { getProductById, productPath } from '@/features/products/data/products';
import { nextRovingIndex } from '@/shared/hooks/useRovingIndex';
import { CRAFTSMANSHIP } from '../data/content';

/**
 * "Look closely": three tabs, each pairing a detail with the photograph that shows it. Tabs follow the WAI-ARIA
 * pattern (arrow keys, Home and End move between them). Copy is the store's existing description of each piece.
 */
export default function LookCloselySection() {
  const points = CRAFTSMANSHIP.points;
  const [active, setActive] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const point = points[active];
  const product = getProductById(point.productId);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = nextRovingIndex(event, active, points.length);
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="craftsmanship" aria-labelledby="look-heading" className="scene scene-canvas py-16 md:py-24">
      <div className="page-container-wide grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <h2 id="look-heading" className="ed-h1">
            {CRAFTSMANSHIP.heading}
          </h2>
          <p className="scene-body mt-5 max-w-lg font-sans text-lg leading-relaxed">{CRAFTSMANSHIP.description}</p>

          <div role="tablist" aria-label="Details by piece" onKeyDown={onKeyDown} className="mt-8 flex flex-wrap gap-3">
            {points.map((item, index) => (
              <button
                key={item.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`look-tab-${item.id}`}
                aria-selected={index === active}
                aria-controls="look-panel"
                tabIndex={index === active ? 0 : -1}
                onClick={() => setActive(index)}
                className="chip"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div id="look-panel" role="tabpanel" aria-labelledby={`look-tab-${point.id}`} className="rule-dashed mt-8 pt-6">
            <h3 className="ed-h3">{point.title}</h3>
            <p className="scene-body mt-3 font-sans text-lg leading-relaxed">{point.text}</p>
            {product && (
              <a
                href={productPath(product)}
                className="mt-4 inline-flex min-h-11 items-center font-sans text-base font-semibold underline decoration-accent-silver underline-offset-4 transition-colors duration-[250ms] hover:decoration-current"
              >
                View {product.name}
              </a>
            )}
          </div>
        </div>

        <div className="lg:col-span-7">
          {product && (
            <div
              key={point.id}
              className="slide-in mx-auto w-full lg:ml-auto lg:mr-0"
              style={{ maxWidth: Math.min(product.images[point.imageIndex]?.width ?? 640, 640) }}
            >
              <div className="media-dashed">
                <ProductMedia
                  product={product}
                  imageIndex={point.imageIndex}
                  allowFilm={false}
                  sizes="(min-width: 1024px) 640px, calc(100vw - 2.5rem)"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
