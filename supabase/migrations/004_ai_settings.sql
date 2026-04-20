-- AI Settings per shop
-- Run in Supabase SQL Editor (idempotent)

create table if not exists ai_settings (
  id               bigserial primary key,
  shop_id          bigint not null references shops(id) on delete cascade unique,
  enabled          boolean not null default true,
  model            text not null default 'glm-4.5-flash',
  temperature      numeric(3,2) not null default 0.70,
  max_tokens       int not null default 350,
  history_limit    int not null default 10,
  bot_name         text not null default 'ผู้ช่วยร้าน',
  business_desc    text not null default '',
  custom_rules     text not null default '',
  booking_redirect text not null default 'พิมพ์ว่า จอง ได้เลยค่ะ หรือกดปุ่มจองคิวในเมนูนะคะ',
  updated_at       timestamptz not null default now()
);

create or replace function touch_ai_settings_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists ai_settings_touch on ai_settings;
create trigger ai_settings_touch before update on ai_settings
  for each row execute function touch_ai_settings_updated_at();
