# Silveram

Silveram is an Indian silver gifting and jewellery online store. Customers browse a small catalogue, fill a bag, and either order on **WhatsApp** (the main, working channel) or check out online with **email verification + Cash on Delivery** (built, but switched off until launch checks pass).

This file explains the whole project in plain language: what it is made of, how it fits together, how to run it, how to put it online, and how to change things.

---

## 1. The big picture

```
 Customer's browser
        │
        │  (1) loads the storefront  ──►  Storefront  (React + Vite, static files)
        │
        │  (2) calls /api/...        ──►  API        (Node + Express, one serverless function on Vercel)
        │                                      │
        │                                      ├─►  MongoDB Atlas   (users, sessions, products, orders)
        │                                      ├─►  Mailjet         (sign-in codes, order e-mails, newsletter)
        │                                      └─►  Razorpay        (online payments – OFF for now)
        │
        └─ product photos  ───────────────────────►  Cloudinary    (images are hosted there, not in the repo)
```

There are **two separate programs** in this one repository:

| Part | Folder | What it does | Deployed as |
|---|---|---|---|
| **Storefront** | repository root (`src/`, `index.html`) | Everything the customer sees | Vercel project #1 (root = repo root) |
| **API** | `server/` | Accounts, orders, stock, e-mail, payments | Vercel project #2 (root = `server/`) |

> The browser never talks to MongoDB directly. Only the API does.

---

## 2. Technology

| Area | Tools |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, GSAP (hero animation) |
| Font | League Spartan (self-hosted via `@fontsource-variable`) |
| Backend | Node.js 20.19+ / 22.12+, Express 5, Zod (validation), Helmet, CORS |
| Database | MongoDB Atlas (official `mongodb` driver) |
| E-mail | Mailjet (SMTP relay via nodemailer + Mailjet contact-list API) |
| Images | Cloudinary |
| Payments | Razorpay (built, disabled) |
| Hosting | Vercel |

---

## 3. What works today

- Homepage with hero, collection, categories, story, craftsmanship, gifting, trust, FAQ and footer.
- Three products with detail pages (`#/product/<slug>`) and image galleries.
- Shopping bag: add, change quantity (1–10), remove, saved in the browser (`localStorage`), prices always re-read from the catalogue.
- **Order on WhatsApp** from product pages and from the bag, with a pre-filled message (needs `VITE_WHATSAPP_NUMBER`).
- Policy pop-ups, FAQ, accessible dialogs, reduced-motion support, SEO tags and product structured data.
- Backend (built and unit-tested, but **checkout is disabled**): e-mail one-time-code login, COD orders with stock reservation in a database transaction, admin APIs for products/orders/image uploads, order-confirmation e-mails, newsletter sign-up, Razorpay order + signature + webhook handling.

## 4. What is switched off (on purpose)

| Feature | Frontend switch | Backend switch |
|---|---|---|
| Online checkout (OTP + COD) | `VITE_CHECKOUT_ENABLED` | `STORE_LIVE_CHECKOUT` |
| Razorpay payments | `VITE_RAZORPAY_ENABLED` | `RAZORPAY_ENABLED` |
| Newsletter form | `VITE_NEWSLETTER_ENABLED` | needs Mailjet keys + list ID |

All default to `false`. Until checkout is on, the bag shows "Order via WhatsApp" only.

---

## 5. Folder map

```
src/
  main.tsx                         App entry
  app/App.tsx                      Page assembly, hash routing, dialogs
  features/
    products/
      data/products.ts             ★ THE product catalogue (edit here)
      components/                  ProductCard, ProductPage, ProductGallery, PriceLabel
    cart/                          CartContext (state + persistence) and CartDrawer
    checkout/                      CheckoutDialog: email → code → address → COD/Razorpay
    storefront/
      data/content.ts              ★ Homepage copy, nav links, FAQ, trust items
      components/                  Header, Hero, Collection, Categories, Story, Craftsmanship,
                                   Gifting, Trust, FAQ, Footer, AnnouncementBar
    policies/                      Policy text (data/policies.ts) and the pop-up
    whatsapp/                      Number parsing, message builders, buttons
  shared/
    config/site.ts                 Site name, public URL, Instagram, e-mail
    lib/                           api.ts (fetch + feature flags), cloudinary.ts, seo.ts, money.ts
    hooks/                         useHashRoute, useReveal, useDialog
    ui/                            Button, ImageSlot (image + placeholder), Toast, icons
  styles/                          tokens.css (colours/fonts), utilities.css, global.css

server/
  app.js                           Vercel entry (starts lazily, returns 503 JSON if misconfigured)
  src/
    index.js                       Local/long-running server entry (also starts background sweepers)
    app.js                         Express app, security headers, CORS, routes
    config.js                      Reads + validates every environment variable
    db.js                          MongoDB connection and indexes
    middleware.js                  requireUser / requireAdmin
    security.js                    OTP hashing, session tokens, rate limiting
    database/                      schema.js (all collections, validators, indexes), setup.js
    routes/                        auth, products, orders, admin, uploads, webhooks, newsletter
    payments/razorpay/             Razorpay client + signature checks
    mail/                          Mailjet/SMTP transport, templates, confirmation sender
    storage/cloudinary/            Signed uploads and folder rules
    scripts/                       db-setup, db-check, seed-catalog, image upload helpers
  test/                            16 unit tests (node --test)

docs/MONGODB_SETUP.md              Atlas, collections, security, deployment checklist
DESIGN.md / PRODUCT.md             Design system and product brief
.agent/                            Design-assistant tooling (not part of the shop)
```

---

## 6. Run it on your computer

You need Node.js 20.19+ (or 22.12+) and npm.

```bash
npm install
npm --prefix server install
```

**Storefront only** (enough for browsing, bag and WhatsApp ordering):

```bash
npm run dev            # http://localhost:3000
```

**With the API** (needed only for checkout, accounts, newsletter):

1. Copy `server/.env.example` to `server/.env` and fill it in (see §8). Never commit `.env` files or paste secrets anywhere.
2. In another terminal: `npm run dev:server` (API on port 4000; Vite proxies `/api` to it).

Useful commands:

| Command | Purpose |
|---|---|
| `npm run typecheck` | TypeScript check (also run by `npm run build`) |
| `npm run build` | Production build into `dist/` |
| `npm --prefix server run check` | Syntax-check every server file |
| `npm --prefix server test` | Run the 16 backend tests |
| `npm --prefix server run db:setup` | Apply MongoDB validators and indexes (safe to re-run) |
| `npm --prefix server run seed:catalog` | Create the 3 products in MongoDB, **inactive with zero stock** |

---

## 7. Everyday editing

**Change a product** → `src/features/products/data/products.ts`
Set `name`, `slug`, `price` (whole rupees), descriptions and `images`. Optional facts (`material`, `purity`, `weight`, `dimensions`, `sizes`, `care`) only appear when filled in, so only enter what you have verified.

**Add or replace product photos** → upload to Cloudinary under
`silveram/<development|production>/products/<sku>/<name>` and reference them with `productImageUrl('SV-001', 'name')`. Photos are not stored in the repo or in MongoDB.

**Change homepage text, menu, FAQ** → `src/features/storefront/data/content.ts`
**Change policies** → `src/features/policies/data/policies.ts` (empty text shows a "not published yet" note)
**Change colours and fonts** → `src/styles/tokens.css`
**Change site name / public URL** → `src/shared/config/site.ts` (also update `index.html` canonical/OG URLs)

> Important: the storefront catalogue and the database are **two copies** of the products. The IDs (`product-1`, `product-2`, `product-3`) must match `_id` in MongoDB, and prices must match (`₹999` = `99900` paise). The server always charges the database price. See `server/src/scripts/seed-catalog.js`.

### Colour palette (Midnight Silver)

| Token | Value | Use |
|---|---|---|
| `brand-primary` | `#182D49` | Buttons, headings, dark sections |
| `surface-primary` | `#F8F7F4` | Page background (ivory) |
| `surface-secondary` | `#EEECE7` | Cards, soft areas |
| `accent-silver` | `#A7ADB5` | Lines, small accents |
| `danger` | `#9B2C2C` | Errors only |

---

## 8. Environment variables

### Storefront (public – baked into the build; never put secrets here)

| Variable | Meaning |
|---|---|
| `VITE_API_BASE_URL` | API address. Default `/api` (same website). |
| `VITE_WHATSAPP_NUMBER` | Indian mobile, e.g. `9XXXXXXXXX`. Without it the site shows "WhatsApp contact pending". |
| `VITE_CHECKOUT_ENABLED`, `VITE_RAZORPAY_ENABLED`, `VITE_NEWSLETTER_ENABLED` | Feature switches (`true`/`false`) |
| `VITE_INSTAGRAM_URL`, `VITE_CONTACT_EMAIL` | Optional footer contacts |
| `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_ROOT_FOLDER` | Optional overrides for image URLs |

### API (`server/.env` locally; Vercel → Environment Variables in production)

| Variable | Required | Meaning |
|---|---|---|
| `MONGODB_URI` | **yes** | Atlas connection string |
| `SESSION_SECRET` | **yes** | Random, ≥ 32 bytes |
| `OTP_PEPPER` | **yes** | Different random value, ≥ 32 bytes |
| `MONGODB_DB_NAME` | no | Default `silveram` |
| `FRONTEND_ORIGINS` | production | Exact `https://` website address(es), comma-separated. Never `*`. |
| `NODE_ENV`, `TRUST_PROXY_HOPS` | production | `production`, `1` |
| `ADMIN_EMAILS` | for admin | Comma-separated e-mails allowed to use admin APIs |
| `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `SMTP_FROM` | for e-mail | Sign-in codes and confirmations. `SMTP_FROM` must be a sender validated in Mailjet. |
| `MAILJET_CONTACT_LIST_ID` | newsletter | Numeric list ID |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | uploads | All three or none |
| `STORE_LIVE_CHECKOUT` | checkout | `true` only at launch (requires the mail settings) |
| `RAZORPAY_ENABLED`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | payments | Keep disabled for now |
| `STORE_NAME`, `STORE_URL`, `SUPPORT_EMAIL` | optional | Shown in e-mails |

If a required value is missing the API refuses to start (locally) or answers `503 {"error":"The API is not configured correctly."}` (on Vercel) and writes the exact reason to the Vercel logs.

---

## 9. How an online order works (when enabled)

1. Customer opens the bag → **Proceed to checkout**.
2. Enters e-mail → receives a 6-digit code (Mailjet). Only a hash of the code is stored; attempts and requests are rate-limited.
3. Verifying the code creates a login cookie (`HttpOnly`, only its hash is stored).
4. Customer enters name, mobile, address, city, state, PIN and picks **Cash on Delivery** (or Razorpay when enabled).
5. The API re-reads prices from MongoDB, checks stock, and in one transaction reduces stock and saves the order. The order ID is the browser's request ID, so a double-click cannot create two orders.
6. A confirmation e-mail is sent (at most once per order).
7. Admins can mark orders fulfilled or cancel COD orders (which gives the stock back).

Order states: `placed_cod`, `pending_payment`, `paid`, `fulfilled`, `cancelled`, `expired`, `refunded`, `payment_review`.

## 10. Database (MongoDB collections)

| Collection | Holds |
|---|---|
| `users` | Verified e-mail and name |
| `authChallenges` | Pending one-time codes (auto-expire) |
| `sessions` | Login sessions (auto-expire) |
| `rateLimits` | Request counters (auto-expire) |
| `products` | SKU, name, price in paise, stock, Cloudinary image references, `active` flag |
| `orders` | Customer, address, price snapshot, status, payment IDs |
| `webhookEvents` | Processed Razorpay events (stops duplicates) |

The full structure, rules and indexes are in `server/src/database/schema.js`.

---

## 11. Deploying on Vercel

Create **two** Vercel projects from this repository.

**A. Storefront**
- Root directory: repository root · Framework: Vite · Build: `npm run build` · Output: `dist`
- Set the `VITE_*` variables from §8. Redeploy after changing any of them.

**B. API**
- Root directory: `server`
- Add the API variables from §8 in Vercel (never upload `.env`).
- In MongoDB Atlas → Network Access, allow the API's outbound IP.
- Check `https://<api-domain>/api/health` returns `{"status":"ok"}`.

**Cookies need one site.** The login cookie is `SameSite=Lax`, so the storefront and API must share a registrable domain (for example `shop.example.com` and `api.example.com`), or `/api` must be proxied through the storefront's domain. Two different `*.vercel.app` addresses will not keep a login.

**Known limit on Vercel.** The background jobs that release expired Razorpay reservations and retry failed e-mails run only in the long-running Node server (`server/src/index.js`), not on Vercel. COD does not need them; Razorpay must stay off until a scheduler is added.

**If you see `500 FUNCTION_INVOCATION_FAILED`:** open Vercel → the API project → Logs. `server/app.js` now logs the real reason. The usual causes are a missing `MONGODB_URI` / `SESSION_SECRET` / `OTP_PEPPER`, secrets shorter than 32 bytes, a non-HTTPS `FRONTEND_ORIGINS` in production, or Atlas blocking the connection.

---

## 12. Before you take real orders (checklist)

- [ ] Verify real silver purity/hallmark for each piece, then update copy (the site currently makes purity claims that are not backed by product data).
- [ ] Publish shipping, returns, and terms policies.
- [ ] Set real stock and activate products in MongoDB; confirm prices match the storefront.
- [ ] Production Atlas cluster with backups; fixed API IP allowlisted.
- [ ] Mailjet sender domain validated (SPF + DKIM); send a test OTP and order e-mail.
- [ ] Real domain; update `SITE.url` and `index.html` URLs.
- [ ] Test COD end-to-end on staging, then switch `STORE_LIVE_CHECKOUT` and `VITE_CHECKOUT_ENABLED` to `true`.
- [ ] Only then consider Razorpay (needs a scheduler for reservation expiry).

## 13. Security rules

- Never commit, print or share `.env` files, Atlas credentials, Mailjet keys, Razorpay secrets, `SESSION_SECRET` or `OTP_PEPPER`. If one was ever shared, rotate it.
- `VITE_*` values are public. Secrets never belong there.
- Prices, stock and totals are always decided by the server, never by the browser.

More detail: [docs/MONGODB_SETUP.md](./docs/MONGODB_SETUP.md), [DESIGN.md](./DESIGN.md), [PRODUCT.md](./PRODUCT.md).
