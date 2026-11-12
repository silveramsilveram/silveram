import { buttonClasses } from '@/shared/ui/Button';
import ImageSlot from '@/shared/ui/ImageSlot';
import { GIFTING } from '../data/content';

export default function GiftingSection() {
  return (
    <section id="gifting" aria-labelledby="gifting-heading" className="section-pad bg-surface-secondary">
      <div className="page-container grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div data-reveal>
          <div className="overflow-hidden rounded-[2px] border border-border shadow-md">
            <ImageSlot
              src={GIFTING.image?.src}
              fallbackSrc={GIFTING.image?.fallbackSrc}
              alt={GIFTING.image?.alt ?? 'Silver gifting – photography coming soon'}
              width={GIFTING.image?.width ?? 1}
              height={GIFTING.image?.height ?? 1}
              ratio="1 / 1"
              sizes="(min-width: 1024px) 560px, 100vw"
            />
          </div>
        </div>
        <div data-reveal>
          <span className="block h-px w-14 bg-brand-primary" aria-hidden="true" />
          <h2 id="gifting-heading" className="type-h2 mt-6 text-balance font-medium">
            {GIFTING.heading}
          </h2>
          <p className="type-body-lg mt-5 max-w-xl text-text-secondary leading-relaxed">{GIFTING.description}</p>
          
          <p className="type-body mt-6 max-w-xl text-text-secondary">
            Ask us about gift presentation and personal notes for the piece you have in mind.
            We will confirm what is available before you order.
          </p>

          <div className="mt-8">
            <a href="/#collection" className={buttonClasses('primary', 'lg')}>
              Explore gifting pieces
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
