-- ─────────────────────────────────────────────────────────
-- SUPABASE STORAGE BUCKET: textbooks-pdf (500MB Size Limit)
-- ─────────────────────────────────────────────────────────

-- 1. Create or update storage bucket with 500MB file size limit (524,288,000 bytes)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('textbooks-pdf', 'textbooks-pdf', true, 524288000, array['application/pdf'])
on conflict (id) do update set
  file_size_limit = 524288000,
  allowed_mime_types = array['application/pdf'];

-- 2. RLS Policies for textbooks-pdf bucket
drop policy if exists "Public Access for textbook PDFs" on storage.objects;
drop policy if exists "Authenticated users can upload textbook PDFs" on storage.objects;
drop policy if exists "Authenticated users can update textbook PDFs" on storage.objects;
drop policy if exists "Authenticated users can delete textbook PDFs" on storage.objects;

create policy "Public Access for textbook PDFs"
  on storage.objects for select
  using ( bucket_id = 'textbooks-pdf' );

create policy "Authenticated users can upload textbook PDFs"
  on storage.objects for insert
  with check ( bucket_id = 'textbooks-pdf' and auth.role() = 'authenticated' );

create policy "Authenticated users can update textbook PDFs"
  on storage.objects for update
  using ( bucket_id = 'textbooks-pdf' and auth.role() = 'authenticated' );

create policy "Authenticated users can delete textbook PDFs"
  on storage.objects for delete
  using ( bucket_id = 'textbooks-pdf' and auth.role() = 'authenticated' );
