import { useEffect } from 'react';
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
    <main id="main-content" tabIndex={-1} className="page-container pb-24 pt-12 focus:outline-none">
      <h1 className="type-h1">We couldn’t find that page.</h1>
      <p className="type-body-lg mt-4 text-text-secondary">The link may be old, or the address may have a typo.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href="/" className={buttonClasses('primary', 'lg')}>Go to the home page</a>
        <a href="/shop" className={buttonClasses('secondary', 'lg')}>Shop the collection</a>
      </div>
    </main>
  );
}
