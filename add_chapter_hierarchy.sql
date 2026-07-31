-- Add hierarchy support to textbook_chapters
ALTER TABLE public.textbook_chapters
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.textbook_chapters(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
