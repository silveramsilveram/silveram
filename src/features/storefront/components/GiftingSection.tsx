import ProductMedia from '@/features/products/components/ProductMedia';
import { getProductById, productPath } from '@/features/products/data/products';
import { WhatsAppButton, buildGeneralMessage } from '@/features/whatsapp';
import { buttonClasses } from '@/shared/ui/Button';
import { ArrowRightIcon } from '@/shared/ui/icons';
import { GIFTING } from '../data/content';

/**
 * Gifting scene on midnight navy: three rounded photographs, each linking to its piece. Gift presentation is
 * handled by asking the store (WhatsApp is for questions only), so no packaging is promised here.
 */
export default function GiftingSection() {
  return (
    <section id="gifting" aria-labelledby="gifting-heading" className="scene scene-deep py-16 md:py-24">
      <div className="page-container-wide">
        <div className="rule-dashed pt-6 text-center">
          <p className="label-mono">Gifting</p>
          <h2 id="gifting-heading" className="ed-h1 mx-auto mt-4 max-w-3xl">
            {GIFTING.heading}
          </h2>
          <p className="scene-body mx-auto mt-5 max-w-2xl font-sans text-lg leading-relaxed">{GIFTING.description}</p>
        </div>

        <ul className="mt-14 grid gap-10 md:grid-cols-3 md:gap-6 lg:gap-10">
          {GIFTING.tiles.map(({ productId, imageIndex }, index) => {
            const product = getProductById(productId);
            if (!product) return null;
            return (
              <li key={product.id} className={index === 1 ? 'md:mt-10' : ''}>
                <a href={productPath(product)} className="group block">
                  <div className="media-zoom">
                    <ProductMedia
                      product={product}
                      imageIndex={imageIndex}
                      allowFilm={false}
                      ratio="1 / 1"
                      sizes="(min-width: 768px) 400px, 90vw"
                    />
                  </div>
                  <span className="mt-5 inline-flex min-h-11 items-center gap-2 font-sans text-lg font-semibold underline decoration-accent-silver underline-offset-4 transition-colors duration-[250ms] group-hover:decoration-current">
                    Gift the {product.name}
                    <ArrowRightIcon size={18} className="transition-transform duration-[250ms] group-hover:translate-x-1" />
                  </span>
                </a>
              </li>
            );
          })}
        </ul>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <WhatsAppButton message={buildGeneralMessage()} variant="inverse" size="lg">
            Ask about gift presentation
          </WhatsAppButton>
          <a href="/shop" className={buttonClasses('outline-inverse', 'lg')}>
            Shop all pieces
          </a>
        </div>
      </div>
    </section>
  );
}
