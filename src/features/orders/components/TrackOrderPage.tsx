import { useEffect } from 'react';
import { setPageMeta } from '@/shared/lib/seo';
import OrderLookupForm from './OrderLookupForm';

/** Track an order placed as a guest, using the order reference and the email used at checkout. */
export default function TrackOrderPage() {
  useEffect(() => {
    setPageMeta({ title: 'Track your order | Silveram', description: 'Find your Silveram order.', noindex: true });
    window.scrollTo(0, 0);
  }, []);

  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      <div className="page-container pb-20 pt-10 md:pb-28 md:pt-16">
        <div className="mx-auto max-w-md">
          <h1 className="type-h1">Track your order</h1>
          <p className="type-body mb-8 mt-3 text-text-secondary">
            Enter the order reference from your confirmation email and the email address you used at checkout.
            If you have an account, <a href="/signin" className="underline underline-offset-4">sign in</a> to see all your orders.
          </p>
          <OrderLookupForm />
        </div>
      </div>
    </main>
  );
}
