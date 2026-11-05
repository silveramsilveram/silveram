/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import AccountPage from '@/features/auth/components/AccountPage';
import AuthDialog from '@/features/auth/components/AuthDialog';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import CartPage from '@/features/cart/components/CartPage';
import { CartProvider, useCart } from '@/features/cart/context/CartContext';
import { useSignedInCartSync } from '@/features/cart/lib/syncCart';
import OrderPage from '@/features/orders/components/OrderPage';
import CartDrawer from '@/features/cart/components/CartDrawer';
import PolicyModal from '@/features/policies/components/PolicyModal';
import type { PolicyId } from '@/features/policies/data/policies';
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

const CheckoutPage = lazy(() => import('@/features/checkout/components/CheckoutPage'));

const HOME_META = {
  title: `${SITE.name} | Silver jewellery & gifting`,
  description:
    'Silveram: devotional silver-finish frames, patterned silver kada and a peacock statement ring, chosen for gifting and celebration. Order through WhatsApp.',
};

function HomePage() {
  const rootRef = useRef<HTMLElement>(null);
  useReveal(rootRef);

  useEffect(() => {
    setPageMeta(HOME_META);
    setStructuredData(null);
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
  const [policyId, setPolicyId] = useState<PolicyId | null>(null);
  const { setIsCartOpen } = useCart();
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

      {route.name === 'product' && <ProductPage key={route.slug} slug={route.slug} onOpenPolicy={setPolicyId} />}
      {route.name === 'home' && <HomePage />}
      {route.name === 'cart' && <CartPage />}
      {route.name === 'account' && <AccountPage />}
      {route.name === 'order' && <OrderPage key={route.id} orderId={route.id} />}
      {route.name === 'checkout' && (
        <Suspense
          fallback={
            <p className="page-container py-16 text-sm text-text-secondary" role="status">
              Loading checkout…
            </p>
          }
        >
          <CheckoutPage />
        </Suspense>
      )}

      <FooterSection onOpenPolicy={setPolicyId} />

      <CartDrawer
        onCheckout={() => {
          setIsCartOpen(false);
          window.location.hash = '#/checkout';
        }}
      />

      <AuthDialog />
      <PolicyModal policyId={policyId} onClose={() => setPolicyId(null)} />
      <FloatingWhatsApp />
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Storefront />
      </CartProvider>
    </AuthProvider>
  );
}
