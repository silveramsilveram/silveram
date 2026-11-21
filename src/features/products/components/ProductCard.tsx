import Button from '@/shared/ui/Button';
import { useCart } from '@/features/cart/store/cartStore';
import ProductMedia from './ProductMedia';
import { productPath, type Product } from '../data/products';
import PriceLabel from './PriceLabel';

/**
 * Shop and related-pieces card: the photograph (a link), the name, the price and one action.
 * Square photographs (the Silver Frame is 508px) sit at native size on a white mat inside the same 4:5 tile as the
 * wider photographs, so no photograph is ever enlarged.
 */
export default function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const image = product.images[0];
  const square = Boolean(image) && image.width === image.height;
  const canAddToBag = product.price !== null && !product.isPlaceholder;

  return (
    <article className="group flex h-full flex-col">
      <a href={productPath(product)} className="block" aria-label={`${product.name}, view piece`}>
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
      </a>

      <div className="mt-5 flex items-start justify-between gap-4">
        <h3 className="ed-product">
          <a
            href={productPath(product)}
            className="underline decoration-transparent decoration-1 underline-offset-4 transition-colors duration-[250ms] hover:decoration-brand-primary"
          >
            {product.name}
          </a>
        </h3>
        <PriceLabel price={product.price} className="shrink-0 pt-1 font-sans text-lg font-semibold tabular-nums" />
      </div>
      {product.shortDescription && (
        <p className="scene-body mt-2 line-clamp-2 font-sans text-base leading-relaxed">{product.shortDescription}</p>
      )}
      <div className="mt-auto pt-5">
        <Button
          variant="secondary"
          size="md"
          disabled={!canAddToBag}
          onClick={() => addToCart(product, true)}
          aria-label={`Add ${product.name} to bag`}
        >
          Add to bag
        </Button>
      </div>
    </article>
  );
}
