-- =====================================================================
-- LINE Booking — Supabase Schema (single-shop, multi-shop-ready)
-- Run in Supabase SQL Editor. Safe to re-run (idempotent where possible).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------- shops ----------------
create table if not exists shops (
  id              bigserial primary key,
  name            text not null,
  timezone        text not null default 'Asia/Bangkok',
  phone           text,
  address         text,
  line_oa_id      text,
  points_per_baht numeric(6,2) not null default 0.01, -- 1 baht = 0.01 points
  created_at      timestamptz not null default now()
);

insert into shops (id, name) values (1, 'My Shop')
on conflict (id) do nothing;

-- ---------------- services ----------------
create table if not exists services (
  id            bigserial primary key,
  shop_id       bigint not null references shops(id) on delete cascade default 1,
  name          text not null,
  name_en       text,
  description   text,
  duration_min  int  not null check (duration_min > 0),
  price         numeric(10,2) not null default 0,
  image_url     text,
  active        boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists services_shop_idx on services(shop_id, active);

-- ---------------- staff ----------------
create table if not exists staff (
  id          bigserial primary key,
  shop_id     bigint not null references shops(id) on delete cascade default 1,
  name        text not null,
  nickname    text,
  avatar_url  text,
  bio         text,
  active      boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists staff_shop_idx on staff(shop_id, active);

-- ---------------- staff_services (which services each staff can do) ----------------
create table if not exists staff_services (
  staff_id    bigint not null references staff(id) on delete cascade,
  service_id  bigint not null references services(id) on delete cascade,
  primary key (staff_id, service_id)
);

-- ---------------- working_hours ----------------
-- day_of_week: 0=Sun .. 6=Sat
create table if not exists working_hours (
  id          bigserial primary key,
  shop_id     bigint not null references shops(id) on delete cascade default 1,
  staff_id    bigint references staff(id) on delete cascade, -- null = shop-wide default
  day_of_week smallint not null check (day_of_week between 0 and 6),
  open_time   time not null,
  close_time  time not null,
  check (close_time > open_time)
);
create index if not exists working_hours_lookup on working_hours(shop_id, staff_id, day_of_week);

-- ---------------- time_off (holidays, staff leave) ----------------
create table if not exists time_off (
  id          bigserial primary key,
  shop_id     bigint not null references shops(id) on delete cascade default 1,
  staff_id    bigint references staff(id) on delete cascade, -- null = whole shop closed
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  reason      text,
  check (ends_at > starts_at)
);
create index if not exists time_off_lookup on time_off(shop_id, staff_id, starts_at, ends_at);

-- ---------------- customers (LINE users) ----------------
create table if not exists customers (
  id             bigserial primary key,
  shop_id        bigint not null references shops(id) on delete cascade default 1,
  line_user_id   text not null,
  display_name   text,
  picture_url    text,
  full_name      text,          -- filled when they register
  phone          text,
  birthday       date,
  points         int  not null default 0,
  visit_count    int  not null default 0,
  registered_at  timestamptz,
  created_at     timestamptz not null default now(),
  unique (shop_id, line_user_id)
);
create index if not exists customers_line_idx on customers(line_user_id);

-- ---------------- bookings ----------------
-- status: pending (created, awaiting confirm) | confirmed | completed | cancelled | no_show
create type booking_status as enum ('pending','confirmed','completed','cancelled','no_show');

create table if not exists bookings (
  id           bigserial primary key,
  shop_id      bigint not null references shops(id) on delete cascade default 1,
  customer_id  bigint not null references customers(id) on delete cascade,
  service_id   bigint not null references services(id),
  staff_id     bigint references staff(id), -- null = any staff
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  status       booking_status not null default 'pending',
  note         text,
  price        numeric(10,2) not null default 0,
  points_earned int not null default 0,
  reminded_at  timestamptz,  -- for 1h push reminder idempotency
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists bookings_shop_time_idx on bookings(shop_id, starts_at);
create index if not exists bookings_customer_idx on bookings(customer_id, starts_at desc);
create index if not exists bookings_staff_time_idx on bookings(staff_id, starts_at) where staff_id is not null;

-- prevent double-booking same staff overlapping time (excluding cancelled/no_show)
create extension if not exists btree_gist;
alter table bookings drop constraint if exists bookings_no_overlap;
alter table bookings add constraint bookings_no_overlap
  exclude using gist (
    staff_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (staff_id is not null and status in ('pending','confirmed'));

-- auto-update updated_at
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists bookings_touch on bookings;
create trigger bookings_touch before update on bookings
  for each row execute function touch_updated_at();

-- ---------------- seed: example services/staff/hours ----------------
insert into services (shop_id, name, name_en, duration_min, price, sort_order) values
  (1, 'ตัดผมชาย', 'Men''s Haircut', 45, 250, 1),
  (1, 'ตัดผม + สระ', 'Cut + Wash', 60, 350, 2),
  (1, 'ทำสีผม', 'Hair Coloring', 120, 1200, 3),
  (1, 'ทำเล็บมือ', 'Manicure', 60, 450, 4)
on conflict do nothing;

insert into staff (shop_id, name, nickname, sort_order) values
  (1, 'พี่โอ๋', 'Oh', 1),
  (1, 'พี่มิ้น', 'Mint', 2)
on conflict do nothing;

-- Map every staff to every active service (default: ทุกช่างทำได้ทุกบริการ)
insert into staff_services (staff_id, service_id)
select s.id, sv.id
from staff s
cross join services sv
where s.shop_id = 1 and sv.shop_id = 1
on conflict do nothing;

-- Mon–Sat 10:00–20:00 (shop default, staff_id null)
insert into working_hours (shop_id, staff_id, day_of_week, open_time, close_time)
select 1, null, d, '10:00', '20:00'
from generate_series(1,6) as d
on conflict do nothing;

-- ---------------- RLS ----------------
-- For MVP we use the service role key on the server and never expose direct
-- writes from the browser, so RLS can stay permissive-read-only on public
-- catalog tables. Customer/booking writes go through our API routes.
alter table shops enable row level security;
alter table services enable row level security;
alter table staff enable row level security;
alter table staff_services enable row level security;
alter table working_hours enable row level security;
alter table time_off enable row level security;
alter table customers enable row level security;
alter table bookings enable row level security;

-- Public read for catalog
drop policy if exists "public read shops" on shops;
create policy "public read shops" on shops for select using (true);
drop policy if exists "public read services" on services;
create policy "public read services" on services for select using (active);
drop policy if exists "public read staff" on staff;
create policy "public read staff" on staff for select using (active);
drop policy if exists "public read staff_services" on staff_services;
create policy "public read staff_services" on staff_services for select using (true);
drop policy if exists "public read working_hours" on working_hours;
create policy "public read working_hours" on working_hours for select using (true);

-- ---------------- waitlist_entries ----------------
-- Customers can join a waitlist when a slot is full.
-- When a slot opens (cancel/reschedule), staff or a cron can notify/convert entries.
create type waitlist_status as enum ('waiting','notified','fulfilled','expired','cancelled');

create table if not exists waitlist_entries (
  id           bigserial primary key,
  shop_id      bigint not null references shops(id) on delete cascade default 1,
  customer_id  bigint not null references customers(id) on delete cascade,
  service_id   bigint not null references services(id) on delete cascade,
  staff_id     bigint references staff(id) on delete cascade, -- null = any staff
  desired_date date not null,          -- shop-local date
  desired_time time,                   -- null = any time on that date
  status       waitlist_status not null default 'waiting',
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists waitlist_shop_date_idx on waitlist_entries(shop_id, desired_date, status);
create index if not exists waitlist_customer_idx on waitlist_entries(customer_id, status);

-- auto-update updated_at on waitlist
drop trigger if exists waitlist_entries_touch on waitlist_entries;
create trigger waitlist_entries_touch before update on waitlist_entries
  for each row execute function touch_updated_at();

-- customers & bookings: no anon access (service role only)
