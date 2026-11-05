# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Direct-to-consumer (D2C) Indian buyers, particularly Gen-Z and millennial shoppers, looking for authentic 925 sterling silver everyday pieces, style statements, and festive gifting. They shop on mobile and desktop, valuing visual polish, transparency in metal purity, quick WhatsApp interaction, and straightforward ordering.

## Product Purpose

Silveram is an e-commerce storefront showcasing curated 925 sterling silver jewellery. It bridges digital visual storytelling with trusted Indian purchasing habits: high-fidelity product galleries, clear purity and pricing transparency, and low-friction purchasing via WhatsApp communication or self-serve checkout.

## Positioning

Trendy, youth-centric silver jewellery combining playful, vibrant energy and modern kinetic motion with hallmarked 925 authenticity. Unlike traditional, heavy Indian jewellery houses or sterile generic e-commerce templates, Silveram delivers energetic, design-forward shopping tailored for young style-conscious collectors.

## Operating Context

- Primary sales interaction: Hybrid channel — browsing online catalogue with direct WhatsApp ordering (`VITE_WHATSAPP_NUMBER`) and self-serve checkout options.
- Market & Currency: Indian domestic market (INR ₹ pricing, Cash on Delivery, mobile-first responsive web).
- Backend & Storage: Node/Express API with Appwrite for authentication and application data, Cloudinary for optimized image/video delivery.

## Capabilities and Constraints

- Capabilities:
  - Product catalogue display with purity, weight, dimensions, and high-resolution galleries.
  - Cart drawer state management with item counts and price calculations.
  - Verification & Checkout: Email OTP authentication, delivery details entry, COD selection, and Razorpay payment support.
  - WhatsApp order message builder with prefilled item details and SKU references.
  - Admin image uploads directly to Cloudinary via signed upload tokens.
- Constraints:
  - Responsive web targeting mobile (primary viewport for Indian social/WhatsApp traffic) and desktop.
  - Fast load performance with optimized media delivery.

## Brand Commitments

- Name: Silveram
- Voice & Personality: Trendy, youth-centric, vibrant, confident, and playful with dynamic motion (GSAP), avoiding stuffy corporate or purely traditional heritage clichés while honoring silver authenticity.
- Visual Language: Clean typography with expressive accents (League Spartan), high contrast, deliberate kinetic transitions, and high-polish metallic reflections.

## Evidence on Hand

- Core code: React 19, TypeScript, Tailwind CSS v4, GSAP, Vite 8.
- Catalogue structure: `src/features/products/data/products.ts` with defined product interfaces.
- Copy & Sections: `src/features/storefront/data/content.ts` (Hero, Collection, Story, Gifting, Trust items, Policies).
- Media system: Cloudinary signed uploads and transformations implemented in `server/src/storage/cloudinary/`.

## Product Principles

1. **Energy with Authenticity**: Infuse youthful vibrancy and playful micro-interactions without ever compromising the seriousness of 925 metal purity and verified product truth.
2. **Effortless Conversion**: Seamlessly support both quick WhatsApp conversational ordering and instant self-serve checkout.
3. **Mobile-First Sensory Richness**: Prioritize rapid loading and fluid tactile gestures on mobile screens, where Indian e-commerce shoppers spend most of their time.
4. **Transparent Simplicity**: Never conceal pricing, weight, or metal composition; eliminate unnecessary friction and ambiguity.

## Accessibility & Inclusion

- Adherence to WCAG AA contrast standards across light and dynamic surfaces.
- Fully keyboard-accessible navigation, modals, and cart drawers with accessible focus management.
- Semantic HTML tags for screen readers across all product listings, forms, and announcements.
