-- Phase 1 Sprint 1.1 columns
-- Run in Supabase SQL Editor (idempotent)

-- bookings: 24h reminder idempotency
alter table bookings add column if not exists reminded_24h_at timestamptz;

-- bookings: review request idempotency
alter table bookings add column if not exists review_requested_at timestamptz;

-- customers: admin notes
alter table customers add column if not exists notes text;

-- shops: track when cron last ran (for healthcheck)
alter table shops add column if not exists cron_last_run timestamptz;
