# Silveram

Silveram is an Indian silver gifting and jewellery storefront. The repository contains a React storefront and an Express API deployed together on Vercel. Appwrite provides backend authentication and application data; Cloudinary stores and delivers all product/site images and videos.

> **Launch status:** the storefront is available at [silveram.in](https://silveram.in/). Email checkout, COD, Cashfree, and newsletter signup remain disabled by default. Configure Appwrite, Cloudinary, email, verified product/inventory facts, policies, and production environment variables before enabling any transactional feature.

## Architecture

```text
Customer browser
  ├─ Static React 19 + Vite storefront ─────────────── Vercel
  └─ Same-origin /api/* requests ── Express function ─ Vercel

Store owner's browser (one person)
  └─ admin.silveram.in: Refine + Ant Design dashboard ─ separate Vercel project
        └─ its own /api/* is proxied to the same Express function above (same API, same database)
                                      ├─ Appwrite Auth: customer accounts
                                      ├─ Appwrite Database: profiles, sessions, catalog,
                                      │  orders, verification state, rate limits
                                      ├─ Appwrite Storage: private, non-media customer files
                                      │  when a customer-file feature is implemented
                                      ├─ Cloudinary: all product/site images and video
                                      ├─ Mailjet SMTP/REST: verification, order and optional
                                      │  newsletter email
                                      └─ Cashfree: UPI, QR and card payments
```

The browser never receives an Appwrite server API key or connects to the private application database directly. Browser requests go to the Vercel API function; the server validates input and uses server-side Appwrite credentials. Appwrite collections have no public permissions. Cloudinary is the only image/video binary store; Appwrite stores their metadata/references.

## Stack

| Area | Technology |
|---|---|
| Storefront | React 19, TypeScript, Vite, Tailwind CSS 4, Zustand (state + caching), GSAP (lazy-loaded) |
| API | Node.js, Express 5, Zod, Helmet, CORS |
| Accounts/data | Appwrite Auth, Databases, and SDK; server-only access |
| Media | Cloudinary signed uploads and CDN delivery |
| Email | Mailjet SMTP and optional contact-list API |
| Payments | Cashfree Payments (UPI, UPI QR, debit/credit cards), disabled until configured |
| Deployment | One Vercel project, Vite output plus Vercel Node.js API function pinned to Singapore (`sin1`) next to Appwrite |

## Features

- Responsive storefront, homepage sections, product listing/detail routes, product galleries, FAQ and draft policy dialogs.
- Shopping bag with browser-local persistence and WhatsApp enquiry messages.
- Express API routes for Appwrite-backed email OTP, sessions, catalog administration, orders, stock reservations, image-upload signatures and newsletter subscriptions.
- Server-side price/stock validation and Appwrite database transactions for order inventory changes.
- Cloudinary uploads use short-lived, admin-authorized signatures; media binaries do not pass through the API.
- Checkout, Cashfree, and newsletter features remain disabled unless explicitly enabled and configured.

## Repository structure

```text
admin/                              Admin dashboard (separate Vite app, own package.json and Vercel project)
  src/features/                    One folder per screen: dashboard, orders, products, transactions,
                                   inventory, customers, analytics, reports, settings, auth
  src/providers/                   Refine auth provider (e-mail OTP) and data provider (talks to /api)
  src/services/                    Typed API client, cached queries, URL-synced table state
  src/components/                  Shared UI: tables/cards, filters, charts, status tags, date range
  src/styles/                      Silveram theme tokens and responsive CSS
  vercel.json                      Proxies /api to the storefront API; strict security headers
api/
  index.js                         Vercel API function entry (vercel.json rewrites /api/* here)
scripts/
  prerender.mjs                    Build step: static HTML per page, sitemap.xml, robots.txt
.github/workflows/ci.yml            CI: type-check, build, tests, dependency audit
src/
  app/                             Storefront assembly: route switch, lazy loading, prefetching
  features/
    auth/                          Sign-in/sign-up UI and Zustand auth store (store/authStore.ts)
    cart/                          Bag UI and Zustand cart store (store/cartStore.ts), persistence
    checkout/                      Disabled-by-default checkout UI
    notfound/                      "Page not found" screen (noindex)
    policies/                      Draft policy text and pages
    products/                      Product cards, galleries, detail pages and static copy
    storefront/                    Homepage content and sections
    whatsapp/                      Contact settings and message builders
  shared/
    config/                        Public site configuration
    hooks/                         Shared UI hooks
    routing/                       router.ts: History-API router, navigate(), link interception
    seo/                           pages.ts: title/description/JSON-LD for every page (single source of truth)
    lib/                           API client, Cloudinary URLs, SEO and formatting
    ui/                            Shared accessible UI
  styles/                          Theme tokens and global styles
server/
  app.js                           Lazy Vercel API bootstrap
  src/
    app.js                         Express security middleware and route assembly
    config.js                      Validated server-only environment configuration
    catalog.js                     Shared server catalog enums
    cache.js                       TtlCache: in-memory cache with expiry, size cap and request coalescing
    sessions.js                    Cached session and user lookups (see Performance)
    platform/
      appwrite.js                  Appwrite SDK client, document and transaction helpers
      appwrite-schema.js            Appwrite collection/attribute/index definitions
    routes/                        Auth, products, orders, admin, upload, email/webhook APIs
    admin/                         Admin-only logic: orders, shipping rules, COD cash, transactions ledger,
                                   inventory, customers, analytics, CSV reports (all behind requireAdmin)
    security.js                    OTP hashing, opaque sessions and persisted rate limits
    mail/                          Mailjet transport and transactional email templates
    payments/cashfree/             Order creation, payment verification, webhook signature (gated)
    storage/cloudinary/            Signed image/video upload helpers and folder policies
    scripts/                       Appwrite provisioning, checks, catalog seed and media upload
  test/                             Node test suite
docs/
  APPWRITE_SETUP.md                 Appwrite setup, schema, security and deployment guide
  CASHFREE_SETUP.md                 Cashfree go-live checklist
  ADMIN_DEPLOYMENT.md               Admin dashboard: rollout order, deployment, security, rollback
public/images/products/             Optimized WebP fallback images
vercel.json                         Region, rewrites, cron jobs, cache + security headers (CSP), noindex rules
CONTRIBUTING.md                     Developer guide: where things live, conventions, checks
SECURITY.md                         Security policy and how to report a vulnerability
.nvmrc, .editorconfig               Node version and formatting defaults
```

## Local development

Requirements: Node.js 20.19+ or 22.12+, npm, an Appwrite project for API testing, and Cloudinary/Mailjet credentials only for the corresponding features.

```powershell
npm ci
npm --prefix server ci
Copy-Item server\.env.example server\.env
```

Edit `server\.env` locally. Keep the API key and all provider secrets out of the browser and source control. The storefront can run without the API:

```powershell
npm run dev
```

For API work, configure Appwrite and start the API in a second terminal:

```powershell
npm --prefix server run appwrite:setup
npm run dev:server
```

Vite proxies `/api` to `http://127.0.0.1:4000`. The shop uses same-origin API requests in production.

| Command | Purpose |
|---|---|
| `npm run build` | Type-check and create the Vite production build |
| `npm run typecheck` | TypeScript check |
| `npm --prefix server test` | Run API tests |
| `npm --prefix server run check` | Syntax-check backend modules/scripts |
| `npm --prefix server run appwrite:setup` | Provision required Appwrite database, private collections, attributes and indexes |
| `npm --prefix server run appwrite:check` | Verify configured Appwrite collections/indexes |
| `npm --prefix server run admin:backfill` | Dry run: make old orders searchable by name/phone for the admin (add `-- --apply` to write) |
| `npm --prefix admin install` / `run dev` / `run build` / `test` | Install, run (port 3100), build and test the admin dashboard |
| `npm --prefix server run seed:catalog` | Add or refresh inactive starter products with zero stock |
| `npm --prefix server run upload:catalog-images -- --environment=production` | Sync catalog images/videos from `public/images/products` to Cloudinary and save references in Appwrite |

## Shopping journey, accounts and e-mails

**Cash on delivery (COD) is the primary payment method. UPI and debit/credit cards (Cashfree) show as "Coming soon" until the gateway is approved and enabled. There is no ordering through WhatsApp: WhatsApp (+91 77669 11777) is for questions only.**

Every step is its own page with a real URL (see [SEO](#seo-how-search-engines-and-link-previews-see-the-site)):

| Page | Route | Purpose |
|---|---|---|
| Home | `/` | Landing page |
| Shop | `/shop` | All products |
| Product | `/product/<slug>` | Details, Add to Cart, Buy Now |
| Bag | `/cart` | Review items and quantities |
| Details | `/checkout` | Contact (guest e-mail or signed-in account) and delivery address |
| Payment | `/checkout/payment` | Cash on delivery (UPI / card: coming soon) |
| Confirmation | `/order/<id>` | Receipt and status |
| Sign in / Create account | `/signin`, `/signup` | Passwordless: e-mail + 6-digit code |
| Account | `/account` | Order history, sign out |
| Track order | `/track` | Guests: order reference + e-mail |
| Policies | `/policy/<shipping\|returns\|privacy\|terms>` | Store policies |

Customers can shop three ways, all stored in Appwrite:

| Path | What the customer does | What is stored in Appwrite |
|---|---|---|
| **Create account** | Name + email, then a 6-digit code sent by Mailjet | A user in Appwrite Auth, a `profiles` record, an opaque `sessions` record |
| **Sign in** | Email, then a 6-digit code (never creates an account by accident) | New session |
| **Guest checkout** | Email, name, mobile (+ optional alternate mobile), address, landmark (optional), city, state, PIN code. No account | A `customers` record (email, name, phones, last address) and the `orders` record with the full delivery details |

E-mails (Mailjet SMTP, sent by the API):
- **Order confirmation** after a successful payment, to the guest or account email.
- **"Your bag is saved"** when a signed-in customer has items in the bag, or a guest enters their email at checkout. At most one every 6 hours per address; the bag is also saved in `customers`.
- Sign-in / sign-up codes.

**Going live with COD:** set `VITE_CHECKOUT_ENABLED=true` (build-time, shows the Checkout button) and `STORE_LIVE_CHECKOUT=true` (API). `COD_ENABLED` / `VITE_COD_ENABLED` default to on. Run `npm --prefix server run appwrite:setup` once for the new `customers.altPhone` / `customers.addressJson` attributes, set each product's `stockQuantity` and `active: true`, and redeploy. SMTP is optional: without it orders still save, but no confirmation email is sent.

**Payments.** Cashfree's hosted gateway supports UPI, UPI QR and debit/credit cards; it is disabled until configured. For staging only, set `PAYMENT_TEST_MODE=true` (API, needs `STORE_LIVE_CHECKOUT=true`) and `VITE_TEST_PAYMENT_ENABLED=true` (storefront): the payment page offers a dummy **UPI** form (`success@upi` succeeds, `failure@upi` is declined) and a dummy **card** form (`4111 1111 1111 1111` succeeds, `4000 0000 0000 0002` is declined). The order is marked paid with payment method `test` and the email says it is a test order. With Cashfree enabled, checkout uses its hosted screen. **Turn test mode off before accepting real orders.**

After pulling this change run `npm --prefix server run appwrite:setup` once to create the new `customers` collection and the `paymentChannel` order attribute, then set each product's `stockQuantity` and `active: true` in Appwrite (seeded products start inactive with zero stock, so orders are refused until you do).

## Configure Appwrite, Cloudinary, and Vercel

Follow [docs/APPWRITE_SETUP.md](./docs/APPWRITE_SETUP.md) for the full guided setup.

1. Create an Appwrite project in the required region and configure its Vercel web platform hostname. Use the region-specific endpoint shown in Appwrite Console (for example, Singapore uses `https://sgp.cloud.appwrite.io/v1`); the setup script creates the database.
2. Set `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, and `APPWRITE_DATABASE_ID`. Run the provisioning script using a temporary key limited to database/schema management, then revoke it. Give the separate runtime key only the scopes required by the API.
3. Configure exact trusted website origins in `FRONTEND_ORIGINS`, a trusted admin-email allowlist, and independent random OTP/session secrets.
4. Configure Cloudinary server credentials for signed uploads. Set the public `VITE_CLOUDINARY_CLOUD_NAME` at build time so the storefront serves uploaded assets from Cloudinary. The Cloudinary API secret must never use a `VITE_` name.
5. In Vercel, use the repository root as the project root and the Vite framework preset. `vercel.json` installs root and API dependencies, builds `dist`, and routes `/api/*` to the Express function.
6. Add server values under Vercel Project → Settings → Environment Variables. Vercel values are not automatically copied from local `.env` files; redeploy after changing them.
7. Verify `/api/health`, catalog reads, OTP delivery and session cookies in a staging environment before enabling checkout.

Product media files must use a supported image format (`.webp`, `.png`, `.jpg`, `.jpeg`, `.avif`) and names such as `silver-frame-07.webp`, or a supported video format (`.mp4`, `.mov`, `.webm`, `.m4v`) named `silver-frame-video-01.mp4`. This checkout has a pre-push hook that detects changed product media, uploads it to Cloudinary, and saves references in Appwrite before pushing. To enable it in another clone, run `git config core.hooksPath .githooks`. You can also run the sync command manually. Admin uploads use the signed `/api/uploads/sign` endpoint and upload directly to Cloudinary. In both paths, Appwrite stores references/metadata only; never upload media binaries to Appwrite Storage.

The Vercel project was previously configured with the `server` directory and Express preset, causing Vercel to load the Express app factory as a serverless function. The storefront project must instead use the repository root and Vite preset. The API entry is now `api/index.js`; do not set the Vercel Root Directory to `server`.

## Storefront data and catalog

The current customer-facing catalog copy is in `src/features/products/data/products.ts`. The API catalog is in Appwrite and is seeded by `server/src/scripts/seed-catalog.js`. Keep product document IDs (`product-1`, `product-2`, `product-3`) and prices synchronized. The server uses Appwrite product records—not browser-provided prices—to calculate checkout totals.

The seed script creates products **inactive with zero inventory** and will not activate products or overwrite live inventory/media. Verify each product’s actual material, purity, weight, dimensions, price, image references, and stock before listing it. Do not treat demo data as approved commercial facts.

## SEO: how search engines and link previews see the site

A React app normally ships one empty HTML page, so Google, Bing, WhatsApp, Facebook and X would see the same title and no content for every URL. This project avoids that in four layers. Each layer is described below with where to change it.

### 1. Real URLs instead of `/#/...`

Old: `https://silveram.in/#/product/silver-frame`. Search engines ignore everything after `#`, so every page looked like the home page and **products could never be indexed**.
New: `https://www.silveram.in/product/silver-frame`. Each page has its own address that can be crawled, bookmarked and shared.

| URL | Page | In search results? |
|---|---|---|
| `/` | Home | Yes |
| `/shop` | All products | Yes |
| `/product/<slug>` | Product | Yes |
| `/policy/<id>` | Policies | **No, until the draft text is approved** (see below) |
| `/cart`, `/checkout`, `/checkout/payment`, `/order/<id>`, `/account`, `/signin`, `/signup`, `/track` | Private / transactional | No (`noindex`) |
| anything else | "Page not found" | No |

- The router is `src/shared/routing/router.ts` (History API, no dependency). Normal `<a href="/shop">` links work; clicks are converted to in-app navigation, so pages do not reload.
- **Old links keep working.** A visit to `/#/cart` (old e-mails, old shares) is rewritten to `/cart` before the app renders.
- `vercel.json` sends unknown paths to `app-shell.html` so React can show the page or the 404 screen.

### 2. A static HTML file per public page (build-time prerender)

`npm run build` now ends with `scripts/prerender.mjs`. For `/`, `/shop`, every product and every policy it writes a real HTML file (`dist/product/silver-frame/index.html`, ...) that already contains the page's:

- `<title>` and meta description
- canonical URL (always the `www` host)
- Open Graph + Twitter tags (what WhatsApp/Facebook/X show in link previews)
- JSON-LD structured data (see below)
- readable fallback content inside `<noscript>` (name, description, price, links)

When the visitor's browser loads the page, React takes over exactly as before, and `src/shared/lib/seo.ts` keeps the tab title and canonical correct while navigating.

**One source of truth:** page titles, descriptions, images and structured data are defined once in `src/shared/seo/pages.ts`. The app and the prerender script both read it, so what Google reads can never disagree with what customers see. Change SEO text there, not in `index.html`.

### 3. Structured data (schema.org JSON-LD)

| Page | Types emitted |
|---|---|
| Home | `JewelryStore` (name, address, phone, e-mail, Instagram, map) and `WebSite` |
| Shop | `BreadcrumbList`, `ItemList` |
| Product | `Product` (name, SKU, images, price in INR, seller) and `BreadcrumbList` |

Only facts that exist in the catalogue are emitted: **no invented ratings, reviews, stock or discounts** (Google penalises fake markup). A product without a price, or marked `isPlaceholder`, gets no `Product` markup. Validate with Google's [Rich Results Test](https://search.google.com/test/rich-results) after deploying.

### 4. Crawl control

- `sitemap.xml` (generated at build) lists only indexable pages, with product images. Submit `https://www.silveram.in/sitemap.xml` in [Google Search Console](https://search.google.com/search-console) and Bing Webmaster Tools.
- `robots.txt` (generated at build) allows everything except `/api/` and points to the sitemap.
- Private pages are kept out of search with an `X-Robots-Tag: noindex` **HTTP header** (`vercel.json`) plus a `noindex` meta tag. They are deliberately *not* blocked in `robots.txt`: a crawler that cannot fetch a page can never see its noindex instruction.
- `www.silveram.in` is the canonical host; the apex redirects to it. If you change the domain, set `VITE_SITE_URL`.

### SEO to-do for the owner (cannot be done in code)

1. Add and verify the site in Google Search Console and Bing Webmaster Tools; submit the sitemap.
2. Create / claim the Google Business Profile for "Ranjan Jewer Mahal, Motihari" (the `JewelryStore` markup mirrors it, so keep name, address and phone identical everywhere).
3. **Finish and approve the policy pages** (shipping, returns, privacy, terms). They are `noindex` while `draft: true` in `src/features/policies/data/policies.ts`; set `draft: false` once approved and they join the sitemap.
4. Keep product names and descriptions unique and specific; add material, purity and weight to `products.ts` only once verified (they appear in structured data and help rankings).
5. Use real Cloudinary-hosted, compressed photographs with accurate `alt` text (already in `products.ts`).

### Checking SEO yourself

```powershell
npm run build                              # then open dist/product/silver-frame/index.html
curl.exe -s https://www.silveram.in/product/silver-frame | findstr /i "canonical og:title ld+json"
curl.exe -sI https://www.silveram.in/cart | findstr /i "x-robots-tag"
```

Also run Lighthouse (Chrome DevTools) and the Rich Results Test on a product URL.

## Performance: why the site is fast and how to keep it fast

This section explains, in plain language, what was slow, what we changed, and where each change lives. If you only read one thing: **a page feels slow when it waits for a faraway server, repeats work it already did, or downloads code it does not need yet.** Every change below attacks one of those three problems.

### What was slow (the diagnosis)

| Symptom | Real cause |
|---|---|
| Every API call took ~0.7 s, even `/api/health` | The Vercel function ran in **Washington, USA** (the default), but the Appwrite database is in **Singapore**. Each database call crossed the planet (~250 ms each way), and one login makes many calls. |
| Sign-in, payment and sign-up felt "very slow" | Those flows made 5–10 database calls **one after another**, so the delays added up. |
| Every signed-in click was slow | Each request re-checked the session in the database, even if it had been checked a second earlier. |
| The shop re-read the same product list for every visitor | Nothing was cached. 1,000 visitors = 1,000 identical database reads. |
| The first page load downloaded a lot of JavaScript | One 390 kB file held every page, plus an animation library (GSAP) used for a single effect. |

### What we changed

**1. Run the API next to the database** (`vercel.json` → `"regions": ["sin1"]`)
Same city as Appwrite (Singapore). This alone removes most of the per-call delay. If you ever move Appwrite to another region, change this value to the matching Vercel region (Frankfurt `fra1`, US East `iad1`, ...). Keep them together.

**2. Do independent work at the same time (parallel requests)** (`server/src/routes/*.js`)
Before: "check IP limit → wait → check email limit → wait → read challenge → wait".
After: all three start together with `Promise.all`, so the total wait is the *slowest one*, not the *sum*. Applied to: sign-in OTP, OTP verify (profile + session + cleanup run together), cart sync, and checkout (all bag products are read at once and stock is updated at once).
We only parallelise things that do not depend on each other. Security checks that must come first (for example "is this code correct?") still run first.

**3. Remember recent answers (in-memory caching)** (`server/src/cache.js`, `server/src/sessions.js`)
A small `TtlCache` (time-to-live cache) remembers a result for a short time:

| What | Remembered for | Cleared when |
|---|---|---|
| Session lookup (who owns this cookie?) | 30 s | the user logs out |
| Appwrite user record for `/auth/me` | 60 s | the user signs in again |
| Public product list | 60 s | an admin creates, edits or deletes a product |
| Health check result | 30 s | automatically |

Two safety rules: a *missing* session or user is **never** cached (so a new sign-in works immediately), and identical requests that arrive at the same moment **share one database call** ("request coalescing") instead of each making their own.
Trade-off to know about: Vercel can run several copies of the API, each with its own memory. After logout, a *different* copy may still accept the old cookie for up to 30 seconds. We accepted that for speed; lower `SESSION_CACHE_MS` in `server/src/sessions.js` if you want it stricter.

**4. Let the CDN cache the product list** (`Cache-Control` header in `server/src/routes/products.js`)
`public, s-maxage=60, stale-while-revalidate=300` means Vercel's edge servers can answer product requests **without waking the API at all**, and can serve a slightly old copy while fetching a fresh one in the background. Measured locally: product list **435 ms → 3 ms** on a repeat request, health check **110 ms → 2 ms**.

**5. Cache static files for a year** (`vercel.json` headers)
Files in `/assets/` have a fingerprint in their name (`index-DLyLY6eM.js`), so when the code changes the name changes. They are therefore safe to cache as `immutable` for a year: returning visitors download nothing. Product photos in `/images/` are cached for a day and refreshed quietly after that.

**6. Faster cold starts** (`server/app.js`)
The first request after a quiet period used to also ping the database before doing anything. That ping was removed (`/api/health` still verifies the database, and real requests report errors if it is down).

**7. Smaller, smarter JavaScript on the first visit** (`src/app/App.tsx`, `vite.config.ts`)
- **Code splitting ("chunking"):** every page except the home page is its own file, downloaded the first time it is opened. First-load app code went from **390 kB → 58 kB**; React and Zustand sit in a separately cached `vendor` file that rarely changes, so repeat visits re-download only the small app file.
- **Lazy animation library:** GSAP (27 kB gzipped) now loads *after* the hero photo is already visible. If it is slow, the photo simply shows without the animation.
- **Prefetching:** when the browser is idle, it quietly downloads the cart, checkout, payment and sign-in pages, and Cashfree's payment script while the customer reads the checkout page. Clicking "Next" or "Pay" then feels instant.

**8. Zustand for client state** (`src/features/cart/store/cartStore.ts`, `src/features/auth/store/authStore.ts`)
We replaced React Context with [Zustand](https://github.com/pmndrs/zustand) stores.
- *Why:* with Context, **any** change (even an "Added to bag" toast) re-rendered every component reading the cart. With Zustand, a component re-renders only when the specific value it reads changes. The header re-renders for the item count and nothing else.
- *Caching:* the signed-in user (name and email only, never the secret session cookie) is remembered in `sessionStorage`, so the header and checkout show you as signed in **instantly** after a refresh, and the server confirms it in the background. A network blip no longer makes the UI forget you.
- *Cart:* totals are calculated once when the bag changes, not on every render, and the bag stays in sync across browser tabs.
- The hook names are unchanged (`useCart()`, `useAuth()`), so components did not need rewriting. On hot paths use selectors: `useCartStore((s) => s.itemCount)`.

**9. A smarter API client** (`src/shared/lib/api.ts`)
Identical GET requests made at the same moment share one network call, and every request has a 25-second timeout so a bad connection shows an error instead of an endless spinner.

### What we deliberately did **not** do

- **List virtualization (windowing).** It renders only the rows on screen, which matters for hundreds or thousands of items. The store has 3 products and a bag capped at 20 lines, so virtualizing would add code and bugs for no gain. If the catalogue grows past ~100 products, add `@tanstack/react-virtual` to `ShopPage` and add paging (`?limit=` already exists on `/api/products`).
- **Redis / a separate cache server.** In-memory caching is enough at this size and needs no extra service. Move to a shared cache (for example Upstash Redis) only if you need logout to take effect on all servers instantly.
- **Algorithm (time-complexity) rewrites.** There were no slow algorithms: every list is tiny. The real cost was *network round trips*, so we cut those. (The cache uses a `Map`, so lookups and evictions are O(1).)

### How to check performance yourself

```powershell
# API latency (run it twice: the second call to /products should be much faster)
curl.exe -s -o NUL -w "%{time_total}s`n" https://www.silveram.in/api/products

# Bundle sizes after a build: index-*.js should stay small
npm run build
```

In Chrome: DevTools → **Network** (check `Cache-Control` and sizes) and **Lighthouse** (Performance). In Vercel: Project → **Logs** and **Speed Insights**. To see which region the function runs in, open a deployment → **Functions**.

### Rules of thumb for future changes

1. New API route that needs several independent database reads? Start them together with `Promise.all`.
2. Data that many people read and rarely changes? Put it behind `TtlCache` and clear the cache in the code that changes it.
3. Never cache secrets, private per-user data in the CDN, or "not found" answers.
4. New page? Add it to the `loaders` object in `src/app/App.tsx` so it is lazy-loaded and can be prefetched.
5. New heavy library used by one screen? `import()` it inside that screen, not at the top of the file.
6. Keep Vercel's function region and Appwrite's region in the same part of the world.

## Security and operational notes

- **Browser hardening** (in `vercel.json`): a strict Content-Security-Policy (scripts only from this site and Cashfree's SDK; images from this site and Cloudinary; no inline scripts, no plugins, no framing by other sites), HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. If you add a new external script, image host or iframe, add its origin to the CSP or the browser will block it. After enabling Cashfree, run one sandbox payment with the browser console open and check for "Refused to ..." CSP messages.
- Behind Vercel the API trusts one proxy hop (`TRUST_PROXY_HOPS` defaults to 1 in production) so rate limits see the real visitor IP. Do not set it to `0` in production.
- Redirect targets after sign-in are restricted to same-site paths (`src/features/auth/redirect.ts`) so the redirect cannot be abused for phishing.
- `npm audit` currently reports no known vulnerabilities in production dependencies, and CI re-checks on every push. A `/.well-known/security.txt` and [SECURITY.md](./SECURITY.md) say how to report problems.
- Store secrets only in local ignored `server/.env` and Vercel’s server environment settings. Never commit `.env`, provider credentials, API keys, or customer data.
- The Appwrite API key is server-only. Public collection permissions stay empty; Vercel’s API performs authorization. Use a separate temporary setup key to provision schema, then revoke it.
- User sessions use random opaque tokens in `HttpOnly`, `SameSite=Lax` cookies; only a hash is stored in Appwrite. OTPs are HMAC-digested, short-lived, attempt-limited, and rate-limited.
- Email, database and Cloudinary failures return explicit API errors; do not enable checkout as a way to test missing integrations.
- Appwrite database transactions protect stock/order writes. Vercel Cron calls the secret-protected `/api/cron/cleanup` route daily to prune expired sessions, challenges, rate-limit records, webhook records, and stale email claims. A separate `/api/cron/reservations` job runs daily at 03:30 UTC (Vercel Hobby only allows daily crons); expired payment stock holds are also released, at most once a minute, whenever a customer starts checkout. `CRON_SECRET` must be a random value of at least 32 bytes.
- On a Vercel Pro plan you can change the reservations schedule in `vercel.json` to `*/5 * * * *`. Verify the jobs are active before enabling Cashfree. E-mail retries run in the long-running local server only.
- Appwrite is configured locally, but the latest schema check found missing Cashfree order attributes/indexes and customer fields. Vercel, Cashfree, Cloudinary, and Mailjet production settings still require verification. A green local build is not proof of production readiness.
- The privacy/terms/shipping/returns text is marked as a draft and requires business/legal review. The domain, commercial terms, product claims and stock must be confirmed before launch.
- Previously exposed credentials must be revoked/rotated. Never re-use credentials that were pasted into chat.

## Validation before launch

```powershell
npm run validate                      # type-check, build + SEO prerender, API syntax check, API tests
npm --prefix server run appwrite:check # verifies every attribute/index required by the checked-out code
```

Then stage-test account creation, email OTP rate limits, session/logout, product reads, private admin access, signed Cloudinary uploads, order creation/cancellation and order email. Enable payment methods only after payment-provider webhook testing and required scheduled cleanup are verified.

For design and product notes, see [DESIGN.md](./DESIGN.md) and [PRODUCT.md](./PRODUCT.md).

## Admin dashboard (for the store owner)

The admin dashboard is where the owner runs the shop: add products, change prices, see and process orders, track cash on delivery, watch stock, and read sales reports. It is made for **one person** (the owner) and works on phones, tablets, laptops and desktops.

It lives in [admin/](admin/) as a **separate website** (`admin.silveram.in`), but it uses the **same API and the same Appwrite database** as the shop. There is no second backend and no second database. Deeper technical notes: [docs/ADMIN_DEPLOYMENT.md](docs/ADMIN_DEPLOYMENT.md).

### What you can do in it

| Screen | What it is for |
|---|---|
| **Overview** | The big picture for any period (7/30/90 days, 6 months, year to date, custom): orders, money, sales chart, what needs attention (overdue deliveries, low stock, payments to review). Hover the **?** icons for exact definitions. |
| **Products** | Search and filter the catalogue, add or edit products, upload photos/films, switch a product on or off sale. Every price change is saved in **Price history** with who changed it and why. |
| **Orders** | Every order with its customer, items (at the price they were bought), payment, shipping and timeline. Set dispatch and delivery dates, courier and tracking, move the shipment forward, cancel an unshipped COD order (stock goes back automatically, exactly once). |
| **Transactions** | The money ledger: confirmed online payments, failed attempts, COD cash collected and handed over, provider-confirmed refunds and refunds manually recorded after checking Cashfree. **COD cash & reconciliation** lists cash still to collect and cash not yet handed over. |
| **Cashfree refunds** | Record a completed refund from Cashfree with its provider ID, amount and reason. This does not initiate a refund or move money. |
| **Cashfree settlements** | Manually compare the settlement report's net payout with the bank deposit; retain the UTR and difference without counting it as revenue. |
| **Inventory** | Stock on hand, low and out-of-stock items, units held by unpaid orders. Stock is changed only here, always with a reason, and every change is kept in **Stock movements**. |
| **Customers** | Who bought, how often and for how much. Phone numbers are masked in the list; open a customer to see full details. A separate export contains only contacts with recorded newsletter consent and includes unsubscribe links. |
| **Analytics** | Sales, orders, products (best and slow sellers), customers (new vs repeat) and delivery speed. |
| **Reports** | Download general CSV files (orders, product sales, transactions, COD, inventory, stock movements). They exclude personal contact details; the separate marketing export is restricted to opted-in email contacts. |
| **Settings** | Your session and a read-only view of what is switched on (database, image storage, e-mail, Cashfree, checkout). Secrets are never shown. |

### Signing in (single owner)

There is **no password and no public sign-up**. Only the e-mail addresses listed in `ADMIN_EMAILS` (a server setting) can use the admin.

1. Open `admin.silveram.in`, type your e-mail, press **Send code**.
2. Type the 6-digit code from the e-mail. The first time, your account is created automatically because your e-mail is on the allow-list. Everyone else is refused.
3. You are in. The session is an HTTP-only cookie (14 days); signing out ends it immediately.

Anyone signed in to the shop who is **not** on the list sees "Administrator access is required" and no data is loaded. The server checks this on **every** request, not just in the browser.

### Setting it up (one time)

Do these in order. Nothing here deletes or renames existing data.

```powershell
# 1. Add the new (optional) database tables/fields. Safe to repeat.
npm --prefix server run appwrite:setup
npm --prefix server run appwrite:check

# 2. Make old orders searchable by name/phone. Look first, then apply.
npm --prefix server run admin:backfill
npm --prefix server run admin:backfill -- --apply
```

Then, on the API's Vercel project, set (server-only, never in the browser):

| Variable | Value |
|---|---|
| `ADMIN_EMAILS` | The owner's e-mail (comma-separate if you ever need more than one) |
| `FRONTEND_ORIGINS` | Existing origins **plus** `https://admin.silveram.in` (exact, no `*`) |
| `LOW_STOCK_THRESHOLD` | Optional. Stock at or below this counts as "low" (default `3`) |

Finally create a **second Vercel project** from this same repository: Root Directory `admin`, domain `admin.silveram.in`. The settings are already in `admin/vercel.json`. See [docs/ADMIN_DEPLOYMENT.md](docs/ADMIN_DEPLOYMENT.md) for the full checklist and how to roll back.

### Running it on your computer

```powershell
npm --prefix server run dev        # the API (needs server\.env); add http://localhost:3100 to FRONTEND_ORIGINS
npm --prefix admin install
npm --prefix admin run dev         # the admin at http://localhost:3100
```

No credentials yet and just want to look around? Start the **demo mode** (made-up data, signs you in automatically, development only):

```powershell
node --experimental-test-module-mocks server/scripts/dev-fixture-server.mjs
$env:ADMIN_DEV_API_TARGET = "http://localhost:4010"; npm --prefix admin run dev
```

### How the money numbers work (plain English)

- **Gross order value** = what was sold (accepted COD, paid, dispatched orders). It is *not* cash received.
- **Confirmed online collections** = Cashfree payments the server itself confirmed. A payment that is only "pending" is never counted.
- **COD** order value is money you are *owed*. It becomes "collected" only when you press **Record cash collected** after dispatch, and "remitted" when you record that it reached you. These entries are typed by a person, so they are marked *operator recorded, not bank-verified*.
- **Refunds** appear after a signed Cashfree confirmation or an operator records a completed refund after checking Cashfree. An order labelled "refunded" with no ledger entry subtracts nothing.
- **Test payments** are always excluded from real money.
- Times are shown in **India time**. A month with no stored orders shows **"no data"**, never a made-up zero, and screens say when the ledger started.

### Built for every device and browser

- **Phones:** tables turn into easy-to-read cards, the menu opens as a drawer, buttons and fields are at least 44px tall, text fields are 16px so iPhones do not zoom, and the layout respects the notch and home bar. There is no sideways scrolling.
- **Tablets and laptops:** the menu collapses to icons on narrower screens; large screens keep a comfortable reading width.
- **Browsers:** current Chrome, Edge, Safari (iOS 15+), Firefox and Samsung Internet on Android and iOS, Windows, macOS and Linux.
- **Accessibility:** works with the keyboard alone (visible focus, "Skip to content"), labels on every field, status shown with words and icons (not colour alone), charts have a "View as table" version, reduced-motion and high-contrast settings are respected, and every page can be printed.

### Security in one minute

- Sign-in is the existing e-mail code system and cookie; nothing secret is stored in the browser.
- Every admin request is checked on the server for a valid session **and** the allow-list; admin writes also need a trusted `Origin` (protects against cross-site forgery).
- Money, price, stock, shipping and cash changes are logged with the signed-in e-mail taken from the session (never typed in a form), and the logs cannot be edited.
- Double clicks and double submits are harmless (the same stock adjustment or cash entry can only be applied once), and an out-of-date screen cannot overwrite newer changes.
- If the session expires while you work, you are sent back to sign-in; if the server is unreachable you get a "try again" page instead of a blank screen.
- Strict browser security headers on `admin.silveram.in` (no framing, locked-down scripts, no indexing by search engines).

### What it deliberately does not do

Initiate refunds from the admin (refunds are processed manually in Cashfree), import settlement reports or match each settlement to individual payments, track couriers live, accept part-payment for COD, or send marketing campaigns. The screens say so instead of showing fake data.

### Checking your work

```powershell
npm --prefix server test                                         # API tests
npm --prefix admin run typecheck; npm --prefix admin test        # admin checks
npm --prefix admin run build                                     # production build
```

### If something looks wrong

| You see | Likely cause and fix |
|---|---|
| Yellow banner "database needs the admin schema update" | Run `npm --prefix server run appwrite:setup` (safe to repeat) |
| "Administrator access is required" | Your e-mail is not in `ADMIN_EMAILS` on the API project (check spelling, redeploy) |
| No code e-mail arrives | E-mail (Mailjet/SMTP) is not configured on the server; see Settings |
| Orders cannot be found by name or phone | Run `npm --prefix server run admin:backfill -- --apply` once |
| Sign-in loops back to the login page | `admin/vercel.json` rewrite does not point at your real API host, or the admin origin is missing from `FRONTEND_ORIGINS` |
| "Image storage is not configured" when uploading | Cloudinary variables are missing on the API project |
| Numbers look lower than expected | Read the yellow "Read this before relying on the numbers" box: older periods or earlier cash events may not be recorded |

