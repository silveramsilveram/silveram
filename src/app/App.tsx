/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect, useRef } from 'react';

import { restoreSession } from '@/features/auth/store/authStore';
import { useSignedInCartSync } from '@/features/cart/lib/syncCart';
import { CheckoutProvider } from '@/features/checkout/context/CheckoutContext';
import { preloadCashfree } from '@/features/checkout/lib/cashfree';
import AnnouncementBar from '@/features/storefront/components/AnnouncementBar';
import CollectionSection from '@/features/storefront/components/CollectionSection';
import CraftsmanshipSection from '@/features/storefront/components/CraftsmanshipSection';
import FaqSection from '@/features/storefront/components/FaqSection';
import FooterSection from '@/features/storefront/components/FooterSection';
import GiftingSection from '@/features/storefront/components/GiftingSection';
import Header from '@/features/storefront/components/Header';
import HeroSection from '@/features/storefront/components/HeroSection';
import StorySection from '@/features/storefront/components/StorySection';
import TrustSection from '@/features/storefront/components/TrustSection';
import { FloatingWhatsApp } from '@/features/whatsapp';
import { useHashRoute } from '@/shared/hooks/useHashRoute';
import { useReveal } from '@/shared/hooks/useReveal';
import { SITE } from '@/shared/config/site';
import { setPageMeta, setStructuredData } from '@/shared/lib/seo';
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

const HOME_META = {
  title: `${SITE.name} | Silver jewellery & gifting`,
  description:
    'Silveram: devotional silver-finish frames, patterned silver kada and a peacock statement ring, chosen for gifting and celebration. Cash on delivery across India; UPI and card payments coming soon.',
};

function HomePage() {
  const rootRef = useRef<HTMLElement>(null);
  useReveal(rootRef);

  useEffect(() => {
    setPageMeta(HOME_META);
    setStructuredData({
      '@context': 'https://schema.org',
      '@type': 'JewelryStore',
      name: SITE.legalName,
      url: SITE.url,
      telephone: '+917766911777',
      sameAs: [SITE.instagramUrl],
      address: {
        '@type': 'PostalAddress',
        streetAddress: SITE.address.lines.join(', '),
        addressLocality: SITE.address.locality,
        addressRegion: SITE.address.region,
        postalCode: SITE.address.postalCode,
        addressCountry: SITE.address.country,
      },
      hasMap: SITE.directionsUrl,
    });
    // Arriving from a product page via "#collection" etc.: the browser tried to
    // scroll before this page existed, so scroll to the section now.
    const id = window.location.hash.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, []);

  return (
    <main id="main-content" tabIndex={-1} ref={rootRef} className="focus:outline-none">
      <HeroSection />
      <CollectionSection />
      <StorySection />
      <CraftsmanshipSection />
      <GiftingSection />
      <TrustSection />
      <FaqSection />
    </main>
  );
}

function Storefront() {
  const route = useHashRoute();
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

      <AnnouncementBar />
      <Header />

      {route.name === 'home' && <HomePage />}
      {route.name !== 'home' && (
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
        </Suspense>
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
