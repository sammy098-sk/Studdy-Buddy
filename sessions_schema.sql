-- ─────────────────────────────────────────────────────────
-- TABLE: study_sessions
-- Tracks each time a user enters a subject/topic to study.
-- ─────────────────────────────────────────────────────────
create table public.study_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  subject text not null,
  topic text,
  mode text, -- 'textbook' | 'summary' | 'questionnaire'
  started_at timestamp with time zone default timezone('utc', now()) not null,
  ended_at timestamp with time zone
);

alter table public.study_sessions enable row level security;

create policy "Users can view own sessions"
  on public.study_sessions for select
  using ( auth.uid() = user_id );

create policy "Users can insert own sessions"
  on public.study_sessions for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own sessions"
  on public.study_sessions for update
  using ( auth.uid() = user_id );


-- ─────────────────────────────────────────────────────────
-- TABLE: messages
-- Stores every AI chat message within a study session.
-- ─────────────────────────────────────────────────────────
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.study_sessions on delete cascade not null,
  user_id uuid references auth.users not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

alter table public.messages enable row level security;

create policy "Users can view own messages"
  on public.messages for select
  using ( auth.uid() = user_id );

create policy "Users can insert own messages"
  on public.messages for insert
  with check ( auth.uid() = user_id );
