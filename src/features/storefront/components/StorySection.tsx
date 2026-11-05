import { buttonClasses } from '@/shared/ui/Button';
import ImageSlot from '@/shared/ui/ImageSlot';
import { STORY } from '../data/content';

export default function StorySection() {
  return (
    <section
      id="story"
      aria-labelledby="story-heading"
      className="on-navy section-pad bg-brand-primary text-surface-primary"
    >
      <div className="page-container grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div data-reveal className="order-2 lg:order-1">
          <span className="block h-px w-14 bg-accent-silver" aria-hidden="true" />
          <h2 id="story-heading" className="type-h2 mt-6 text-balance font-medium">
            {STORY.heading}
          </h2>
          <p className="type-body-lg mt-5 max-w-xl text-surface-primary/80 leading-relaxed">{STORY.description}</p>
          
          <div className="mt-8 grid grid-cols-1 gap-4 border-t border-accent-silver/20 pt-6 sm:grid-cols-3">
            <div>
              <p className="type-body-lg font-semibold text-surface-primary">Devotional décor</p>
              <p className="type-caption mt-1 text-accent-silver">For meaningful moments at home</p>
            </div>
            <div>
              <p className="type-body-lg font-semibold text-surface-primary">Patterned kada</p>
              <p className="type-caption mt-1 text-accent-silver">Texture that catches the eye</p>
            </div>
            <div>
              <p className="type-body-lg font-semibold text-surface-primary">Peacock detail</p>
              <p className="type-caption mt-1 text-accent-silver">A vivid statement design</p>
            </div>
          </div>

          <div className="mt-9">
            <a href="#collection" className={buttonClasses('outline-inverse', 'lg')}>
              Explore the pieces
            </a>
          </div>
        </div>
        <div data-reveal className="order-1 lg:order-2">
          <div className="overflow-hidden rounded-[2px] border border-accent-silver/40 shadow-xl">
            <ImageSlot
              src={STORY.image?.src}
              fallbackSrc={STORY.image?.fallbackSrc}
              alt={STORY.image?.alt ?? 'Silver craftsmanship – photography coming soon'}
              width={STORY.image?.width ?? 6}
              height={STORY.image?.height ?? 5}
              ratio="6 / 5"
              tone="dark"
              sizes="(min-width: 1024px) 560px, 100vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
