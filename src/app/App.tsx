/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect } from 'react';

import { restoreSession } from '@/features/auth/store/authStore';
import { useSignedInCartSync } from '@/features/cart/lib/syncCart';
import { CheckoutProvider } from '@/features/checkout/context/CheckoutContext';
import { preloadCashfree } from '@/features/checkout/lib/cashfree';
import AnnouncementBar from '@/features/storefront/components/AnnouncementBar';
import CollectionRail from '@/features/storefront/components/CollectionRail';
import EditorialPromise from '@/features/storefront/components/EditorialPromise';
import FaqSection from '@/features/storefront/components/FaqSection';
import FeaturedCampaign from '@/features/storefront/components/FeaturedCampaign';
import FooterSection from '@/features/storefront/components/FooterSection';
import GiftingSection from '@/features/storefront/components/GiftingSection';
import Header from '@/features/storefront/components/Header';
import HeroSection from '@/features/storefront/components/HeroSection';
import LookCloselySection from '@/features/storefront/components/LookCloselySection';
import OccasionsSection from '@/features/storefront/components/OccasionsSection';
import ProductLineup from '@/features/storefront/components/ProductLineup';
import PromisesSection from '@/features/storefront/components/PromisesSection';
import VisitSection from '@/features/storefront/components/VisitSection';
import { FloatingWhatsApp } from '@/features/whatsapp';
import { useLinkInterception, useRoute } from '@/shared/routing/router';
import { applyPageSeo } from '@/shared/lib/seo';
import { homeSeo } from '@/shared/seo/pages';
import Toast from '@/shared/ui/Toast';

/**
 * Route code is split into chunks: the home page ships only what it needs, and every other page is
 * downloaded the first time it is visited. The loaders are kept in one object so the same
 * `import()` can be reused to prefetch a page before the customer clicks it.
 */
const loaders = {
  shop: () => import('@/features/shop/ShopPage'),
  product: () => import('@/features/products/components/ProductPage'),
  cart: () => import('@/features/cart/components/CartPage'),
  auth: () => import('@/features/auth/components/AuthPage'),
  account: () => import('@/features/auth/components/AccountPage'),
  track: () => import('@/features/orders/components/TrackOrderPage'),
  order: () => import('@/features/orders/components/OrderPage'),
  policy: () => import('@/features/policies/components/PolicyPage'),
  checkout: () => import('@/features/checkout/components/CheckoutDetailsPage'),
  payment: () => import('@/features/checkout/components/CheckoutPaymentPage'),
};

const ShopPage = lazy(loaders.shop);
const ProductPage = lazy(loaders.product);
const CartPage = lazy(loaders.cart);
const AuthPage = lazy(loaders.auth);
const AccountPage = lazy(loaders.account);
const TrackOrderPage = lazy(loaders.track);
const OrderPage = lazy(loaders.order);
const PolicyPage = lazy(loaders.policy);
const NotFoundPage = lazy(() => import('@/features/notfound/NotFoundPage'));
const CheckoutDetailsPage = lazy(loaders.checkout);
const CheckoutPaymentPage = lazy(loaders.payment);

/** Once the browser is idle, warm the pages a shopper is most likely to open next. */
function prefetchLikelyRoutes() {
  const run = () => {
    void loaders.product();
    void loaders.cart();
    void loaders.checkout();
    void loaders.payment();
    void loaders.auth();
  };
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
    .requestIdleCallback;
  if (idle) idle(run, { timeout: 4000 });
  else setTimeout(run, 2000);
}

function HomePage() {
  useEffect(() => {
    applyPageSeo(homeSeo());
    // Arriving from another page via "/#collection" etc.: the browser tried to scroll before this
    // page existed, so scroll to the section now.
    const id = window.location.hash.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, []);

  return (
    <div className="relative">
      <AnnouncementBar overlay />
      <Header overlay />
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <HeroSection />
        <FeaturedCampaign />
        <EditorialPromise />
        <ProductLineup />
        <PromisesSection />
        <LookCloselySection />
        <OccasionsSection />
        <GiftingSection />
        <CollectionRail />
        <VisitSection />
        <FaqSection />
      </main>
    </div>
  );
}

function Storefront() {
  const route = useRoute();
  useLinkInterception();
  useSignedInCartSync();

  useEffect(() => {
    void restoreSession();
    prefetchLikelyRoutes();
  }, []);

  // The Cashfree SDK is ~100 kB from another origin: fetch it while the customer reads the
  // payment page so the popup opens instantly on "Pay".
  useEffect(() => {
    if (route.name === 'payment' || route.name === 'checkout') preloadCashfree();
  }, [route.name]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[2px] focus:bg-brand-primary focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-surface-primary"
      >
        Skip to main content
      </a>

      {route.name === 'home' ? (
        <HomePage />
      ) : (
        <>
          <AnnouncementBar />
          <Header />
          <Suspense
            fallback={
              <p className="page-container py-16 text-sm text-text-secondary" role="status">
                Loading…
              </p>
            }
          >
            {route.name === 'shop' && <ShopPage />}
            {route.name === 'product' && <ProductPage key={route.slug} slug={route.slug} />}
            {route.name === 'cart' && <CartPage />}
            {route.name === 'signin' && <AuthPage mode="signin" />}
            {route.name === 'signup' && <AuthPage mode="signup" />}
            {route.name === 'account' && <AccountPage />}
            {route.name === 'track' && <TrackOrderPage />}
            {route.name === 'policy' && <PolicyPage key={route.id} id={route.id} />}
            {route.name === 'order' && <OrderPage key={route.id} orderId={route.id} />}
            {route.name === 'checkout' && <CheckoutDetailsPage />}
            {route.name === 'payment' && <CheckoutPaymentPage />}
            {route.name === 'notfound' && <NotFoundPage />}
          </Suspense>
        </>
      )}

      <FooterSection />

      {/* Focused checkout: no floating chat button over the bag / checkout actions. */}
      {!['cart', 'checkout', 'payment'].includes(route.name) && <FloatingWhatsApp />}
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <CheckoutProvider>
      <Storefront />
    </CheckoutProvider>
  );
}
