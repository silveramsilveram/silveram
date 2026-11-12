import { useCart } from '@/features/cart/store/cartStore';
import PriceLabel from '@/features/products/components/PriceLabel';
import ProductMedia from '@/features/products/components/ProductMedia';
import { PRODUCTS, productPath, type Product } from '@/features/products/data/products';
import { formatINR } from '@/shared/lib/money';
import Button, { buttonClasses } from '@/shared/ui/Button';
import Stamp from '@/shared/ui/Stamp';
import { LINEUP } from '../data/content';

/**
 * One tile of the editorial lineup. Square photographs (the Silver Frame is only 508px wide) sit at native size
 * on a white mat inside the same 4:5 tile as the wider photographs, which are cropped to fit, so nothing is enlarged.
 */
function Tile({ product, offset }: { product: Product; offset: boolean }) {
  const { addToCart } = useCart();
  const image = product.images[0];
  const square = Boolean(image) && image.width === image.height;
  const canBuy = product.price !== null && !product.isPlaceholder;
  const priceText = product.price === null ? 'Price on request' : formatINR(product.price);

  return (
    <article className={`group flex flex-col ${offset ? 'lg:mt-16' : ''}`}>
      <a href={productPath(product)} aria-label={`${product.name}, ${priceText}`} className="relative block">
        {square ? (
          <div className="media-frame grid aspect-[4/5] place-items-center bg-surface-white">
            <div className="media-zoom w-full" style={{ maxWidth: image.width }}>
              <ProductMedia product={product} allowFilm={false} radius="none" sizes="(min-width: 1024px) 420px, 90vw" />
            </div>
          </div>
        ) : (
          <div className="media-zoom">
            <ProductMedia
              product={product}
              allowFilm={false}
              ratio="4 / 5"
              focal={{ x: 50, y: 50 }}
              sizes="(min-width: 1024px) 420px, 90vw"
            />
          </div>
        )}
        <Stamp className="absolute left-4 top-4 bg-surface-primary/95 text-brand-primary">{product.categoryLabel}</Stamp>
        <PriceLabel
          price={product.price}
          className="absolute right-4 top-4 rounded-full bg-surface-primary/95 px-3 py-1 font-sans text-[0.9375rem] font-semibold tabular-nums text-brand-primary"
        />
      </a>

      <h3 className="ed-product mt-6 text-center">
        <a
          href={productPath(product)}
          className="underline decoration-transparent decoration-1 underline-offset-4 transition-colors duration-[250ms] hover:decoration-brand-primary"
        >
          {product.name}
        </a>
      </h3>
      {product.shortDescription && (
        <p className="scene-body mx-auto mt-3 line-clamp-3 max-w-xs text-center font-sans text-base leading-relaxed">
          {product.shortDescription}
        </p>
      )}
      <div className="mt-5 flex justify-center">
        <Button
          variant="secondary"
          size="sm"
          disabled={!canBuy}
          onClick={() => addToCart(product, true)}
          aria-label={`Add ${product.name} to bag`}
        >
          Add to bag
        </Button>
      </div>
    </article>
  );
}

/** The three pieces side by side. The `collection` anchor is the target of the hero's "Shop the collection". */
export default function ProductLineup() {
  return (
    <section id="collection" aria-labelledby="collection-heading" className="scene scene-mat py-16 md:py-24">
      <div className="page-container-wide">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="collection-heading" className="ed-h1">
            {LINEUP.heading}
          </h2>
          <p className="scene-body mt-4 font-sans text-lg leading-relaxed">{LINEUP.description}</p>
        </div>

        <div className="mt-14 grid gap-14 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
          {PRODUCTS.map((product, index) => (
            <Tile key={product.id} product={product} offset={index === 1} />
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <a href="/shop" className={buttonClasses('primary', 'lg', 'w-full max-w-xl')}>
            Shop all
          </a>
        </div>
      </div>
    </section>
  );
}
