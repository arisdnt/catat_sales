# Setup Supabase Storage untuk Fitur Pengeluaran

Dokumen ini menjelaskan cara mengkonfigurasi Supabase Storage untuk fitur pengeluaran operasional.

## 1. Buat Bucket Storage

### Melalui Dashboard Supabase
1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda: `ubzemtmtkmezhdsezeko`
3. Navigasi ke **Storage** > **Buckets**
4. Klik **New bucket**
5. Isi detail bucket:
   - **Name**: `bukti-pengeluaran`
   - **Public bucket**: ✅ (Centang untuk akses publik)
   - **File size limit**: 5MB
   - **Allowed MIME types**: `image/jpeg,image/png,image/jpg`

### Melalui SQL (Alternatif)
Jalankan script SQL berikut di Supabase SQL Editor:

```sql
-- Buat bucket 'bukti-pengeluaran'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bukti-pengeluaran', 
  'bukti-pengeluaran', 
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;
```

## 2. Konfigurasi Storage Policies

Jalankan script SQL berikut untuk mengatur policies:

```sql
-- Policy untuk service role upload files
CREATE POLICY "Service role can upload bukti pengeluaran" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'bukti-pengeluaran' AND 
  auth.role() = 'service_role'
);

-- Policy untuk public read access
CREATE POLICY "Public can view bukti pengeluaran" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'bukti-pengeluaran');

-- Policy untuk service role delete files (opsional)
CREATE POLICY "Service role can delete bukti pengeluaran" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'bukti-pengeluaran' AND 
  auth.role() = 'service_role'
);
```

## 3. Verifikasi Setup

### Cek Bucket
```sql
SELECT * FROM storage.buckets WHERE id = 'bukti-pengeluaran';
```

### Cek Policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%bukti%';
```

## 4. Environment Variables

Pastikan environment variables berikut sudah dikonfigurasi di `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ubzemtmtkmezhdsezeko.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 5. Fitur yang Sudah Terintegrasi

✅ **Upload File**: API route `/api/admin/pengeluaran` sudah menggunakan Supabase Storage
✅ **Validasi File**: Tipe file (JPEG, PNG) dan ukuran (max 5MB) sudah divalidasi
✅ **Preview Image**: Form pengeluaran sudah menampilkan preview gambar
✅ **Public URL**: File yang diupload dapat diakses melalui public URL

## 6. Struktur File Upload

- **Bucket**: `bukti-pengeluaran`
- **Naming Convention**: `pengeluaran_{timestamp}.{extension}`
- **Supported Formats**: JPEG, PNG, JPG
- **Max File Size**: 5MB
- **Access**: Public read, Service role write/delete

## 7. Testing

Untuk menguji fitur storage:

1. Buka halaman pengeluaran: `/dashboard/pengeluaran`
2. Klik "Tambah Pengeluaran"
3. Upload file gambar sebagai bukti
4. Submit form
5. Verifikasi file tersimpan di bucket dan URL dapat diakses

## 8. Troubleshooting

### Error: "Failed to upload file"
- Pastikan bucket `bukti-pengeluaran` sudah dibuat
- Cek policies storage sudah dikonfigurasi
- Verifikasi `SUPABASE_SERVICE_ROLE_KEY` di environment

### Error: "Invalid file type"
- Pastikan file yang diupload adalah JPEG/PNG
- Cek MIME type validation di client dan server

### Error: "File size too large"
- Pastikan file tidak lebih dari 5MB
- Cek file size limit di bucket configuration