-- AI Chat History for Z.AI GLM multi-turn conversations
-- Run in Supabase SQL Editor (idempotent)

create table if not exists chat_history (
  id            bigserial primary key,
  shop_id       bigint not null references shops(id) on delete cascade,
  line_user_id  text not null,
  role          text not null check (role in ('user', 'assistant')),
  content       text not null,
  created_at    timestamptz not null default now()
);

create index if not exists chat_history_user_idx
  on chat_history(shop_id, line_user_id, created_at desc);

-- Auto-purge rows older than 7 days per user (keep history lean)
-- Optional: run this manually or as a cron if needed
-- delete from chat_history where created_at < now() - interval '7 days';
