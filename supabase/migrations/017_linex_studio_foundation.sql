-- LINEX Studio Sprint 1 foundation
-- Content package generator groundwork: projects, outputs, business memory, agent logs.

create table if not exists public.linex_studio_business_profiles (
  id bigserial primary key,
  shop_id bigint not null references public.shops(id) on delete cascade,
  business_name text not null,
  business_type text,
  brand_tone text,
  brand_colors jsonb not null default '[]'::jsonb,
  services_json jsonb not null default '[]'::jsonb,
  target_audience text,
  line_oa_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.linex_studio_video_projects (
  id bigserial primary key,
  shop_id bigint not null references public.shops(id) on delete cascade,
  business_profile_id bigint references public.linex_studio_business_profiles(id) on delete set null,
  title text not null,
  business_type text,
  goal text not null,
  platform text not null default 'tiktok',
  duration_seconds int not null default 30,
  tone text not null default 'friendly',
  brief text not null default '',
  status text not null default 'draft' check (status in ('draft','generating','completed','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.linex_studio_video_project_outputs (
  id bigserial primary key,
  project_id bigint not null references public.linex_studio_video_projects(id) on delete cascade,
  strategy_json jsonb not null default '{}'::jsonb,
  script_text text not null default '',
  storyboard_json jsonb not null default '[]'::jsonb,
  visual_direction_json jsonb not null default '{}'::jsonb,
  asset_prompts_json jsonb not null default '[]'::jsonb,
  caption_json jsonb not null default '{}'::jsonb,
  editor_notes_text text not null default '',
  markdown_export text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id)
);

create table if not exists public.linex_studio_agent_runs (
  id bigserial primary key,
  project_id bigint references public.linex_studio_video_projects(id) on delete cascade,
  agent_name text not null,
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  status text not null default 'completed' check (status in ('completed','failed','fallback')),
  latency_ms int not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.linex_studio_output_variations (
  id bigserial primary key,
  project_id bigint not null references public.linex_studio_video_projects(id) on delete cascade,
  agent_name text not null,
  section text not null,
  variation_index int not null default 0,
  output_json jsonb not null default '{}'::jsonb,
  score_total numeric(4,2),
  score_breakdown_json jsonb not null default '{}'::jsonb,
  selected boolean not null default false,
  selected_by text not null default 'auto' check (selected_by in ('auto','user_override')),
  created_at timestamptz not null default now()
);

create table if not exists public.linex_studio_tts_outputs (
  id bigserial primary key,
  project_id bigint not null references public.linex_studio_video_projects(id) on delete cascade,
  variation_id bigint references public.linex_studio_output_variations(id) on delete set null,
  provider text not null default 'google_cloud_tts',
  voice_id text not null,
  ssml_input text not null,
  audio_url text,
  duration_sec numeric(8,2),
  cost_usd numeric(10,6),
  cache_hit boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.linex_studio_trend_snapshots (
  id bigserial primary key,
  project_id bigint references public.linex_studio_video_projects(id) on delete cascade,
  platform text not null,
  fetched_at timestamptz not null default now(),
  hook_patterns_json jsonb not null default '[]'::jsonb,
  hashtag_clusters_json jsonb not null default '[]'::jsonb
);

create index if not exists idx_linex_studio_projects_shop on public.linex_studio_video_projects(shop_id, created_at desc);
create index if not exists idx_linex_studio_agent_runs_project on public.linex_studio_agent_runs(project_id, created_at desc);
create index if not exists idx_linex_studio_business_profiles_shop on public.linex_studio_business_profiles(shop_id, created_at desc);
