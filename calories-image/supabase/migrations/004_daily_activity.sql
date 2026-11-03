-- Migration 004: Daily Physical Activity Tracking (Samsung Health & Android Health Connect)
-- Additive & Non-destructive migration for daily steps, active calories burned, and device synchronization.

-- 1. Create table for daily activity summaries
create table if not exists public.daily_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  steps integer not null default 0 check (steps >= 0),
  active_calories_kcal numeric(7,1) check (active_calories_kcal is null or active_calories_kcal >= 0),
  source text not null default 'samsung_health',
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_activities_user_date_key unique (user_id, activity_date)
);

-- Index for fast user_id and date queries
create index if not exists idx_daily_activities_user_date on public.daily_activities(user_id, activity_date);

-- Enable Row Level Security
alter table public.daily_activities enable row level security;

-- RLS Policies: users can only view and manage their own activity records
create policy "daily_activities_private_select" on public.daily_activities
for select using (auth.uid() = user_id);

create policy "daily_activities_private_insert" on public.daily_activities
for insert with check (auth.uid() = user_id);

create policy "daily_activities_private_update" on public.daily_activities
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "daily_activities_private_delete" on public.daily_activities
for delete using (auth.uid() = user_id);

