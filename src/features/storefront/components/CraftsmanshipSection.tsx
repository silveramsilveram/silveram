import ImageSlot from '@/shared/ui/ImageSlot';
import { CRAFTSMANSHIP } from '../data/content';

export default function CraftsmanshipSection() {
  const { image } = CRAFTSMANSHIP;
  return (
    <section id="craftsmanship" aria-labelledby="craft-heading" className="section-pad bg-surface-primary">
      <div className="page-container grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
        <div data-reveal>
          <ImageSlot
            src={image.src}
            fallbackSrc={image.fallbackSrc}
            alt={image.alt}
            width={image.width}
            height={image.height}
            ratio="1 / 1"
            sizes="(min-width: 1024px) 560px, 100vw"
            className="border border-border"
          />
        </div>
        <div data-reveal>
          <p className="type-eyebrow text-text-muted">Craftsmanship</p>
          <h2 id="craft-heading" className="type-h2 mt-4 text-balance">
            {CRAFTSMANSHIP.heading}
          </h2>
          <p className="type-body-lg mt-5 max-w-xl text-text-secondary">{CRAFTSMANSHIP.description}</p>
          <ul className="mt-8 divide-y divide-border border-y border-border">
            {CRAFTSMANSHIP.points.map((point) => (
              <li key={point.id} className="py-4">
                <h3 className="type-body font-medium">{point.title}</h3>
                <p className="type-body text-text-secondary">{point.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
