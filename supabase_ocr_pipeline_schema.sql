/*
  Supabase OCR Pipeline & Document Classification Migration
  Adds scalable server-side OCR metadata, versioning, granular
  processing states, and persistent page-level extraction storage.
*/

-- 1. Extend textbooks table with automatic classification and OCR tracking
ALTER TABLE public.textbooks 
ADD COLUMN IF NOT EXISTS pdf_type TEXT DEFAULT 'native_searchable_pdf',
ADD COLUMN IF NOT EXISTS processing_state TEXT DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS ocr_engine TEXT DEFAULT 'native_text',
ADD COLUMN IF NOT EXISTS ocr_status TEXT DEFAULT 'not_needed',
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC DEFAULT 100.0,
ADD COLUMN IF NOT EXISTS pages_requiring_ocr INTEGER[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS pages_failed INTEGER[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ocr_pipeline_version INTEGER DEFAULT 1;

-- 2. Create textbook_extracted_pages table for persistent page-level text & confidence
CREATE TABLE IF NOT EXISTS public.textbook_extracted_pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    book_id UUID REFERENCES public.textbooks(id) ON DELETE CASCADE NOT NULL,
    page_number INTEGER NOT NULL,
    extracted_text TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'digital', -- 'digital', 'ocr'
    confidence_score NUMERIC DEFAULT 100.0, -- Page-level confidence score (0-100)
    ocr_status TEXT DEFAULT 'completed', -- 'not_needed', 'completed', 'low_confidence', 'failed'
    is_low_dpi BOOLEAN DEFAULT false,
    ocr_pipeline_version INTEGER DEFAULT 1, -- Versioning to support future targeted reprocessing
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT unique_book_page UNIQUE(book_id, page_number)
);

-- 3. Create index for fast page retrieval during reader sessions and RAG search
CREATE INDEX IF NOT EXISTS idx_textbook_extracted_pages_book_id ON public.textbook_extracted_pages(book_id, page_number);

-- 4. Enable Row Level Security (RLS) on textbook_extracted_pages
ALTER TABLE public.textbook_extracted_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all users to read textbook_extracted_pages" ON public.textbook_extracted_pages;
CREATE POLICY "Allow all users to read textbook_extracted_pages"
  ON public.textbook_extracted_pages FOR SELECT
  USING ( true );

DROP POLICY IF EXISTS "Allow authenticated users to insert textbook_extracted_pages" ON public.textbook_extracted_pages;
CREATE POLICY "Allow authenticated users to insert textbook_extracted_pages"
  ON public.textbook_extracted_pages FOR INSERT
  WITH CHECK ( auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Allow authenticated users to update textbook_extracted_pages" ON public.textbook_extracted_pages;
CREATE POLICY "Allow authenticated users to update textbook_extracted_pages"
  ON public.textbook_extracted_pages FOR UPDATE
  USING ( auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Allow authenticated users to delete textbook_extracted_pages" ON public.textbook_extracted_pages;
CREATE POLICY "Allow authenticated users to delete textbook_extracted_pages"
  ON public.textbook_extracted_pages FOR DELETE
  USING ( auth.role() = 'authenticated' );
