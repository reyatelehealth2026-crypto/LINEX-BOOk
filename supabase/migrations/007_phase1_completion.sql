-- Phase 1 completion: no-show counter + block policy, popular-times helper
-- Run in Supabase SQL Editor (idempotent)

-- 1. Customers: no-show tracking and soft-block
alter table customers add column if not exists no_show_count int not null default 0;
alter table customers add column if not exists blocked_until timestamptz;
alter table customers add column if not exists referral_code text unique;
alter table customers add column if not exists referred_by bigint references customers(id);

create index if not exists customers_blocked_idx on customers(shop_id, blocked_until)
  where blocked_until is not null;

-- 2. Auto-update no_show_count and blocked_until when booking status becomes no_show
create or replace function bump_no_show_counter()
returns trigger language plpgsql as $$
declare
  new_count int;
  block_days int := coalesce(current_setting('app.no_show_block_days', true)::int, 30);
  block_threshold int := coalesce(current_setting('app.no_show_block_threshold', true)::int, 2);
begin
  if new.status = 'no_show' and (old.status is null or old.status <> 'no_show') then
    update customers
      set no_show_count = no_show_count + 1,
          blocked_until = case
            when no_show_count + 1 >= block_threshold then now() + (block_days || ' days')::interval
            else blocked_until
          end
      where id = new.customer_id
      returning no_show_count into new_count;
  end if;
  return new;
end $$;

drop trigger if exists bookings_bump_noshow on bookings;
create trigger bookings_bump_noshow after update of status on bookings
  for each row execute function bump_no_show_counter();

-- 3. Reviews: admin reply
alter table reviews add column if not exists reply text;
alter table reviews add column if not exists replied_at timestamptz;
