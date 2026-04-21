-- Phase 4.5 Churn auto-push + Points expiry support
-- Run in Supabase SQL Editor (idempotent)

-- Track last churn push date per customer (for 30-day cooldown)
alter table customers add column if not exists churn_push_at date;

-- Track last visit for points expiry lookups (backfill from bookings)
-- last_visit_at already exists from 007; this is a no-op guard
alter table customers add column if not exists last_visit_at timestamptz;
