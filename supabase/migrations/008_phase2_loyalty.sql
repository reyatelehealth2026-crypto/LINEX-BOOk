-- Phase 2 Loyalty + Promotions
-- Run in Supabase SQL Editor (idempotent)

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Shop settings for loyalty tiers, birthday bonus, referral rules
-- ──────────────────────────────────────────────────────────────────────────
alter table shops add column if not exists tier_silver_points int not null default 500;
alter table shops add column if not exists tier_gold_points int not null default 2000;
alter table shops add column if not exists tier_platinum_points int not null default 5000;
alter table shops add column if not exists birthday_bonus_points int not null default 100;
alter table shops add column if not exists referral_bonus_points int not null default 100;
alter table shops add column if not exists points_expiry_days int;  -- null = no expiry
alter table shops add column if not exists last_birthday_run date;  -- idempotency

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Customers: lifetime_points (for tier computation — points column is redeemable balance)
-- ──────────────────────────────────────────────────────────────────────────
alter table customers add column if not exists lifetime_points int not null default 0;

-- Backfill from existing points
update customers set lifetime_points = greatest(lifetime_points, points) where lifetime_points < points;

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Coupons & Promo codes
-- ──────────────────────────────────────────────────────────────────────────
do $$ begin
  create type coupon_kind as enum ('percent', 'amount', 'free_service');
exception when duplicate_object then null; end $$;

create table if not exists coupons (
  id              bigserial primary key,
  shop_id         bigint not null references shops(id) on delete cascade default 1,
  code            text not null,              -- human-enterable promo code
  name            text not null,              -- admin-facing label
  kind            coupon_kind not null default 'percent',
  value           numeric(10,2) not null,     -- 10 = 10% (percent) or 100 = 100 baht (amount)
  service_id      bigint references services(id) on delete cascade, -- null = any service
  min_amount      numeric(10,2) not null default 0,
  max_uses        int,                        -- null = unlimited
  uses_count      int not null default 0,
  per_customer_limit int not null default 1,
  starts_at       timestamptz,
  expires_at      timestamptz,
  issued_by_redeem boolean not null default false,  -- true = created by points redemption
  issued_to_customer bigint references customers(id) on delete cascade,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);
create unique index if not exists coupons_shop_code_idx on coupons(shop_id, lower(code));
create index if not exists coupons_active_idx on coupons(shop_id, active, expires_at);

-- Track redemptions (coupon usages)
create table if not exists coupon_usages (
  id          bigserial primary key,
  coupon_id   bigint not null references coupons(id) on delete cascade,
  customer_id bigint not null references customers(id) on delete cascade,
  booking_id  bigint references bookings(id) on delete set null,
  amount_off  numeric(10,2) not null default 0,
  used_at     timestamptz not null default now()
);
create index if not exists coupon_usages_customer_idx on coupon_usages(customer_id, used_at desc);
create index if not exists coupon_usages_coupon_idx on coupon_usages(coupon_id);

-- ──────────────────────────────────────────────────────────────────────────
-- 4. Points redemptions (customers exchange points for coupon codes)
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists point_redemptions (
  id          bigserial primary key,
  shop_id     bigint not null references shops(id) on delete cascade default 1,
  customer_id bigint not null references customers(id) on delete cascade,
  points_spent int not null check (points_spent > 0),
  coupon_id   bigint references coupons(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists point_redemptions_customer_idx on point_redemptions(customer_id, created_at desc);
