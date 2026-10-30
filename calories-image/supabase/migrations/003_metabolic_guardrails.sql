-- Migration 003: Personalized Metabolic Nutrition Guardrails
-- Additive & Non-destructive migration for Fatty Liver, High Insulin, Added Sugar, GI/GL & Meal Timing.

-- 1. Create table for metabolic preferences
create table if not exists public.metabolic_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  metabolic_monitoring_enabled boolean not null default true,
  strictness text not null default 'balanced' check (strictness in ('gentle', 'balanced', 'strict')),
  fatty_liver_consideration boolean not null default true,
  high_insulin_consideration boolean not null default true,
  added_sugar_monitoring_enabled boolean not null default true,
  gi_monitoring_enabled boolean not null default true,
  meal_timing_monitoring_enabled boolean not null default true,
  meal_frequency_monitoring_enabled boolean not null default true,
  daily_added_sugar_target_g numeric(5,1) default 25.0,
  daily_total_sugar_target_g numeric(5,1),
  daily_glycemic_load_target numeric(5,1),
  preferred_meals_per_day integer not null default 3 check (preferred_meals_per_day between 1 and 10),
  minimum_meal_interval_minutes integer not null default 180 check (minimum_meal_interval_minutes between 30 and 480),
  preferred_first_meal_time text not null default '07:00',
  preferred_last_meal_time text not null default '19:30',
  morning_high_gi_warning_enabled boolean not null default true,
  morning_window_start text not null default '05:00',
  morning_window_end text not null default '09:30',
  custom_dietary_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast user_id lookups
create index if not exists idx_metabolic_preferences_user on public.metabolic_preferences(user_id);

-- Enable RLS
alter table public.metabolic_preferences enable row level security;

-- RLS Policies: users can only see and manage their own preferences
create policy "metabolic_preferences_private_select" on public.metabolic_preferences
for select using (auth.uid() = user_id);

create policy "metabolic_preferences_private_insert" on public.metabolic_preferences
for insert with check (auth.uid() = user_id);

create policy "metabolic_preferences_private_update" on public.metabolic_preferences
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "metabolic_preferences_private_delete" on public.metabolic_preferences
for delete using (auth.uid() = user_id);

-- 2. Additive columns to meal_items
alter table public.meal_items
  add column if not exists sugar_classification text default 'UNKNOWN',
  add column if not exists added_sugar_g numeric(6,1) default 0,
  add column if not exists total_sugar_g numeric(6,1) default 0,
  add column if not exists gi_value integer,
  add column if not exists gi_category text default 'unknown',
  add column if not exists gl_value numeric(5,1),
  add column if not exists gl_category text default 'unknown',
  add column if not exists metabolic_notes text;

-- 3. Additive columns to foods
alter table public.foods
  add column if not exists sugar_classification text default 'UNKNOWN',
  add column if not exists added_sugar_per_100g numeric(6,1) default 0,
  add column if not exists total_sugar_per_100g numeric(6,1) default 0,
  add column if not exists gi_value integer,
  add column if not exists gi_category text default 'unknown';

