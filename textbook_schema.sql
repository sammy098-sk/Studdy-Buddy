-- ─────────────────────────────────────────────────────────
-- TABLE: textbooks
-- ─────────────────────────────────────────────────────────
create table if not exists public.textbooks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  subject text not null,
  author text,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

alter table public.textbooks enable row level security;

create policy "Allow all users to read textbooks"
  on public.textbooks for select
  using ( true );

create policy "Allow authenticated users to insert textbooks"
  on public.textbooks for insert
  with check ( auth.role() = 'authenticated' );

create policy "Allow authenticated users to update textbooks"
  on public.textbooks for update
  using ( auth.role() = 'authenticated' );

create policy "Allow authenticated users to delete textbooks"
  on public.textbooks for delete
  using ( auth.role() = 'authenticated' );


-- ─────────────────────────────────────────────────────────
-- TABLE: textbook_chapters
-- ─────────────────────────────────────────────────────────
create table if not exists public.textbook_chapters (
  id uuid default gen_random_uuid() primary key,
  textbook_id uuid references public.textbooks on delete cascade not null,
  chapter_number integer not null,
  title text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

alter table public.textbook_chapters enable row level security;

create policy "Allow all users to read textbook_chapters"
  on public.textbook_chapters for select
  using ( true );

create policy "Allow authenticated users to insert textbook_chapters"
  on public.textbook_chapters for insert
  with check ( auth.role() = 'authenticated' );

create policy "Allow authenticated users to update textbook_chapters"
  on public.textbook_chapters for update
  using ( auth.role() = 'authenticated' );

create policy "Allow authenticated users to delete textbook_chapters"
  on public.textbook_chapters for delete
  using ( auth.role() = 'authenticated' );
