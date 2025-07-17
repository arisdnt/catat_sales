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

This is a Next.js 15 sales management system ("Sistem Penjualan Titip Bayar") built with TypeScript, Tailwind CSS, and Supabase.

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Database**: Supabase (PostgreSQL) with TypeScript types
- **Authentication**: Supabase Auth with JWT tokens
- **UI**: Tailwind CSS + shadcn/ui components
- **Forms**: React Hook Form with Zod validation + TanStack Form
- **Data Fetching**: TanStack Query (React Query) for server state management
- **State**: Context providers for auth and sidebar
- **Icons**: Lucide React
- **Excel Export**: SheetJS (xlsx) for data export functionality

### Database Schema
The system tracks consignment sales with these main entities:
- `sales` - Sales representatives
- `produk` - Products with pricing  
- `toko` - Stores assigned to sales reps
- `pengiriman` + `detail_pengiriman` - Product shipments to stores
- `penagihan` + `detail_penagihan` - Billing with sold/returned items
- `setoran` - Cash deposits from sales reps
- Views: `v_laporan_pengiriman`, `v_laporan_penagihan`, `v_rekonsiliasi_setoran`

### Authentication Flow
- All routes under `/dashboard` require authentication via `AuthGuard`
- API routes validate JWT tokens from Supabase session
- Row Level Security (RLS) enabled on all tables
- Middleware at `middleware.ts:4` handles route protection

### API Architecture
- RESTful API routes in `/app/api/`
- Centralized API client at `lib/api-client.ts:3` with automatic auth headers
- TanStack Query hooks in `/lib/queries/` for type-safe data fetching
- Query client configuration at `lib/react-query.ts` with optimized caching
- API helper functions at `lib/api-helpers.ts`
- All endpoints require Bearer token authentication

### UI Components
- shadcn/ui components in `/components/ui/`
- Custom shared components in `/components/shared/`
- Responsive design with collapsible sidebar (`components/shared/modern-sidebar.tsx`)
- Form utilities in `lib/form-utils.ts`

### Key File Locations
- Database types: `types/database.ts:1`
- Supabase config: `lib/supabase.ts:1`
- Auth provider: `components/providers/auth-provider.tsx`
- Query provider: `components/providers/query-provider.tsx`
- Query hooks: `lib/queries/*.ts` (sales, produk, toko, pengiriman, penagihan, setoran, laporan)
- Navigation hook: `lib/hooks/use-navigation.ts`
- Excel export utilities: `lib/excel-export.ts`
- Dashboard layout: `app/dashboard/layout.tsx:1`
- Database schema: `database-schema.sql:1`

### Environment Setup
- Requires `.env.local` with Supabase credentials
- Database must be initialized with `database-schema.sql`
- First user created via API: `POST /api/auth/create-user`

### Business Flow
1. Setup master data (sales, products, stores)
2. Record shipments (`pengiriman`) - sales deliver products to stores
3. Process billing (`penagihan`) - record sales, returns, discounts  
4. Record deposits (`setoran`) - sales deposit cash to office
5. Generate reconciliation reports via `/api/laporan`

## TanStack Query Implementation

### Complete Migration Status
✅ **Fully Migrated Components:**
- Dashboard main page (`app/dashboard/page.tsx`)
- Sales management (`app/dashboard/master-data/sales/page.tsx`)
- Product management (`app/dashboard/master-data/produk/page.tsx`)
- Store management (`app/dashboard/master-data/toko/page.tsx`)
- Shipment management (`app/dashboard/pengiriman/page.tsx`)
- Billing management (`app/dashboard/penagihan/page.tsx`)
- Deposit management (`app/dashboard/setoran/page.tsx`)
- Reports/Reconciliation (`app/dashboard/laporan/rekonsiliasi/page.tsx`)

### Query Organization
All query logic is organized in `/lib/queries/` with separate files for each domain:
- `sales.ts` - Sales management queries and mutations
- `produk.ts` - Product management queries and mutations  
- `toko.ts` - Store management queries and mutations
- `pengiriman.ts` - Shipment queries and mutations
- `penagihan.ts` - Billing queries and mutations
- `setoran.ts` - Deposit queries and mutations
- `laporan.ts` - Report queries and dashboard stats

### Query Keys
Each domain follows a consistent query key pattern:
```typescript
export const salesKeys = {
  all: ['sales'] as const,
  lists: () => [...salesKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...salesKeys.lists(), { filters }] as const,
  details: () => [...salesKeys.all, 'detail'] as const,
  detail: (id: number) => [...salesKeys.details(), id] as const,
}
```

### Usage Pattern
Components use typed hooks instead of direct API calls:
```typescript
// Before: Manual state management
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)

// After: TanStack Query
const { data = [], isLoading, error, refetch } = useSalesQuery()
const deleteMutation = useDeleteSalesMutation()
```

### Cache Configuration
- Default stale time: 5 minutes for most queries
- Reports: 2 minutes (fresher data needed)
- Dashboard stats: 1 minute with auto-refresh every 5 minutes
- Automatic retry with auth error handling

### Navigation Enhancement
- Custom `useNavigation` hook for type-safe routing
- Replaced `window.location.href` with router navigation
- Maintained Next.js App Router structure while adding TanStack Query benefits

## Excel Export Functionality

### Overview
The system includes comprehensive Excel export functionality using SheetJS (xlsx) for all data management pages.

### Features
- **Individual Page Export**: Each listing page has an export button that generates Excel files
- **Dashboard Export**: Dashboard statistics can be exported as Excel
- **Multi-Sheet Export**: Support for complex reports with multiple sheets
- **Formatted Output**: Proper column widths, data formatting, and Indonesian currency formatting
- **Error Handling**: Graceful error handling with user notifications

### Implementation
All export functionality is centralized in `lib/excel-export.ts` with specific functions:

```typescript
// Individual export functions
exportSalesData(data: any[]) - Sales team export
exportProductData(data: any[]) - Product catalog export  
exportStoreData(data: any[]) - Store directory export
exportShipmentData(data: any[]) - Shipment tracking export
exportBillingData(data: any[]) - Billing records export
exportDepositData(data: any[]) - Deposit records export
exportReconciliationData(data: any[]) - Reconciliation reports export
exportDashboardStats(data: any) - Dashboard statistics export

// Multi-sheet export
exportMultiSheetReport(data: {...}) - Comprehensive multi-sheet reports
```

### File Naming Convention
- Sales: `data_sales_YYYYMMDD_HHMMSS.xlsx`
- Products: `data_produk_YYYYMMDD_HHMMSS.xlsx`
- Stores: `data_toko_YYYYMMDD_HHMMSS.xlsx`
- Shipments: `data_pengiriman_YYYYMMDD_HHMMSS.xlsx`
- Billings: `data_penagihan_YYYYMMDD_HHMMSS.xlsx`
- Deposits: `data_setoran_YYYYMMDD_HHMMSS.xlsx`
- Reconciliation: `laporan_rekonsiliasi_YYYYMMDD_HHMMSS.xlsx`
- Dashboard: `dashboard_statistics_YYYYMMDD_HHMMSS.xlsx`
- Multi-sheet: `laporan_lengkap_YYYYMMDD_HHMMSS.xlsx`

### Usage Pattern
```typescript
// In components
import { exportSalesData } from '@/lib/excel-export'

const handleExport = () => {
  const result = exportSalesData(salesData)
  if (result.success) {
    toast({ title: "Export Success", description: `File exported: ${result.filename}` })
  } else {
    toast({ title: "Export Error", description: result.error, variant: "destructive" })
  }
}
```

## Path Aliases
- `@/*` - Root directory
- `@/components/*` - Components directory  
- `@/lib/*` - Library utilities
- `@/types/*` - TypeScript types