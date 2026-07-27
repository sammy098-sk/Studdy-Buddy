-- Create the study_progress table
create table public.study_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  topic_label text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table public.study_progress enable row level security;

-- Policy: Users can see their own progress
create policy "Users can view own study progress"
  on public.study_progress for select
  using ( auth.uid() = user_id );

-- Policy: Users can insert their own progress
create policy "Users can insert own study progress"
  on public.study_progress for insert
  with check ( auth.uid() = user_id );
