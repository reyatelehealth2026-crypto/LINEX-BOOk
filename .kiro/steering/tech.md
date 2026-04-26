---
inclusion: auto
---

# Technology Stack

## Core Framework

- **Next.js 16** (App Router) - React framework with server-side rendering
- **React 19** - UI library
- **TypeScript 5.6** - Type-safe JavaScript

## Backend & Database

- **Supabase** - PostgreSQL database with real-time subscriptions and RLS (Row Level Security)
- **Supabase Storage** - File storage for AI-generated images and shop assets
- Database client: `@supabase/supabase-js`

## LINE Platform Integration

- **LINE Messaging API** - Webhook events, push messages, reply messages
- **LIFF v2** (`@line/liff`) - LINE Front-end Framework for mini-app UI
- **Rich Menu API** - 6-button menu interface

## AI/ML

- **Google Gemini API**
  - `gemini-2.5-flash` - Vision model for image analysis
  - `gemini-2.5-flash-image` - Image generation model

## Styling & UI

- **Tailwind CSS 3.4** - Utility-first CSS framework
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing
- **tailwindcss-animate** - Animation utilities
- **Lucide React** - Icon library
- **clsx** + **tailwind-merge** - Conditional class name utilities

## Date/Time Handling

- **date-fns 4.1** - Date manipulation and formatting
- **date-fns-tz 3.2** - Timezone support (shops can set their own timezone)

## Development Tools

- **ESLint 9** - Code linting with Next.js config
- **TypeScript compiler** - Type checking

## Common Commands

### Development
```bash
npm run dev          # Start development server (localhost:3000)
```

### Production
```bash
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
```

### Scripts
```bash
npm run richmenu              # Setup rich menu for a shop
npm run reminders             # Send appointment reminders (cron job)
npm run seed:demo             # Seed demo data
npm run create-super-admin    # Create super admin user
npm run vercel:domains        # Setup Vercel domains
npm run cf:dns                # Setup Cloudflare DNS
```

## Environment Variables

### Required (Supabase)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (public)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-only, bypasses RLS)

### Required (Multi-tenant)
- `ROOT_DOMAIN` - Root domain for subdomain routing (e.g., `linebook.app` or `localhost` for dev)

### Optional (LINE - per shop in DB)
- `LINE_CHANNEL_ACCESS_TOKEN` - Fallback for single-tenant mode
- `LINE_CHANNEL_SECRET` - Fallback for single-tenant mode
- `LIFF_ID` - Fallback for single-tenant mode

### Optional (AI Features)
- `GEMINI_API_KEY` - Google AI Studio API key
- `GEMINI_VISION_MODEL` - Vision model name (default: `gemini-2.5-flash`)
- `GEMINI_IMAGE_GEN_MODEL` - Image gen model name (default: `gemini-2.5-flash-image`)
- `AI_VISION_ENABLED` - Enable vision feature (default: `true`)
- `AI_IMAGE_GEN_ENABLED` - Enable image generation (default: `false`)

### Optional (Legacy)
- `DEFAULT_SHOP_ID` - Fallback shop ID for single-tenant mode (default: `1`)

## Build System

- **Module Resolution**: `bundler` (Next.js handles bundling)
- **Path Aliases**: `@/*` maps to `src/*`
- **Target**: ES2022
- **JSX**: `react-jsx` (automatic runtime)

## Database Migrations

SQL migrations are in `supabase/migrations/` and should be run in order:
- `supabase/schema.sql` - Base schema
- `001_*.sql` through `016_*.sql` - Incremental migrations

Key migrations:
- `011_saas_multitenant.sql` - Multi-tenant support
- `013_ai_multimodal.sql` - AI vision and image generation
- `016_linex_studio_foundation.sql` - Latest schema updates

## Testing

No formal test suite currently. Manual testing workflow:
1. Follow LINE OA → receive welcome message
2. Click rich menu "จองคิว" → LIFF opens → complete booking → receive confirmation
3. Click "คิวของฉัน" → see booking carousel
4. Admin panel → confirm/complete/cancel bookings → verify real-time updates
5. Test double-booking prevention (DB should reject with 409)
6. Test AI vision (send image) and image generation (type prompt)

## Deployment

- **Platform**: Vercel (recommended) or any Node.js hosting
- **Cron Jobs**: Configured in `vercel.json` for reminder notifications
- **Subdomain Routing**: Handled by Next.js middleware (`src/middleware.ts`)
- **Webhook**: Must be publicly accessible HTTPS endpoint for LINE platform
