-- Supabase schema for 命定內容引擎 MVP.
-- Prefix rule: all app-owned tables and columns use `eightlatter_`.
-- Note: PostgreSQL identifiers that start with a number require quoting, so this
-- schema uses the SQL-safe prefix `eightlatter_` instead of literal `8latter_`.
-- Run this in Supabase SQL Editor after creating a new project.

create extension if not exists "pgcrypto";

create table if not exists public.eightlatter_profiles (
  eightlatter_id uuid primary key references auth.users(id) on delete cascade,
  eightlatter_display_name text not null,
  eightlatter_gender text,
  eightlatter_phone text,
  eightlatter_birth_date date not null,
  eightlatter_birth_time time not null,
  eightlatter_birth_place text,
  eightlatter_current_work text,
  eightlatter_hobbies text,
  eightlatter_daily_focus text,
  eightlatter_positioning_summary text,
  eightlatter_created_at timestamptz not null default now(),
  eightlatter_updated_at timestamptz not null default now()
);

create table if not exists public.eightlatter_bazi_charts (
  eightlatter_id uuid primary key default gen_random_uuid(),
  eightlatter_user_id uuid not null references public.eightlatter_profiles(eightlatter_id) on delete cascade,
  eightlatter_year_pillar text not null,
  eightlatter_month_pillar text not null,
  eightlatter_day_pillar text not null,
  eightlatter_hour_pillar text not null,
  eightlatter_day_master text not null,
  eightlatter_day_master_element text not null,
  eightlatter_energy_state text,
  eightlatter_talent_distribution jsonb not null default '{}'::jsonb,
  eightlatter_calculated_at timestamptz not null default now()
);

create table if not exists public.eightlatter_videos (
  eightlatter_id uuid primary key default gen_random_uuid(),
  eightlatter_user_id uuid not null references public.eightlatter_profiles(eightlatter_id) on delete cascade,
  eightlatter_title text not null,
  eightlatter_positioning text,
  eightlatter_storage_path text,
  eightlatter_public_url text,
  eightlatter_duration_seconds integer check (eightlatter_duration_seconds is null or eightlatter_duration_seconds <= 90),
  eightlatter_uploaded_for_date date not null default current_date,
  eightlatter_ai_score integer check (eightlatter_ai_score is null or (eightlatter_ai_score between 60 and 100)),
  eightlatter_ai_grade text check (eightlatter_ai_grade is null or eightlatter_ai_grade in ('C', 'B', 'A', 'S')),
  eightlatter_ai_strengths jsonb not null default '[]'::jsonb,
  eightlatter_ai_improvements jsonb not null default '[]'::jsonb,
  eightlatter_created_at timestamptz not null default now()
);

create table if not exists public.eightlatter_video_reactions (
  eightlatter_id uuid primary key default gen_random_uuid(),
  eightlatter_video_id uuid not null references public.eightlatter_videos(eightlatter_id) on delete cascade,
  eightlatter_user_id uuid not null references public.eightlatter_profiles(eightlatter_id) on delete cascade,
  eightlatter_reaction_type text not null check (eightlatter_reaction_type in ('like', 'heart')),
  eightlatter_created_at timestamptz not null default now(),
  unique (eightlatter_video_id, eightlatter_user_id, eightlatter_reaction_type)
);

create table if not exists public.eightlatter_video_comments (
  eightlatter_id uuid primary key default gen_random_uuid(),
  eightlatter_video_id uuid not null references public.eightlatter_videos(eightlatter_id) on delete cascade,
  eightlatter_user_id uuid not null references public.eightlatter_profiles(eightlatter_id) on delete cascade,
  eightlatter_body text not null check (char_length(eightlatter_body) <= 240),
  eightlatter_created_at timestamptz not null default now()
);

create table if not exists public.eightlatter_achievements (
  eightlatter_id uuid primary key default gen_random_uuid(),
  eightlatter_user_id uuid not null references public.eightlatter_profiles(eightlatter_id) on delete cascade,
  eightlatter_code text not null,
  eightlatter_title text not null,
  eightlatter_unlocked_at timestamptz not null default now(),
  unique (eightlatter_user_id, eightlatter_code)
);

alter table public.eightlatter_profiles enable row level security;
alter table public.eightlatter_bazi_charts enable row level security;
alter table public.eightlatter_videos enable row level security;
alter table public.eightlatter_video_reactions enable row level security;
alter table public.eightlatter_video_comments enable row level security;
alter table public.eightlatter_achievements enable row level security;

create policy "eightlatter_profiles_select_own" on public.eightlatter_profiles
  for select using (auth.uid() = eightlatter_id);

create policy "eightlatter_profiles_insert_own" on public.eightlatter_profiles
  for insert with check (auth.uid() = eightlatter_id);

create policy "eightlatter_profiles_update_own" on public.eightlatter_profiles
  for update using (auth.uid() = eightlatter_id) with check (auth.uid() = eightlatter_id);

create policy "eightlatter_bazi_select_own" on public.eightlatter_bazi_charts
  for select using (auth.uid() = eightlatter_user_id);

create policy "eightlatter_bazi_insert_own" on public.eightlatter_bazi_charts
  for insert with check (auth.uid() = eightlatter_user_id);

create policy "eightlatter_videos_select_all" on public.eightlatter_videos
  for select using (true);

create policy "eightlatter_videos_insert_own" on public.eightlatter_videos
  for insert with check (auth.uid() = eightlatter_user_id);

create policy "eightlatter_videos_update_own" on public.eightlatter_videos
  for update using (auth.uid() = eightlatter_user_id) with check (auth.uid() = eightlatter_user_id);

create policy "eightlatter_reactions_select_all" on public.eightlatter_video_reactions
  for select using (true);

create policy "eightlatter_reactions_insert_own" on public.eightlatter_video_reactions
  for insert with check (auth.uid() = eightlatter_user_id);

create policy "eightlatter_reactions_delete_own" on public.eightlatter_video_reactions
  for delete using (auth.uid() = eightlatter_user_id);

create policy "eightlatter_comments_select_all" on public.eightlatter_video_comments
  for select using (true);

create policy "eightlatter_comments_insert_own" on public.eightlatter_video_comments
  for insert with check (auth.uid() = eightlatter_user_id);

create policy "eightlatter_comments_delete_own" on public.eightlatter_video_comments
  for delete using (auth.uid() = eightlatter_user_id);

create policy "eightlatter_achievements_select_own" on public.eightlatter_achievements
  for select using (auth.uid() = eightlatter_user_id);

create index if not exists eightlatter_videos_uploaded_for_date_idx
  on public.eightlatter_videos(eightlatter_uploaded_for_date desc);

create index if not exists eightlatter_video_comments_video_id_idx
  on public.eightlatter_video_comments(eightlatter_video_id);

create index if not exists eightlatter_video_reactions_video_id_idx
  on public.eightlatter_video_reactions(eightlatter_video_id);
