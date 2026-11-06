# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Direct-to-consumer Indian buyers, mainly Gen Z and millennials, who shop on mobile and want silver gifts and everyday statement pieces for festivals, weddings, anniversaries and housewarmings. They expect clear prices in rupees, honest product details, cash on delivery, and a quick way to ask a question. Many arrive from Instagram or WhatsApp, and some are local customers of the physical shop.

## Product Purpose

Silveram is an online storefront for a small, considered collection of silver gifting and jewellery (currently three pieces: Silver Frame, Silver Kada and Peacock Ring). The store lets a customer browse real photography, add pieces to a bag and place a cash-on-delivery order as a guest or with an account, without having to message anyone.

## Positioning

An editorial, premium and youthful silver jewellery brand. Unlike heavy traditional jewellery houses or generic template stores, Silveram presents a few pieces the way a printed lookbook would: large photography, calm typography and plain, honest information. The brand has a real shop in Motihari, Bihar.

## Operating Context

- **Market**: India only. Prices in INR. Mobile-first.
- **How orders are placed**: on the website only. Customer flow is product, bag page, delivery details, payment, order confirmation. WhatsApp is **not** used to take orders.
- **Payment**: **cash on delivery is the available method and the default.** UPI and debit/credit card (Razorpay) are shown as "Coming soon" until the payment gateway is approved and enabled. Online payment must stay disabled until then.
- **Accounts**: optional. Guests check out with email, name, mobile (plus an optional alternate mobile), address, optional landmark, city, state and PIN code. Accounts use a passwordless email code.
- **Support**: WhatsApp (+91 77669 11777) and Instagram (@silveram__) are customer-support and enquiry channels. The shop address is shown on the site.
- **Platform**: React single-page storefront with hash routes, an Express API on Vercel, Appwrite for authentication and application data (orders, customers, products), Cloudinary for product images, and email through Mailjet when configured.
- **Canonical domain**: https://silveram.in

## Capabilities and Constraints

- Capabilities:
  - Product listing and detail pages with photo galleries and an image lightbox.
  - Persistent shopping bag with quantity updates, shown on its own page.
  - Guest or account checkout with cash on delivery, delivery-detail validation, order creation, confirmation page and email, order tracking by reference and email, and an account order history.
  - Admin-side order status changes and Cloudinary image uploads through the API.
- Constraints:
  - **Only verified product information may be shown.** The store has not supplied confirmed metal, purity, hallmarking, weight or dimensions for the current products, so none are displayed and none may be implied in copy or metadata.
  - Store policies (shipping, returns, privacy, terms) are drafts pending the store's approval.
  - Product photographs are limited in resolution (about 508 px and 922 by 768 px). They must not be upscaled. Higher-resolution originals are a documented future improvement.
  - Routing uses URL hashes and stays that way for now. Individual product pages are not separately indexable by search engines; a separate technical SEO project is planned.
  - Commerce behaviour (bag, checkout validation, COD, authentication, API) must be preserved during any redesign.

## Brand Commitments

- Name: Silveram
- Voice: calm, clear and quietly confident. Plain language in sentence case, specific rather than promotional, never exaggerated.
- Visual language: editorial lookbook. Photography leads; League Spartan throughout; Midnight Navy, Ivory and Sterling Silver palette; flat surfaces; 2px corners; light theme only. See DESIGN.md.

## Evidence on Hand

- Product data: `src/features/products/data/products.ts`.
- Storefront copy: `src/features/storefront/data/content.ts`.
- Design tokens: `src/styles/tokens.css` and DESIGN.md.
- Real photography for all three pieces (Silver Frame: 6 photos, Silver Kada: 1, Peacock Ring: 2).
- Store address and contact details in `src/shared/config/site.ts`.

## Product Principles

1. **Photography first**: let the pieces be seen, at honest scale.
2. **Honest information**: show only what is verified; say plainly when something is not yet confirmed.
3. **Effortless ordering**: every step is its own clear page, guest checkout is always possible, and cash on delivery is the default.
4. **Mobile first**: the bag, forms and checkout must work comfortably on a phone.
5. **Quiet confidence**: restraint, space and consistency over decoration.

## Accessibility and Inclusion

- WCAG AA: 4.5:1 for text, 3:1 for large text and UI component boundaries.
- Full keyboard operation with a visible focus indicator, skip link, semantic landmarks, labelled form fields with inline errors, and announcements for bag changes.
- Respect reduced-motion preferences.
- Touch targets of at least 44px on mobile.
