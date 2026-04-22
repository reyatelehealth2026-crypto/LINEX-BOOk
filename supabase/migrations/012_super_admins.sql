-- =====================================================================
-- 012_super_admins.sql — Global super-admin role (ops / platform owner).
--
-- A super admin is NOT scoped to a shop. They authenticate on the root
-- domain (/super) and can read/write every shop's data, including
-- impersonating any shop's admin console.
--
-- Auth modes supported (either or both populated per row):
--   - email + password_hash  (scrypt, same format as admin_users)
--   - line_user_id           (verified via LINE idToken)
--
-- Safe to re-run.
-- =====================================================================

create table if not exists super_admins (
  id             bigserial primary key,
  email          text,
  password_hash  text,
  line_user_id   text,
  display_name   text,
  active         boolean not null default true,
  last_login_at  timestamptz,
  created_at     timestamptz not null default now(),
  check (email is not null or line_user_id is not null),
  unique (email),
  unique (line_user_id)
);

create index if not exists super_admins_active_idx on super_admins(active) where active;

alter table super_admins enable row level security;
-- No public policies — only server (service_role) accesses this table.
