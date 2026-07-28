-- Add pdf_path column to textbooks table to support streaming PDF viewer
ALTER TABLE public.textbooks ADD COLUMN IF NOT EXISTS pdf_path TEXT;
