# Silveram: Hallmark redesign audit

Branch: `feat/hallmark-ecommerce-redesign` (from `main` at 786fa93). Depth: **full** (`/hallmark redesign ./src`).
Method: `sloplint --render --before` against the dev server on 9 routes (screenshots and record in `.hallmark/before*`, git-ignored), plus a read of the source. Nothing in this file was changed in code yet.

## What could not be verified

- **Live site (silveram.in)** was not captured: no network capture was run. The audit is of the local build only.
- **Hero photograph:** `HeroSection` builds its URL only through Cloudinary (`siteImageUrl`), and `VITE_CLOUDINARY_CLOUD_NAME` is empty locally, so the hero renders the "Photograph coming soon" panel. Whether production has `site/hero/silveram-fullbleed-hero` was not confirmed. A redesign must not depend on it.
- Firefox, Safari and Edge are not installed here; only Chrome is available.

## Read (what the page is, what stays, what reads generated)

- **For:** Indian gifting and festival buyers on phones, one action: put a piece in the bag and pay cash on delivery.
- **Stays:** the navy/ivory/silver brand, Instrument Serif + League Spartan, the real photographs, the checkout/auth/order logic, the honest "not verified" product copy, the footer's contact facts.
- **Reads generated:** a 12-section homepage that repeats the same centred head over a card grid; a seven-product lineup as identical tiles; the "Silveram is always" blob cards; Courier Prime tracked labels and eyebrows on every head; pill/stamp chips on every product.
- **Broken:** see P0/P1.

## Corrections to the brief

- The catalogue has **7 products**, not three (`products.ts`: Silver Frame, Silver Kada, Peacock Ring, Chapka, Shiv Locket, Adipurush Locket, Kurta Pin). Copy such as "Three pieces. Endless meaning." (`content.ts` LINEUP) is stale and wrong.
- Payment: DESIGN/PRODUCT docs say Razorpay "coming soon"; the code has Cashfree gating (`features/checkout/lib/cashfree.ts`). Gating is preserved untouched.
- The design system (`DESIGN.md`) is a locked system and wins: navy anchor, three families, pills and 20px media radius are already decided. The redesign works inside it.

## Preservation inventory (recorded by `--before`: 55 links, 5 fields, 80 handlers)

Routes: `/ /shop /product/:slug /cart /checkout /checkout/payment /order/:id /signin /signup /account /track /policy/:id` and 404. Untouched: `server/`, `api/`, `vercel.json`, env files, stores (`features/*/store`), `shared/lib/api.ts`, `checkout/lib/*`, `orders/api.ts`, `cart/lib/syncCart.ts`, `shared/seo/*`, `scripts/prerender.mjs`, product ids/skus/slugs/prices. Data owner: product records static in `products.ts` (ids match Appwrite docs); orders/customers/sessions in Appwrite via the API; images via Cloudinary with bundled local fallbacks.

## Findings

### P0 (broken or blocking)
- None found in commerce logic by reading. Not tested end to end against a live backend here.

### P1 (conversion, usability, responsive)
1. **Hero depends on one remote asset and shows a placeholder when it is missing** (`HeroSection.tsx`, `Media` placeholder). The first screen is an empty navy field with "Photograph coming soon" (screenshot `localhost-3000-1440x900`). Also 5760px source requested for a 100vw hero.
2. **Homepage is 12 sections, ~120 words per screen**, repeating one centred-head-over-grid pattern (gates 58, 59, 77, 79). The whole page ends with the lineup and FAQ far from the first action.
3. **Shop page and product cards are the legacy 2px bordered white cards** with two buttons per card ("View Product" + "Add to Cart" side by side), uppercase tracked badges, `transition-all` (gate 10a). "7 pieces" is a lone orphan row of 3+3+1 (F20).
4. **Product page**: uppercase tracked eyebrow over the h1 (gate 54), title/price/description stacked with the buy box below the fold at 1440x900 (Add to Cart is at y≈763 of 900, Buy Now at 828), 568px-tall lightbox button (39b), thumbnails fixed at 6 across, arrow glyph "›" glued (63).
5. **Cart/checkout**: empty states are bare text with a heading and one button over large empty space; checkout step list is uppercase tracked (67); sticky mobile cart bar uses an `rgba` literal shadow (48).
6. **Not found, sign-in, track, policy** are thin pages (gate 77): one narrow column, no mass.
7. **Footer** carries a script success message with no verified endpoint (gate 70) and a template line "All rights reserved" (19).

### P2 (system and component)
- Tokens: `#ffffff` surface (7b), `rgba()` literals in `utilities.css:99` and `CartPage.tsx:148` (48), three container widths (F15), four font weights (F19).
- Courier Prime labels used as tracked-caps eyebrows across sections and footer (54, 64, 67). Mono stays only where it is a real shop-label voice, in sentence case.
- `Button`: sm/md/lg controls render 40px (39b); `md` is 44px.
- Marquee has pause control but no hover/focus pause (18).
- Dashes in policy copy (19), middle-dot meta in the dev preview (63).

### P3
- `text-wrap: balance` missing on display heads (F3), 404 h1 ends on a stub (F26), contrast 4.05:1 over a gradient on the hero at 1280 (40), `Shipping policy` link wraps at 1024 (49b).

### Accessibility
Skip link, dialog focus trap, reduced-motion handling and labelled forms already exist. Fix: contrast at the hero gradient, touch targets below 44px, uppercase label contrast, announce bag changes (kept if present).

### Admin (`admin/`, not redesigned)
Reported only: separate Refine/Ant Design app with its own theme (`admin/src/styles/theme.ts`, `global.css`); not audited visually in this pass; left untouched.

## Direction

Silveram's own system stays; Hallmark deals no new theme. The redesign is a **full composition change inside the locked `DESIGN.md`**:

- **Hero:** replaced with a "Stage" composition built from real product photography at native size (always available through bundled fallbacks), headline "Small keepsakes. Lasting meaning." kept, one primary action to the collection.
- **Homepage:** cut from 12 sections to 8: hero, collection (lead piece plus a quiet list, not 7 identical tiles), gifting, story, visit, FAQ, footer. Each with one purpose and a different composition.
- **Shop/product cards:** one action per card (view), price and name, no badges; add-to-bag on the product page, where the decision is made.
- **Product page:** buy box beside the gallery and above the fold, no eyebrow, one primary action.
- **Bag/checkout/auth/track/404/policy:** shared form, empty-state and step components, wider composition, same logic.
- Labels become body-face sentence case; Courier Prime kept only for the announcement strip and order references.
