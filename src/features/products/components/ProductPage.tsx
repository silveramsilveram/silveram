import { useEffect, useState } from 'react';
import Button, { buttonClasses } from '@/shared/ui/Button';
import { MinusIcon, PlusIcon } from '@/shared/ui/icons';
import ProductCard from './ProductCard';
import { MAX_ITEM_QUANTITY, useCart } from '@/features/cart/context/CartContext';
import { WhatsAppButton, buildProductMessage } from '@/features/whatsapp';
import { SITE } from '@/shared/config/site';
import { setPageMeta, setStructuredData } from '@/shared/lib/seo';
import type { PolicyId } from '@/features/policies/data/policies';
import { PRODUCTS, getProductBySlug, productPath, type Product } from '../data/products';
import ProductGallery from './ProductGallery';
import PriceLabel from './PriceLabel';

interface ProductPageProps {
  slug: string;
  onOpenPolicy: (id: PolicyId) => void;
}

function specRows(product: Product): Array<[string, string]> {
  const rows: Array<[string, string | undefined]> = [
    ['Material', product.material],
    ['Silver purity', product.purity],
    ['Weight', product.weight],
    ['Dimensions', product.dimensions],
    ['Available sizes', product.sizes?.length ? product.sizes.join(', ') : undefined],
  ];
  return rows.filter((row): row is [string, string] => Boolean(row[1]));
}

/** Product schema is emitted only for real (non-placeholder) products with a price. */
function productJsonLd(product: Product) {
  if (product.isPlaceholder || product.price === null) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    ...(product.description && { description: product.description }),
    ...(product.images.length > 0 && {
      image: product.images.map((image) => new URL(image.src, SITE.url).toString()),
    }),
    ...(product.material && { material: product.material }),
    brand: { '@type': 'Brand', name: SITE.name },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'INR',
      url: `${SITE.url}/${productPath(product)}`,
    },
  };
}

export default function ProductPage({ slug, onOpenPolicy }: ProductPageProps) {
  const product = getProductBySlug(slug);
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    if (!product) {
      setPageMeta({ title: `Piece not found | ${SITE.name}`, description: 'This piece could not be found.' });
      return;
    }
    setPageMeta({
      title: `${product.name} | ${SITE.name}`,
      description:
        product.shortDescription ??
        product.description?.slice(0, 155) ??
        `${product.name} from the ${SITE.name} silver collection.`,
      path: productPath(product),
      image: product.images[0]?.src,
    });
    setStructuredData(productJsonLd(product));
    return () => setStructuredData(null);
  }, [product]);

  if (!product) {
    return (
      <main id="main-content" tabIndex={-1} className="page-container section-pad focus:outline-none">
        <h1 className="type-h1">We couldn’t find that piece.</h1>
        <a href="#collection" className={buttonClasses('primary', 'lg', 'mt-8')}>
          View the collection
        </a>
      </main>
    );
  }

  const specs = specRows(product);
  const others = PRODUCTS.filter((item) => item.id !== product.id);
  const canBuy = product.price !== null && !product.isPlaceholder;

  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      <div className="page-container pb-16 pt-6 md:pb-24 md:pt-10">
        <nav aria-label="Breadcrumb" className="type-caption mb-6 text-text-secondary">
          <ol className="flex flex-wrap items-center gap-x-2">
            <li><a href="#home" className="inline-flex min-h-11 items-center hover:text-text-primary hover:underline">Home</a></li>
            <li aria-hidden="true">/</li>
            <li><a href="#collection" className="inline-flex min-h-11 items-center hover:text-text-primary hover:underline">Collection</a></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-medium text-text-primary">{product.name}</li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <ProductGallery product={product} />

          <div className="lg:pt-4">
            <div className="inline-flex items-center gap-2 rounded-[2px] border border-border bg-surface-primary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-silver" aria-hidden="true" />
              <span>{product.categoryLabel}</span>
            </div>
            <h1 className="type-h1 mt-3">{product.name}</h1>
            <PriceLabel price={product.price} className="type-h3 mt-4 block" />

            {product.shortDescription && (
              <p className="type-body-lg mt-5 text-text-secondary">{product.shortDescription}</p>
            )}
            {product.description && <p className="type-body mt-4 text-text-secondary">{product.description}</p>}
            {product.isPlaceholder && (
              <p className="type-body mt-5 border-l-2 border-accent-silver pl-4 text-text-secondary">
                Full details, photography and pricing for this piece are coming soon. Message us on WhatsApp
                and we will share what you would like to know.
              </p>
            )}

            <div className="mt-8 flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <span id="qty-label" className="type-caption uppercase tracking-[0.12em] text-text-muted">Quantity</span>
                <div role="group" aria-labelledby="qty-label" className="flex items-center rounded-[2px] border border-border-strong">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="flex h-11 w-11 items-center justify-center text-text-secondary hover:bg-surface-secondary disabled:opacity-40"
                    aria-label="Decrease quantity"
                  >
                    <MinusIcon size={14} />
                  </button>
                  <output className="w-10 text-center text-sm font-medium tabular-nums" aria-live="polite">{quantity}</output>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(MAX_ITEM_QUANTITY, q + 1))}
                    disabled={quantity >= MAX_ITEM_QUANTITY}
                    className="flex h-11 w-11 items-center justify-center text-text-secondary hover:bg-surface-secondary disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    <PlusIcon size={14} />
                  </button>
                </div>
              </div>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                disabled={!canBuy}
                onClick={() => addToCart(product, false, quantity)}
              >
                Add to Cart
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                disabled={!canBuy}
                onClick={() => addToCart(product, true, quantity)}
              >
                Buy Now
              </Button>
              <WhatsAppButton message={buildProductMessage(product)} variant="secondary" size="lg" className="w-full">
                Enquire on WhatsApp
              </WhatsAppButton>
              {!canBuy && (
                <p className="type-caption text-text-muted">
                  Adding to the bag is available once a price is set. Please enquire on WhatsApp.
                </p>
              )}
              <p className="type-caption text-text-muted">
                An enquiry is not an order. Your order is confirmed only when Silveram confirms it with you.
              </p>
            </div>

            {specs.length > 0 && (
              <dl className="mt-10 divide-y divide-border border-y border-border">
                {specs.map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[9rem_1fr] gap-4 py-3">
                    <dt className="type-caption uppercase tracking-[0.12em] text-text-muted">{label}</dt>
                    <dd className="type-body">{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-8 divide-y divide-border border-y border-border">
              {product.care && product.care.length > 0 && (
                <details className="group py-4">
                  <summary className="type-body cursor-pointer list-none font-medium">Care instructions</summary>
                  <ul className="type-body mt-3 list-disc space-y-1 pl-5 text-text-secondary">
                    {product.care.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </details>
              )}
              <details className="group py-4">
                <summary className="type-body cursor-pointer list-none font-medium">Delivery</summary>
                <p className="type-body mt-3 text-text-secondary">
                  {product.deliveryInfo ??
                    'We confirm delivery timelines and charges for your location on WhatsApp before you order.'}{' '}
                  <button type="button" className="underline underline-offset-4" onClick={() => onOpenPolicy('shipping')}>
                    Shipping policy
                  </button>
                </p>
              </details>
              <details className="group py-4">
                <summary className="type-body cursor-pointer list-none font-medium">Returns &amp; exchanges</summary>
                <p className="type-body mt-3 text-text-secondary">
                  {product.returnInfo ?? 'Please confirm return and exchange terms with us before ordering.'}{' '}
                  <button type="button" className="underline underline-offset-4" onClick={() => onOpenPolicy('returns')}>
                    Return policy
                  </button>
                </p>
              </details>
            </div>
          </div>
        </div>

        <section aria-labelledby="more-heading" className="mt-20 border-t border-border pt-10">
          <h2 id="more-heading" className="type-h3">
            Related products
          </h2>
          <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-8">
            {others.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
