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
  storage_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE textbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE textbook_chunks ENABLE ROW LEVEL SECURITY;

-- Policies for Textbooks
CREATE POLICY "Users can insert their own textbooks" 
ON textbooks FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view ready textbooks" 
ON textbooks FOR SELECT TO authenticated 
USING (status = 'ready');

CREATE POLICY "Users can update their own textbooks" 
ON textbooks FOR UPDATE TO authenticated 
USING (auth.uid() = user_id);

-- Policies for Chunks
CREATE POLICY "Users can insert chunks for their textbooks" 
ON textbook_chunks FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM textbooks 
    WHERE textbooks.id = textbook_chunks.book_id 
    AND textbooks.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view chunks for ready textbooks" 
ON textbook_chunks FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM textbooks 
    WHERE textbooks.id = textbook_chunks.book_id 
    AND textbooks.status = 'ready'
  )
);
