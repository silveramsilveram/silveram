import { useState, type KeyboardEvent } from 'react';
import { useCart } from '@/features/cart/store/cartStore';
import PriceLabel from '@/features/products/components/PriceLabel';
import ProductMedia from '@/features/products/components/ProductMedia';
import { getProductById, productPath, type Product } from '@/features/products/data/products';
import Button, { buttonClasses } from '@/shared/ui/Button';
import CarouselControls from '@/shared/ui/CarouselControls';
import Stamp from '@/shared/ui/Stamp';
import { FEATURED } from '../data/content';

interface Slide {
  product: Product;
  imageIndex: number;
}

const slides: Slide[] = FEATURED.slides.flatMap(({ productId, imageIndex }) => {
  const product = getProductById(productId);
  return product ? [{ product, imageIndex }] : [];
});

/**
 * Featured piece carousel on an ice-blue scene: copy and actions on the left, the photograph (or the product's film,
 * once one is added) in a dashed frame on the right. Previous/next buttons and the Left/Right arrow keys both work;
 * the slide change is announced politely to screen readers. Photographs never exceed their native width.
 */
export default function FeaturedCampaign() {
  const { addToCart } = useCart();
  const [index, setIndex] = useState(0);
  const count = slides.length;
  if (count === 0) return null;

  const { product, imageIndex } = slides[index];
  const image = product.images[imageIndex] ?? product.images[0];
  const canBuy = product.price !== null && !product.isPlaceholder;
  const go = (next: number) => setIndex((next + count) % count);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowLeft') go(index - 1);
    else if (event.key === 'ArrowRight') go(index + 1);
  };

  return (
    <section
      id="featured"
      aria-roledescription="carousel"
      aria-label="Featured pieces"
      onKeyDown={onKeyDown}
      className="scene scene-ice py-14 md:py-20"
    >
      <div className="page-container-wide grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="label-mono">
            {FEATURED.label} · {index + 1} of {count}
          </p>

          <div key={product.id} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${count}`} className="slide-in">
            <Stamp className="mt-6">{product.categoryLabel}</Stamp>
            <h2 className="ed-h1 mt-5">{product.name}</h2>
            <PriceLabel price={product.price} className="mt-4 block font-sans text-2xl font-semibold tabular-nums" />
            {product.shortDescription && (
              <p className="scene-body mt-5 max-w-md font-sans text-lg leading-relaxed">{product.shortDescription}</p>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Button
                size="lg"
                disabled={!canBuy}
                onClick={() => addToCart(product, true)}
                aria-label={`Add ${product.name} to bag`}
              >
                Add to bag
              </Button>
              <a href={productPath(product)} className={buttonClasses('secondary', 'lg')}>
                View piece
                <span className="sr-only">: {product.name}</span>
              </a>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-5">
            <CarouselControls
              onPrev={() => go(index - 1)}
              onNext={() => go(index + 1)}
              prevLabel={`Previous piece (${index === 0 ? count : index} of ${count})`}
              nextLabel={`Next piece (${((index + 1) % count) + 1} of ${count})`}
            />
            <p className="label-mono-sm scene-body hidden sm:block">Use the arrow keys to browse</p>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div
            key={`${product.id}-media`}
            className="slide-in mx-auto w-full lg:ml-auto lg:mr-0"
            style={{ maxWidth: Math.min(image?.width ?? 640, 640) }}
          >
            <div className="media-dashed">
              <ProductMedia
                product={product}
                imageIndex={imageIndex}
                sizes="(min-width: 1024px) 640px, calc(100vw - 2.5rem)"
              />
            </div>
          </div>
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {`Showing ${product.name}, piece ${index + 1} of ${count}`}
      </p>
    </section>
  );
}
