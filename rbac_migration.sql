-- 1. Add role to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';

-- 2. Grant admin to samsonijie66@gmail.com
UPDATE public.profiles SET role = 'admin' WHERE email = 'samsonijie66@gmail.com';

-- 3. Create helper function for RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enable RLS on core tables
ALTER TABLE textbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE textbook_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

-- 5. Drop any existing policies to avoid conflicts if run multiple times
DROP POLICY IF EXISTS "Anyone can read published textbooks or admins can read all" ON textbooks;
DROP POLICY IF EXISTS "Admins can manage textbooks" ON textbooks;
DROP POLICY IF EXISTS "Anyone can read chunks of published textbooks" ON textbook_chunks;
DROP POLICY IF EXISTS "Admins can manage chunks" ON textbook_chunks;
DROP POLICY IF EXISTS "Users can manage own reading progress" ON reading_progress;

-- 6. Create RLS Policies for textbooks
CREATE POLICY "Anyone can read published textbooks or admins can read all"
ON textbooks FOR SELECT
USING (is_published = true OR public.is_admin());

CREATE POLICY "Admins can manage textbooks"
ON textbooks FOR ALL
USING (public.is_admin());

-- 7. Create RLS Policies for textbook_chunks
CREATE POLICY "Anyone can read chunks of published textbooks"
ON textbook_chunks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM textbooks 
    WHERE id = textbook_chunks.book_id 
    AND (is_published = true OR public.is_admin())
  )
);

CREATE POLICY "Admins can manage chunks"
ON textbook_chunks FOR ALL
USING (public.is_admin());

-- 8. Create RLS Policies for reading_progress
CREATE POLICY "Users can manage own reading progress"
ON reading_progress FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
