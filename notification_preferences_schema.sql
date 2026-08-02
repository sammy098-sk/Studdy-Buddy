-- ─────────────────────────────────────────────────────────
-- TABLE: notification_preferences
-- Tracks persistent user notification preference toggles.
-- Enforces one row per user via UNIQUE constraint.
-- ─────────────────────────────────────────────────────────
create table if not exists public.notification_preferences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  daily boolean default true not null,
  new_topics boolean default true not null,
  weekly_progress boolean default false not null,
  question_of_day boolean default false not null,
  updated_at timestamp with time zone default timezone('utc', now()) not null,
  constraint notification_preferences_user_id_key unique (user_id)
);

-- Ensure UNIQUE constraint on user_id if table already existed without it
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notification_preferences_user_id_key'
  ) then
    alter table public.notification_preferences add constraint notification_preferences_user_id_key unique (user_id);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Authenticated users must only be able to SELECT, INSERT, 
-- and UPDATE their own row (auth.uid() = user_id).
-- ─────────────────────────────────────────────────────────
alter table public.notification_preferences enable row level security;

-- Drop existing policies if running a migration update to avoid duplicates
drop policy if exists "Users can view own notification preferences" on public.notification_preferences;
drop policy if exists "Users can insert own notification preferences" on public.notification_preferences;
drop policy if exists "Users can update own notification preferences" on public.notification_preferences;

create policy "Users can view own notification preferences"
  on public.notification_preferences for select
  using ( auth.uid() = user_id );

create policy "Users can insert own notification preferences"
  on public.notification_preferences for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own notification preferences"
  on public.notification_preferences for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );
