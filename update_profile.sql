-- Add new columns for profile settings and preferences
alter table public.profiles 
add column if not exists favorite_subjects text[] default '{}',
add column if not exists daily_goal text default '30';
