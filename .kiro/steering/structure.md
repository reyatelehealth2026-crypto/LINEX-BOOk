---
inclusion: auto
---

# Project Structure

## Root Directory

```
linebook/
├── src/                    # Application source code
├── supabase/              # Database schema and migrations
├── scripts/               # Utility scripts (richmenu, reminders, seed)
├── public/                # Static assets
├── design/                # Design system and brand assets
├── docs/                  # Documentation
└── .claude/               # Claude AI workspace settings
```

## Source Code Organization (`src/`)

### Application Routes (`src/app/`)

Next.js App Router structure with route-based organization:

- **`/admin/`** - Shop owner admin panel
  - Real-time booking queue management
  - Services, staff, hours configuration
  - Customer CRM views
  - Analytics and reports

- **`/liff/`** - LINE Front-end Framework mini-app routes
  - Booking flow (service → staff → date → time)
  - My bookings list
  - Customer profile and points
  - Service catalog

- **`/api/`** - API routes (server-side)
  - `/api/line/webhook/` - LINE webhook event handler
  - `/api/bookings/` - Booking CRUD operations
  - `/api/customers/` - Customer registration and lookup
  - `/api/admin/` - Admin-only operations
  - `/api/cron/` - Scheduled tasks (reminders)
  - `/api/catalog/` - Public service/staff listings

- **`/signup/`** - Shop registration flow
- **`/login/`** - Admin login
- **`/super/`** - Super admin panel (multi-tenant management)
- **`/booking/`** - Public booking page (non-LIFF)
- **`/services/`** - Public service listing
- **`/profile/`** - Customer profile page
- **`/my-bookings/`** - Customer bookings page

### Shared Libraries (`src/lib/`)

Core business logic and utilities:

- **Database & Auth**
  - `supabase.ts` - Supabase client factory, shop resolution, tenant context
  - `supabase-browser.ts` - Browser-safe Supabase client
  - `admin-auth.ts` - Admin authentication
  - `super-admin-auth.ts` - Super admin authentication
  - `admin-session-token.ts` - Session token management
  - `impersonation-token.ts` - Super admin shop impersonation

- **LINE Integration**
  - `line.ts` - LINE API client (reply, push, profile, content download)
  - `flex.ts` - Flex message builders (welcome, profile, bookings, confirmations)
  - `rich-menu.ts` - Rich menu creation and management

- **Business Logic**
  - `booking.ts` - Slot availability calculator, booking validation
  - `loyalty.ts` - Points calculation, tier management
  - `coupons.ts` - Coupon validation and redemption
  - `analytics.ts` - Business metrics and reporting

- **AI Features**
  - `ai/` - AI service integrations
  - `zai.ts` - AI orchestration layer

- **Utilities**
  - `i18n.tsx` - Internationalization (Thai/English)
  - `format.ts` - Date/time/currency formatting
  - `utils.ts` - General utilities
  - `rate-limit.ts` - Rate limiting for AI features
  - `thai-nlp.ts` - Thai language processing for natural language booking

- **Multi-tenant**
  - `request-context.ts` - AsyncLocalStorage for shop context in webhooks/cron
  - `shop-theme.ts` - Shop theming and branding
  - `themes.ts` - Theme definitions
  - `theme-context.tsx` - React theme context

- **Presets & Templates**
  - `presets/` - Business type presets (salon, nail, spa)
  - `linex-studio/` - LineX Studio integration

- **Infrastructure**
  - `vercel-domains.ts` - Vercel domain management
  - `handoff.ts` - Handoff logic between systems

### Components (`src/components/`)

Reusable React components:
- `LiffProvider.tsx` - LIFF SDK initialization wrapper
- `LanguageToggle.tsx` - Thai/English language switcher
- `ThemePicker.tsx` - Shop theme selector
- `ImageUpload.tsx` - Image upload component

### Types (`src/types/`)

- `db.ts` - TypeScript types for database tables (Shop, Service, Staff, Booking, Customer, etc.)

### Locales (`src/locales/`)

- `th.json` - Thai translations
- `en.json` - English translations

## Database (`supabase/`)

- `schema.sql` - Base database schema with RLS policies
- `migrations/` - Incremental schema changes
  - `001_*.sql` through `016_*.sql` - Numbered migrations

## Scripts (`scripts/`)

Standalone Node.js scripts:
- `setup-richmenu.mjs` - Create and upload rich menu to LINE
- `send-reminders.mjs` - Send appointment reminders (cron)
- `seed-demo.mjs` - Seed demo data for testing
- `create-super-admin.mjs` - Create super admin user
- `vercel-setup-domains.mjs` - Configure Vercel domains
- `cloudflare-setup-dns.mjs` - Configure Cloudflare DNS

## Design Assets (`design/`)

- `brand-illustrations/` - Brand illustration assets
- `LINEX_DESIGN_SYSTEM.md` - Design system documentation

## Documentation (`docs/`)

- `plans/` - Development plans and feature specs
- `THEMES.md` - Theme system documentation

## Key Architectural Patterns

### Multi-Tenant Resolution

Shop context is resolved in this order:
1. AsyncLocalStorage (set by webhook/cron via `runWithShopContext`)
2. `x-shop-id` header (super admin impersonation, requires `x-super-admin: 1`)
3. `x-shop-slug` header (set by middleware from subdomain)
4. `DEFAULT_SHOP_ID` env variable (legacy fallback)

### Request Flow

**Customer Booking (LIFF)**:
```
LINE App → LIFF → fetch /api/bookings → Supabase (with RLS)
```

**Customer Chat**:
```
LINE App → POST /api/line/webhook → Supabase → reply/push via LINE API
```

**Admin Panel**:
```
Browser → /admin/* → fetch /api/admin/* → Supabase (service role)
                   ↓
            Supabase Realtime (live updates)
```

### Database Access Patterns

- **Client-side (LIFF)**: Uses `supabasePublic()` with anon key + RLS
- **Server-side (API routes)**: Uses `supabaseAdmin()` with service role (bypasses RLS)
- **Shop-scoped queries**: Always filter by `shop_id` from `getCurrentShop()`

### Naming Conventions

- **Files**: kebab-case (e.g., `admin-auth.ts`, `rich-menu.ts`)
- **Components**: PascalCase (e.g., `LiffProvider.tsx`)
- **Functions**: camelCase (e.g., `getCurrentShop()`, `replyMessage()`)
- **Types**: PascalCase (e.g., `Shop`, `Booking`, `BookingStatus`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `SHOP_ID`, `API`)

### Code Style

- TypeScript strict mode enabled
- ESLint with Next.js config
- Prefer async/await over promises
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Server-only code must never import in client components
- Path aliases: `@/` maps to `src/`
