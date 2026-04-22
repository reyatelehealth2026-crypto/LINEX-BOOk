# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

LineBook — a **multi-tenant SaaS** for LINE-based booking (salons / nail / spa). One deployment hosts many shops. Each shop brings its own LINE OA + LIFF credentials (stored in `shops` table), and is reached at `<slug>.${ROOT_DOMAIN}`.

Stack: Next.js 16 App Router · React 19 · Supabase (Postgres + Realtime) · LINE Messaging API + LIFF · Tailwind.

## Commands

```bash
npm run dev              # Next dev server (expects ROOT_DOMAIN=localhost for subdomain testing)
npm run build
npm run lint             # next lint
npm run richmenu         # scripts/setup-richmenu.mjs — legacy single-tenant rich menu
npm run reminders        # scripts/send-reminders.mjs  — legacy single-tenant reminder cron
npm run seed:demo        # scripts/seed-demo.mjs
```

There is no test suite. Type-checking runs via `next build` / `next lint`; there is no separate `tsc` script.

For local subdomain dev use `ROOT_DOMAIN=localhost` — Chrome/Safari resolve `*.localhost` automatically, no `/etc/hosts` edit needed. For LINE webhook/LIFF against localhost, use `ngrok http 3000` and paste the URL into LINE console.

Apply DB schema via Supabase SQL editor: run `supabase/schema.sql` first, then every file in `supabase/migrations/` **in numeric order** (001 → 011). `011_saas_multitenant.sql` is the one that turns the app from single-tenant into SaaS — without it, signup and subdomain routing won't work.

## Tenant resolution — the core architectural concept

Every request must resolve to exactly one shop. There are **three** resolution paths, and they're tried in this order inside `getCurrentShop()` (`src/lib/supabase.ts`):

1. **AsyncLocalStorage** (`src/lib/request-context.ts`) — set by `runWithShopContext(ctx, fn)`. Used when the request can't carry a subdomain: the LINE webhook (single URL, tenant resolved from the event payload's `destination` field) and the cron handler (iterates all shops, running each inside its own context).
2. **`x-shop-slug` request header** — injected by `src/proxy.ts` (Next.js 16 renamed middleware → "proxy"; same concept, file lives at `src/proxy.ts`). Proxy parses the host, extracts the subdomain slug, and forwards it on *request* headers via `NextResponse.next({ request: { headers } })`. Proxy is intentionally DB-free to avoid cold-start cost — the actual shop lookup (with 30s in-memory cache) happens lazily in handlers.
3. **`DEFAULT_SHOP_ID` env** — legacy single-tenant fallback for scripts and pre-SaaS deployments.

Consequences:
- **Never read shop_id from an env var inside an API route.** Use `await getCurrentShopId()` or `await getCurrentShop()`. The legacy `SHOP_ID` export is a Proxy-ish object with `valueOf()` / `toJSON()` that pulls from AsyncLocalStorage at access time — it's kept for backward compat, but prefer the async accessor in new code.
- **Background work (webhook/cron) must wrap each shop's processing in `runWithShopContext`** — otherwise `getCurrentShop()` and the `SHOP_ID` proxy fall back to `DEFAULT_SHOP_ID` and will silently cross-contaminate data.
- **LINE credentials are also tenant-scoped.** `src/lib/line.ts` resolves access token / channel secret in this order: explicit arg → `currentAccessToken()` from AsyncLocalStorage → env var. Cron and webhook set these via the context; subdomain-scoped API routes call `getShopLineCredentials(shopId)` or `credsFromShop(shop)`.

Routing rules live in `src/proxy.ts`:
- Root-only paths (`/signup`, `/api/signup`) accessed on a tenant subdomain → 302 to root.
- Tenant-only paths on the root domain → 302 to `/`, **except** `/api/line/webhook`, `/api/cron/*`, `/api/signup` which are intentionally multi-tenant-aware and allowed on root.

## Super-admin (platform operator)

Separate from the per-shop admin system. Super admins are NOT scoped to a shop — they can list/edit every shop and impersonate any shop's admin.

- Table: `super_admins` (migration 012) — no `shop_id` column.
- Auth: `src/lib/super-admin-auth.ts` issues a signed httpOnly cookie (`super_admin_session`, HMAC with `SUPER_ADMIN_SESSION_SECRET` or fallback service-role key). `verifySuperAdmin(req)` reads the cookie; there is no in-request shop context.
- Routes: `/super/login`, `/super` (list), `/super/shops/[id]` (edit) — all on the root domain. Proxy (`src/proxy.ts`) redirects unauthenticated `/super/*` to `/super/login` and forwards `x-super-admin: 1` when a session cookie is present.
- `getCurrentShop()` honors the `x-shop-id` request header **only** when `x-super-admin: 1` is also set — that's how super-admin API routes talk to shop-scoped code.
- Impersonation: `POST /api/super/shops/[id]/impersonate` mints a short-lived (120s) signed token. The link goes to the tenant subdomain's `/admin/impersonate?token=…` page, which calls `/api/admin/impersonate/redeem` to plant a 30-min `super_admin_impersonation` cookie. `verifyAdmin()` accepts that cookie as an alternate auth mode (mode=`password`, role=`owner`).
- Seed a super admin: `npm run create-super-admin -- --email you@example.com --password s3cret` (upserts into `super_admins`).

Important: the impersonation cookie is host-only (the subdomain only), so it doesn't leak cross-tenant. The super-admin session cookie is only valid on the root domain.

## Admin auth

Per-shop, not global. `verifyAdmin(req)` in `src/lib/admin-auth.ts`:
- **Password mode**: `x-admin-password` header → scrypt-compared against rows in `admin_users` WHERE `shop_id = currentShop` (rate-limited per-IP). Falls back to `ADMIN_PASSWORD` env only if the shop has no admin_users rows.
- **LINE idToken mode**: `x-line-id-token` header verified against `https://api.line.me/oauth2/v2.1/verify` using the shop's `liff_id` as client_id, then matched against `admin_users.line_user_id` for that shop.

Password hashing uses node's built-in `crypto.scryptSync` (no bcrypt dep) — format `scrypt$<salt-hex>$<hash-hex>`.

## Signup & onboarding flow

`/signup` → `/api/signup` creates the shop row with slug, LINE credentials, business_type. Then `installPreset(shopId, key)` (`src/lib/presets/index.ts`) seeds services, working hours, message templates, and one placeholder staff linked to every service. Redirects to `https://<slug>.<ROOT_DOMAIN>/admin/setup` where the owner can click "install rich menu" (calls `uploadRichMenuForShop`, `src/lib/rich-menu.ts`) to push a LINE rich menu using the shop's own token.

`shops.onboarding_status` (`pending` → `setup_in_progress` → `completed`) gates which shops the cron iterates.

## Double-booking prevention

Enforced at the DB layer via a Postgres exclusion constraint (`EXCLUDE USING gist` on staff_id × tstzrange). Violations surface as SQLSTATE `23P01` — handlers catch this code and return HTTP 409. Don't replicate the check in application code; trust the constraint.

## LIFF / webhook communication patterns

- **Webhook** (`src/app/api/line/webhook/route.ts`) — receives events, resolves shop via `destination` → `getShopByLineOaId`, then wraps the rest in `runWithShopContext`. Per-user event processing is serialized via an in-process `Map<userId, Promise>` queue (`globalThis.__lineEventQueues`) and rate-limited (20 evts/min/user).
- **LIFF pages** (`src/app/liff/*`) — client components that call `/api/*` with `lineUserId` from the LIFF SDK. MVP trusts the client-supplied userId; production should verify the idToken server-side (see note in README).
- **Admin panel** (`src/app/admin/*`) — subscribes to Supabase Realtime channels for live queue updates; auth via `x-admin-password` stored in `sessionStorage` and passed through `AdminContext` (`src/app/admin/_ctx.ts`).

## Flex messages & i18n

All Flex message builders live in `src/lib/flex.ts`. They accept a theme id (see `src/lib/shop-theme.ts`, migration 010) and render per-shop colors. i18n via `src/lib/i18n.tsx` (th default, en toggle inside LIFF).

## Cron

`vercel.json` schedules `/api/cron/reminders` every 10 min. Handler loops over shops with `onboarding_status = 'completed'`, and for each shop calls `runWithShopContext({ shop, accessToken, channelSecret }, () => ...)` so the inner push/DB code picks up the correct credentials automatically. Optional `CRON_SECRET` env — if set, handler requires `Authorization: Bearer <secret>`.

## Things that will bite you

- `src/proxy.ts` (not `src/middleware.ts`) — Next.js 16 rename. File *must* export `proxy` (not `middleware`) and a `config` with `matcher`.
- When inserting rows, **always** include `shop_id: await getCurrentShopId()` (or pass `SHOP_ID` which serializes via `toJSON()`). The schema has `shop_id` defaulting to 1 on most tables for legacy compat — omitting it will silently write to shop 1.
- The in-memory shop cache (`slugCache` / `idCache` in `src/lib/supabase.ts`, 30s TTL) is per-lambda-instance. After updating a shop row, call `invalidateShopCache(id-or-slug)` or accept up to 30s of staleness.
- Numeric migrations are additive and idempotent where possible — prefer `alter table ... add column if not exists` / `create table if not exists` patterns already established.
