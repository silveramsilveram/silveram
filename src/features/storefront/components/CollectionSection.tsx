import { useCart } from '@/features/cart/context/CartContext';
import PriceLabel from '@/features/products/components/PriceLabel';
import { getProductById, productPath, type Product } from '@/features/products/data/products';
import { responsiveSrcSet } from '@/shared/lib/cloudinary';
import Button, { buttonClasses } from '@/shared/ui/Button';
import ImageSlot from '@/shared/ui/ImageSlot';
import { COLLECTION } from '../data/content';

/** Sentence-case buttons (the shared Button is still uppercase until the commerce pages are migrated). */
const SENTENCE = 'text-sm! normal-case! tracking-normal!';

type Layout = 'frame' | 'kada' | 'ring';

interface Band {
  productId: string;
  layout: Layout;
  /** Which of the product's photographs to use. The hero already uses the ring's first photograph. */
  imageIndex: number;
}

const BANDS: readonly Band[] = [
  { productId: 'product-1', layout: 'frame', imageIndex: 0 },
  { productId: 'product-2', layout: 'kada', imageIndex: 0 },
  { productId: 'product-3', layout: 'ring', imageIndex: 1 },
];

/** Responsive widths that never exceed the photograph's own pixel width, so nothing is upscaled. */
function widthsFor(native: number): number[] {
  return [...[320, 480, 720, 922].filter((width) => width < native), native];
}

function Description({ product }: { product: Product }) {
  return product.shortDescription ? (
    <p className="type-body-lg mt-5 max-w-md text-text-secondary">{product.shortDescription}</p>
  ) : null;
}

function CollectionBand({ band }: { band: Band }) {
  const { addToCart } = useCart();
  const product = getProductById(band.productId);
  const image = product?.images[band.imageIndex] ?? product?.images[0];
  if (!product) return null;

  const canBuy = product.price !== null && !product.isPlaceholder;
  const headingId = `${product.slug}-heading`;
  const { layout } = band;

  // The Silver Frame photograph is only 508 px wide, so it sits on a stone mat at that size instead of being enlarged.
  const maxPhotoWidth = layout === 'frame' ? 'max-w-[480px]' : layout === 'ring' ? 'md:max-w-[480px]' : '';
  const imageColumn =
    layout === 'frame'
      ? 'lg:col-span-7 lg:col-start-1'
      : layout === 'kada'
        ? 'lg:order-2 lg:col-span-7 lg:col-start-6'
        : 'lg:order-2 lg:col-span-5 lg:col-start-7';
  const textColumn =
    layout === 'frame'
      ? 'lg:col-span-4 lg:col-start-9'
      : layout === 'kada'
        ? 'lg:order-1 lg:col-span-4 lg:col-start-1'
        : 'lg:order-1 lg:col-span-4 lg:col-start-2 lg:self-end';

  const photo = (
    <ImageSlot
      src={image?.src}
      fallbackSrc={image?.fallbackSrc}
      srcSet={image ? responsiveSrcSet(image.src, widthsFor(image.width)) : undefined}
      alt={image?.alt ?? `${product.name}, photograph coming soon`}
      width={image?.width ?? 1}
      height={image?.height ?? 1}
      ratio={layout === 'frame' ? '1 / 1' : '6 / 5'}
      sizes={
        layout === 'frame'
          ? '(min-width: 640px) 480px, calc(100vw - 5rem)'
          : layout === 'ring'
            ? '(min-width: 1024px) 480px, calc(100vw - 2.5rem)'
            : '(min-width: 1024px) 680px, calc(100vw - 2.5rem)'
      }
      imgClassName="transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.02]"
      className={`w-full ${maxPhotoWidth} ${layout === 'frame' ? 'mx-auto' : ''}`}
    />
  );

  return (
    <article
      aria-labelledby={headingId}
      className={layout === 'kada' ? 'bg-surface-secondary' : 'bg-surface-primary'}
    >
      <div
        className={`page-container grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-x-10 ${
          layout === 'ring' ? 'py-16 md:py-24 lg:py-36' : 'py-12 md:py-16 lg:py-20'
        }`}
      >
        <a
          href={productPath(product)}
          tabIndex={-1}
          className={`group block ${imageColumn} ${layout === 'frame' ? 'bg-surface-secondary p-5 sm:p-10' : ''}`}
        >
          {photo}
        </a>

        <div className={textColumn}>
          <h3 id={headingId} className="type-h2">
            {product.name}
          </h3>
          <PriceLabel price={product.price} className="type-h3 mt-3 block" />
          <Description product={product} />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="primary"
              size="lg"
              className={SENTENCE}
              disabled={!canBuy}
              onClick={() => addToCart(product, true)}
              aria-label={`Add ${product.name} to bag`}
            >
              Add to bag
            </Button>
            <a href={productPath(product)} className={`${buttonClasses('secondary', 'lg')} ${SENTENCE}`}>
              View product
              <span className="sr-only">: {product.name}</span>
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function CollectionSection() {
  return (
    <section id="collection" aria-labelledby="collection-heading" className="bg-surface-primary">
      <div className="page-container pb-4 pt-16 md:pt-24">
        <h2 id="collection-heading" className="type-h2 max-w-xl text-balance">
          {COLLECTION.heading}
        </h2>
        <p className="type-body-lg mt-4 max-w-xl text-text-secondary">{COLLECTION.description}</p>
      </div>
      {BANDS.map((band) => (
        <CollectionBand key={band.productId} band={band} />
      ))}
    </section>
  );
}
