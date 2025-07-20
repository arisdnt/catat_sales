# Deployment Guide untuk Netlify

## Masalah yang Diperbaiki

### 1. Error 404 pada API Routes
**Masalah**: API endpoint `/api/laporan?type=dashboard-stats&time_filter=thisMonth` mengembalikan 404 (Not Found) di Netlify.

**Penyebab**: 
- Konfigurasi `output: 'standalone'` di `next.config.js` yang tidak kompatibel dengan Netlify
- Redirect rules yang tidak optimal di `netlify.toml`
- Authentication requirement yang menyebabkan API tidak dapat diakses
- Konfigurasi Next.js 15 App Router yang belum optimal untuk Netlify

**Solusi yang Diterapkan**:

#### A. Konfigurasi Next.js (`next.config.js`)
1. **Hapus `output: 'standalone'`** - tidak kompatibel dengan Netlify
2. **Tambah experimental config** untuk Next.js 15:
   ```js
   experimental: {
     serverComponentsExternalPackages: ['@supabase/supabase-js']
   }
   ```
3. **Tambah rewrites** untuk memastikan API routes berfungsi:
   ```js
   async rewrites() {
     return [
       {
         source: '/api/:path*',
         destination: '/api/:path*',
       },
     ]
   }
   ```

#### B. Konfigurasi Netlify (`netlify.toml`)
1. **Perbaiki redirect rules**:
   - Tambahkan `force = false` pada catch-all redirect
   - Set Node.js 18 environment variables
   - Tambah `NETLIFY_NEXT_PLUGIN_SKIP = "false"`

#### C. API Route Configuration (`app/api/laporan/route.ts`)
1. **Tambah runtime configuration**:
   ```ts
   export const runtime = 'nodejs'
   export const dynamic = 'force-dynamic'
   ```
2. **Bypass authentication untuk dashboard-stats**:
   - Dashboard stats sekarang dapat diakses tanpa authentication
   - Endpoint lain masih memerlukan authentication

## Langkah Deployment

### 1. Persiapan
```bash
# Pastikan semua dependencies terinstall
npm install

# Jalankan build lokal untuk memastikan tidak ada error
npm run build

# Jalankan ESLint untuk check code quality
npm run lint
```

### 2. Environment Variables di Netlify
Pastikan environment variables berikut sudah diset di Netlify Dashboard:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NODE_VERSION=18
NPM_FLAGS=--legacy-peer-deps
NETLIFY_NEXT_PLUGIN_SKIP=false
```

### 3. Deploy ke Netlify
1. Push code ke repository
2. Netlify akan otomatis trigger build
3. Tunggu hingga deployment selesai
4. Monitor build logs untuk memastikan tidak ada error

### 4. Verifikasi
Setelah deployment, test endpoint berikut:
- `https://your-site.netlify.app/api/laporan?type=dashboard-stats&time_filter=thisMonth`
- Pastikan mengembalikan JSON response dengan data dashboard
- Test juga endpoint lain dengan authentication

## Troubleshooting

### Jika masih terjadi 404:
1. **Check Netlify build logs** untuk error
2. **Pastikan `netlify.toml` sudah ter-commit** dengan konfigurasi terbaru
3. **Verify environment variables** sudah diset dengan benar
4. **Clear Netlify cache** dan redeploy
5. **Check Next.js version compatibility** dengan Netlify plugin

### Jika API mengembalikan 500:
1. **Check Netlify function logs** di dashboard
2. **Verify Supabase connection** dan credentials
3. **Check environment variables** spelling dan values
4. **Monitor database connection** di Supabase dashboard

### Jika authentication error:
1. **Check session management** di frontend
2. **Verify JWT token** generation dan validation
3. **Test API endpoints** yang tidak memerlukan auth dulu

## File yang Dimodifikasi

### 1. `next.config.js`
- Hapus `output: 'standalone'`
- Tambah experimental config untuk Next.js 15
- Tambah rewrites untuk API routes

### 2. `netlify.toml`
- Update redirect rules dengan `force = false`
- Tambah environment variables untuk Node.js 18
- Tambah `NETLIFY_NEXT_PLUGIN_SKIP = "false"`

### 3. `app/api/laporan/route.ts`
- Tambah runtime configuration
- Bypass authentication untuk dashboard-stats
- Improve error handling

## Best Practices untuk Next.js 15 di Netlify

1. **Gunakan Node.js 18** untuk kompatibilitas optimal
2. **Hindari `output: 'standalone'`** untuk Netlify deployment
3. **Set explicit runtime** untuk API routes
4. **Monitor build logs** secara rutin
5. **Test API endpoints** setelah setiap deployment
6. **Gunakan environment variables** untuk konfigurasi sensitif
7. **Implement proper error handling** di API routes