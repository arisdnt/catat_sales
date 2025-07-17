# Sistem Penjualan Titip Bayar

Sistem komprehensif untuk mengelola penjualan dengan model titip bayar, yang mencakup pengiriman barang, penagihan, dan setoran uang tunai.

## 🚀 Fitur Utama

- **Dashboard Analitik**: Ringkasan statistik dan pendapatan harian
- **Master Data**: Kelola produk, toko, dan sales
- **Pengiriman**: Catat pengiriman barang ke toko
- **Penagihan**: Proses penagihan dengan detail barang terjual dan retur
- **Setoran**: Rekonsiliasi setoran uang tunai
- **Laporan**: Laporan rekonsiliasi dan tracking yang lengkap
- **Autentikasi**: Sistem login yang aman dengan Supabase Auth

## 🛠️ Teknologi yang Digunakan

- **Frontend**: Next.js 15 dengan App Router
- **UI Framework**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Autentikasi**: Supabase Auth
- **TypeScript**: Untuk type safety
- **Form Handling**: React Hook Form dengan Zod validation

## 📋 Prasyarat

Sebelum memulai, pastikan Anda memiliki:

- Node.js 18+ dan npm
- Akun Supabase
- Git

## 🎯 Setup Database di Supabase

1. **Buat Project Baru di Supabase**
   - Kunjungi [supabase.com](https://supabase.com)
   - Buat project baru
   - Tunggu hingga database siap

2. **Jalankan SQL Schema**
   - Buka SQL Editor di dashboard Supabase
   - Copy semua kode dari file `database-schema.sql`
   - Jalankan script untuk membuat semua tabel dan konfigurasi

3. **Konfigurasi Authentication**
   - Di dashboard Supabase, buka Authentication > Settings
   - Pastikan "Enable email confirmations" dinonaktifkan untuk development
   - Buat user pertama melalui Authentication > Users

## ⚙️ Setup Aplikasi

1. **Clone dan Install Dependencies**
   ```bash
   # Install dependencies
   npm install
   ```

2. **Konfigurasi Environment Variables**
   File `.env.local` sudah dikonfigurasi dengan kredensial Supabase Anda:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://juhibrdtpxfccbbzuqyd.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Setup Database**
   - Buka dashboard Supabase: https://supabase.com/dashboard
   - Masuk ke SQL Editor
   - Copy dan jalankan seluruh kode dari file `database-schema.sql`

4. **Buat User Pertama**
   ```bash
   # Setelah aplikasi berjalan, buat user dengan:
   curl -X POST http://localhost:3000/api/auth/create-user \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"password123"}'
   ```

5. **Jalankan Development Server**
   ```bash
   npm run dev
   ```

   Aplikasi akan tersedia di `http://localhost:3000`

## 📊 Struktur Database

### Tabel Master
- **sales**: Data sales/tenaga penjualan
- **produk**: Data produk yang dijual
- **toko**: Data toko/klien dengan relasi ke sales

### Tabel Transaksi
- **pengiriman** & **detail_pengiriman**: Header dan detail pengiriman barang
- **penagihan** & **detail_penagihan**: Header dan detail penagihan
- **potongan_penagihan**: Data potongan jika ada
- **setoran**: Data setoran uang tunai

### Views untuk Laporan
- **v_laporan_pengiriman**: Laporan pengiriman dengan join
- **v_laporan_penagihan**: Laporan penagihan dengan join
- **v_rekonsiliasi_setoran**: Laporan rekonsiliasi setoran

## 🔄 Alur Bisnis

1. **Setup Master Data**
   - Tambahkan data sales
   - Tambahkan data produk
   - Tambahkan data toko dengan sales yang bertanggung jawab

2. **Proses Pengiriman**
   - Sales mencatat pengiriman barang ke toko
   - Sistem mencatat detail produk dan jumlah yang dikirim

3. **Proses Penagihan**
   - Sales melakukan penagihan ke toko
   - Mencatat barang yang terjual, retur, dan potongan (jika ada)
   - Sistem menghitung total uang yang diterima

4. **Proses Setoran**
   - Sales menyetor uang tunai ke kantor
   - Sistem melakukan rekonsiliasi dengan penagihan cash

## 🔌 API Endpoints

### Master Data
- **Sales**: `/api/sales` - GET, POST, PUT, DELETE
- **Products**: `/api/produk` - GET, POST, PUT, DELETE
- **Stores**: `/api/toko` - GET, POST, PUT, DELETE

### Transactions
- **Shipments**: `/api/pengiriman` - GET, POST, PUT, DELETE
- **Billings**: `/api/penagihan` - GET, POST, PUT, DELETE
- **Deposits**: `/api/setoran` - GET, POST, PUT, DELETE

### Reports
- **Reports**: `/api/laporan` - GET dengan parameter type:
  - `pengiriman` - Laporan pengiriman
  - `penagihan` - Laporan penagihan
  - `rekonsiliasi` - Laporan rekonsiliasi setoran
  - `dashboard-stats` - Statistik dashboard

### Authentication
- Semua API endpoint membutuhkan Authorization header dengan Bearer token
- Token didapat dari Supabase Auth session
- Middleware otomatis memvalidasi token pada setiap request

## 🗃️ Struktur Folder

```
├── app/                          # Next.js App Router
│   ├── (auth)/login/            # Halaman login
│   ├── (dashboard)/             # Layout dashboard dengan sidebar
│   │   └── dashboard/
│   │       ├── page.tsx         # Dashboard utama
│   │       ├── master-data/     # CRUD master data
│   │       ├── pengiriman/      # Manajemen pengiriman
│   │       ├── penagihan/       # Manajemen penagihan
│   │       ├── setoran/         # Manajemen setoran
│   │       └── laporan/         # Laporan dan rekonsiliasi
├── components/
│   ├── ui/                      # Komponen shadcn/ui
│   └── shared/                  # Komponen custom
├── lib/
│   ├── supabase.ts             # Konfigurasi Supabase client
│   ├── utils.ts                # Utility functions
│   └── auth-context.tsx        # Context untuk autentikasi
├── types/
│   └── database.ts             # TypeScript types untuk database
└── database-schema.sql          # SQL schema untuk Supabase
```

## 🔐 Autentikasi

Sistem menggunakan Supabase Auth dengan Row Level Security (RLS):

- Semua tabel memiliki RLS enabled
- User yang authenticated dapat mengakses semua data
- Middleware Next.js memproteksi route dashboard

## 📱 Responsive Design

Aplikasi fully responsive dengan:
- Mobile-first approach
- Sidebar yang collapse di mobile
- Tabel yang responsive dengan scroll horizontal
- Form yang adaptive untuk berbagai ukuran layar

## 🚀 Deployment

### Deploy ke Vercel

1. Push kode ke GitHub repository
2. Connect repository ke Vercel
3. Set environment variables di Vercel dashboard
4. Deploy otomatis akan berjalan

### Deploy ke Platform Lain

Aplikasi ini adalah standard Next.js app yang bisa di-deploy ke:
- Netlify
- Railway
- DigitalOcean App Platform
- atau hosting Node.js lainnya

## 🔧 Development Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Linting
npm run lint

# Type checking
npm run type-check
```

## 📈 Monitoring dan Analytics

- Dashboard menyediakan statistik real-time
- Laporan rekonsiliasi untuk tracking setoran
- Views database yang optimized untuk reporting

## 🛡️ Security Features

- Row Level Security (RLS) di Supabase
- JWT-based authentication
- Input validation dengan Zod
- SQL injection protection melalui Supabase client

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

Untuk pertanyaan atau bantuan, silakan buat issue di GitHub repository.