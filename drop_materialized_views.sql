-- SQL Script to Drop All Materialized Views
-- This script removes all materialized views to ensure data consistency through direct queries

-- Drop materialized views (in dependency order if needed)
DROP MATERIALIZED VIEW IF EXISTS public.mv_asset_distribution_real CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_dashboard_realtime_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_penagihan_aggregates CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_penagihan_with_totals CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_pengiriman_aggregates CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_produk_aggregates CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_produk_with_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_receivables_aging_real CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_sales_aggregates CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_sales_performance_real CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_toko_aggregates CASCADE;

-- Drop any related triggers that refresh materialized views
DROP TRIGGER IF EXISTS refresh_mv_dashboard_stats ON public.penagihan;
DROP TRIGGER IF EXISTS refresh_mv_dashboard_stats ON public.pengiriman;
DROP TRIGGER IF EXISTS refresh_mv_dashboard_stats ON public.setoran;
DROP TRIGGER IF EXISTS refresh_mv_penagihan_aggregates ON public.penagihan;
DROP TRIGGER IF EXISTS refresh_mv_penagihan_with_totals ON public.penagihan;
DROP TRIGGER IF EXISTS refresh_mv_pengiriman_aggregates ON public.pengiriman;
DROP TRIGGER IF EXISTS refresh_mv_produk_aggregates ON public.produk;
DROP TRIGGER IF EXISTS refresh_mv_produk_with_stats ON public.produk;
DROP TRIGGER IF EXISTS refresh_mv_sales_aggregates ON public.sales;
DROP TRIGGER IF EXISTS refresh_mv_toko_aggregates ON public.toko;

-- Drop any refresh functions related to materialized views
DROP FUNCTION IF EXISTS public.refresh_dashboard_materialized_views() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_penagihan_materialized_views() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_pengiriman_materialized_views() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_produk_materialized_views() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_sales_materialized_views() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_toko_materialized_views() CASCADE;

-- Output confirmation
SELECT 'All materialized views and related objects have been dropped successfully' as status;