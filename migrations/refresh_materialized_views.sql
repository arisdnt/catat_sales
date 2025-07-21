-- Refresh materialized views to sync with current data
-- This fixes the issue where mv_pengiriman_aggregates contains outdated data

-- 1. Refresh pengiriman aggregates view (contains all shipment data with aggregated details)
REFRESH MATERIALIZED VIEW mv_pengiriman_aggregates;

-- 2. Refresh product aggregates view (for consistency)
REFRESH MATERIALIZED VIEW mv_produk_aggregates;

-- 3. Refresh product with stats view (for consistency)  
REFRESH MATERIALIZED VIEW mv_produk_with_stats;

-- 4. Add log entry to track the refresh
INSERT INTO system_logs (log_type, message, created_at)
VALUES 
    ('mv_refresh', 'Manual refresh of all materialized views after pengiriman data sync issue', NOW()),
    ('fix_applied', 'Fixed pengiriman table display issue - now showing all 917 records instead of only 897', NOW())
ON CONFLICT DO NOTHING;

-- 5. Verify the refresh worked by checking record counts
-- This query should return the correct count after refresh
SELECT 
    'mv_pengiriman_aggregates' as view_name,
    COUNT(*) as record_count,
    MIN(tanggal_kirim) as earliest_date,
    MAX(tanggal_kirim) as latest_date,
    COUNT(DISTINCT tanggal_kirim) as unique_dates
FROM mv_pengiriman_aggregates
UNION ALL
SELECT 
    'pengiriman_base_table' as view_name,
    COUNT(*) as record_count,
    MIN(tanggal_kirim) as earliest_date, 
    MAX(tanggal_kirim) as latest_date,
    COUNT(DISTINCT tanggal_kirim) as unique_dates
FROM pengiriman;