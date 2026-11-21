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
    <main id="main-content" tabIndex={-1} className="scene scene-canvas focus:outline-none">
      <div className="page-container-wide grid gap-10 pb-20 pt-10 md:pb-28 md:pt-16 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <h1 className="ed-display">Track your order</h1>
          <p className="scene-body mt-5 max-w-md font-sans text-lg leading-relaxed">
            Enter the order reference from your confirmation email and the email address you used at checkout.
            If you have an account, <a href="/signin" className="underline underline-offset-4">sign in</a> to see all your orders.
          </p>
        </div>
        <div className="frame-dashed max-w-xl p-6 md:p-9 lg:col-span-6 lg:col-start-7">
          <OrderLookupForm />
        </div>
      </div>
    </main>
  );
}
