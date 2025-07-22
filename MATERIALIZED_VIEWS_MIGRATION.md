# Materialized Views to Direct Queries Migration

This document outlines the migration from materialized views to direct queries for improved data consistency and real-time accuracy.

## Overview

The system has been migrated from using materialized views to direct SQL queries to ensure data consistency and real-time accuracy. This change eliminates the potential for stale data that can occur with materialized views.

## Changes Made

### 1. Database Changes
- **File**: `drop_materialized_views.sql`
- **Purpose**: Drops all materialized views and related triggers/functions
- **Materialized Views Removed**:
  - `mv_asset_distribution_real`
  - `mv_dashboard_realtime_stats`
  - `mv_penagihan_aggregates`
  - `mv_penagihan_with_totals`
  - `mv_pengiriman_aggregates`
  - `mv_produk_aggregates`
  - `mv_produk_with_stats`
  - `mv_receivables_aging_real`
  - `mv_sales_aggregates`
  - `mv_sales_performance_real`
  - `mv_toko_aggregates`

### 2. Direct Query Implementation
- **File**: `lib/direct-queries.ts`
- **Purpose**: Contains SQL queries that replace materialized view logic
- **Features**:
  - Real-time data calculation
  - Proper filtering and aggregation
  - Maintains same data structure as materialized views

### 3. API Route Updates
Updated API routes to use direct queries instead of materialized views:

#### Sales API (`app/api/mv/sales/route.ts`)
- Now uses direct queries with proper joins
- Real-time calculation of aggregated statistics
- Maintains same API contract

#### Product API (`app/api/mv/produk/route.ts`)
- Direct calculation of product statistics
- Real-time inventory and sales data
- On-demand aggregation for performance

#### Store API (`app/api/mv/toko/route.ts`)
- Direct queries for store data
- Real-time calculation of inventory levels
- Proper filtering and search functionality

#### Shipment API (`app/api/mv/pengiriman/route.ts`)
- Direct joins with related tables
- Real-time shipment aggregation
- Maintains search and filter capabilities

#### Billing API (`app/api/mv/penagihan/route.ts`)
- Direct calculation of billing totals
- Real-time aggregation of sales data
- Proper handling of returns and discounts

#### Reports API (`app/api/laporan/route.ts`)
- Removed dependency on materialized views
- Direct calculation of dashboard statistics
- Real-time reporting data

### 4. Query Hook Updates
- **File**: `lib/queries/materialized-views.ts`
- **Changes**:
  - Updated query keys for direct queries
  - Reduced stale time from minutes to 30 seconds
  - Added backward compatibility aliases
  - Updated comments to reflect direct query usage

## Performance Considerations

### Benefits
1. **Data Consistency**: No stale data issues
2. **Real-time Updates**: Immediate reflection of changes
3. **Simplified Architecture**: No complex refresh mechanisms
4. **Reduced Storage**: No materialized view storage overhead

### Trade-offs
1. **Query Performance**: Some queries may be slower due to real-time calculation
2. **Database Load**: Increased load on database for complex aggregations

### Optimizations Implemented
1. **Selective Aggregation**: Expensive calculations only for detail views
2. **Efficient Joins**: Optimized query structures
3. **Reduced Cache Time**: 30-second stale time for better balance
4. **On-demand Calculation**: List views use minimal aggregation

## Migration Steps

### 1. Backup Database
```sql
-- Create backup before migration
pg_dump your_database > backup_before_migration.sql
```

### 2. Run Drop Script
```sql
-- Execute the drop script
\i drop_materialized_views.sql
```

### 3. Update Application Code
- Deploy updated API routes
- Update query hooks
- Test functionality

### 4. Monitor Performance
- Monitor database performance
- Check query execution times
- Adjust indexes if needed

## API Contract Compatibility

All API endpoints maintain the same contract:
- Same URL patterns
- Same request parameters
- Same response structures
- Same data fields

The only difference is the source of data (direct queries vs materialized views).

## Testing Checklist

- [ ] Sales listing and detail pages
- [ ] Product listing and detail pages
- [ ] Store listing and detail pages
- [ ] Shipment listing and detail pages
- [ ] Billing listing and detail pages
- [ ] Dashboard statistics
- [ ] Reports generation
- [ ] Search functionality
- [ ] Filter functionality
- [ ] Data consistency across pages

## Rollback Plan

If issues arise, you can recreate materialized views using the original SQL from `db_baru_7.sql`:

1. Extract materialized view definitions from backup
2. Recreate materialized views
3. Restore original API code
4. Restart refresh functions and triggers

## Future Considerations

1. **Database Indexing**: Monitor and optimize indexes for direct queries
2. **Caching Strategy**: Consider application-level caching for expensive calculations
3. **Query Optimization**: Fine-tune query performance based on usage patterns
4. **Monitoring**: Implement query performance monitoring

## Benefits Achieved

1. ✅ **Data Consistency**: All data is now real-time and consistent
2. ✅ **Simplified Maintenance**: No materialized view refresh complexity
3. ✅ **Better Developer Experience**: No confusion about data freshness
4. ✅ **Reduced Storage**: No materialized view storage overhead
5. ✅ **Improved Reliability**: No refresh failures or inconsistencies