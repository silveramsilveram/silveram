import type { CSSProperties } from 'react';
import { nativeWidths, responsiveSrcSet, siteImageUrl } from '@/shared/lib/cloudinary';
import { buttonClasses } from '@/shared/ui/Button';
import { ArrowRightIcon } from '@/shared/ui/icons';
import Media from '@/shared/ui/Media';
import { HERO } from '../data/content';

const step = (index: number) => ({ '--i': index }) as CSSProperties;

export default function HeroSection() {
  const image = HERO.image;
  const imageSrc = siteImageUrl('hero', image.name, 1920);
  const srcSet = responsiveSrcSet(
    imageSrc,
    nativeWidths(image.width, [320, 480, 640, 768, 960, 1280, 1600, 1920, 2560, 2880, 3840]),
  );
  const [lineOne, ...rest] = HERO.heading.split(/(?<=\.)\s+/);
  const lineTwo = rest.join(' ');

  return (
    <section
      id="home"
      aria-labelledby="hero-heading"
      className="scene scene-deep relative isolate h-[100svh] min-h-[34rem] overflow-hidden"
    >
      <div className="hero-media-in absolute inset-0 h-full w-full">
        <Media
          src={imageSrc}
          srcSet={srcSet}
          alt={image.alt}
          width={image.width}
          height={image.height}
          focal={image.focal}
          radius="none"
          tone="dark"
          priority
          sizes="100vw"
          className="h-full w-full"
          imgClassName="object-cover"
        />
      </div>
      <div aria-hidden="true" className="hero-image-scrim absolute inset-0" />
      <div
        className="relative z-10 flex h-full items-end px-5 pb-[clamp(2rem,7vh,5rem)] pt-32 sm:px-8 md:px-12 lg:px-16"
      >
        <div className="max-w-2xl">
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
          <p
            className="hero-fade-in mt-5 max-w-md font-sans text-base leading-relaxed text-surface-primary/95 sm:mt-6 sm:text-lg"
            style={step(2)}
          >
            {HERO.description}
          </p>
          <div className="hero-fade-in mt-8 flex flex-wrap items-center gap-x-8 gap-y-4" style={step(3)}>
            <a href="/#collection" className={buttonClasses('inverse', 'lg')}>
              Shop the collection
            </a>
            <a
              href="/#gifting"
              className="group inline-flex min-h-11 items-center gap-2 font-sans text-base font-semibold text-surface-primary underline decoration-accent-silver underline-offset-4 transition-colors duration-[250ms] hover:decoration-current"
            >
              Gifting ideas
              <ArrowRightIcon size={18} className="transition-transform duration-[250ms] group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
