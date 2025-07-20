# 🏪 Sistem Manajemen Penjualan Titip Bayar

> **Sales Management System** - Aplikasi web modern untuk mengelola penjualan dengan model titip bayar (consignment sales)

[![Built with Next.js](https://img.shields.io/badge/built%20with-Next.js%2015-000000.svg?style=flat-square&logo=next.js)](https://nextjs.org)
[![Powered by Supabase](https://img.shields.io/badge/powered%20by-Supabase-3ECF8E.svg?style=flat-square&logo=supabase)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Deployed on Netlify](https://img.shields.io/badge/deployed%20on-Netlify-00C7B7?style=flat-square&logo=netlify)](https://netlify.com)

## 📋 Deskripsi

Sistem komprehensif untuk mengelola **penjualan dengan model titip bayar** (consignment sales), yang mencakup pengiriman barang, penagihan, dan setoran uang tunai. Dibangun dengan teknologi modern untuk memastikan performa optimal dan pengalaman pengguna yang lancar.

### 🎯 Model Bisnis: Titip Bayar (Consignment Sales)

**Alur Bisnis:**
1. **Sales** mengirim produk ke **Toko** tanpa pembayaran di muka
2. **Toko** menjual produk kepada konsumen akhir  
3. **Sales** melakukan penagihan berkala untuk produk yang terjual
4. **Toko** membayar hanya untuk produk yang terjual, bisa mengembalikan yang tidak laku
5. **Sales** menyetor uang hasil penagihan ke kantor pusat

## ✨ Fitur Unggulan

### 📊 Dashboard & Analytics
- **Real-time Statistics**: Monitoring performa penjualan harian
- **Interactive Charts**: Visualisasi data dengan Chart.js dan Recharts
- **Performance Insights**: Analisis tren penjualan dan performa sales

### 🗃️ Master Data Management
- **Sales Management**: Kelola data tenaga penjualan dan teritori
- **Product Management**: CRUD produk dengan kategorisasi prioritas
- **Store Management**: Database toko dengan mapping ke sales

### 🚚 Operasional Harian
- **Shipment Tracking**: Pencatatan pengiriman barang ke toko
- **Billing System**: Penagihan dengan dukungan retur dan potongan
- **Cash Deposits**: Rekonsiliasi setoran uang tunai
- **Bulk Operations**: Import/export data dalam jumlah besar

### 📈 Reporting & Reconciliation
- **Comprehensive Reports**: Laporan pengiriman, penagihan, dan rekonsiliasi
- **Excel Export**: Export data ke format Excel untuk analisis lanjutan
- **Audit Trail**: Tracking perubahan data untuk keperluan audit

### 🔐 Security & Performance
- **Row Level Security**: Keamanan data tingkat baris dengan Supabase RLS
- **Optimized Queries**: Query database yang dioptimasi untuk performa
- **Virtual Scrolling**: Handling dataset besar dengan performa tinggi
- **Progressive Loading**: Smart prefetching dan caching

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 dengan App Router
- **Language**: TypeScript untuk type safety
- **UI Library**: Tailwind CSS + shadcn/ui + Radix UI
- **State Management**: TanStack Query + React Context
- **Forms**: React Hook Form + Zod validation
- **Charts**: Chart.js + Recharts

### Backend & Database  
- **Database**: Supabase (PostgreSQL) dengan Row Level Security
- **API**: Next.js API Routes dengan RESTful design
- **Authentication**: Supabase Auth dengan JWT tokens
- **File Storage**: Supabase Storage untuk dokumen

### Performance & Developer Experience
- **Caching**: TanStack Query dengan background updates
- **Optimization**: Bundle optimization dengan SWC
- **Type Safety**: Fully typed dengan database schema
- **DevTools**: ESLint, Prettier, TypeScript strict mode

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ dan npm/yarn
- **Git** untuk version control  
- **Akun Supabase** untuk database dan auth

### 1. Clone Repository

```bash
git clone <repository-url>
cd catat_sales
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local` dengan kredensial Supabase Anda:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Database Setup

1. Buat project baru di [Supabase](https://supabase.com)
2. Jalankan SQL schema (database-schema.sql) di SQL Editor
3. Setup authentication policies
4. Buat user pertama:

```bash
curl -X POST http://localhost:3000/api/auth/create-user \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

### 4. Development

```bash
# Start development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Production build
npm run build
```

Aplikasi akan tersedia di `http://localhost:3000`

## 📁 Struktur Project

```
catat_sales/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login)
│   ├── dashboard/                # Main application
│   │   ├── master-data/          # CRUD master data
│   │   ├── pengiriman/           # Shipment management
│   │   ├── penagihan/            # Billing management  
│   │   ├── setoran/              # Cash deposit management
│   │   └── laporan/              # Reports & analytics
│   └── api/                      # API routes
├── components/                   # React components
│   ├── data-tables/              # Table components (basic, optimized, advanced)
│   ├── navigation/               # Navigation (sidebars)
│   ├── search/                   # Search & filter components
│   ├── charts/                   # Chart components
│   ├── forms/                    # Form utilities
│   ├── layout/                   # Layout components
│   ├── ui/                       # shadcn/ui components
│   └── providers/                # Context providers
├── lib/                          # Utilities & configurations
│   ├── queries/                  # TanStack Query definitions
│   ├── hooks/                    # Custom React hooks
│   └── performance/              # Performance optimizations
└── types/                        # TypeScript type definitions
```

## 🗄️ Database Schema

### Master Tables
- **sales**: Data tenaga penjualan
- **produk**: Master data produk dengan prioritas
- **toko**: Database toko dengan mapping ke sales

### Transaction Tables
- **pengiriman** + **detail_pengiriman**: Header dan detail pengiriman
- **penagihan** + **detail_penagihan**: Header dan detail penagihan
- **potongan_penagihan**: Data potongan/diskon
- **setoran**: Data setoran uang tunai

### Materialized Views (Optimized Reporting)
- **v_laporan_pengiriman**: Laporan pengiriman dengan join
- **v_laporan_penagihan**: Laporan penagihan dengan join  
- **v_rekonsiliasi_setoran**: Laporan rekonsiliasi setoran

## 🔗 API Documentation

### Master Data Endpoints
```
GET    /api/sales              # List sales
POST   /api/sales              # Create sales
PUT    /api/sales/[id]         # Update sales
DELETE /api/sales/[id]         # Delete sales

GET    /api/produk             # List products
POST   /api/produk             # Create product
PUT    /api/produk/[id]        # Update product
DELETE /api/produk/[id]        # Delete product

GET    /api/toko               # List stores
POST   /api/toko               # Create store
PUT    /api/toko/[id]          # Update store
DELETE /api/toko/[id]          # Delete store
```

### Transaction Endpoints
```
GET    /api/pengiriman         # List shipments
POST   /api/pengiriman         # Create shipment
PUT    /api/pengiriman/[id]    # Update shipment

GET    /api/penagihan          # List billing
POST   /api/penagihan          # Create billing
PUT    /api/penagihan/[id]     # Update billing

GET    /api/setoran            # List deposits
POST   /api/setoran            # Create deposit
PUT    /api/setoran/[id]       # Update deposit
```

### Reporting Endpoints
```
GET    /api/laporan?type=pengiriman     # Shipment reports
GET    /api/laporan?type=penagihan      # Billing reports
GET    /api/laporan?type=rekonsiliasi   # Reconciliation reports
GET    /api/laporan?type=dashboard-stats # Dashboard statistics
```

## 🚀 Deployment

### Deploy ke Netlify

1. **Push ke GitHub**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Netlify**:
   - Login ke [Netlify](https://netlify.com)
   - Import repository dari GitHub
   - Build settings sudah dikonfigurasi via `netlify.toml`

3. **Environment Variables**:
   Set di Netlify dashboard > Site settings > Environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Deploy**: 
   Netlify akan otomatis build dan deploy

### Alternative Platforms
- **Vercel**: Native Next.js support
- **Railway**: Full-stack deployment  
- **DigitalOcean App Platform**: Managed hosting

## 🔧 Development Guidelines

### Code Organization
- **Components**: Organized by function (data-tables, navigation, search)
- **API Routes**: RESTful design dengan optimized variants
- **Queries**: Separated regular dan optimized queries
- **Types**: Centralized TypeScript definitions

### Performance Best Practices
- **Query Optimization**: Gunakan materialized views untuk reporting
- **Caching Strategy**: TanStack Query dengan stale-while-revalidate
- **Bundle Optimization**: Tree shaking dan code splitting
- **Virtual Scrolling**: Untuk dataset besar (>1000 items)

### Security Considerations
- **Row Level Security**: Enforced di Supabase
- **Input Validation**: Zod schemas untuk semua forms
- **Authentication**: JWT tokens dengan refresh strategy
- **Environment Variables**: Sensitive data di environment vars

## 🧪 Testing

```bash
# Unit tests (jika tersedia)
npm run test

# Type checking
npm run type-check

# Linting  
npm run lint

# Integration testing
npm run test:integration
```

## 📊 Monitoring & Analytics

### Performance Monitoring
- **Core Web Vitals**: FCP, LCP, CLS monitoring
- **Bundle Analysis**: Webpack bundle analyzer
- **Database Performance**: Supabase query analytics

### Business Analytics
- **Sales Performance**: Real-time dashboard metrics
- **Product Analytics**: Best/worst performing products
- **Territory Analysis**: Performance per sales area

## 🤝 Contributing

1. **Fork repository**
2. **Create feature branch**: `git checkout -b feature/new-feature`
3. **Make changes** dan test thoroughly
4. **Commit changes**: `git commit -m 'Add new feature'`
5. **Push to branch**: `git push origin feature/new-feature`
6. **Create Pull Request**

### Coding Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Extended dari Next.js config
- **Prettier**: Code formatting
- **Conventional Commits**: Commit message format

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Documentation

### Documentation
- **API Docs**: `/docs/api` (jika tersedia)
- **Component Docs**: Storybook (jika dikonfigurasi)
- **Database Schema**: ERD diagram di `/docs/database`

### Getting Help
- **Issues**: [GitHub Issues](link-to-issues)
- **Discussions**: [GitHub Discussions](link-to-discussions)
- **Wiki**: [Project Wiki](link-to-wiki)

### Contact
- **Project Lead**: [Contact Info]
- **Development Team**: [Team Contact]
- **Business Questions**: [Business Contact]

---

<div align="center">

**Built with ❤️ for Indonesian SME businesses**

[🚀 Live Demo](your-demo-url) • [📚 Documentation](your-docs-url) • [🐛 Report Bug](your-issues-url)

</div>