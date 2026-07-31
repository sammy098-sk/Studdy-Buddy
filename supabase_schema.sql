-- Drop the old tables if they exist
DROP TABLE IF EXISTS textbook_chapters CASCADE;
DROP TABLE IF EXISTS textbook_chunks CASCADE;
DROP TABLE IF EXISTS reading_progress CASCADE;
DROP TABLE IF EXISTS textbooks CASCADE;

-- Create the Textbooks parent table
CREATE TABLE textbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  author TEXT,
  subject TEXT,
  total_pages INTEGER NOT NULL,
  total_parts INTEGER NOT NULL,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'splitting', 'uploading', 'verifying', 'ready', 'failed')),
  uploaded_by UUID, -- References auth.users(id), represents the admin who uploaded it
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the Chunks child table
CREATE TABLE textbook_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES textbooks(id) ON DELETE CASCADE,
  part_number INTEGER NOT NULL,
  first_page INTEGER NOT NULL,
  last_page INTEGER NOT NULL,
  page_count INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  checksum TEXT NOT NULL,
  upload_status TEXT DEFAULT 'pending' CHECK (upload_status IN ('pending', 'success', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Reading Progress table
CREATE TABLE reading_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES textbooks(id) ON DELETE CASCADE,
  current_page INTEGER DEFAULT 1,
  zoom_level NUMERIC DEFAULT 1.0,
  view_mode TEXT DEFAULT 'continuous',
  fit_mode BOOLEAN DEFAULT true,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- Create Textbook Chapters table
CREATE TABLE textbook_chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES textbooks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  level INTEGER DEFAULT 0,
  parent_id UUID REFERENCES textbook_chapters(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS to allow seamless uploads during development
ALTER TABLE textbooks DISABLE ROW LEVEL SECURITY;
ALTER TABLE textbook_chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE textbook_chapters DISABLE ROW LEVEL SECURITY;
