import type { CSSProperties } from 'react';
import ProductMedia from '@/features/products/components/ProductMedia';
import { getProductById, productPath } from '@/features/products/data/products';
import { buttonClasses } from '@/shared/ui/Button';
import { ArrowRightIcon } from '@/shared/ui/icons';
import { HERO } from '../data/content';

const step = (index: number) => ({ '--i': index }) as CSSProperties;

/**
 * First screen: the headline on the left and one real photograph of a real piece on the right, shown at its
 * native size (the photographs are about 920px wide, so a full-bleed hero would be enlarged and go soft).
 * It reads bundled product photographs, so the first screen never depends on a remote site image.
 */
export default function HeroSection() {
  const product = getProductById(HERO.productId);
  const [lineOne, ...rest] = HERO.heading.split(/(?<=\.)\s+/);
  const lineTwo = rest.join(' ');

  return (
    <section id="home" aria-labelledby="hero-heading" className="scene scene-deep relative isolate overflow-hidden">
      <div className="page-container-wide grid min-h-[100svh] items-center gap-10 pb-12 pt-32 lg:grid-cols-12 lg:gap-12 lg:pb-16">
        <div className="lg:col-span-6 lg:pr-6">
          <h1 id="hero-heading" className="ed-hero">
            <span className="line-reveal" style={step(0)}>
              <span>{lineOne}</span>
            </span>
            {lineTwo && (
              <span className="line-reveal ed-italic" style={step(1)}>
                <span>{lineTwo}</span>
              </span>
            )}
          </h1>
          <p className="hero-fade-in scene-body mt-6 max-w-md font-sans text-lg leading-relaxed" style={step(2)}>
            {HERO.description}
          </p>
          <div className="hero-fade-in mt-8 flex flex-wrap items-center gap-x-8 gap-y-4" style={step(3)}>
            <a href="/shop" className={buttonClasses('inverse', 'lg')}>
              Shop the collection
            </a>
            <a href="/#gifting" className="hero-link group inline-flex min-h-11 items-center gap-2 font-sans text-base font-semibold">
              Gifting ideas
              <ArrowRightIcon size={18} className="transition-transform duration-[250ms] group-hover:translate-x-1" />
            </a>
          </div>
        </div>

        {product && (
          <a
            href={productPath(product)}
            className="hero-fade-in group block w-full lg:col-span-6 lg:justify-self-end"
            style={{ ...step(2), maxWidth: product.images[HERO.imageIndex]?.width }}
            aria-label={`${product.name}, view piece`}
          >
            <div className="media-zoom">
              <ProductMedia
                product={product}
                imageIndex={HERO.imageIndex}
                allowFilm={false}
                priority
                sizes="(min-width: 1024px) 560px, 92vw"
              />
            </div>
            <span className="scene-body mt-3 block font-sans text-sm">{product.name}</span>
          </a>
        )}
      </div>
    </section>
  );
}
