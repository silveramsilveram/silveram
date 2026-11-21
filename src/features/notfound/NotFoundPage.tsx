import { useEffect } from 'react';
import ProductCard from '@/features/products/components/ProductCard';
import { PRODUCTS } from '@/features/products/data/products';
import { applyPageSeo } from '@/shared/lib/seo';
import { privateSeo } from '@/shared/seo/pages';
import { buttonClasses } from '@/shared/ui/Button';

/** Unknown URL. The server still answers with the app shell, so the page itself says "noindex". */
export default function NotFoundPage() {
  useEffect(() => {
    applyPageSeo(privateSeo('Page not found', 'This page could not be found.'));
    window.scrollTo(0, 0);
  }, []);

  return (
    <main id="main-content" tabIndex={-1} className="scene scene-canvas focus:outline-none">
      <div className="page-container-wide pb-24 pt-12 md:pt-16">
        <h1 className="ed-display max-w-[14ch]">We couldn’t find that page.</h1>
        <p className="scene-body mt-5 max-w-md font-sans text-lg leading-relaxed">
          The link may be old, or the address may have a typo.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="/" className={buttonClasses('primary', 'lg')}>Go to the home page</a>
          <a href="/shop" className={buttonClasses('secondary', 'lg')}>Shop the collection</a>
        </div>
        <div className="rule-dashed mt-14 grid gap-x-8 gap-y-12 pt-10 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.slice(0, 3).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </main>
  );
}
