# Panduan Deployment ke Netlify

## Masalah yang Diperbaiki

Masalah 404 pada API routes di Netlify telah diperbaiki dengan perubahan berikut:

### 1. Konfigurasi Next.js (`next.config.js`)
- **Dihapus**: `output: 'standalone'` yang menyebabkan konflik dengan Netlify serverless functions
- **Dipertahankan**: Konfigurasi webpack dan compiler optimizations

### 2. Konfigurasi Netlify (`netlify.toml`)
- **Diperbaiki**: Redirect rules untuk API routes
- **Ditambahkan**: Environment variables untuk Node.js 18
- **Dioptimalkan**: Publish directory dan plugin configuration

## Langkah Deployment

1. **Push perubahan ke repository**
   ```bash
   git add .
   git commit -m "Fix: API routes 404 issue on Netlify"
   git push origin main
   ```

2. **Redeploy di Netlify**
   - Buka Netlify dashboard
   - Pilih site yang bermasalah
   - Klik "Trigger deploy" > "Deploy site"

3. **Verifikasi API endpoints**
   - Test endpoint: `https://your-site.netlify.app/api/laporan?type=dashboard-stats&time_filter=thisMonth`
   - Pastikan mengembalikan JSON, bukan HTML 404

## Troubleshooting

Jika masih ada masalah:

1. **Cek Function Logs di Netlify**
   - Buka site dashboard
   - Pergi ke "Functions" tab
   - Lihat logs untuk error details

2. **Verifikasi Environment Variables**
   - Pastikan semua environment variables (database, auth) sudah diset
   - Cek di Site settings > Environment variables

3. **Build Logs**
   - Periksa build logs untuk error atau warning
   - Pastikan semua dependencies terinstall dengan benar

## Konfigurasi yang Diperlukan

### Environment Variables di Netlify
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Build Settings
- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Node version**: 18.x

## Catatan Penting

- API routes di Next.js App Router memerlukan konfigurasi khusus di Netlify
- Penggunaan `output: 'standalone'` tidak kompatibel dengan Netlify serverless functions
- Redirect rules harus diatur dengan benar untuk menghindari konflik antara API routes dan client-side routing