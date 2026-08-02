-- Migration to implement real study session duration tracking
-- Run this SQL in your Supabase project's SQL Editor

alter table public.study_sessions 
  add column if not exists duration_minutes integer default 0,
  add column if not exists textbook_id uuid references public.textbooks(id) on delete set null;

-- Enable indexing for faster streak and duration aggregations
create index if not exists idx_study_sessions_user_id on public.study_sessions(user_id);
create index if not exists idx_study_sessions_started_at on public.study_sessions(started_at);
