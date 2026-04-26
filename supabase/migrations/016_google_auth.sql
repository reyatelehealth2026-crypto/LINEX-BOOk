-- ─────────────────────────────────────────────────────────────────────────
-- 016_google_auth.sql
-- Adds Supabase Auth (Google OAuth) support to admin_users.
--
--   * auth_user_id  → links an admin to a Supabase auth.users row (Google).
--                     NULL for admins created via legacy email+password.
--   * password_hash becomes NULLable so Google-only owners don't need one.
-- ─────────────────────────────────────────────────────────────────────────

alter table admin_users
  add column if not exists auth_user_id uuid;

create unique index if not exists idx_admin_users_auth_user_id
  on admin_users(auth_user_id)
  where auth_user_id is not null;

-- Make password_hash nullable so a Google-only signup can omit a password.
do $$
begin
  alter table admin_users alter column password_hash drop not null;
exception
  when others then null;  -- already nullable
end $$;
