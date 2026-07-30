-- Drop the old tables if they exist
DROP TABLE IF EXISTS textbook_chapters CASCADE;
DROP TABLE IF EXISTS textbook_chunks CASCADE;
DROP TABLE IF EXISTS textbooks CASCADE;

-- Create the Textbooks parent table
CREATE TABLE textbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  author TEXT,
  subject TEXT,
  total_pages INTEGER NOT NULL,
  total_parts INTEGER NOT NULL,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'uploading', 'ready', 'failed')),
  user_id UUID, -- References auth.users(id)
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

-- Disable RLS to allow seamless uploads during development
ALTER TABLE textbooks DISABLE ROW LEVEL SECURITY;
ALTER TABLE textbook_chunks DISABLE ROW LEVEL SECURITY;
