-- =====================================================
-- CREATE MISSING DASHBOARD VIEWS
-- File: migrations/create_missing_dashboard_views.sql
-- Purpose: Create missing views for dashboard functionality
-- =====================================================

-- 1. View for Laporan Pengiriman (Shipment Report)
CREATE OR REPLACE VIEW public.v_laporan_pengiriman AS
SELECT 
    p.id_pengiriman,
    p.tanggal_kirim,
    p.is_autorestock,
    t.nama_toko,
    s.nama_sales,
    pr.nama_produk,
    dp.jumlah_kirim,
    (dp.jumlah_kirim * pr.harga_satuan) AS nilai_kirim,
    p.dibuat_pada
FROM pengiriman p
JOIN toko t ON p.id_toko = t.id_toko
JOIN sales s ON t.id_sales = s.id_sales
JOIN detail_pengiriman dp ON p.id_pengiriman = dp.id_pengiriman
JOIN produk pr ON dp.id_produk = pr.id_produk
WHERE t.status_toko = true 
  AND s.status_aktif = true 
  AND pr.status_produk = true;

-- 2. View for Laporan Penagihan (Billing Report)  
CREATE OR REPLACE VIEW public.v_laporan_penagihan AS
SELECT 
    pen.id_penagihan,
    pen.dibuat_pada::date AS tanggal_tagih,
    pen.total_uang_diterima,
    pen.metode_pembayaran,
    pen.ada_potongan,
    t.nama_toko,
    s.nama_sales,
    pr.nama_produk,
    dt.jumlah_terjual,
    dt.jumlah_kembali,
    (dt.jumlah_terjual * pr.harga_satuan) AS nilai_terjual,
    COALESCE(pot.jumlah_potongan, 0) AS jumlah_potongan
FROM penagihan pen
JOIN toko t ON pen.id_toko = t.id_toko
JOIN sales s ON t.id_sales = s.id_sales
JOIN detail_penagihan dt ON pen.id_penagihan = dt.id_penagihan
JOIN produk pr ON dt.id_produk = pr.id_produk
LEFT JOIN potongan_penagihan pot ON pen.id_penagihan = pot.id_penagihan
WHERE t.status_toko = true 
  AND s.status_aktif = true 
  AND pr.status_produk = true;

-- 3. View for Rekonsiliasi Setoran (Cash Reconciliation)
CREATE OR REPLACE VIEW public.v_rekonsiliasi_setoran AS
SELECT 
    s.id_setoran,
    s.dibuat_pada::date AS tanggal_setoran,
    s.total_setoran,
    s.penerima_setoran,
    COALESCE(cash_summary.total_penagihan_cash, 0) AS total_penagihan_cash,
    (s.total_setoran - COALESCE(cash_summary.total_penagihan_cash, 0)) AS selisih
FROM setoran s
LEFT JOIN (
    SELECT 
        DATE(pen.dibuat_pada) AS tanggal_cash,
        SUM(pen.total_uang_diterima) AS total_penagihan_cash
    FROM penagihan pen
    WHERE pen.metode_pembayaran = 'Cash'
    GROUP BY DATE(pen.dibuat_pada)
) cash_summary ON DATE(s.dibuat_pada) = cash_summary.tanggal_cash;

-- 4. Materialized View for Real-time Dashboard Stats
CREATE MATERIALIZED VIEW public.mv_dashboard_realtime_stats AS
SELECT 
    1 AS id, -- Single row for stats
    
    -- Basic Counts
    (SELECT COUNT(*) FROM pengiriman) AS total_pengiriman,
    (SELECT COUNT(*) FROM penagihan) AS total_penagihan,
    (SELECT COUNT(*) FROM setoran) AS total_setoran,
    (SELECT COUNT(*) FROM toko WHERE status_toko = true) AS total_toko,
    (SELECT COUNT(*) FROM produk WHERE status_produk = true) AS total_produk,
    (SELECT COUNT(*) FROM sales WHERE status_aktif = true) AS total_sales,
    
    -- Revenue Calculations
    (SELECT COALESCE(SUM(total_uang_diterima), 0) FROM penagihan 
     WHERE DATE(dibuat_pada) = CURRENT_DATE) AS pendapatan_harian,
    (SELECT COALESCE(SUM(total_uang_diterima), 0) FROM penagihan 
     WHERE DATE(dibuat_pada) >= DATE_TRUNC('month', CURRENT_DATE)) AS pendapatan_bulan_ini,
    (SELECT COALESCE(SUM(total_uang_diterima), 0) FROM penagihan) AS total_pendapatan,
    
    -- Real Cash in Hand (Cash payments minus deposits)
    (SELECT COALESCE(SUM(pen.total_uang_diterima), 0) - COALESCE(SUM(set.total_setoran), 0)
     FROM penagihan pen
     FULL OUTER JOIN setoran set ON DATE(pen.dibuat_pada) = DATE(set.dibuat_pada)
     WHERE pen.metode_pembayaran = 'Cash' OR pen.metode_pembayaran IS NULL) AS kas_belum_disetor,
    
    -- Outstanding Receivables (Transfer payments pending)
    (SELECT COALESCE(SUM(total_uang_diterima), 0) FROM penagihan 
     WHERE metode_pembayaran = 'Transfer') AS piutang_beredar,
    
    -- Stock Value (Products * average price)
    (SELECT COALESCE(SUM(harga_satuan), 0) FROM produk WHERE status_produk = true) AS nilai_stok_produk,
    
    -- Goods in Transit (Shipped but not billed)
    (SELECT COALESCE(COUNT(DISTINCT p.id_pengiriman), 0)
     FROM pengiriman p
     LEFT JOIN penagihan pen ON p.id_toko = pen.id_toko 
       AND DATE(p.tanggal_kirim) = DATE(pen.dibuat_pada)
     WHERE pen.id_penagihan IS NULL) AS barang_dalam_perjalanan,
    
    -- Last update timestamp
    NOW() AS last_updated
WITH NO DATA;

-- 5. Create unique index for materialized view
CREATE UNIQUE INDEX idx_mv_dashboard_realtime_stats_pk 
ON public.mv_dashboard_realtime_stats (id);

-- 6. Materialized View for Sales Performance (Real Data)
CREATE MATERIALIZED VIEW public.mv_sales_performance_real AS
SELECT 
    s.id_sales,
    s.nama_sales,
    
    -- Total sales amount
    COALESCE(SUM(pen.total_uang_diterima), 0) AS total_penjualan,
    
    -- Cash deposits (cash payments)
    COALESCE(SUM(CASE WHEN pen.metode_pembayaran = 'Cash' THEN pen.total_uang_diterima ELSE 0 END), 0) AS total_setoran_cash,
    
    -- Transfer receivables
    COALESCE(SUM(CASE WHEN pen.metode_pembayaran = 'Transfer' THEN pen.total_uang_diterima ELSE 0 END), 0) AS piutang_transfer,
    
    -- Cash in hand (cash not yet deposited)
    (COALESCE(SUM(CASE WHEN pen.metode_pembayaran = 'Cash' THEN pen.total_uang_diterima ELSE 0 END), 0) - 
     COALESCE((SELECT SUM(set.total_setoran) FROM setoran set WHERE set.penerima_setoran = s.nama_sales), 0)) AS kas_di_tangan,
    
    -- Performance metrics
    COUNT(DISTINCT pen.id_penagihan) AS total_transaksi,
    COUNT(DISTINCT t.id_toko) AS toko_aktif,
    
    -- Effectiveness percentage
    CASE 
        WHEN COALESCE(SUM(pen.total_uang_diterima), 0) > 0 
        THEN ROUND((COALESCE(SUM(CASE WHEN pen.metode_pembayaran = 'Cash' THEN pen.total_uang_diterima ELSE 0 END), 0) / 
                   COALESCE(SUM(pen.total_uang_diterima), 0)) * 100, 2)
        ELSE 0 
    END AS efektivitas_persen,
    
    -- Last activity
    MAX(pen.dibuat_pada) AS aktivitas_terakhir
    
FROM sales s
LEFT JOIN toko t ON s.id_sales = t.id_sales AND t.status_toko = true
LEFT JOIN penagihan pen ON t.id_toko = pen.id_toko
WHERE s.status_aktif = true
GROUP BY s.id_sales, s.nama_sales
WITH NO DATA;

-- 7. Create unique index for sales performance view  
CREATE UNIQUE INDEX idx_mv_sales_performance_real_pk 
ON public.mv_sales_performance_real (id_sales);

-- 8. Materialized View for Asset Distribution (Real Data)
CREATE MATERIALIZED VIEW public.mv_asset_distribution_real AS
SELECT 
    'Stok Gudang' AS category,
    COALESCE(SUM(pr.harga_satuan), 0) AS amount,
    COUNT(*) AS count_items,
    'IDR' AS currency
FROM produk pr 
WHERE pr.status_produk = true

UNION ALL

SELECT 
    'Barang di Jalan' AS category,
    COALESCE(SUM(dp.jumlah_kirim * pr.harga_satuan), 0) AS amount,
    COUNT(DISTINCT p.id_pengiriman) AS count_items,
    'IDR' AS currency
FROM pengiriman p
JOIN detail_pengiriman dp ON p.id_pengiriman = dp.id_pengiriman
JOIN produk pr ON dp.id_produk = pr.id_produk
LEFT JOIN penagihan pen ON p.id_toko = pen.id_toko 
    AND DATE(p.tanggal_kirim) <= DATE(pen.dibuat_pada)
WHERE pen.id_penagihan IS NULL -- Not yet billed

UNION ALL

SELECT 
    'Piutang Beredar' AS category,
    COALESCE(SUM(pen.total_uang_diterima), 0) AS amount,
    COUNT(*) AS count_items,
    'IDR' AS currency
FROM penagihan pen
WHERE pen.metode_pembayaran = 'Transfer'

UNION ALL

SELECT 
    'Kas di Tangan Sales' AS category,
    COALESCE(SUM(cash_balance.balance), 0) AS amount,
    COUNT(*) AS count_items,
    'IDR' AS currency
FROM (
    SELECT 
        s.id_sales,
        s.nama_sales,
        (COALESCE(SUM(CASE WHEN pen.metode_pembayaran = 'Cash' THEN pen.total_uang_diterima ELSE 0 END), 0) - 
         COALESCE((SELECT SUM(set.total_setoran) FROM setoran set WHERE set.penerima_setoran = s.nama_sales), 0)) AS balance
    FROM sales s
    LEFT JOIN toko t ON s.id_sales = t.id_sales
    LEFT JOIN penagihan pen ON t.id_toko = pen.id_toko
    WHERE s.status_aktif = true
    GROUP BY s.id_sales, s.nama_sales
    HAVING (COALESCE(SUM(CASE WHEN pen.metode_pembayaran = 'Cash' THEN pen.total_uang_diterima ELSE 0 END), 0) - 
            COALESCE((SELECT SUM(set.total_setoran) FROM setoran set WHERE set.penerima_setoran = s.nama_sales), 0)) > 0
) cash_balance
WITH NO DATA;

-- 9. Materialized View for Receivables Aging (Real Data)
CREATE MATERIALIZED VIEW public.mv_receivables_aging_real AS
SELECT 
    CASE 
        WHEN CURRENT_DATE - DATE(pen.dibuat_pada) <= 30 THEN '0-30 hari'
        WHEN CURRENT_DATE - DATE(pen.dibuat_pada) <= 60 THEN '31-60 hari'  
        WHEN CURRENT_DATE - DATE(pen.dibuat_pada) <= 90 THEN '61-90 hari'
        ELSE '90+ hari'
    END AS aging_category,
    
    COUNT(*) AS count_items,
    COALESCE(SUM(pen.total_uang_diterima), 0) AS total_amount,
    
    -- Average aging days
    ROUND(AVG(CURRENT_DATE - DATE(pen.dibuat_pada)), 0) AS avg_days,
    
    -- Oldest transaction in category
    MAX(CURRENT_DATE - DATE(pen.dibuat_pada)) AS max_days
    
FROM penagihan pen
WHERE pen.metode_pembayaran = 'Transfer'
GROUP BY 
    CASE 
        WHEN CURRENT_DATE - DATE(pen.dibuat_pada) <= 30 THEN '0-30 hari'
        WHEN CURRENT_DATE - DATE(pen.dibuat_pada) <= 60 THEN '31-60 hari'
        WHEN CURRENT_DATE - DATE(pen.dibuat_pada) <= 90 THEN '61-90 hari'
        ELSE '90+ hari'
    END
ORDER BY 
    CASE 
        WHEN CASE 
            WHEN CURRENT_DATE - DATE(pen.dibuat_pada) <= 30 THEN '0-30 hari'
            WHEN CURRENT_DATE - DATE(pen.dibuat_pada) <= 60 THEN '31-60 hari'
            WHEN CURRENT_DATE - DATE(pen.dibuat_pada) <= 90 THEN '61-90 hari'
            ELSE '90+ hari'
        END = '0-30 hari' THEN 1
        WHEN CASE 
            WHEN CURRENT_DATE - DATE(pen.dibuat_pada) <= 30 THEN '0-30 hari'
            WHEN CURRENT_DATE - DATE(pen.dibuat_pada) <= 60 THEN '31-60 hari'
            WHEN CURRENT_DATE - DATE(pen.dibuat_pada) <= 90 THEN '61-90 hari'
            ELSE '90+ hari'
        END = '31-60 hari' THEN 2
        WHEN CASE 
            WHEN CURRENT_DATE - DATE(pen.dibuat_pada) <= 30 THEN '0-30 hari'
            WHEN CURRENT_DATE - DATE(pen.dibuat_pada) <= 60 THEN '31-60 hari'
            WHEN CURRENT_DATE - DATE(pen.dibuat_pada) <= 90 THEN '61-90 hari'
            ELSE '90+ hari'
        END = '61-90 hari' THEN 3
        ELSE 4
    END
WITH NO DATA;

-- 10. Function to refresh all dashboard materialized views
CREATE OR REPLACE FUNCTION public.refresh_dashboard_materialized_views() 
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    result_text TEXT;
BEGIN
    -- Refresh dashboard realtime stats
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_realtime_stats;
        RAISE NOTICE 'Successfully refreshed mv_dashboard_realtime_stats concurrently at %', NOW();
    EXCEPTION WHEN OTHERS THEN
        REFRESH MATERIALIZED VIEW mv_dashboard_realtime_stats;
        RAISE NOTICE 'Fell back to non-concurrent refresh for mv_dashboard_realtime_stats: % at %', SQLERRM, NOW();
    END;
    
    -- Refresh sales performance  
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_performance_real;
        RAISE NOTICE 'Successfully refreshed mv_sales_performance_real concurrently at %', NOW();
    EXCEPTION WHEN OTHERS THEN
        REFRESH MATERIALIZED VIEW mv_sales_performance_real;
        RAISE NOTICE 'Fell back to non-concurrent refresh for mv_sales_performance_real: % at %', SQLERRM, NOW();
    END;
    
    -- Refresh asset distribution
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_asset_distribution_real;
        RAISE NOTICE 'Successfully refreshed mv_asset_distribution_real concurrently at %', NOW();
    EXCEPTION WHEN OTHERS THEN
        REFRESH MATERIALIZED VIEW mv_asset_distribution_real;
        RAISE NOTICE 'Fell back to non-concurrent refresh for mv_asset_distribution_real: % at %', SQLERRM, NOW();
    END;
    
    -- Refresh receivables aging
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_receivables_aging_real;
        RAISE NOTICE 'Successfully refreshed mv_receivables_aging_real concurrently at %', NOW();
    EXCEPTION WHEN OTHERS THEN
        REFRESH MATERIALIZED VIEW mv_receivables_aging_real;
        RAISE NOTICE 'Fell back to non-concurrent refresh for mv_receivables_aging_real: % at %', SQLERRM, NOW();
    END;
    
    -- Return success message
    SELECT INTO result_text
        format('Dashboard materialized views refreshed successfully at %s', NOW());
    
    RETURN result_text;
END;
$$;

-- 11. Initial data population for materialized views
REFRESH MATERIALIZED VIEW mv_dashboard_realtime_stats;
REFRESH MATERIALIZED VIEW mv_sales_performance_real;  
REFRESH MATERIALIZED VIEW mv_asset_distribution_real;
REFRESH MATERIALIZED VIEW mv_receivables_aging_real;

-- 12. Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- Grant permissions on materialized views individually
GRANT ALL ON TABLE public.mv_dashboard_realtime_stats TO anon, authenticated;
GRANT ALL ON TABLE public.mv_sales_performance_real TO anon, authenticated;
GRANT ALL ON TABLE public.mv_asset_distribution_real TO anon, authenticated;
GRANT ALL ON TABLE public.mv_receivables_aging_real TO anon, authenticated;

-- 13. Add comments for documentation
COMMENT ON VIEW v_laporan_pengiriman IS 'Laporan pengiriman dengan detail produk dan nilai';
COMMENT ON VIEW v_laporan_penagihan IS 'Laporan penagihan dengan detail produk dan potongan';
COMMENT ON VIEW v_rekonsiliasi_setoran IS 'Rekonsiliasi setoran vs penagihan cash harian';
COMMENT ON MATERIALIZED VIEW mv_dashboard_realtime_stats IS 'Real-time dashboard statistics with accurate business calculations';
COMMENT ON MATERIALIZED VIEW mv_sales_performance_real IS 'Real sales performance metrics with cash flow tracking';
COMMENT ON MATERIALIZED VIEW mv_asset_distribution_real IS 'Real asset distribution based on actual data';
COMMENT ON MATERIALIZED VIEW mv_receivables_aging_real IS 'Real receivables aging analysis for transfer payments';
COMMENT ON FUNCTION refresh_dashboard_materialized_views() IS 'Refresh all dashboard materialized views with concurrent fallback';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Test the new views
SELECT 'v_laporan_pengiriman' AS view_name, COUNT(*) AS row_count FROM v_laporan_pengiriman
UNION ALL
SELECT 'v_laporan_penagihan' AS view_name, COUNT(*) AS row_count FROM v_laporan_penagihan  
UNION ALL
SELECT 'v_rekonsiliasi_setoran' AS view_name, COUNT(*) AS row_count FROM v_rekonsiliasi_setoran
UNION ALL
SELECT 'mv_dashboard_realtime_stats' AS view_name, COUNT(*) AS row_count FROM mv_dashboard_realtime_stats
UNION ALL
SELECT 'mv_sales_performance_real' AS view_name, COUNT(*) AS row_count FROM mv_sales_performance_real
UNION ALL
SELECT 'mv_asset_distribution_real' AS view_name, COUNT(*) AS row_count FROM mv_asset_distribution_real
UNION ALL  
SELECT 'mv_receivables_aging_real' AS view_name, COUNT(*) AS row_count FROM mv_receivables_aging_real;