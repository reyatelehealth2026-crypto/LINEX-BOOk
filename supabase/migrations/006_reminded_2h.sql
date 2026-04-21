-- Phase 1.1 — 2-hour reminder idempotency
-- Run in Supabase SQL Editor (idempotent)

alter table bookings add column if not exists reminded_2h_at timestamptz;
