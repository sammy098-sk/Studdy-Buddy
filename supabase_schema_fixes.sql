-- =================================================================
-- Supabase Database Schema & RLS Fixes for Study Buddy
-- Resolves 400 Bad Request on reading_progress and reader_preferences
-- =================================================================

-- 1. Ensure reading_progress table exists and has updated_at column
CREATE TABLE IF NOT EXISTS public.reading_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id TEXT NOT NULL,
    current_page INT DEFAULT 1,
    zoom_level NUMERIC DEFAULT 1.0,
    view_mode TEXT DEFAULT 'continuous',
    fit_mode BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_user_book_progress UNIQUE (user_id, book_id)
);

-- In case reading_progress already existed without updated_at column:
ALTER TABLE public.reading_progress 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW());

-- 2. Configure Row Level Security (RLS) policies for reading_progress
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reading progress" ON public.reading_progress;
CREATE POLICY "Users can view own reading progress" 
ON public.reading_progress FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reading progress" ON public.reading_progress;
CREATE POLICY "Users can insert own reading progress" 
ON public.reading_progress FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reading progress" ON public.reading_progress;
CREATE POLICY "Users can update own reading progress" 
ON public.reading_progress FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Ensure reader_preferences table is fully set up with RLS
CREATE TABLE IF NOT EXISTS public.reader_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id TEXT NOT NULL,
    study_scope TEXT DEFAULT 'page',
    theme TEXT DEFAULT 'light',
    font_size INTEGER DEFAULT 16,
    zoom_level NUMERIC DEFAULT 1.0,
    reading_mode TEXT DEFAULT 'continuous',
    read_aloud_speed NUMERIC DEFAULT 1.0,
    sidebar_state BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT reader_preferences_user_book_key UNIQUE (user_id, book_id)
);

ALTER TABLE public.reader_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own reader preferences" ON public.reader_preferences;
CREATE POLICY "Users can read own reader preferences"
ON public.reader_preferences FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reader preferences" ON public.reader_preferences;
CREATE POLICY "Users can insert own reader preferences"
ON public.reader_preferences FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reader preferences" ON public.reader_preferences;
CREATE POLICY "Users can update own reader preferences"
ON public.reader_preferences FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
