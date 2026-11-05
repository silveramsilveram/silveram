# Razorpay integration

This directory is the isolated Razorpay provider adapter. It is prepared for a later merchant-account integration; **online payment is disabled** until the account and end-to-end flows have been configured and tested.

## Current safeguards

- `RAZORPAY_ENABLED=false` on the API and `VITE_RAZORPAY_ENABLED=false` in the storefront build.
- The API configuration refuses to enable Razorpay unless checkout is enabled and all three server credentials are present.
- Checkout remains globally gated by `STORE_LIVE_CHECKOUT=false` and `VITE_CHECKOUT_ENABLED=false`.
- If the globally gated checkout UI is enabled for staging, COD is the only method currently shown.
- Do not set these switches to `true` for production until the launch checks below are complete.

## Code map

| File | Responsibility |
|---|---|
| `client.js` | Creates provider orders and verifies captured payment details against the provider API |
| `signatures.js` | Constant-time verification of checkout and webhook HMAC signatures |
| `../../routes/orders.js` | Reserves inventory, creates the local order, verifies ownership/payment, records capture |
| `../../routes/webhooks.js` | Accepts signed, replay-protected payment capture/refund events |
| `../../app.js` | Parses Razorpay webhook bytes as raw JSON before normal API JSON middleware |

The provider secret is never returned to the browser. The public key identifier is sent to checkout only when the online method is intentionally enabled.

## Later setup checklist

1. Activate the Silveram merchant account with Razorpay and complete its business/KYC requirements.
2. Configure **test** credentials first in the API host's encrypted secret manager (or the ignored local `server/.env` for development):
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET`
3. Point the provider's webhook to `https://<api-host>/api/webhooks/razorpay`. Subscribe to the capture and refund events used by `server/src/routes/webhooks.js`; copy the webhook secret only into the API secret manager.
4. Verify automatic capture configuration, successful/failed/cancelled payment, wrong signatures, duplicate webhook delivery, out-of-order events, and browser-close reconciliation with test credentials.
5. Ensure pending-payment inventory reservations are reliably expired and stock is restored. The local long-running Node server has a timer, but Vercel serverless functions do not. Vercel Hobby cron runs only once per day, too slowly for the 30-minute reservation; use a suitable per-minute scheduler/worker before enabling payments on Vercel.
6. Test refunds, provider reconciliation, support escalation, alerting, and production key rotation. Do not claim a charge succeeded based only on the browser callback.
7. Set `RAZORPAY_ENABLED=true` only on the API and `VITE_RAZORPAY_ENABLED=true` only in the storefront build after review and staging sign-off. Keep the global checkout gates off until the complete COD/online checkout launch is separately authorized.

## Security and operations

- Keep all credentials server-only; never use `VITE_RAZORPAY_KEY_SECRET` or expose webhook secrets.
- Store only provider order/payment identifiers and verified payment state needed for reconciliation. Never store card numbers, CVVs, UPI PINs, or other payment credentials.
- Webhook endpoint must receive the original raw request body for HMAC verification. Do not bypass signature verification or mark orders paid from client-controlled fields.
- Keep provider changes isolated in this directory. Add unit tests for every signature and provider response validation change, plus staging integration tests for new event types.
- Refunds, payment cancellation, and late-capture inventory recovery require an audited workflow. A signed webhook should not silently release inventory for a captured payment.

For Appwrite credentials, collection structure, access controls, deployment, and the full checkout launch checklist, see [Appwrite setup](../../../../docs/APPWRITE_SETUP.md).
