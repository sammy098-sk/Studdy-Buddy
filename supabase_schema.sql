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
  status TEXT DEFAULT 'uploading',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the Chunks child table
CREATE TABLE textbook_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES textbooks(id) ON DELETE CASCADE,
  part_number INTEGER NOT NULL,
  first_page INTEGER NOT NULL,
  last_page INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: Ensure you have RLS policies set up for these tables 
-- if they are being accessed by anonymous users, or disable RLS.
