# Contributing to Silveram

A short guide so a new developer can find things, change them safely and ship. For architecture, performance and setup details see [README.md](./README.md).

## First run

```powershell
nvm use                                  # Node 22 (see .nvmrc)
npm ci --include=dev
npm --prefix server ci
copy .env.example .env.local             # browser settings (public values only)
copy server\.env.example server\.env     # server secrets: never commit this file
npm run dev:server                       # API on :4000
npm run dev                              # storefront on :3000 (proxies /api to :4000)
```

## Before you open a pull request

```powershell
npm run validate    # type-check + production build + SEO prerender + server syntax check + server tests
```

CI runs the same command. Run `npm --prefix server run appwrite:check` when you change anything in `server/src/platform/appwrite-schema.js`.

## Where things live

| I want to... | Go to |
|---|---|
| Change a page's title / description / structured data | `src/shared/seo/pages.ts` (used by the app **and** the build-time prerender) |
| Add a page / URL | add it to `parseRoute` in `src/shared/routing/router.ts`, to `loaders` + the route switch in `src/app/App.tsx`; if it should rank in search, add it to `listIndexablePages()` in `src/shared/seo/pages.ts`; if it is private, add its path to the `X-Robots-Tag` block in `vercel.json` |
| Link to a page | plain `<a href="/shop">`; clicks are turned into in-app navigation automatically. In code use `navigate('/cart')` |
| Edit product copy / prices | `src/features/products/data/products.ts` (and keep the Appwrite record in step) |
| Change shared cart or sign-in state | `src/features/cart/store/cartStore.ts`, `src/features/auth/store/authStore.ts` (Zustand; read with selectors) |
| Add an API route | `server/src/routes/<name>.js`, mount it in `server/src/app.js`, add a test in `server/test/` |
| Add a database field | `server/src/platform/appwrite-schema.js`, then run `appwrite:setup` and `appwrite:check` |
| Cache something on the server | `server/src/cache.js` (`TtlCache`), and clear it wherever the data changes |
| Allow a new external script/image/iframe | the Content-Security-Policy in `vercel.json` |

## Conventions

- **TypeScript strict** in the storefront; the API is plain ES modules validated with Zod at the edge.
- **Feature folders** (`src/features/<name>/`) own their components, data and state. `src/shared/` is for code used by two or more features. Features may import from `shared`, not from each other's internals (stores and `*/data` modules are the exceptions).
- **Server code never trusts the browser**: prices, stock, ownership and order state are always re-read from Appwrite.
- **Independent awaits run together** (`Promise.all`); dependent ones stay in sequence.
- **Never commit** `.env*` files, keys or customer data (see [SECURITY.md](./SECURITY.md)).
- Keep comments for the *why*; the code already says the *what*.
- Commit messages: imperative, one topic per commit (`Add order lookup rate limit`).

## Repository tooling folders

`.agent/`, `.agents/` and `.claude/` hold AI-assistant skills used by the maintainers' editors. They are not part of the website and are never deployed.
