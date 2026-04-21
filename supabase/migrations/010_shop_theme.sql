-- Migration 010 — Add theme_id to shops for industry-specific theming
-- Ported from LINEX Design System Builder. Valid ids are enforced in application layer
-- (see `src/lib/themes.ts` THEME_PRESETS). Keeping as text so adding a new preset
-- doesn't require a DDL migration.

alter table shops
  add column if not exists theme_id text not null default 'linex';

comment on column shops.theme_id is
  'Active theme preset id. One of: linex, fnb, healthcare, fitness, beauty, hospitality, retail, education, realestate, automotive, corporate, pet, tattoo, wellness, tech. See src/lib/themes.ts for canonical list.';

-- Optional guard: only allow known ids. Using a soft check so future presets can be added
-- by seeding before the app restarts.
alter table shops
  drop constraint if exists shops_theme_id_check;

alter table shops
  add constraint shops_theme_id_check
  check (theme_id in (
    'linex', 'fnb', 'healthcare', 'fitness', 'beauty',
    'hospitality', 'retail', 'education', 'realestate',
    'automotive', 'corporate', 'pet', 'tattoo', 'wellness', 'tech'
  ));
