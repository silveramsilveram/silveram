/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect, useRef } from 'react';

import AccountPage from '@/features/auth/components/AccountPage';
import AuthPage from '@/features/auth/components/AuthPage';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import CartPage from '@/features/cart/components/CartPage';
import { CartProvider } from '@/features/cart/context/CartContext';
import { useSignedInCartSync } from '@/features/cart/lib/syncCart';
import OrderPage from '@/features/orders/components/OrderPage';
import { CheckoutProvider } from '@/features/checkout/context/CheckoutContext';
import TrackOrderPage from '@/features/orders/components/TrackOrderPage';
import PolicyPage from '@/features/policies/components/PolicyPage';
import ShopPage from '@/features/shop/ShopPage';
import ProductPage from '@/features/products/components/ProductPage';
import AnnouncementBar from '@/features/storefront/components/AnnouncementBar';
import CategoriesSection from '@/features/storefront/components/CategoriesSection';
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

const CheckoutDetailsPage = lazy(() => import('@/features/checkout/components/CheckoutDetailsPage'));
const CheckoutPaymentPage = lazy(() => import('@/features/checkout/components/CheckoutPaymentPage'));

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
      name: SITE.name,
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
      <CategoriesSection />
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
      {route.name === 'shop' && <ShopPage />}
      {route.name === 'product' && <ProductPage key={route.slug} slug={route.slug} />}
      {route.name === 'cart' && <CartPage />}
      {route.name === 'signin' && <AuthPage mode="signin" />}
      {route.name === 'signup' && <AuthPage mode="signup" />}
      {route.name === 'account' && <AccountPage />}
      {route.name === 'track' && <TrackOrderPage />}
      {route.name === 'policy' && <PolicyPage key={route.id} id={route.id} />}
      {route.name === 'order' && <OrderPage key={route.id} orderId={route.id} />}
      {(route.name === 'checkout' || route.name === 'payment') && (
        <Suspense
          fallback={
            <p className="page-container py-16 text-sm text-text-secondary" role="status">
              Loading checkout…
            </p>
          }
        >
          {route.name === 'checkout' ? <CheckoutDetailsPage /> : <CheckoutPaymentPage />}
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
    <AuthProvider>
      <CartProvider>
        <CheckoutProvider>
          <Storefront />
        </CheckoutProvider>
      </CartProvider>
    </AuthProvider>
  );
}
