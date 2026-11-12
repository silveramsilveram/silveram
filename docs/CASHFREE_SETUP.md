# Cashfree setup (UPI, QR code, debit/credit cards)

## How it works
1. Customer picks "UPI, QR code, debit or credit card" at checkout; `POST /api/orders` reserves stock and
   creates a Cashfree order (id = our order id, amount always recomputed from Appwrite prices).
2. The browser opens Cashfree's hosted popup with the returned `payment_session_id` (QR, UPI apps, cards).
3. When the popup closes the browser calls `POST /api/orders/:id/verify-cashfree`; the server asks Cashfree
   for the payment itself and only then marks the order `paid`.
4. Cashfree also calls `POST /api/webhooks/cashfree` (signed with your secret key). The webhook is the
   safety net for customers who close the tab after paying. Events are idempotent.
5. A payment for an expired order or a wrong amount sets the order to `payment_review` for manual action.

## Go-live checklist
1. Cashfree dashboard: finish merchant KYC, activate Payment Gateway, enable UPI, cards (and QR) under
   Payment Methods, and whitelist `silveram.in` under Developers > Whitelisted Domains.
2. Developers > API Keys: copy the **Production** App ID and Secret Key.
3. Developers > Webhooks: add `https://www.silveram.in/api/webhooks/cashfree`, select Payment Success, Failed,
   User Dropped and Refund events (webhook version 2025-01-01 or 2023-08-01). Use the exact canonical
   host: `silveram.in` redirects (308) to `www.silveram.in` and Cashfree does not follow redirects.
4. Vercel env (Production): `CASHFREE_ENABLED=true`, `CASHFREE_ENV=production`, `CASHFREE_APP_ID`,
   `CASHFREE_SECRET_KEY`, `STORE_LIVE_CHECKOUT=true`, `STORE_URL=https://www.silveram.in`,
   `FRONTEND_ORIGINS=https://www.silveram.in,https://silveram.in`, `PAYMENT_TEST_MODE=false`, and `VITE_CASHFREE_ENABLED=true`,
   `VITE_CHECKOUT_ENABLED=true`, `VITE_TEST_PAYMENT_ENABLED=false`, and a random `CRON_SECRET` of at least 32 bytes
   (VITE_* need a redeploy). Cashfree startup is rejected if the expiry-job secret is missing.
5. Run `npm --prefix server run appwrite:setup` once (needs a temporary `APPWRITE_SETUP_API_KEY`) to add the
   `cashfreeOrderId` / `cashfreePaymentId` attributes and index. Wait until they are "available".
   Then run `npm --prefix server run appwrite:check`; it must report 0 failures. Skipping this makes every
   online-payment checkout fail with "The server could not complete this request." (Appwrite rejects the
   unknown `cashfreeOrderId` attribute). Remove the setup key afterwards.
6. Vercel Hobby only allows daily crons, so `/api/cron/cleanup` runs at 03:00 UTC and
   `/api/cron/reservations` at 03:30 UTC. Expired reservations are additionally released (throttled to once
   a minute) whenever a customer starts checkout. On a Pro plan, change the reservations schedule in
   `vercel.json` to `*/5 * * * *`. Verify that an expired test reservation is released before accepting
   live payments.
7. Test first with sandbox keys (`CASHFREE_ENV=sandbox`) on a preview deployment, then place one real
   low-value order in production and refund it from the Cashfree dashboard.
