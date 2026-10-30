-- Initial schema for the Calories Image nutrition coach.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  date_of_birth date,
  height_cm numeric(5,1) check (height_cm > 0),
  sex_for_bmr text check (sex_for_bmr in ('male', 'female', 'prefer_not_to_say')),
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nutrition_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  current_weight_kg numeric(5,2) not null check (current_weight_kg > 0),
  goal_weight_kg numeric(5,2) not null check (goal_weight_kg > 0),
  daily_calorie_target integer not null check (daily_calorie_target > 0),
  daily_protein_target_g numeric(6,1) not null check (daily_protein_target_g > 0),
  daily_carbohydrate_target_g numeric(6,1) not null check (daily_carbohydrate_target_g >= 0),
  daily_fat_target_g numeric(6,1) not null check (daily_fat_target_g >= 0),
  daily_fiber_target_g numeric(6,1) not null check (daily_fiber_target_g >= 0),
  weight_loss_pace text not null check (weight_loss_pace in ('slow', 'moderate', 'aggressive')),
  effective_from timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  standardized_name text,
  serving_basis text not null default '100g',
  calories_per_100g numeric(7,1) not null default 0,
  protein_per_100g numeric(7,1) not null default 0,
  carbs_per_100g numeric(7,1) not null default 0,
  fat_per_100g numeric(7,1) not null default 0,
  fiber_per_100g numeric(7,1) not null default 0,
  nutrition_source text not null default 'user_entry',
  source_reference text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete restrict,
  quantity_g numeric(8,1) not null check (quantity_g > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  eaten_at timestamptz not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
  notes text,
  analysis_status text not null default 'manual' check (analysis_status in ('manual', 'ai_pending', 'ai_confirmed', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  food_name_snapshot text not null,
  portion_g numeric(7,1) not null check (portion_g > 0),
  calories numeric(10,1) not null default 0,
  protein numeric(10,1) not null default 0,
  carbs numeric(10,1) not null default 0,
  fat numeric(10,1) not null default 0,
  fiber numeric(10,1) not null default 0,
  nutrition_source text not null default 'manual',
  is_ai_estimated boolean not null default false,
  confidence numeric(3,2) check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recorded_at timestamptz not null,
  weight_kg numeric(5,2) not null check (weight_kg > 0),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_analysis_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  model text,
  analysis_type text not null,
  status text not null,
  latency_ms integer,
  created_at timestamptz not null default now(),
  usage_metadata jsonb
);

create index if not exists idx_profiles_updated_at on public.profiles(updated_at);
create index if not exists idx_goals_user_effective_from on public.nutrition_goals(user_id, effective_from);
create index if not exists idx_foods_user_id on public.foods(user_id);
create index if not exists idx_meals_user_eaten_at on public.meals(user_id, eaten_at);
create index if not exists idx_meal_items_meal_id on public.meal_items(meal_id);
create index if not exists idx_weight_entries_user_recorded_at on public.weight_entries(user_id, recorded_at);
create index if not exists idx_ai_analysis_logs_user_created on public.ai_analysis_logs(user_id, created_at);

alter table public.profiles enable row level security;
alter table public.nutrition_goals enable row level security;
alter table public.foods enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.weight_entries enable row level security;
alter table public.ai_analysis_logs enable row level security;

create policy "profiles_are_private" on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "nutrition_goals_are_private" on public.nutrition_goals
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "foods_user_is_owner_or_public" on public.foods
for select
using (user_id is null or user_id = auth.uid());

create policy "foods_user_manage_own" on public.foods
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "recipes_private" on public.recipes
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "recipe_ingredients_private" on public.recipe_ingredients
for all
using (
  exists (
    select 1 from public.recipes r
    where r.id = recipe_id and r.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.recipes r
    where r.id = recipe_id and r.user_id = auth.uid()
  )
);

create policy "meals_private" on public.meals
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "meal_items_private" on public.meal_items
for all
using (
  exists (
    select 1 from public.meals m
    where m.id = meal_id and m.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.meals m
    where m.id = meal_id and m.user_id = auth.uid()
  )
);

create policy "weight_entries_private" on public.weight_entries
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "ai_logs_private" on public.ai_analysis_logs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
