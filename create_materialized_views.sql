-- Create materialized view for product statistics
-- This will improve performance of the optimized product API

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_produk_with_stats AS
SELECT 
    p.id_produk,
    p.nama_produk,
    p.harga_satuan,
    p.status_produk,
    p.is_priority,
    p.priority_order,
    p.dibuat_pada,
    p.diperbarui_pada,
    
    -- Shipment statistics (from detail_pengiriman)
    COALESCE(ship_stats.total_terkirim, 0) AS total_terkirim,
    COALESCE(ship_stats.shipment_count, 0) AS shipment_count,
    
    -- Billing statistics (from detail_penagihan) 
    COALESCE(bill_stats.total_terjual, 0) AS total_terjual,
    COALESCE(bill_stats.total_kembali, 0) AS total_kembali,
    COALESCE(bill_stats.billing_count, 0) AS billing_count,
    
    -- Calculated fields
    (COALESCE(bill_stats.total_terjual, 0) - COALESCE(bill_stats.total_kembali, 0)) AS total_terbayar,
    (COALESCE(ship_stats.total_terkirim, 0) - COALESCE(bill_stats.total_terjual, 0)) AS sisa_stok,
    (((COALESCE(bill_stats.total_terjual, 0) - COALESCE(bill_stats.total_kembali, 0)))::numeric * p.harga_satuan) AS total_revenue
    
FROM produk p
LEFT JOIN (
    -- Aggregate shipment data
    SELECT 
        id_produk,
        SUM(jumlah_kirim) AS total_terkirim,
        COUNT(DISTINCT id_pengiriman) AS shipment_count
    FROM detail_pengiriman
    GROUP BY id_produk
) ship_stats ON p.id_produk = ship_stats.id_produk
LEFT JOIN (
    -- Aggregate billing data  
    SELECT 
        id_produk,
        SUM(jumlah_terjual) AS total_terjual,
        SUM(jumlah_kembali) AS total_kembali,
        COUNT(DISTINCT id_penagihan) AS billing_count
    FROM detail_penagihan
    GROUP BY id_produk
) bill_stats ON p.id_produk = bill_stats.id_produk;

-- Create materialized view for aggregate statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_produk_aggregates AS
SELECT 
    1 AS id,
    count(*) AS total_products,
    count(CASE WHEN status_produk = true THEN 1 END) AS active_products,
    count(CASE WHEN status_produk = false THEN 1 END) AS inactive_products,
    count(CASE WHEN is_priority = true THEN 1 END) AS priority_products,
    count(CASE WHEN is_priority = false THEN 1 END) AS standard_products,
    count(CASE WHEN date(dibuat_pada) = CURRENT_DATE THEN 1 END) AS today_products,
    count(CASE WHEN dibuat_pada >= (CURRENT_DATE - '7 days'::interval) THEN 1 END) AS this_week_products,
    COALESCE(min(harga_satuan), 0) AS min_price,
    COALESCE(max(harga_satuan), 0) AS max_price,
    COALESCE(avg(harga_satuan), 0) AS avg_price,
    COALESCE(sum(harga_satuan), 0) AS total_value
FROM produk;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_detail_pengiriman_produk ON detail_pengiriman(id_produk);
CREATE INDEX IF NOT EXISTS idx_detail_penagihan_produk ON detail_penagihan(id_produk);
CREATE INDEX IF NOT EXISTS idx_produk_status ON produk(status_produk);
CREATE INDEX IF NOT EXISTS idx_produk_priority ON produk(is_priority);
CREATE INDEX IF NOT EXISTS idx_produk_nama ON produk(nama_produk);

-- Refresh the materialized views
REFRESH MATERIALIZED VIEW mv_produk_with_stats;
REFRESH MATERIALIZED VIEW mv_produk_aggregates;