# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

Essential commands for working with this codebase:

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server  
npm start

# Type checking (IMPORTANT: Run before commits)
npm run type-check

# Linting (IMPORTANT: Run before commits)
npm run lint
```

Always run `npm run type-check` and `npm run lint` before committing changes to ensure code quality.

## Database Setup

The project uses Supabase (PostgreSQL) with the schema defined in `db.sql`. Key environment variables required:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Architecture Overview

This is a **Next.js 15 sales management system** for Indonesian SME businesses using a "titip bayar" (consignment sales) model.

### Core Business Flow
1. **Sales** ship products to **Stores** without upfront payment
2. **Stores** sell products to end consumers
3. **Sales** perform periodic billing for sold products
4. **Stores** pay only for sold products, can return unsold items
5. **Sales** deposit collected cash to headquarters

### Key Architectural Patterns

**Database Layer:**
- Supabase with Row Level Security (RLS) enabled
- Type-safe database interactions via `types/database.ts`
- Optimized queries separated into regular and `-optimized` variants
- Materialized views for reporting (`v_laporan_*`)

**State Management:**
- TanStack Query for server state (configured in `lib/react-query.ts`)
- React Context for UI state (sidebar, auth)
- Query invalidation patterns for real-time updates

**Component Architecture:**
- Three data table variants: `basic`, `optimized`, `advanced`
- Shared UI components via shadcn/ui in `components/ui/`
- Provider pattern for auth, queries, and sidebar state
- Performance optimizations with virtual scrolling for large datasets

**API Design:**
- RESTful API routes in `app/api/`
- Separate endpoints for regular and optimized queries
- Filter options and search suggestions endpoints
- Bulk operations support (batch processing)

### Key Directories

- `app/api/` - API routes organized by feature (sales, produk, toko, pengiriman, penagihan, setoran)
- `lib/queries/` - TanStack Query hooks and types, organized by feature
- `components/data-tables/` - Three table implementations for different performance needs
- `components/navigation/` - Sidebar components (basic and modern variants)
- `components/search/` - Advanced filtering and virtual list components

### Performance Optimizations

**Database:**
- Optimized queries with materialized views
- Pagination and filtering at database level
- Separate count functions for large datasets
- Index strategies for common query patterns

**Frontend:**
- Virtual scrolling for tables with >1000 rows
- Smart prefetching with `use-smart-prefetch` hook
- Debounced search with `use-debounced-search`
- Component-level optimization patterns

**Query Strategy:**
- 5-minute stale time, 30-minute garbage collection
- Background refetching disabled to reduce server load
- Optimistic updates for mutations
- Separate optimized endpoints for performance-critical operations

### Data Tables Usage

Choose the appropriate table component based on your needs:
- `DataTableBasic` - Simple tables with basic features
- `DataTableOptimized` - Medium datasets with enhanced performance
- `DataTableAdvanced` - Large datasets (>1000 rows) with virtual scrolling

### Authentication & Security

- Supabase Auth with JWT tokens
- Row Level Security policies enforced at database level
- Client-side auth guards via `AuthGuard` component
- Service role key for API routes requiring elevated permissions

### Import Patterns

The codebase uses centralized exports:
- `components/data-tables/index.ts` - All table components
- `lib/queries/index.ts` - All query hooks and types
- Feature-specific query files (`sales.ts`, `produk.ts`, etc.)

When adding new features, follow the established patterns for queries, components, and API routes.