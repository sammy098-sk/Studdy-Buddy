-- ─────────────────────────────────────────────────────────
-- TABLE: reader_preferences
-- Tracks persistent study scope and reader preferences per user and per textbook.
-- Enforces one row per user+book combination via UNIQUE(user_id, book_id).
-- ─────────────────────────────────────────────────────────
create table if not exists public.reader_preferences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  book_id text not null,
  study_scope text default 'page' not null check (study_scope in ('page', 'chapter', 'book')),
  theme text default 'light' not null check (theme in ('light', 'dark', 'sepia')),
  font_size integer default 16 not null,
  zoom_level numeric default 1.0 not null,
  reading_mode text default 'continuous' not null,
  read_aloud_speed numeric default 1.0 not null,
  sidebar_state boolean default true not null,
  updated_at timestamp with time zone default timezone('utc', now()) not null,
  constraint reader_preferences_user_book_key unique (user_id, book_id)
);

-- Ensure UNIQUE constraint on (user_id, book_id) if table existed without it
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reader_preferences_user_book_key'
  ) then
    alter table public.reader_preferences add constraint reader_preferences_user_book_key unique (user_id, book_id);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Authenticated users must only be able to SELECT, INSERT, 
-- and UPDATE their own rows (auth.uid() = user_id).
-- ─────────────────────────────────────────────────────────
alter table public.reader_preferences enable row level security;

-- Drop existing policies if running a migration update to avoid duplicates
drop policy if exists "Users can view own reader preferences" on public.reader_preferences;
drop policy if exists "Users can insert own reader preferences" on public.reader_preferences;
drop policy if exists "Users can update own reader preferences" on public.reader_preferences;
drop policy if exists "Users can delete own reader preferences" on public.reader_preferences;

create policy "Users can view own reader preferences"
  on public.reader_preferences for select
  using ( auth.uid() = user_id );

create policy "Users can insert own reader preferences"
  on public.reader_preferences for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own reader preferences"
  on public.reader_preferences for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

create policy "Users can delete own reader preferences"
  on public.reader_preferences for delete
  using ( auth.uid() = user_id );
