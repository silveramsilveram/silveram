import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import ProductMedia from '@/features/products/components/ProductMedia';
import { PRODUCTS, productPath } from '@/features/products/data/products';
import CarouselControls from '@/shared/ui/CarouselControls';
import Stamp from '@/shared/ui/Stamp';
import { RAIL } from '../data/content';

/** Every photograph of every product, in catalogue order. Add images to a product in products.ts and they appear here. */
const ITEMS = PRODUCTS.flatMap((product) =>
  product.images.map((image, imageIndex) => ({ product, imageIndex, key: `${product.id}-${imageIndex}`, image })),
);

/**
 * Horizontal photograph rail with snap points. The previous/next buttons scroll it by most of a screen and disable
 * at either end; it also scrolls by touch, trackpad and keyboard (it is a focusable scroll region). Every card links
 * to its piece. The structure is ready for customer or store photographs: add entries to the data and they join the rail.
 */
export default function CollectionRail() {
  const railRef = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    setEdge({ start: rail.scrollLeft <= 2, end: rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2 });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const scrollByPage = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (rail) rail.scrollBy({ left: direction * rail.clientWidth * 0.8 });
  };

  const onRailKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'ArrowLeft') scrollByPage(-1);
    else if (event.key === 'ArrowRight') scrollByPage(1);
    else return;
    event.preventDefault();
  };

  return (
    <section aria-labelledby="rail-heading" className="scene scene-canvas py-16 md:py-24">
      <div className="page-container-wide flex items-end justify-between gap-6">
        <div>
          <h2 id="rail-heading" className="ed-h2">
            {RAIL.heading}
          </h2>
          <p className="scene-body mt-3 max-w-lg font-sans text-base leading-relaxed">{RAIL.description}</p>
        </div>
        <CarouselControls
          onPrev={() => scrollByPage(-1)}
          onNext={() => scrollByPage(1)}
          prevDisabled={edge.start}
          nextDisabled={edge.end}
          prevLabel="Scroll photographs left"
          nextLabel="Scroll photographs right"
          className="shrink-0"
        />
      </div>

      <ul
        ref={railRef}
        onScroll={measure}
        onKeyDown={onRailKeyDown}
        tabIndex={0}
        role="list"
        aria-label="Photographs from the collection"
        className="rail mt-10 items-start pb-4 focus-visible:outline-offset-[-3px]"
      >
        {ITEMS.map(({ product, imageIndex, key, image }, index) => (
          <li key={key} className={`w-[min(72vw,19rem)] ${index % 2 === 1 ? 'md:mt-12' : ''}`}>
            <a href={productPath(product)} aria-label={`${product.name}, photograph ${imageIndex + 1}`} className="group relative block">
              <div className="media-zoom">
                <ProductMedia
                  product={product}
                  imageIndex={imageIndex}
                  allowFilm={false}
                  ratio={image.width === image.height ? '1 / 1' : '5 / 6'}
                  focal={{ x: 50, y: 50 }}
                  sizes="19rem"
                />
              </div>
              <Stamp className="absolute bottom-3 left-3 bg-surface-primary/95 text-brand-primary">{product.name}</Stamp>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
