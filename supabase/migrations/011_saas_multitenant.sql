-- =====================================================================
-- 011_saas_multitenant.sql — Transform LineBook into multi-tenant SaaS
--
-- Adds:
--   - shops.slug, line_channel_access_token, line_channel_secret, liff_id,
--     business_type, logo_url, onboarding_status, created_by_line_id
--   - admin_users table (per-shop admin identities)
--   - rich_menus table (per-shop LINE rich menu ids)
--
-- Safe to re-run (idempotent where possible).
-- =====================================================================

-- ---------------- shops: SaaS columns ----------------
alter table shops add column if not exists slug text;
alter table shops add column if not exists line_channel_access_token text;
alter table shops add column if not exists line_channel_secret text;
alter table shops add column if not exists liff_id text;
alter table shops add column if not exists business_type text;
alter table shops add column if not exists logo_url text;
alter table shops add column if not exists onboarding_status text not null default 'pending';
alter table shops add column if not exists created_by_line_id text;

-- Backfill slug for existing shops so the unique constraint below holds.
update shops set slug = 'shop-' || id::text where slug is null;

-- Enforce slug rules
do $$ begin
  alter table shops add constraint shops_slug_unique unique (slug);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table shops add constraint shops_slug_format
    check (slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table shops add constraint shops_business_type_check
    check (business_type is null or business_type in ('salon','nail','spa'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table shops add constraint shops_onboarding_status_check
    check (onboarding_status in ('pending','setup_in_progress','completed'));
exception when duplicate_object then null; end $$;

-- Lookup index for webhook → shop resolution by OA id
create index if not exists shops_line_oa_idx on shops(line_oa_id) where line_oa_id is not null;

-- ---------------- admin_users ----------------
-- Per-shop admin identities. Replaces global ADMIN_PASSWORD/ADMIN_LINE_IDS env.
-- Either email+password_hash OR line_user_id is required.
do $$ begin
  create type admin_role as enum ('owner','manager','staff');
exception when duplicate_object then null; end $$;

create table if not exists admin_users (
  id             bigserial primary key,
  shop_id        bigint not null references shops(id) on delete cascade,
  email          text,
  password_hash  text,
  line_user_id   text,
  display_name   text,
  role           admin_role not null default 'owner',
  active         boolean not null default true,
  last_login_at  timestamptz,
  created_at     timestamptz not null default now(),
  check (email is not null or line_user_id is not null),
  unique (shop_id, email),
  unique (shop_id, line_user_id)
);
create index if not exists admin_users_shop_idx on admin_users(shop_id, active);
create index if not exists admin_users_email_idx on admin_users(email) where email is not null;
create index if not exists admin_users_line_idx on admin_users(line_user_id) where line_user_id is not null;

alter table admin_users enable row level security;

-- ---------------- rich_menus ----------------
-- Tracks per-shop LINE rich menu uploads so we can update/delete on rotation.
create table if not exists rich_menus (
  id                 bigserial primary key,
  shop_id            bigint not null references shops(id) on delete cascade,
  line_rich_menu_id  text not null,
  is_default         boolean not null default true,
  uploaded_at        timestamptz not null default now(),
  unique (shop_id, line_rich_menu_id)
);
create index if not exists rich_menus_shop_idx on rich_menus(shop_id);

alter table rich_menus enable row level security;

-- ---------------- helper: set shop context for RLS ----------------
-- API routes call select set_shop_context(N) to scope queries per-tenant.
-- Used with RLS policies that check current_setting('app.shop_id').
create or replace function set_shop_context(p_shop_id bigint)
returns void language plpgsql security definer as $$
begin
  perform set_config('app.shop_id', p_shop_id::text, true);
end $$;

-- Ensure a sensible default exists so pre-SaaS single-tenant code keeps working
-- when no slug subdomain is used.
update shops set slug = 'default', onboarding_status = coalesce(onboarding_status, 'completed')
  where id = 1 and (slug is null or slug = 'shop-1');
