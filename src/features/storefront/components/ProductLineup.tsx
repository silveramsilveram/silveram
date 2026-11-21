import { useCart } from '@/features/cart/store/cartStore';
import ProductMedia from '@/features/products/components/ProductMedia';
import PriceLabel from '@/features/products/components/PriceLabel';
import { PRODUCTS, productPath, type Product } from '@/features/products/data/products';
import { formatINR } from '@/shared/lib/money';
import Button, { buttonClasses } from '@/shared/ui/Button';
import { LINEUP } from '../data/content';

const canBuy = (product: Product) => product.price !== null && !product.isPlaceholder;
const priceText = (product: Product) => (product.price === null ? 'Price on request' : formatINR(product.price));

/** The first piece, shown large at its native photograph size on a white mat. */
function LeadPiece({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const image = product.images[0];

  return (
    <article className="group">
      <a href={productPath(product)} aria-label={`${product.name}, ${priceText(product)}`} className="block">
        <div className="media-frame grid place-items-center bg-surface-white p-6 md:p-10">
          <div className="media-zoom w-full" style={{ maxWidth: image?.width }}>
            <ProductMedia product={product} allowFilm={false} radius="none" sizes="(min-width: 1024px) 508px, 90vw" />
          </div>
        </div>
      </a>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h3 className="ed-h3">
            <a href={productPath(product)}>{product.name}</a>
          </h3>
          <PriceLabel price={product.price} className="mt-2 block font-sans text-lg font-semibold tabular-nums" />
        </div>
        <Button variant="primary" size="md" disabled={!canBuy(product)} onClick={() => addToCart(product, true)} aria-label={`Add ${product.name} to bag`}>
          Add to bag
        </Button>
      </div>
      {product.shortDescription && (
        <p className="scene-body mt-4 max-w-md font-sans text-base leading-relaxed">{product.shortDescription}</p>
      )}
    </article>
  );
}

/** One quiet row of the list: thumbnail, name, price, and the two things you can do with it. */
function Row({ product }: { product: Product }) {
  const { addToCart } = useCart();

  return (
    <li className="group grid grid-cols-[5.5rem_1fr] items-center gap-x-5 gap-y-2 py-5 sm:grid-cols-[7rem_1fr_auto]">
      <a href={productPath(product)} tabIndex={-1} aria-hidden="true" className="block">
        <div className="media-zoom">
          <ProductMedia product={product} allowFilm={false} ratio="1 / 1" focal={{ x: 50, y: 50 }} sizes="112px" />
        </div>
      </a>
      <div className="min-w-0">
        <h3 className="ed-product">
          <a href={productPath(product)} className="underline decoration-transparent underline-offset-4 transition-colors duration-[250ms] hover:decoration-brand-primary">
            {product.name}
          </a>
        </h3>
        <p className="mt-1 font-sans text-base font-semibold tabular-nums">{priceText(product)}</p>
      </div>
      <div className="col-span-2 sm:col-span-1">
        <Button variant="secondary" size="sm" disabled={!canBuy(product)} onClick={() => addToCart(product, true)} aria-label={`Add ${product.name} to bag`}>
          Add to bag
        </Button>
      </div>
    </li>
  );
}

/** The collection: one lead piece and the rest as a list. `#collection` stays an anchor for old links. */
export default function ProductLineup() {
  const [lead, ...rest] = PRODUCTS;

  return (
    <section id="collection" aria-labelledby="collection-heading" className="scene scene-mat py-16 md:py-24">
      <div className="page-container-wide grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6">
          <h2 id="collection-heading" className="ed-h1">
            {LINEUP.heading}
          </h2>
          <p className="scene-body mt-4 max-w-md font-sans text-lg leading-relaxed">{LINEUP.description}</p>
          <div className="mt-10">{lead && <LeadPiece product={lead} />}</div>
        </div>

        <div className="lg:col-span-6 lg:pt-4">
          <ul className="divide-y divide-dashed divide-[var(--scene-line)] border-y border-dashed border-[var(--scene-line)]">
            {rest.map((product) => (
              <Row key={product.id} product={product} />
            ))}
          </ul>
          <a href="/shop" className={buttonClasses('secondary', 'lg', 'mt-8')}>
            Shop all
          </a>
        </div>
      </div>
    </section>
  );
}
