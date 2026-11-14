# Silveram admin: architecture, rollout and operations

The admin (`admin/`) is a separate Refine + Ant Design frontend. It has **no backend of its own**: it calls the existing Express API (`server/`) under `/api/admin/*`, which reads and writes the existing Appwrite project. Production URL: `https://admin.silveram.in`.

## 1. What was added

| Area | Where |
| --- | --- |
| Admin frontend | `admin/` (Vite, React 19, TypeScript strict, Refine v5, antd 5) |
| Admin API | `server/src/routes/admin.js` composing `server/src/admin/*` |
| Schema additions | `server/src/platform/appwrite-schema.js` (additive only) |
| Backfill script | `server/src/scripts/admin-backfill.js` |
| Demo fixture server (dev only) | `server/scripts/dev-fixture-server.mjs` |

Storefront code, `vercel.json`, checkout flags and the Cashfree/COD defaults are untouched. Checkout, expiry and webhook code gained **best-effort, idempotent bookkeeping** (stock-movement rows, ledger rows, searchable name/phone) that runs after the order commits and can never fail a checkout or a payment webhook.

Pre-existing bug fixed on the way: `PATCH /api/products/admin/:id` threw on zod 4 (`.partial()` on a refined schema) and, even without the refinement, would have reset `active`/`currency` to their defaults on every edit. It now uses a dedicated patch schema.

## 2. Roll-out order (important)

1. **Provision the schema first** (additive and idempotent, nothing is renamed or deleted):
   ```bash
   # server/.env needs APPWRITE_SETUP_API_KEY (temporary key with databases scope; never put it on Vercel)
   npm --prefix server run appwrite:setup
   npm --prefix server run appwrite:check
   ```
   Creates `product_price_history`, `inventory_movements`, `order_events`, `transactions`; adds optional attributes to `orders` (`customerName`, `customerPhone`, `shippingStatus`, `expectedDispatchAt`, `dispatchedAt`, `estimatedDeliveryAt`, `deliveredAt`, `carrier`, `trackingNumber`, `trackingUrl`, `codCollectedInPaise`, `codRemittedInPaise`) and new indexes (including fulltext `name_search` on products/customers and `customer_name_search` on orders). Wait until the script reports every index available.
2. **Backfill searchable order fields** (dry run first; fills only missing values, never overwrites):
   ```bash
   npm --prefix server run admin:backfill
   npm --prefix server run admin:backfill -- --apply
   ```
3. **Deploy the API** (the existing Vercel project). Add the admin origin to `FRONTEND_ORIGINS` (exact origin, no wildcard): `https://www.silveram.in,https://silveram.in,https://admin.silveram.in`. Confirm `ADMIN_EMAILS` lists the administrators. Optional: `LOW_STOCK_THRESHOLD` (default 3).
4. **Deploy the admin** (section 4).

Backend newer than the database: admin pages show a banner listing what is missing (`/api/admin/me` probes it) and the affected screens fail with an error; customer checkout is unaffected. Admin newer than the backend: the layout warns when the API version differs.

## 3. Authentication, CORS and cookies

* Login is the existing passwordless e-mail OTP (`/api/auth/otp`, `/api/auth/verify`). The session is the existing HTTP-only `silveram_session` cookie (`Secure`, `SameSite=Lax`, `Path=/api`). Nothing is stored in `localStorage`.
* A valid session is **not** admin access. The admin calls `GET /api/admin/me`, which runs `requireUser` + `requireAdmin` (server-side `ADMIN_EMAILS`). 401 -> login, 403 -> a terminal "access denied" page, outage -> a retry page. No redirect loops.
* Every `/api/admin/*` route, plus the product admin routes and `/api/uploads/sign`, enforces admin on the server. State-changing calls additionally require a trusted `Origin` (same host or exact entry of `FRONTEND_ORIGINS`), which blocks cross-site form posts even though the cookie is `SameSite=Lax`.
* **Cookie scope.** The session cookie has no `Domain`, so it is host-only. Calling `www.silveram.in/api` straight from `admin.silveram.in` would not carry it. The admin therefore calls its **own** `/api` and `admin/vercel.json` rewrites `/api/*` to `https://www.silveram.in/api/*`. The browser sees one origin (cookie set for `admin.silveram.in`, no CORS preflight); the session itself lives in Appwrite, so both hosts accept it. Per-IP OTP limits will see Vercel's proxy address for admin sign-ins; the per-e-mail limits still apply.
* Money, price, stock, status and shipping writes are audited with the authenticated admin's e-mail, taken from the session, never from the request body.

## 4. Deploying `admin/` as its own Vercel project

1. New project from the same repository, **Root Directory `admin`**, framework Vite, install `npm ci`, build `npm run build`, output `dist` (already in `admin/vercel.json`).
2. Domain `admin.silveram.in`. No environment variables are required. Optional public `VITE_API_BASE_URL` (keep `/api`) and `VITE_CLOUDINARY_CLOUD_NAME`.
3. If the storefront project's canonical host is not `www.silveram.in`, edit the rewrite destination in `admin/vercel.json`.
4. Verify after deploying: open `/login`, request a code, sign in; `/settings` should show integrations and "admin schema ready"; `https://admin.silveram.in/api/health` returns `{"status":"ok"}`.

## 5. Local development

```bash
npm --prefix server run dev          # API on :4000 (needs server/.env; add http://localhost:3100 to FRONTEND_ORIGINS)
npm --prefix admin install
npm --prefix admin run dev           # admin on :3100, /api proxied to :4000
```
Without credentials you can explore the UI with **made-up demo data**: `node --experimental-test-module-mocks server/scripts/dev-fixture-server.mjs`, then `ADMIN_DEV_API_TARGET=http://localhost:4010 npm --prefix admin run dev`. This is dev-only and signs in a demo administrator automatically.

## 6. Financial definitions

All money is integer paise; test-payment orders are excluded from every real-money figure.

* **Orders placed**: all real orders in the period, any status.
* **Confirmed order / gross order value**: status `placed_cod`, `paid`, `fulfilled` or `refunded` (value of what was sold, not cash).
* **Confirmed online collections**: Cashfree orders that are `paid`, `fulfilled` or `refunded`. `pending_payment` never counts.
* **COD order value** is owed money. **COD collected / remitted** only exist once an operator records them (operator-entered, not bank-verified). **COD awaiting** = order value - collected.
* **Refunds**: only Cashfree refunds confirmed by signed webhook and stored in the ledger. A `refunded` label alone subtracts nothing.
* **Net collected (recorded)** = online collections + COD cash collected - recorded refunds.
* Periods use `Asia/Kolkata`. A month before the first stored order is shown as **unavailable**, never as zero. The ledger starts when tracking began; screens say so.

## 7. Not built (deliberate)

Refund initiation, Cashfree settlement reconciliation, live courier tracking, partial COD collection, category analytics, customer-summary exports and marketing messages. The UI states this where relevant rather than showing fake screens.

## 8. Rollback

* **Admin frontend**: redeploy the previous Vercel deployment; nothing else depends on it.
* **API**: redeploy the previous deployment. New collections/attributes stay in place harmlessly (the old code ignores them). Nothing was renamed or removed, so no data rollback is needed.
* **Schema**: do not delete the new collections; they hold audit history. Optional attributes on `orders` can stay unused indefinitely.
* **Backfill** only fills empty fields; to undo, clear `customerName`/`customerPhone` on the affected orders (storefront does not read them).

## 9. Tests

```bash
npm run typecheck && npm run build         # storefront (unchanged)
npm --prefix server run check && npm --prefix server test
npm --prefix admin run typecheck && npm --prefix admin test && npm --prefix admin run build
```
Server tests include: 401/403 on every admin route, CSRF origin checks, order filters/pagination/search, the shipping state machine, COD cancel restoring stock once (including two simultaneous requests), COD cash rules, price-history audit, stock adjustment idempotency, analytics definitions, CSV formula injection, and webhook signature/replay/ledger behaviour.
