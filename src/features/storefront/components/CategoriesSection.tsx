import ImageSlot from '@/shared/ui/ImageSlot';
import { PRODUCTS, productPath } from '@/features/products/data/products';
import { CATEGORIES_SECTION } from '../data/content';

export default function CategoriesSection() {
  return (
    <section id="categories" aria-labelledby="categories-heading" className="section-pad bg-surface-secondary">
      <div className="page-container">
        <div className="mx-auto max-w-2xl text-center" data-reveal>
          <h2 id="categories-heading" className="type-h2 text-balance">
            {CATEGORIES_SECTION.heading}
          </h2>
          <p className="type-body-lg mt-4 text-text-secondary">{CATEGORIES_SECTION.description}</p>
        </div>
        <ul className="mt-12 grid gap-4 sm:grid-cols-3 sm:gap-6 md:mt-14">
          {PRODUCTS.map((product) => {
            const image = product.images[0];
            return (
              <li key={product.id} data-reveal>
                <a href={productPath(product)} className="group relative block overflow-hidden rounded-[2px]">
                  <ImageSlot
                    src={image?.src}
                    fallbackSrc={image?.fallbackSrc}
                    alt={image?.alt ?? product.categoryLabel}
                    width={image?.width ?? 6}
                    height={image?.height ?? 5}
                    ratio="4 / 3"
                    sizes="(min-width: 640px) 33vw, 100vw"
                    imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-brand-primary px-4 py-3 text-surface-primary">
                    <span className="type-eyebrow">{product.categoryLabel}</span>
                    <span aria-hidden="true">→</span>
                  </span>
                  <span className="sr-only">View {product.name}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
