-- AI Human Handoff sessions
-- Tracks when a customer requests to talk to a real human.
-- While a session is 'pending' or 'active', AI replies are paused for that LINE user.
-- Run in Supabase SQL Editor (idempotent).

create table if not exists ai_handoff_sessions (
  id            bigserial primary key,
  shop_id       bigint not null references shops(id) on delete cascade default 1,
  customer_id   bigint not null references customers(id) on delete cascade,
  line_user_id  text not null,
  status        text not null default 'pending'
                check (status in ('pending','active','resolved','cancelled')),
  last_message  text,
  requested_at  timestamptz not null default now(),
  taken_at      timestamptz,
  taken_by      text,            -- LINE userId ของแอดมินที่รับเรื่อง
  resolved_at   timestamptz,
  resolved_by   text
);

create index if not exists ai_handoff_shop_status_idx
  on ai_handoff_sessions(shop_id, status, requested_at desc);
create index if not exists ai_handoff_user_idx
  on ai_handoff_sessions(shop_id, line_user_id, status);

-- Prevent more than one OPEN handoff per (shop, line_user_id)
create unique index if not exists ai_handoff_unique_open
  on ai_handoff_sessions(shop_id, line_user_id)
  where status in ('pending', 'active');

alter table ai_handoff_sessions enable row level security;
