import type { CSSProperties } from 'react';
import { PRODUCTS, getProductById, productPath } from '@/features/products/data/products';
import { productVideoPosterUrl, productVideoUrl, responsiveSrcSet } from '@/shared/lib/cloudinary';
import { formatINR } from '@/shared/lib/money';
import { buttonClasses } from '@/shared/ui/Button';
import { ArrowRightIcon } from '@/shared/ui/icons';
import Media from '@/shared/ui/Media';
import { HERO } from '../data/content';

/**
 * Hero variants share one component so a film or higher-resolution photography can be introduced later
 * without rebuilding it:
 *  - `contained` (default): a midnight card with the headline and a rounded media slot side by side.
 *    Right for the current photographs (about 920px wide), which are shown at or below native size.
 *  - `bleed`: the media fills the whole card behind a flat navy scrim, headline low-left. Switch to it once a
 *    full-bleed film or a large photograph exists (see HERO.film in content.ts).
 */
export type HeroVariant = 'contained' | 'bleed';

const step = (index: number) => ({ '--i': index }) as CSSProperties;

/** Responsive widths that never exceed the photograph's own pixel width, so nothing is upscaled. */
function widthsFor(native: number): number[] {
  return [...[480, 720].filter((width) => width < native), native];
}

export default function HeroSection({ variant = 'contained' }: { variant?: HeroVariant }) {
  const bleed = variant === 'bleed';
  const product = getProductById(HERO.productId);
  const image = product?.images[0];
  const film = HERO.film;
  const filmSrc = film ? productVideoUrl(film.sku, film.name, Math.min(1280, film.width)) : '';
  const [lineOne, ...rest] = HERO.heading.split(/(?<=\.)\s+/);
  const lineTwo = rest.join(' ');

  const media =
    film && filmSrc ? (
      <Media
        kind="video"
        src={filmSrc}
        poster={productVideoPosterUrl(film.sku, film.name, Math.min(1280, film.width))}
        fallbackSrc={image?.fallbackSrc ?? image?.src}
        alt={film.alt}
        width={film.width}
        height={film.height}
        ratio={bleed ? undefined : '6 / 5'}
        radius={bleed ? 'none' : 'media'}
        tone="dark"
        priority
        className={bleed ? 'h-full! w-full' : ''}
      />
    ) : (
      <Media
        src={image?.src}
        fallbackSrc={image?.fallbackSrc}
        srcSet={responsiveSrcSet(image?.src, widthsFor(image?.width ?? 920))}
        alt={image?.alt ?? 'Peacock Ring, photograph coming soon'}
        width={image?.width ?? 920}
        height={image?.height ?? 768}
        ratio={bleed ? undefined : '6 / 5'}
        focal={{ x: 50, y: 50 }}
        radius={bleed ? 'none' : 'media'}
        tone="dark"
        priority
        sizes="(min-width: 1024px) 600px, calc(100vw - 4rem)"
        placeholderLabel="Photograph coming soon"
        className={bleed ? 'h-full! w-full' : ''}
      />
    );

  const copy = (
    <div className={bleed ? 'relative z-10 max-w-2xl' : ''}>
      <h1 id="hero-heading" className="ed-display">
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
        <a href="/#collection" className={buttonClasses('inverse', 'lg')}>
          Shop the collection
        </a>
        <a
          href="/#gifting"
          className="group inline-flex min-h-11 items-center gap-2 font-sans text-base font-semibold underline decoration-accent-silver underline-offset-4 transition-colors duration-[250ms] hover:decoration-current"
        >
          Gifting ideas
          <ArrowRightIcon size={18} className="transition-transform duration-[250ms] group-hover:translate-x-1" />
        </a>
      </div>
    </div>
  );

  const index = (
    <nav aria-label="Pieces in the collection" className="hero-fade-in mt-10 lg:mt-12" style={step(4)}>
      <ul className="rule-dashed">
        {PRODUCTS.map((item) => (
          <li key={item.id} className="rule-dashed-b">
            <a
              href={productPath(item)}
              className="group flex min-h-14 items-baseline justify-between gap-4 py-3 transition-colors duration-[250ms]"
            >
              <span className="flex flex-col sm:flex-row sm:items-baseline sm:gap-4">
                <span className="ed-product text-[1.5rem]! group-hover:italic">{item.name}</span>
                <span className="label-mono-sm scene-body">{item.categoryLabel}</span>
              </span>
              <span className="flex items-center gap-3 font-sans tabular-nums">
                {item.price === null ? 'Price on request' : formatINR(item.price)}
                <ArrowRightIcon
                  size={16}
                  className="-ml-1 hidden opacity-0 transition-all duration-[250ms] group-hover:translate-x-1 group-hover:opacity-100 sm:block"
                />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );

  const caption = product && !bleed && (
    <a
      href={productPath(product)}
      aria-label={`View ${product.name}, ${product.price === null ? 'price on request' : formatINR(product.price)}`}
      className="group absolute bottom-4 left-4 flex items-center gap-4 rounded-2xl bg-surface-primary px-4 py-3 text-brand-primary shadow-[0_2px_0_0_var(--color-brand-primary)] transition-[background-color,transform] duration-[250ms] hover:-translate-y-0.5 hover:bg-surface-secondary"
    >
      <span className="flex flex-col">
        <span className="ed-product text-[1.375rem]! leading-none">{product.name}</span>
        <span className="label-mono-sm mt-1 text-text-secondary">
          {product.categoryLabel}
          {product.price !== null && ` · ${formatINR(product.price)}`}
        </span>
      </span>
      <ArrowRightIcon size={18} className="transition-transform duration-[250ms] group-hover:translate-x-1" />
    </a>
  );

  return (
    <section id="home" aria-labelledby="hero-heading" className="bg-surface-primary">
      <div className="page-container-wide pb-8 md:pb-12">
        {bleed ? (
          <div className="scene scene-deep media-frame relative flex min-h-[34rem] items-end p-6 md:p-10 lg:min-h-[44rem] lg:p-14">
            <div className="hero-media-in absolute inset-0">{media}</div>
            <div aria-hidden="true" className="absolute inset-0 bg-brand-primary/50" />
            {copy}
          </div>
        ) : (
          <div className="scene scene-deep media-frame grid items-center gap-10 p-6 sm:p-8 md:p-10 lg:grid-cols-12 lg:gap-14 lg:p-14">
            <div className="lg:col-span-6">
              {copy}
              {index}
            </div>
            <div className="lg:col-span-6">
              <div className="hero-media-in relative rounded-[var(--radius-media)] outline-1 outline-dashed outline-offset-[10px] outline-[color:var(--scene-line)]">
                {media}
                {caption}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
