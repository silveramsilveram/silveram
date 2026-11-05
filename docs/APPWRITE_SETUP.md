# Appwrite setup and operations

This project uses Appwrite for customer accounts and application data. The API uses the Appwrite Node SDK from the Vercel server function. Browser code must never contain an Appwrite API key or write directly to private collections.

## 1. Create project and database

1. Create an Appwrite project in the region appropriate for your customers and configure its web platform hostname for the Vercel storefront. Copy the project ID and region-specific endpoint from the Console; for example, Singapore projects use `https://sgp.cloud.appwrite.io/v1`.
2. The setup command creates the Appwrite database with ID `silveram` (or the value of `APPWRITE_DATABASE_ID`) and its private collections.
3. Generate a temporary Appwrite server key with `databases.read/write`, `collections.read/write`, `attributes.read/write`, and `indexes.read/write` scopes for schema provisioning. Run the setup command from a trusted local machine. Do not store this key in Vercel:

   ```powershell
   Copy-Item server\.env.example server\.env
   # Fill APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY,
   # APPWRITE_SETUP_API_KEY, OTP_PEPPER, and any local frontend origins.
   npm --prefix server run appwrite:setup
   ```

4. Revoke the temporary setup key after the collections and indexes are provisioned.
5. Create a separate runtime API key with `databases.read/write`, `collections.read/write`, `attributes.read/write`, `indexes.read/write`, `documents.read/write`, and `users.read/write` scopes. Place this key only in `APPWRITE_API_KEY` on the API/Vercel environment.
6. Run `npm --prefix server run appwrite:check` to verify that all collections, attributes, and indexes are available.

`appwrite:setup` is idempotent for existing resources. It creates private collections with no public permissions; it does not delete or migrate records. For custom collection IDs, configure the corresponding `APPWRITE_*_COLLECTION_ID` variables before setup, then keep the IDs unchanged in all environments.

The JSON attribute sizes are intentionally bounded to fit Appwrite Cloud collection limits while covering the current API payload limits. Validate the project's limits and application payloads before increasing them.

## 2. Data model

| Collection | Purpose | Important fields and controls |
|---|---|---|
| Appwrite Auth users | Verified customer identities | Email/name managed with Appwrite Users API; generated password is random and never returned |
| `profiles` | Customer profile timestamps | Document ID is the Appwrite user ID; email, name, created/login timestamps |
| `auth_challenges` | Email OTP challenge | Email, peppered code digest, attempt count, create/send/expiry timestamps; raw OTP is never stored |
| `auth_consumptions` | OTP replay protection | Deterministic one-time marker for a verified challenge |
| `sessions` | API cookie sessions | SHA-256 token hash, Appwrite user ID, email and expiration; token is `HttpOnly` in the browser |
| `rate_limits` | Shared per-window API limits | Hashed action/identity key, fixed window start and atomic counter |
| `products` | Catalog and inventory | SKU, text, category, price in paise, active state, stock, Cloudinary reference JSON |
| `orders` | Order and payment records | Owner/email, status, amount, item and shipping snapshots, payment references |
| `webhook_events` | Razorpay webhook idempotency | Hashed document ID, provider event ID/type and received timestamp |
| `email_claims` | Order confirmation send claims | Order ID, claim timestamp and sent timestamp |

Database numeric timestamps are Unix milliseconds. Orders store item and shipping snapshots as JSON strings to keep private, nested customer/order data in Appwrite. Product image metadata is JSON; the image/video binaries themselves belong only in Cloudinary.

## 3. Appwrite access model

- Keep all collections private (`permissions: []`, document security off); only server API keys access them.
- Do not put an Appwrite API key, Cloudinary API secret, Mailjet secret, Razorpay secret, OTP pepper, or session token in a `VITE_*` setting.
- Use a separate temporary setup key from the runtime API key. Revoke the setup key after provisioning.
- Restrict `ADMIN_EMAILS` to the exact normalized staff email addresses. Never trust a client-supplied role.
- Enable Appwrite’s built-in MFA for project owners/admins and use unique operator accounts. Protect project and API-key access with MFA.
- Configure Appwrite backups/retention appropriate to the business plan and test restore procedures before real orders.

## 4. Authentication and data flow

1. The browser requests an email code through `/api/auth/otp`.
2. The API normalizes/validates the email, applies Appwrite-backed rate limits, stores only an HMAC digest with a short expiry, and sends the code through the configured transactional email provider.
3. `/api/auth/verify` checks the digest with a timing-safe comparison, limits attempts, writes a one-time consumption marker, creates/updates the Appwrite Auth user/profile, and creates a random opaque session.
4. Only the raw opaque session token is sent in an `HttpOnly`, `SameSite=Lax` cookie; only its hash is stored in Appwrite. Logout deletes its session record.
5. Protected APIs check that session and the server-side admin allowlist before accessing customer/order/catalog data.

Set `OTP_PEPPER` to a cryptographically random value of at least 32 bytes. Keep it stable for the lifetime of active OTP challenges; rotating it invalidates pending codes.

## 5. Catalog and orders

Run `npm --prefix server run seed:catalog` after schema setup. Starter products are created inactive with zero stock. This script does not activate products or replace images/stock on an active product.

The server validates order quantities and re-reads current product price/stock from Appwrite. Order creation and inventory reservation use Appwrite database transactions; stock restoration on cancellation/expired reservation is also transactional. Checkout remains disabled unless `STORE_LIVE_CHECKOUT=true`, the frontend checkout feature flag is enabled, and transactional email is configured. Razorpay has additional independent gates. Keep both off until staging workflows are fully verified.

The local/long-running Node server starts reservation and email retry sweepers. Vercel serverless functions do not keep background timers alive. COD does not require the Razorpay reservation sweeper, but do not enable Razorpay on Vercel until a Vercel Cron or Appwrite scheduled function has been deployed and verified for expiry/email retries.

## 6. Cloudinary media and Appwrite Storage

Cloudinary is the single source for image/video binaries. Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and `CLOUDINARY_ROOT_FOLDER` on the server. Admin image upload signatures are short-lived and scoped to a product/site folder. The browser uploads media directly to Cloudinary; the API does not proxy file bytes.

Set public `VITE_CLOUDINARY_CLOUD_NAME` at build time to generate CDN image URLs after corresponding public IDs are uploaded. The Cloudinary cloud name is public; the API key and secret are not. Local optimized WebP fallbacks are bundled for the existing products.

Appwrite Storage is reserved for private **non-image/video** customer files if/when a feature requires them (for example, a private document attachment). No such customer-file upload feature is currently exposed. Do not use Appwrite Storage for product photos, avatars, or videos; keep all image/video media in Cloudinary and store only its references in Appwrite.

## 7. Vercel deployment

Use one Vercel project for storefront and API:

| Setting | Value |
|---|---|
| Repository | `silveramsilveram/silveram` |
| Root Directory | repository root (leave blank; **not** `server`) |
| Framework Preset | Vite |
| Install Command | `npm ci && npm --prefix server ci` (in `vercel.json`) |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| API function | `api/[...path].js` imports `server/app.js` |

Add backend variables in Vercel Project → Settings → Environment Variables for the required environments. Do not set `APPWRITE_SETUP_API_KEY` in Vercel. At minimum configure:

- `NODE_ENV=production`
- `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `APPWRITE_DATABASE_ID`
- `OTP_PEPPER` (random, at least 32 bytes)
- `FRONTEND_ORIGINS` (exact HTTPS storefront origins; no `*`)
- `ADMIN_EMAILS` (before admin routes are used)
- `CRON_SECRET` (random, at least 32 bytes, for the daily Vercel cleanup cron)
- Mailjet SMTP values if OTP or transactional email is used
- Cloudinary server values only if signed uploads are enabled
- Public build variable `VITE_CLOUDINARY_CLOUD_NAME` only after images are available there

`VITE_*` variables are public and baked into the storefront build. Never place secrets in them. A change to a `VITE_*` variable requires a new build/deployment.

The scheduled cleanup runs daily at 03:00 UTC and authenticates with `Authorization: Bearer <CRON_SECRET>`. Do not expose this route with a public bypass or log the secret. Payment-reservation expiry and email retries are separate jobs and are not yet scheduled on Vercel.

The API is same-origin under `/api`, so session cookies remain first-party. If a separate frontend/API host is introduced later, revisit CORS, cookie `SameSite`/domain policy, CSRF defenses, and origin allowlists before deploying.

### Diagnose `FUNCTION_INVOCATION_FAILED`

Inspect the latest Vercel deployment’s runtime logs and the failing function path:

- The storefront `/` must be served by Vite static output; it should not invoke Express.
- `/api/*` should invoke only `api/[...path].js`. Do not set the Vercel project root to `server/`.
- A missing Appwrite key/database or unreachable Appwrite service should return the API’s generic 503 startup response; the actual reason is logged server-side.
- Verify root framework is Vite, `server/` dependencies are installed, required server variables exist, and the latest source commit was deployed.

## 8. Email, privacy, and operations

Mailjet provides service email via SMTP and optional newsletter contact synchronization. Validate the sender/domain and SPF/DKIM before sending production email. Keep marketing consent separate from order/verification email.

Policies in `src/features/policies/data/policies.ts` are explicitly draft copy. Confirm the legal seller identity, data-retention periods, customer privacy contact, shipping/return terms, tax and pricing treatment before publication. Do not enable ordering based only on the technical setup.

Never copy legacy MongoDB credentials or any previously exposed provider keys into Appwrite/Vercel. Revoke/rotate exposed credentials with the provider. This project’s migration removes MongoDB code/config; existing MongoDB-hosted data is not automatically copied or deleted. If any legacy customer records exist, export/import them only through a separately reviewed, access-controlled migration and then securely decommission the old database.
