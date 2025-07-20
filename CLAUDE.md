# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

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

## Project Architecture

This is a Next.js 15 application with App Router implementing a **sales management system** ("Sistem Penjualan Titip Bayar") for tracking inventory shipments, billing, and cash deposits.

### Tech Stack
- **Frontend**: Next.js 15 with App Router, React 18, TypeScript
- **UI**: Tailwind CSS + shadcn/ui components + Radix UI primitives
- **Backend**: Supabase (PostgreSQL) with Row Level Security
- **Auth**: Supabase Auth with JWT tokens
- **Data Fetching**: TanStack Query (React Query) with optimized caching
- **Forms**: React Hook Form + Zod validation + TanStack Form
- **Charts**: Chart.js + Recharts for analytics

### Core Business Entities

The system follows a **consignment sales model** with these key entities:

1. **Master Data**: `sales` (salespeople), `produk` (products), `toko` (stores)
2. **Transaction Flow**: 
   - `pengiriman` + `detail_pengiriman` → Shipments to stores
   - `penagihan` + `detail_penagihan` + `potongan_penagihan` → Billing with returns/discounts  
   - `setoran` → Cash deposits
3. **Reporting Views**: Materialized views for optimized reporting (`v_laporan_*`, `v_rekonsiliasi_*`)

### File Structure

```
app/
├── (auth)/login/           # Authentication pages
├── dashboard/              # Main dashboard with sidebar layout
│   ├── master-data/        # CRUD for sales, products, stores
│   ├── pengiriman/         # Shipment management
│   ├── penagihan/          # Billing management
│   ├── setoran/            # Cash deposit management
│   └── laporan/            # Reports and reconciliation
└── api/                    # API routes with Supabase integration

components/
├── ui/                     # shadcn/ui components  
├── data-tables/            # Data table components (basic, optimized, advanced)
├── navigation/             # Navigation components (sidebars)
├── search/                 # Search and filter components
├── charts/                 # Chart components
├── forms/                  # Form utilities and components
├── layout/                 # Layout components (auth guard, navbar)
└── providers/              # Context providers (auth, query, sidebar)

lib/
├── supabase.ts            # Supabase client configuration
├── queries/               # TanStack Query definitions (optimized + regular)
├── hooks/                 # Custom hooks (debounce, navigation, prefetch)
└── performance/           # Table optimization utilities
```

### Database Architecture

- **Supabase PostgreSQL** with Row Level Security enabled
- **Optimized queries** in `lib/queries/*-optimized.ts` for better performance
- **Materialized views** for complex reporting queries
- **TypeScript types** auto-generated in `types/database.ts`

### Key Patterns

1. **Optimized Data Fetching**: Separate optimized query files for performance-critical pages
2. **Smart Prefetching**: `use-smart-prefetch.ts` for proactive data loading
3. **Virtual Tables**: `virtual-list.tsx` for handling large datasets
4. **Responsive Tables**: Custom responsive table configurations with horizontal scroll
5. **Bulk Operations**: Bulk import/export functionality with Excel support
6. **Search & Filtering**: Debounced search with suggestion endpoints

### Authentication

- **Supabase Auth** with session-based authentication
- **JWT tokens** validated via middleware for API routes  
- **AuthProvider** manages authentication state across components
- **Row Level Security** enforces data access permissions

### Performance Optimizations

- **TanStack Query** for caching and background updates
- **Optimized database queries** with proper indexing
- **Virtual scrolling** for large data tables
- **Debounced search** to reduce API calls
- **Smart prefetching** for improved UX

### State Management

- **TanStack Query** for server state
- **React Context** for auth, sidebar, and UI state
- **React Hook Form** for form state with Zod validation
- **URL state** for filters and pagination

## Environment Setup

Requires these environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
- `SUPABASE_SERVICE_ROLE_KEY`

## Important Notes

### Build & Deploy Configuration
- **Output**: Standalone build configured for Netlify deployment
- **ESLint**: Ignored during builds (set in next.config.js)
- **TypeScript**: Build errors not ignored (strict type checking enabled)
- **Production**: Console logs removed in production builds

### Component Architecture Update
Recent structural changes from git status show:
- **Data Tables**: Consolidated into `components/data-tables/` with basic, optimized, and advanced variants
- **Navigation**: Separate directory with sidebar components
- **Search**: Dedicated `components/search/` for search and filter functionality
- **Layout**: Auth guards and navigation components in `components/layout/`
- **Providers**: Context providers for auth, query, and sidebar state

### Path Aliases

TypeScript configured with these aliases:
- `@/*` → root directory
- `@/components/*` → components directory
- `@/lib/*` → lib directory  
- `@/types/*` → types directory