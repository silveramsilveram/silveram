# Silveram: Graza-inspired redesign. Phase 0/1 audit and plan

Status: **proposal, awaiting approval.** No application, backend, env or config file has been changed. This file is the only addition (docs only, untracked).

## 1. Phase 0: safety and baseline

| Item | Result |
|---|---|
| Repo | `d:\silverfinal\silveram` |
| Branch | `redesign/homepage`, in sync with `origin/redesign/homepage` |
| Working tree | Clean (`git status` empty), no stashes |
| ZIP (`silveram-main.zip`) vs local | 210 files; **0 content differences** after line-ending normalisation (raw bytes differ only by CRLF). Nothing exists in the ZIP that is missing locally |
| Node | v24.11.1 (`engines`: ^20.19 or >=22.12) |
| Baseline `npm run typecheck` | Passes (about 95 s) |
| Baseline build / server check / server tests | **Not yet run.** Build rewrites `dist/` (gitignored); will run on approval. Server commands are verification only |
| Proposed branch | `redesign/graza-inspired-silveram` from the current clean tip. Not created yet |

Protected, will not be touched: `server/`, `api/`, `vercel.json`, `.env*`, `scripts/` (prerender excepted only if a route/SEO change forces it, with approval), Appwrite/Cloudinary/Cashfree code, `src/shared/lib/api.ts`, `src/features/*/store/*`, `src/features/checkout/lib/*`, `src/features/orders/api.ts`, `src/features/cart/lib/syncCart.ts`.

## 2. Research coverage, and what could not be verified

| Source | Status |
|---|---|
| Mobbin collection (33 sections) | **All 33 retrieved and visually inspected** (pages 1 and 2). Section matrix in section 4 |
| Live graza.co | Text-only fetch of `/`, `/pages/about-us`, `/pages/faqs`, `/pages/glog` succeeded. `/collections/all` and a product page returned **HTTP 429**, so shop and product structure come from Mobbin only. Fetch returns text, not rendering, so motion, colour and fonts were not observable. Live hero reads "Extra Virgin Olive Oil makes everything better." with a "Shop now" CTA and a "Pause animations" control, which differs from the Mobbin captures. Live content changes, so treat Mobbin as the visual source |
| Refero style page | **Inaccessible.** The page is JavaScript-rendered and returned only its title, with no style data. Nothing from it is used |
| `graza.co-DESIGN(1).md` | **Not found.** It was not in the attachments I could see, in `d:\silverfinal`, Downloads or Desktop. Measurements from it (30 px gutter, 20 px media radius, 0.25 s / 0.4 s / 20 s timings, 72 / 102 / 120 px type) are therefore used only as the brief quotes them. **Please re-attach it** |
| Skills in repo | Read: `redesign-existing-projects`, `frontend-design`, head of `web-design-guidelines` and `impeccable`. See conflicts in section 3 |

Mobbin shows screenshots of sections, not source. Nothing here claims knowledge of Graza's CSS or exact animation.

## 3. Current Silveram audit

**Stack:** React 19, Vite 8, Tailwind 4 (`@theme` in `src/styles/tokens.css`), GSAP (lazy, hero mask only), Zustand, History-API router (`src/shared/routing/router.ts`; `DESIGN.md` still says hash routes, which is stale). Routes: `/`, `/shop`, `/product/:slug`, `/cart`, `/checkout`, `/checkout/payment`, `/signin`, `/signup`, `/account`, `/track`, `/order/:id`, `/policy/:id`, not found.

**Homepage today:** AnnouncementBar, Header, Hero (two-line headline, photo with GSAP mask, product price list), Collection (three staggered product bands), Story (navy), Craftsmanship, Gifting, Trust (four icon cards), FAQ (accordion, 9 items), Footer (navy, newsletter with consent, contact).

**Findings that shape the plan**
1. **Product data is static in the frontend.** `src/features/products/data/products.ts` holds all three products, and image URLs are *constructed* from SKU and file name (`productImageUrl`). No frontend code reads the products API. The backend does return `media[]` (with `resourceType`), but the storefront never consumes it. So "video-ready" means extending the frontend type and URL builder; no backend contact is needed.
2. **Photo resolution is the main constraint.** Sources are about 508 px (Silver Frame) and about 920 x 768 px (Kada, Ring). `DESIGN.md` says never upscale. A Graza-style full-bleed hero or giant product crops would look soft at these sizes.
3. **Rules in `DESIGN.md` and the skills contradict the new brief:** 2 px radius everywhere, no pills, no gradients, no italics, sentence case only, League Spartan only, no eyebrows, flat surfaces. The brief explicitly wants pill CTAs, 20 px media corners, a serif plus a typewriter face, dashed dividers, stamps and a marquee. The skill "Design Values" are for a different brand (Geist/Manrope, dark greys) and say to ask before inventing values. Per the brief, the user's direction wins; accessibility, truthfulness, performance and the backend freeze stay mandatory. `DESIGN.md` must be rewritten as part of Milestone 2.
4. **Existing components to rebuild, not patch:** `Button` (uppercase, 2 px, shadow), `ProductCard` (bordered white card, uppercase badge, two buttons), `Header` (text wordmark, no scene awareness), `TrustSection` (icon-card grid, flagged as generic), `ImageSlot` (images only, no video, no focal point).
5. **Reusable as is:** `useDialog` (focus trap), `useReveal` (IntersectionObserver), `responsiveSrcSet`, router and SEO helpers, WhatsApp support module, newsletter submit logic in the footer, FAQ copy, all product facts.
6. **Not yet read in detail (will be before Milestone 6):** `ProductGallery`, `CartPage`, checkout pages and `CheckoutLayout`, auth and account pages, track/order pages, policy and not-found pages. Reviewed at file-list level only.

## 4. Mobbin reference matrix (all 33 sections)

Links are `https://mobbin.com/sites/sections/<id>`. "Use" is the Silveram adaptation.

| # | ID | Mobbin pattern | What the image shows | Silveram use | Target files |
|---|---|---|---|---|---|
| 1 | `64e41fb0-c4fa-4f69-a03a-707d52b26b9c` | Features | Giant wordmark filling the width on a peach block, italic serif tagline with dotted underlines, three product cards with pill tag and price | Wordmark scene under the hero or as footer sign-off; navy on ivory | `HomePage`, new `WordSculpture` |
| 2 | `1eccc51f-9534-4b5c-8daa-9311605fcdbc` | Features | Staggered two-line serif statement with a small drawn motif | Editorial promise, staggered, original single-ink motif | new `EditorialPromise` |
| 3 | `4061cf39-c105-4846-9a9f-999478042329` | Navigation | Transparent nav over video hero: logo, 4 mono links, account icon, cart pill | Transparent-to-solid header over hero | `Header` |
| 4 | `da100285-4c67-4601-9bed-b4be4c14f5dd` | Hero | Split hero: serif headline, mono sub, lime pill, rounded photo | Gifting page/hero variant | Gifting scene |
| 5 | `3b407af7-3a06-49e3-b727-b3063e67f768` | Hero | Full-bleed video, headline low-left, pill CTA | Cinematic hero (needs larger photo or video) | `HeroSection` |
| 6 | `fabe4995-a146-4090-900e-b2a6165baf92` | CTA | Full-bleed photo, serif headline, pill, glass "stamp" card top-right | Story hero with a store-address stamp (verified facts only) | story scene |
| 7 | `674d9fc9-7e05-45fe-ac3c-c8f6d793c78f` | Store | Info ticker strip, then colour split: copy left, rounded dashed-frame photo right, prev/next | Featured collection scene in ice blue/navy | `FeaturedScene` |
| 8 | `9739cf34-8152-4901-89d7-b8ae0124d6db` | Store | Bundle panel: photo, serif line, dotted divider, spec list with price, outlined pill | Gift set / "all three" panel using real prices only | collection |
| 9 | `e1617357-c934-4edb-a549-dde7bf356c30` | Store | Three tall product tiles on a textured mat, oval category pill and price top, centred serif name, one-line benefit, wide "Shop all" pill | Editorial product lineup | `ProductCard`, lineup |
| 10 | `f86d7f5d-fd2c-4cc5-b199-0e86d955d470` | Store | Shop listing: centred serif title, dashed-border tab row, format chips, 4-up cards with round stamps | Shop page. Tabs not justified with 3 products; use header and stamps only | `ShopPage` |
| 11 | `624afda0-0098-4e2e-9c95-a12e635a83eb` | Store | PDP: thumbnail rail over large image left; right panel with title, stars, dashed-border purchase box, tabs Details/Harvest/Uses/Refills | PDP layout: rail, purchase panel, tabs. No stars (no reviews) | `ProductPage`, `ProductGallery` |
| 12 | `9fc30a18-1fd0-48f8-8c87-048a81e238f9` | Store | Lime panel "Give the gift that keeps on squeezing", three rounded photos with text links | Gifting scene with real gift-box photo (Silver Frame photo 3) | gifting |
| 13 | `ee5be1fd-0642-4808-8cf4-ef5c3234a18b` | How it works | Three numbered dashed-oval callouts around a line drawing | Only if there is a true sequence (e.g. order steps from existing flow) | optional |
| 14 | `4f4b677e-6d53-4d56-b70f-ea59861a426b` | Features | "Why cans?" hand-lettered blob bubbles in three colours | Craftsmanship "reasons" as blobs, using the three verified details | `Craftsmanship` |
| 15 | `1aa65984-1092-4a1a-b6a3-cae3fd813d04` | About/Features | "Graza is always" centre blob with four outlined ovals | Same role: Silveram promises, only verified ones | promise scene |
| 16 | `abf49e60-923d-4bae-9905-5daebacb909d` | About | Botanical image with numbered annotations | Annotated product photo (Silver Frame relief) with verified callouts | craft scene |
| 17 | `2e8f8ca8-47cd-42e2-9e03-8b72e1ad6d23` | About | Three-colour band timeline with side index nav | Not used (no process facts) | none |
| 18 | `31907bbb-49b8-4354-95eb-fcd7855db5eb` | About | "1 olive, 2 oils" mirrored comparison with centre line | Frame vs Kada vs Ring comparison only with verified specs | optional |
| 19 | `7a52ef93-30b2-4a1b-8c9c-d4123e5bb5c7` | About | Half photo, half text with place name | Store story split with the Motihari shop (supplied photo needed) | story |
| 20 | `2eff73a5-3e21-4a2c-a7b4-fe9100a464b9` | About | Asymmetric photos joined by a thin diagonal line | Staggered editorial promise layout | `EditorialPromise` |
| 21 | `c0551959-279d-4c6f-ad77-0998844fd5c3` | About | Large serif statement, small "Sincerely, the team", rounded portrait | Founder/store note. Only with real photo and approved text | story |
| 22 | `2e930a44-b70f-44e8-9fe7-5cde2beddabf` | Showcase | Horizontal rail of varied rounded photos, "follow us" | Community rail only if real customer or store images exist; else omit | optional |
| 23 | `d9623cbc-5725-40ab-b206-bbf6a160e5d7` | Blog | Lime marquee strip, floating verb cloud with one circled, photo and caption | Marquee plus "ways to wear/gift" cloud, factual only | `Marquee` |
| 24 | `25fa618b-3dba-4cac-9b8c-0dba5d80237a` | Blog | Single-ink illustrated characters with lime category pills | Not copied. Single-ink motif system only | `Stamp` |
| 25 | `9af1f750-1e20-4776-ae94-9ad2f4d96011` | Blog | 3 x 2 grid of rounded photos, tag pill, centred serif title | Only if a journal exists; not in launch | none |
| 26 | `f3df16e9-45e3-4bc1-bf4e-1c599982ab76` | Blog | Dark header, search, category pills, split featured article | Not in launch | none |
| 27 | `1b36d57a-b72c-4982-9cc4-83f3f6857e56` | Blog | "See what else we're cooking up" three cards with lime CTA | Not in launch | none |
| 28 | `068c8633-d304-472a-82a8-045dbc3c094f` | Blog | Lime band, "Featured Articles", arrow control, three cards | Carousel-control styling reused for the collection rail | `CarouselControls` |
| 29 | `23598922-81c2-498a-adec-f31cae869289` | FAQ | Left category list with dots; right mono questions, circle toggles, one open | FAQ redesign (existing 9 questions); keep accessible disclosure | `FaqSection` |
| 30 | `c8b574af-1755-46ee-baa9-150ecb3f40e4` | FAQ | Same pattern for corporate gifting | Same component; no corporate-gifting claims | `FaqSection` |
| 31 | `48277ebc-1984-41a6-b25e-f2ee7c4404f2` | Contact | Colour split: heading left, dashed-border form card right with outlined pill fields | Visual reference for form styling only; WhatsApp stays support-only | form styles |
| 32 | `e0b0a006-0495-4969-ab1a-5b35acc33e8d` | Footer/Newsletter | Dashed grid, three link columns, boxed email field with arrow button, legal links, wordmark across the bottom | Footer rebuild: navy, existing newsletter with consent, SILVERAM wordmark | `FooterSection` |
| 33 | `664f434f-c113-4138-b15c-e8dbb854c26f` | 404 | Full-colour page, drawn character, one line, "Go home" pill | Branded not-found with an original motif | `NotFoundPage` |

## 5. Design system proposal

**Colour roles (navy `#182D49` stays the anchor).** Core tokens unchanged; add `--color-steel-navy #385575`, `--color-ice #DCE6F0`, `--color-champagne #D9C5A3`. Scenes: *canvas* (ivory), *mat* (stone), *deep* (navy, white text), *ice* (promo scene), *champagne* (gifting accent only, small). Contrast to be validated with a script before use; silver never used as small text on ivory. No olive, citrus or peach.

**Type (needs your decision).** Display serif: **Instrument Serif** (narrow editorial, OFL) is the closest legal match to the condensed serif; Cormorant Garamond is too light and wide for the effect. Typewriter: **Courier Prime** (OFL) for labels, captions and short supporting lines only, not long copy. League Spartan stays for nav, buttons, prices and forms. Both new fonts via `@fontsource`, subset, `font-display: swap`; verify each licence at install. Sizes via `clamp()` and fitted to Silveram copy, with Graza's 72/102/120 px as upper bounds on desktop.

**Shape and structure.** Container max about 1440 px with 30 px desktop gutter; editorial inner width about 1104 px. Media radius 20 px, inputs 8 px, CTAs pill. 1 px dashed dividers, oval stamps, outlined pill with offset underside ("layered" CTA). Cards only where they carry hierarchy.

**Motion (CSS first, GSAP lazy only for hero and word sculpture).** Colour/border/fill 250 ms; header 400 ms; marquee 20 s linear with a visible pause control; decorative loops 2 to 3 s and paused with the same control. Hover scale 1.02 to 1.04 on product images. All of it off or reduced under `prefers-reduced-motion`; content visible without JS; no `transition: all`.

**Media.** New `Media` component (image or video) wrapping existing `ImageSlot` behaviour: per-asset focal point, poster, lazy loading, no autoplay sound, graceful empty state. Product type extended with an optional `kind` and `focal`, URLs built by an extended `src/shared/lib/cloudinary.ts` (video path `/video/upload/`). Same folder convention and URL contract; nothing sent to the server.

## 6. Homepage storyline (12 beats, verified content only)

1. Cinematic hero. 2. Info strip: COD across India, store in Motihari. 3. Featured collection scene. 4. Staggered promise. 5. Craftsmanship reasons (frame relief, kada texture, ring colour; existing copy). 6. Editorial lineup (3 products, real prices). 7. Interlude: ways to wear or gift, **no care or trivia facts unless you supply them**. 8. Gifting scene (real navy gift-box photo). 9. Store story (address and WhatsApp; no maker or origin claims). 10. Community: **omitted until real images exist**. 11. FAQ. 12. Newsletter, directory, SILVERAM word sculpture.

## 7. Route-by-route plan

| Route | Plan | Behaviour that must not change |
|---|---|---|
| `/` | Rebuild per section 6 | Section anchors (`#collection`, `#story`, `#gifting`, `#contact`), SEO, prerender |
| `/shop` | Editorial header, 3-up lineup, stamps; no filter tabs for 3 products | Add to bag eligibility |
| `/product/:slug` | Rail plus large media, purchase panel, tabs from existing fields | Add to Cart, Buy Now, quantity cap, WhatsApp questions, JSON-LD |
| `/cart`, `/checkout`, `/checkout/payment` | Restyle with shared tokens only (type, buttons, fields, step indicator) | All state, API calls, COD and gateway flags, validation |
| `/signin`, `/signup`, `/account` | Restyle | Appwrite session flow |
| `/track`, `/order/:id` | Restyle | Lookup and status logic |
| `/policy/:id` | Typographic restyle | Draft policy text |
| not found | New branded page | 404 behaviour |
| Global | Header (transparent over hero, solid after), announcement strip with pause control, footer | Skip link, focus trap, mobile menu, floating WhatsApp rules |

## 8. Files intended to change (frontend and docs only)

- Tokens/styles: `src/styles/tokens.css`, `global.css`, `utilities.css`; `package.json` (add two `@fontsource` packages) and lockfile.
- Shared UI: `Button.tsx`, `ImageSlot.tsx`; new `Media.tsx`, `Marquee.tsx`, `Stamp.tsx`, `CarouselControls.tsx`, `WordSculpture.tsx`; `src/shared/lib/cloudinary.ts` (additive helpers only).
- Storefront: `Header`, `AnnouncementBar`, `HeroSection`, `CollectionSection`, `StorySection`, `CraftsmanshipSection`, `GiftingSection`, `TrustSection` (likely replaced), `FaqSection`, `FooterSection`; new scene components; `content.ts` (copy only), `src/app/App.tsx` (section order only).
- Products/shop: `ProductCard`, `ProductGallery`, `ProductPage`, `ShopPage`, `products.ts` (type extension only; facts unchanged).
- Commerce/auth/orders/policy/not-found pages: className and markup restyle only; no logic.
- Docs: `DESIGN.md`, this audit.

**Will not change:** everything listed as protected in section 1, and every price, product ID, SKU, slug and policy fact.

## 9. Risks and open questions

1. **Hero image quality** (finding 2). Options: (a) contained hero with the photo at native size on a navy scene (safe now), (b) full-bleed using your higher-resolution originals or a video when supplied. Needs your choice.
2. **Typefaces** (Instrument Serif plus Courier Prime) need your approval before install.
3. **Missing facts.** Care guidance, material, purity, weight and origin are not in the data, so the "care and styling" interlude will be styling and gifting ideas only.
4. **Rewriting `DESIGN.md`** reverses its no-pill, no-gradient, 2 px, no-italic rules. Confirm that is intended.
5. **Graza design guide** missing (see section 2).
6. **Milestone order.** Proposed: 1 audit (this), 2 design system, 3 header and hero, 4 homepage sections, 5 shop and PDP, 6 cart/checkout/account, 7 motion, mobile and visual QA. Each milestone ends with typecheck and build, and I stop for review.
