# Security policy

## Reporting a vulnerability

E-mail **silveramsilveram@gmail.com** with the subject "Security". Please include what you found, how to reproduce it, and the impact. Do not open a public issue for security problems and do not access other customers' data while testing. We aim to reply within 3 working days.

## How the project protects customers (summary)

- **Secrets stay on the server.** Appwrite API keys, the OTP pepper, Cashfree and Cloudinary secrets exist only in `server/.env` (local) and Vercel's environment settings. Only `VITE_*` values are public and are bundled into the browser code.
- **No public database access.** Appwrite collections have empty permissions; every read/write goes through the API, which validates input with Zod and re-prices every order from the database.
- **Sessions:** random opaque tokens in `HttpOnly`, `Secure`, `SameSite=Lax` cookies; only a SHA-256 hash is stored. One-time codes are HMAC-hashed, short-lived, attempt-limited and rate-limited.
- **Payments:** Cashfree webhooks are verified with an HMAC signature over the raw body; the browser is never trusted to say an order is paid.
- **Browser hardening:** `Content-Security-Policy`, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy` are set in `vercel.json`; the API adds Helmet headers.
- **Dependencies:** `npm audit` runs in CI (`.github/workflows/ci.yml`).

## Rules for contributors

- Never commit `.env` files, API keys, customer data or screenshots that show them. If a secret is ever pasted into chat, a ticket or a commit, **rotate it immediately**.
- Any new `fetch`/script/image/iframe origin the storefront needs must also be added to the Content-Security-Policy in `vercel.json`.
- Never build HTML from user input; React escapes by default, so avoid `dangerouslySetInnerHTML`.
