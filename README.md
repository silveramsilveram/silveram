# Silveram

Silveram is an Indian silver gifting and jewellery storefront. The repository contains a React storefront and an Express API deployed together on Vercel. Appwrite provides backend authentication and application data; Cloudinary stores and delivers all product/site images and videos.

> **Launch status:** the storefront is available at [silveram.in](https://silveram.in/). Email checkout, COD, Cashfree, and newsletter signup remain disabled by default. Configure Appwrite, Cloudinary, email, verified product/inventory facts, policies, and production environment variables before enabling any transactional feature.

## Architecture

```text
Customer browser
  ├─ Static React 19 + Vite storefront ─────────────── Vercel
  └─ Same-origin /api/* requests ── Express function ─ Vercel
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
| Storefront | React 19, TypeScript, Vite, Tailwind CSS 4, GSAP |
| API | Node.js, Express 5, Zod, Helmet, CORS |
| Accounts/data | Appwrite Auth, Databases, and SDK; server-only access |
| Media | Cloudinary signed uploads and CDN delivery |
| Email | Mailjet SMTP and optional contact-list API |
| Payments | Cashfree Payments (UPI, UPI QR, debit/credit cards), disabled until configured |
| Deployment | One Vercel project, Vite output plus Vercel Node.js API function |

## Features

- Responsive storefront, homepage sections, product listing/detail routes, product galleries, FAQ and draft policy dialogs.
- Shopping bag with browser-local persistence and WhatsApp enquiry messages.
- Express API routes for Appwrite-backed email OTP, sessions, catalog administration, orders, stock reservations, image-upload signatures and newsletter subscriptions.
- Server-side price/stock validation and Appwrite database transactions for order inventory changes.
- Cloudinary uploads use short-lived, admin-authorized signatures; media binaries do not pass through the API.
- Checkout, Cashfree, and newsletter features remain disabled unless explicitly enabled and configured.

## Repository structure

```text
api/
  index.js                         Vercel API function entry (vercel.json rewrites /api/* here)
src/
  app/                             Storefront assembly and hash routing
  features/
    cart/                          Cart context, drawer and persistence
    checkout/                      Disabled-by-default checkout UI
    policies/                      Draft policy text and modal
    products/                      Product cards, galleries, detail pages and static copy
    storefront/                    Homepage content and sections
    whatsapp/                      Contact settings and message builders
  shared/
    config/                        Public site configuration
    hooks/                         Shared UI hooks
    lib/                           API client, Cloudinary URLs, SEO and formatting
    ui/                            Shared accessible UI
  styles/                          Theme tokens and global styles
server/
  app.js                           Lazy Vercel API bootstrap
  src/
    app.js                         Express security middleware and route assembly
    config.js                      Validated server-only environment configuration
    catalog.js                     Shared server catalog enums
    platform/
      appwrite.js                  Appwrite SDK client, document and transaction helpers
      appwrite-schema.js            Appwrite collection/attribute/index definitions
    routes/                        Auth, products, orders, admin, upload, email/webhook APIs
    security.js                    OTP hashing, opaque sessions and persisted rate limits
    mail/                          Mailjet transport and transactional email templates
    payments/cashfree/             Order creation, payment verification, webhook signature (gated)
    storage/cloudinary/            Signed image/video upload helpers and folder policies
    scripts/                       Appwrite provisioning, checks, catalog seed and media upload
  test/                             Node test suite
docs/
  APPWRITE_SETUP.md                 Appwrite setup, schema, security and deployment guide
public/images/products/             Optimized WebP fallback images
vercel.json                         Vercel build and API function configuration
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
| `npm --prefix server run seed:catalog` | Add or refresh inactive starter products with zero stock |
| `npm --prefix server run upload:catalog-images -- --environment=production` | Sync catalog images/videos from `public/images/products` to Cloudinary and save references in Appwrite |

## Shopping journey, accounts and e-mails

**Cash on delivery (COD) is the primary payment method. UPI and debit/credit cards (Cashfree) show as "Coming soon" until the gateway is approved and enabled. There is no ordering through WhatsApp: WhatsApp (+91 77669 11777) is for questions only.**

Every step is its own page (hash routes, no server rewrites needed):

| Page | Route | Purpose |
|---|---|---|
| Home | `#/` | Landing page |
| Shop | `#/shop` | All products |
| Product | `#/product/<slug>` | Details, Add to Cart, Buy Now |
| Bag | `#/cart` | Review items and quantities |
| Details | `#/checkout` | Contact (guest e-mail or signed-in account) and delivery address |
| Payment | `#/checkout/payment` | Cash on delivery (UPI / card: coming soon) |
| Confirmation | `#/order/<id>` | Receipt and status |
| Sign in / Create account | `#/signin`, `#/signup` | Passwordless: e-mail + 6-digit code |
| Account | `#/account` | Order history, sign out |
| Track order | `#/track` | Guests: order reference + e-mail |
| Policies | `#/policy/<shipping|returns|privacy|terms>` | Store policies |

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

**Payments.** The real gateway is not connected yet. Until then set `PAYMENT_TEST_MODE=true` (API, needs `STORE_LIVE_CHECKOUT=true`) and `VITE_TEST_PAYMENT_ENABLED=true` (storefront): the payment page offers a dummy **UPI** form (`success@upi` succeeds, `failure@upi` is declined) and a dummy **card** form (`4111 1111 1111 1111` succeeds, `4000 0000 0000 0002` is declined). The order is marked paid with payment method `test` and the email says it is a test order. When Cashfree is configured (`RAZORPAY_ENABLED` / `VITE_RAZORPAY_ENABLED`), its hosted screen (UPI, debit and credit cards) is offered instead. If neither is enabled the payment page says payments are being set up. **Turn test mode off before accepting real orders.**

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

## Security and operational notes

- Store secrets only in local ignored `server/.env` and Vercel’s server environment settings. Never commit `.env`, provider credentials, API keys, or customer data.
- The Appwrite API key is server-only. Public collection permissions stay empty; Vercel’s API performs authorization. Use a separate temporary setup key to provision schema, then revoke it.
- User sessions use random opaque tokens in `HttpOnly`, `SameSite=Lax` cookies; only a hash is stored in Appwrite. OTPs are HMAC-digested, short-lived, attempt-limited, and rate-limited.
- Email, database and Cloudinary failures return explicit API errors; do not enable checkout as a way to test missing integrations.
- Appwrite database transactions protect stock/order writes. Vercel Cron calls the secret-protected `/api/cron/cleanup` route daily to prune expired sessions, challenges, rate-limit records, webhook records, and stale email claims. `CRON_SECRET` must be a random value of at least 32 bytes.
- Payment reservation expiry and email retry jobs run in the long-running local server only; do not enable Cashfree on Vercel until those jobs are migrated to a verified scheduler.
- Appwrite is not configured in this workspace and no live Appwrite, Cloudinary or Mailjet call has been verified. A green local build is not proof of production readiness.
- The privacy/terms/shipping/returns text is marked as a draft and requires business/legal review. The domain, commercial terms, product claims and stock must be confirmed before launch.
- Previously exposed credentials must be revoked/rotated. Never re-use credentials that were pasted into chat.

## Validation before launch

```powershell
npm run build
npm --prefix server test
npm --prefix server run check
npm --prefix server run appwrite:check
```

Then stage-test account creation, email OTP rate limits, session/logout, product reads, private admin access, signed Cloudinary uploads, order creation/cancellation and order email. Enable payment methods only after payment-provider webhook testing and required scheduled cleanup are verified.

For design and product notes, see [DESIGN.md](./DESIGN.md) and [PRODUCT.md](./PRODUCT.md).
