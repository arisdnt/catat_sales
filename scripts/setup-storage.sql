-- Script untuk setup Supabase Storage bucket dan policies
-- Jalankan script ini di Supabase SQL Editor

-- 1. Buat bucket 'bukti-pengeluaran' jika belum ada
INSERT INTO storage.buckets (id, name, public)
VALUES ('bukti-pengeluaran', 'bukti-pengeluaran', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy untuk mengizinkan service role upload file
CREATE POLICY "Service role can upload files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'bukti-pengeluaran' AND 
  auth.role() = 'service_role'
);

-- 3. Policy untuk mengizinkan public read access
CREATE POLICY "Public can view bukti pengeluaran" ON storage.objects
FOR SELECT USING (
  bucket_id = 'bukti-pengeluaran'
);

-- 4. Policy untuk mengizinkan service role delete file (jika diperlukan)
CREATE POLICY "Service role can delete files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'bukti-pengeluaran' AND 
  auth.role() = 'service_role'
);

-- 5. Verifikasi bucket sudah dibuat
SELECT * FROM storage.buckets WHERE id = 'bukti-pengeluaran';

-- 6. Verifikasi policies sudah dibuat
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%bukti%';