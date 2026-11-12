import { useEffect, useRef } from 'react';
import { PRODUCTS, getProductById, productPath } from '@/features/products/data/products';
import { formatINR } from '@/shared/lib/money';
import { responsiveSrcSet } from '@/shared/lib/cloudinary';
import { buttonClasses } from '@/shared/ui/Button';
import ImageSlot from '@/shared/ui/ImageSlot';
import { HERO } from '../data/content';

/** Source photographs are 922 px wide: never ask for more, so nothing is upscaled. */
const HERO_WIDTHS = [480, 720, 922] as const;

export default function HeroSection() {
  const imageFrameRef = useRef<HTMLDivElement>(null);
  const image = getProductById(HERO.productId)?.images[0];
  const [lineOne, ...rest] = HERO.heading.split(/(?<=\.)\s+/);
  const lineTwo = rest.join(' ');

  // One authored moment: an ivory mask lifts off the photograph. gsap is loaded on demand (it is
  // ~28 kB gzipped and only decorative), so the photograph paints first and the mask is added
  // only once the animation library is ready: nothing is ever hidden while scripts are slow.
  useEffect(() => {
    const frame = imageFrameRef.current;
    if (!frame || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void import('gsap').then(({ default: gsap }) => {
      if (cancelled) return;
      const mask = document.createElement('div');
      mask.setAttribute('aria-hidden', 'true');
      mask.className = 'absolute inset-0 z-10 bg-surface-primary';
      frame.appendChild(mask);

      const img = frame.querySelector('img');
      const timeline = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' }, onComplete: () => mask.remove() })
        .to(mask, { yPercent: -100, duration: 1.2 });
      if (img) timeline.from(img, { scale: 1.06, duration: 1.4 }, 0);

      const play = () => timeline.play();
      const fallbackTimer = window.setTimeout(play, 2000);
      if (!img || img.complete) {
        play();
      } else {
        img.addEventListener('load', play, { once: true });
        img.addEventListener('error', play, { once: true });
      }

      cleanup = () => {
        window.clearTimeout(fallbackTimer);
        img?.removeEventListener('load', play);
        img?.removeEventListener('error', play);
        timeline.kill();
        mask.remove();
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <section id="home" aria-labelledby="hero-heading" className="bg-surface-primary">
      <div className="page-container grid gap-8 py-10 md:py-14 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-10 lg:py-16">
        <div className="lg:col-span-6 lg:row-start-1 lg:self-end">
          <h1 id="hero-heading" className="type-hero text-balance">
            <span className="block">{lineOne}</span>
            {lineTwo && <span className="block">{lineTwo}</span>}
          </h1>
          <p className="type-body-lg mt-6 max-w-md text-text-secondary">{HERO.description}</p>
          <a href="/#collection" className={`${buttonClasses('primary', 'lg')} mt-8 text-sm! normal-case! tracking-normal!`}>
            Shop the collection
          </a>
        </div>

        <div ref={imageFrameRef} className="relative overflow-hidden lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1 lg:self-start">
          <ImageSlot
            src={image?.src}
            fallbackSrc={image?.fallbackSrc}
            srcSet={responsiveSrcSet(image?.src, HERO_WIDTHS)}
            alt={image?.alt ?? 'Peacock Ring, photograph coming soon'}
            width={image?.width ?? 922}
            height={image?.height ?? 768}
            ratio="6 / 5"
            priority
            sizes="(min-width: 1024px) 600px, calc(100vw - 2.5rem)"
            placeholderLabel="Photograph coming soon"
          />
        </div>

        <nav aria-label="Pieces in the collection" className="border-t border-border lg:col-span-6 lg:row-start-2 lg:self-start">
          <ul>
            {PRODUCTS.map((product) => (
              <li key={product.id}>
                <a
                  href={productPath(product)}
                  className="flex min-h-12 items-baseline justify-between gap-4 border-b border-border py-3 text-text-primary transition-colors duration-200 hover:text-brand-primary"
                >
                  <span className="type-body font-medium">{product.name}</span>
                  <span className="type-body tabular-nums text-text-secondary">
                    {product.price === null ? 'Price on request' : formatINR(product.price)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
