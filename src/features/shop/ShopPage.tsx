import { useEffect } from 'react';
import ProductCard from '@/features/products/components/ProductCard';
import { PRODUCTS } from '@/features/products/data/products';
import { applyPageSeo } from '@/shared/lib/seo';
import { shopSeo } from '@/shared/seo/pages';

/** All products on one page. */
export default function ShopPage() {
  useEffect(() => {
    applyPageSeo(shopSeo());
    window.scrollTo(0, 0);
  }, []);

  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      <div className="page-container pb-20 pt-10 md:pb-28 md:pt-16">
        <nav aria-label="Breadcrumb" className="type-caption mb-4 text-text-secondary">
          <a href="/" className="underline underline-offset-4 hover:text-text-primary">Home</a> / <span className="text-text-primary">Shop</span>
        </nav>
        <h1 className="type-h1">Shop all</h1>
        <p className="type-body-lg mt-3 max-w-2xl text-text-secondary">
          {PRODUCTS.length} pieces, each chosen for gifting, festivals and everyday celebration.
        </p>
        <div className="mt-10 grid gap-12 md:gap-14 lg:grid-cols-3 lg:gap-8">
          {PRODUCTS.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </main>
  );
}
