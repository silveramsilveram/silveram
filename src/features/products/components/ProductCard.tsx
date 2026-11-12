import Button, { buttonClasses } from '@/shared/ui/Button';
import { useCart } from '@/features/cart/store/cartStore';
import ImageSlot from '@/shared/ui/ImageSlot';
import { productPath, type Product } from '../data/products';
import PriceLabel from './PriceLabel';

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const image = product.images[0];
  const canAddToCart = product.price !== null && !product.isPlaceholder;

  return (
    <article
      className="silver-card group flex h-full flex-col rounded-[2px] border border-border bg-surface-white p-4 transition-all duration-300 md:flex-row md:gap-6 lg:flex-col lg:gap-0 lg:p-5"
      data-reveal
    >
      <a
        href={productPath(product)}
        className="jewellery-image-stage relative block overflow-hidden rounded-[2px] border border-border/80 bg-surface-primary md:w-2/5 md:shrink-0 lg:w-full"
        aria-label={`${product.name} – view details`}
      >
        <ImageSlot
          src={image?.src}
          fallbackSrc={image?.fallbackSrc}
          alt={image?.alt ?? `${product.name} – photograph coming soon`}
          width={image?.width ?? 6}
          height={image?.height ?? 5}
          ratio="6 / 5"
          sizes="(min-width: 1024px) 400px, (min-width: 768px) 40vw, 100vw"
          imgClassName="transition-transform duration-500 hover:scale-[1.03]"
          className="border border-border"
        />
        <div className="absolute top-2.5 left-2.5 rounded-[2px] bg-brand-primary/90 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-surface-primary">
          {product.categoryLabel}
        </div>
      </a>

      <div className="flex flex-1 flex-col pt-5 md:pt-0 lg:pt-5">
        <h3 className="type-h3 font-medium">
          <a
            href={productPath(product)}
            className="transition-colors hover:text-brand-primary hover:underline underline-offset-4 decoration-accent-silver"
          >
            {product.name}
          </a>
        </h3>
        <PriceLabel price={product.price} className="type-body-lg mt-1.5 block font-semibold text-brand-primary" />
        <p className="type-body mt-2.5 line-clamp-3 text-text-secondary">
          {product.shortDescription ?? (product.isPlaceholder ? 'Product details and photographs are being confirmed.' : '')}
        </p>
        <div className="mt-auto flex flex-col gap-2.5 pt-6 sm:flex-row lg:flex-col xl:flex-row">
          <a href={productPath(product)} className={buttonClasses('secondary', 'md', 'flex-1')}>
            View Product
          </a>
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            disabled={!canAddToCart}
            onClick={() => addToCart(product, true)}
            aria-label={`Add ${product.name} to cart`}
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </article>
  );
}
