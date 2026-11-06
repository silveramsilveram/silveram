import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { buttonClasses } from '@/shared/ui/Button';
import ImageSlot from '@/shared/ui/ImageSlot';
import { ArrowRightIcon } from '@/shared/ui/icons';
import { HERO } from '../data/content';

export default function HeroSection() {
  const rootRef = useRef<HTMLElement>(null);

  // Authored entrance animation; honors prefers-reduced-motion
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from('[data-hero-text]', { y: 28, opacity: 0, duration: 0.9, stagger: 0.12 })
        .from('[data-hero-visual]', { opacity: 0, scale: 0.96, duration: 1.1, ease: 'power2.out' }, 0.2);
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="home"
      ref={rootRef}
      aria-labelledby="hero-heading"
      className="on-navy silver-light relative overflow-hidden text-surface-primary"
    >
      <div className="page-container grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:py-28">
        <div>
          <h1 id="hero-heading" data-hero-text className="type-display text-balance font-medium tracking-[-0.025em]">
            {HERO.heading}
          </h1>
          <p data-hero-text className="type-body-lg mt-6 max-w-xl text-surface-primary/85 leading-relaxed">
            {HERO.description}
          </p>
          <div data-hero-text className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <a href="#collection" className={`${buttonClasses('inverse', 'lg')} group gap-3`}>
              <span>Shop Collection</span>
              <ArrowRightIcon size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
            </a>
            <a href="#story" className={buttonClasses('outline-inverse', 'lg')}>
              Our story & craft
            </a>
          </div>

          <div data-hero-text className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-accent-silver/20 pt-6 text-xs uppercase tracking-[0.18em] text-accent-silver">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-silver" aria-hidden="true" />
              Thoughtful gifting
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-silver" aria-hidden="true" />
              Considered designs
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-silver" aria-hidden="true" />
              Cash on delivery
            </span>
          </div>
        </div>

        <div data-hero-visual className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="relative overflow-hidden rounded-[2px] border border-accent-silver/40 shadow-2xl">
            <ImageSlot
              src={HERO.image?.src}
              fallbackSrc={HERO.image?.fallbackSrc}
              alt={HERO.image?.alt ?? 'Silveram collection – photograph coming soon'}
              width={HERO.image?.width ?? 1}
              height={HERO.image?.height ?? 1}
              ratio="1 / 1"
              tone="dark"
              priority
              sizes="(min-width: 1024px) 520px, 90vw"
              placeholderLabel="Product photography coming soon"
            />
            <div className="absolute bottom-4 left-4 right-4 rounded-[2px] border border-white/10 bg-brand-primary/95 px-4 py-2.5">
              <p className="type-caption flex items-center justify-between text-surface-primary">
                <span className="font-semibold uppercase tracking-wider">Thoughtful gifting</span>
                <span className="text-accent-silver">A considered collection</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
