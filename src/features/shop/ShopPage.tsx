import { useEffect } from 'react';
import ProductCard from '@/features/products/components/ProductCard';
import { PRODUCTS } from '@/features/products/data/products';
import { applyPageSeo } from '@/shared/lib/seo';
import { shopSeo } from '@/shared/seo/pages';

/** All products on one page: a short statement, then the pieces. Six across two rows after the lead piece would orphan, so the grid is three wide. */
export default function ShopPage() {
  useEffect(() => {
    applyPageSeo(shopSeo());
    window.scrollTo(0, 0);
  }, []);

  return (
    <main id="main-content" tabIndex={-1} className="scene scene-canvas focus:outline-none">
      <div className="page-container-wide pb-20 pt-10 md:pb-28 md:pt-14">
        <nav aria-label="Breadcrumb" className="font-sans text-sm text-text-secondary">
          <a href="/" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-text-primary">Home</a>
          <span aria-hidden="true"> / </span>
          <span aria-current="page" className="text-text-primary">Shop</span>
        </nav>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <h1 className="ed-display">Shop all</h1>
          <p className="scene-body max-w-sm pb-2 font-sans text-lg leading-relaxed">
            {PRODUCTS.length} pieces for gifting, festivals and everyday celebration. Cash on delivery across India.
          </p>
        </div>
        <div className="rule-dashed mt-10 grid gap-x-8 gap-y-14 pt-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-10">
          {PRODUCTS.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </main>
  );
}
