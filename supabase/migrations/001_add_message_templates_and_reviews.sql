-- =====================================================================
-- Migration: add message_templates + reviews to an existing DB.
-- Safe to re-run (idempotent).
--
-- Why: The main schema.sql in supabase/ contains these tables, but
-- existing deployments that were provisioned earlier don't have them.
-- Running this file in the Supabase SQL editor adds just those pieces
-- without touching existing data.
-- =====================================================================

-- ---------- message_templates ----------
do $$ begin
  create type template_category as enum ('reminder','promo','follow_up','custom');
exception
  when duplicate_object then null;
end $$;

create table if not exists message_templates (
  id          bigserial primary key,
  shop_id     bigint not null references shops(id) on delete cascade default 1,
  name        text not null,
  category    template_category not null default 'custom',
  subject     text,
  body        text not null,
  active      boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists msg_tpl_shop_idx on message_templates(shop_id, active);

-- reuse the generic touch_updated_at function from schema.sql if it exists,
-- otherwise create a local one.
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists message_templates_touch on message_templates;
create trigger message_templates_touch before update on message_templates
  for each row execute function touch_updated_at();

alter table message_templates enable row level security;

-- Seed a few useful templates only if the table is empty.
insert into message_templates (shop_id, name, category, subject, body, sort_order)
select * from (values
  (1, 'เตือนนัด 1 ชั่วโมง', 'reminder'::template_category, '⏰ แจ้งเตือนนัด',
    E'สวัสดีค่ะ {{customer_name}}\nเตือนว่าพรุ่งนี้ {{date}} เวลา {{time}} มีนัด{{service_name}} ที่ร้านนะคะ\nหากต้องการเลื่อนนัด พิมมาได้เลยค่ะ 🙏', 1),
  (1, 'โปรโมชั่นเดือนนี้', 'promo'::template_category, '🎉 โปรพิเศษ',
    E'สวัสดีค่ะ {{customer_name}}\nเดือนนี้มีโปรพิเศษสำหรับลูกค้าที่รัก!\nทุกบริการลด 10% เมื่อจองล่วงหน้า\nจองเลยที่นี่นะคะ →', 2),
  (1, 'ขอบคุณหลังใช้บริการ', 'follow_up'::template_category, 'ขอบคุณที่ใช้บริการ 💛',
    E'ขอบคุณค่ะ {{customer_name}} ที่มาใช้บริการ{{service_name}} กับเรา\nหวังว่าจะถูกใจนะคะ ขอให้วันนี้เป็นวันที่ดี! ✨', 3)
) as v(shop_id, name, category, subject, body, sort_order)
where not exists (select 1 from message_templates);

-- ---------- reviews ----------
create table if not exists reviews (
  id           bigserial primary key,
  shop_id      bigint not null references shops(id) on delete cascade default 1,
  booking_id   bigint not null references bookings(id) on delete cascade,
  customer_id  bigint not null references customers(id) on delete cascade,
  service_id   bigint not null references services(id) on delete cascade,
  staff_id     bigint references staff(id) on delete cascade,
  rating       smallint not null check (rating between 1 and 5),
  comment      text,
  created_at   timestamptz not null default now(),
  unique (booking_id)
);
create index if not exists reviews_shop_idx on reviews(shop_id, created_at desc);
create index if not exists reviews_customer_idx on reviews(customer_id, created_at desc);
create index if not exists reviews_staff_idx on reviews(staff_id) where staff_id is not null;
create index if not exists reviews_service_idx on reviews(service_id);

alter table reviews enable row level security;
drop policy if exists "public read reviews" on reviews;
create policy "public read reviews" on reviews for select using (true);
