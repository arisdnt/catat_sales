// Direct SQL queries to replace materialized views
// These queries provide real-time data consistency without materialized views

export const directQueries = {
  // Replace mv_sales_aggregates
  salesAggregates: `
    SELECT 
      s.id_sales,
      s.nama_sales,
      s.nomor_telepon,
      s.status_aktif,
      s.dibuat_pada,
      s.diperbarui_pada,
      COALESCE(store_stats.total_stores, 0) AS total_stores,
      COALESCE(store_stats.active_stores, 0) AS active_stores,
      COALESCE(store_stats.inactive_stores, 0) AS inactive_stores,
      COALESCE(shipment_stats.total_shipments, 0) AS total_shipments,
      COALESCE(shipment_stats.total_shipped_items, 0) AS total_shipped_items,
      COALESCE(shipment_stats.last_shipment_date, NULL) AS last_shipment_date,
      COALESCE(billing_stats.total_billings, 0) AS total_billings,
      COALESCE(billing_stats.total_revenue, 0) AS total_revenue,
      COALESCE(billing_stats.total_items_sold, 0) AS total_items_sold,
      COALESCE(billing_stats.total_items_returned, 0) AS total_items_returned,
      COALESCE(billing_stats.last_billing_date, NULL) AS last_billing_date,
      CASE 
        WHEN COALESCE(shipment_stats.total_shipped_items, 0) > 0 
        THEN ROUND((COALESCE(billing_stats.total_items_sold, 0)::numeric / shipment_stats.total_shipped_items::numeric) * 100, 2)
        ELSE 0
      END AS conversion_rate
    FROM sales s
    LEFT JOIN (
      SELECT 
        id_sales,
        COUNT(*) AS total_stores,
        COUNT(CASE WHEN status_toko = true THEN 1 END) AS active_stores,
        COUNT(CASE WHEN status_toko = false THEN 1 END) AS inactive_stores
      FROM toko
      GROUP BY id_sales
    ) store_stats ON s.id_sales = store_stats.id_sales
    LEFT JOIN (
      SELECT 
        s.id_sales,
        COUNT(DISTINCT p.id_pengiriman) AS total_shipments,
        SUM(dp.jumlah_kirim) AS total_shipped_items,
        MAX(p.tanggal_kirim) AS last_shipment_date
      FROM sales s
      JOIN toko t ON s.id_sales = t.id_sales
      JOIN pengiriman p ON t.id_toko = p.id_toko
      JOIN detail_pengiriman dp ON p.id_pengiriman = dp.id_pengiriman
      GROUP BY s.id_sales
    ) shipment_stats ON s.id_sales = shipment_stats.id_sales
    LEFT JOIN (
      SELECT 
        s.id_sales,
        COUNT(DISTINCT pen.id_penagihan) AS total_billings,
        SUM(pen.total_uang_diterima) AS total_revenue,
        SUM(dp.jumlah_terjual) AS total_items_sold,
        SUM(dp.jumlah_kembali) AS total_items_returned,
        MAX(pen.dibuat_pada) AS last_billing_date
      FROM sales s
      JOIN toko t ON s.id_sales = t.id_sales
      JOIN penagihan pen ON t.id_toko = pen.id_toko
      LEFT JOIN detail_penagihan dp ON pen.id_penagihan = dp.id_penagihan
      GROUP BY s.id_sales
    ) billing_stats ON s.id_sales = billing_stats.id_sales
  `,

  // Replace mv_produk_aggregates
  produkAggregates: `
    SELECT 
      1 AS id,
      COUNT(*) AS total_products,
      COUNT(CASE WHEN status_produk = true THEN 1 END) AS active_products,
      COUNT(CASE WHEN status_produk = false THEN 1 END) AS inactive_products,
      COUNT(CASE WHEN is_priority = true THEN 1 END) AS priority_products,
      COUNT(CASE WHEN is_priority = false THEN 1 END) AS non_priority_products,
      AVG(harga_satuan) AS avg_price,
      MIN(harga_satuan) AS min_price,
      MAX(harga_satuan) AS max_price
    FROM produk
  `,

  // Replace mv_produk_with_stats
  produkWithStats: `
    SELECT 
      p.id_produk,
      p.nama_produk,
      p.harga_satuan,
      p.status_produk,
      p.is_priority,
      p.priority_order,
      p.dibuat_pada,
      p.diperbarui_pada,
      COALESCE(ship_stats.total_terkirim, 0) AS total_terkirim,
      COALESCE(bill_stats.total_terjual, 0) AS total_terjual,
      COALESCE(bill_stats.total_kembali, 0) AS total_kembali,
      (COALESCE(bill_stats.total_terjual, 0) - COALESCE(bill_stats.total_kembali, 0)) AS total_terbayar,
      (COALESCE(ship_stats.total_terkirim, 0) - COALESCE(bill_stats.total_terjual, 0)) AS sisa_stok,
      COALESCE(ship_stats.shipment_count, 0) AS shipment_count,
      COALESCE(bill_stats.billing_count, 0) AS billing_count,
      ((COALESCE(bill_stats.total_terjual, 0) - COALESCE(bill_stats.total_kembali, 0))::numeric * p.harga_satuan) AS total_revenue
    FROM produk p
    LEFT JOIN (
      SELECT 
        dp.id_produk,
        SUM(dp.jumlah_kirim) AS total_terkirim,
        COUNT(DISTINCT dp.id_pengiriman) AS shipment_count
      FROM detail_pengiriman dp
      GROUP BY dp.id_produk
    ) ship_stats ON p.id_produk = ship_stats.id_produk
    LEFT JOIN (
      SELECT 
        dp.id_produk,
        SUM(dp.jumlah_terjual) AS total_terjual,
        SUM(dp.jumlah_kembali) AS total_kembali,
        COUNT(DISTINCT dp.id_penagihan) AS billing_count
      FROM detail_penagihan dp
      GROUP BY dp.id_produk
    ) bill_stats ON p.id_produk = bill_stats.id_produk
  `,

  // Replace mv_toko_aggregates
  tokoAggregates: `
    SELECT 
      t.id_toko,
      t.nama_toko,
      t.id_sales,
      s.nama_sales,
      t.kabupaten,
      t.kecamatan,
      t.no_telepon,
      t.link_gmaps,
      t.status_toko,
      t.dibuat_pada,
      t.diperbarui_pada,
      COALESCE(agg_kirim.total_terkirim, 0) AS barang_terkirim,
      COALESCE(agg_bayar.total_terbayar, 0) AS barang_terbayar,
      (COALESCE(agg_kirim.total_terkirim, 0) - COALESCE(agg_bayar.total_terbayar, 0)) AS sisa_stok
    FROM toko t
    LEFT JOIN sales s ON t.id_sales = s.id_sales
    LEFT JOIN (
      SELECT 
        p.id_toko,
        SUM(dp.jumlah_kirim) AS total_terkirim
      FROM pengiriman p
      JOIN detail_pengiriman dp ON p.id_pengiriman = dp.id_pengiriman
      GROUP BY p.id_toko
    ) agg_kirim ON t.id_toko = agg_kirim.id_toko
    LEFT JOIN (
      SELECT 
        pen.id_toko,
        SUM(dp.jumlah_terjual - dp.jumlah_kembali) AS total_terbayar
      FROM penagihan pen
      JOIN detail_penagihan dp ON pen.id_penagihan = dp.id_penagihan
      GROUP BY pen.id_toko
    ) agg_bayar ON t.id_toko = agg_bayar.id_toko
  `,

  // Replace mv_pengiriman_aggregates
  pengirimanAggregates: `
    SELECT 
      p.id_pengiriman,
      p.tanggal_kirim,
      p.dibuat_pada,
      p.diperbarui_pada,
      t.id_toko,
      t.nama_toko,
      t.kecamatan,
      t.kabupaten,
      t.link_gmaps,
      s.id_sales,
      s.nama_sales,
      s.nomor_telepon,
      COALESCE(agg.total_quantity, 0) AS total_quantity,
      COALESCE(agg.total_products, 0) AS total_products,
      COALESCE(agg.detail_pengiriman, '[]'::json) AS detail_pengiriman,
      to_tsvector('indonesian', COALESCE(t.nama_toko, '') || ' ' || COALESCE(s.nama_sales, '') || ' ' || COALESCE(t.kecamatan, '') || ' ' || COALESCE(t.kabupaten, '')) AS search_vector,
      p.tanggal_kirim AS tanggal_kirim_date,
      EXTRACT(year FROM p.tanggal_kirim) AS tahun,
      EXTRACT(month FROM p.tanggal_kirim) AS bulan,
      EXTRACT(week FROM p.tanggal_kirim) AS minggu
    FROM pengiriman p
    LEFT JOIN toko t ON p.id_toko = t.id_toko
    LEFT JOIN sales s ON t.id_sales = s.id_sales
    LEFT JOIN (
      SELECT 
        dp.id_pengiriman,
        SUM(dp.jumlah_kirim) AS total_quantity,
        COUNT(DISTINCT dp.id_produk) AS total_products,
        json_agg(json_build_object(
          'id_produk', dp.id_produk,
          'nama_produk', pr.nama_produk,
          'jumlah_kirim', dp.jumlah_kirim,
          'harga_satuan', pr.harga_satuan
        )) AS detail_pengiriman
      FROM detail_pengiriman dp
      JOIN produk pr ON dp.id_produk = pr.id_produk
      GROUP BY dp.id_pengiriman
    ) agg ON p.id_pengiriman = agg.id_pengiriman
  `,

  // Replace mv_penagihan_aggregates
  penagihanAggregates: `
    SELECT 
      1 AS id,
      COUNT(*) AS total_billings,
      COUNT(CASE WHEN DATE(dibuat_pada) = CURRENT_DATE THEN 1 END) AS today_billings,
      COUNT(CASE WHEN dibuat_pada >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) AS this_week_billings,
      COUNT(DISTINCT id_toko) AS unique_toko,
      COUNT(CASE WHEN metode_pembayaran = 'Cash' THEN 1 END) AS cash_payments,
      COUNT(CASE WHEN metode_pembayaran = 'Transfer' THEN 1 END) AS transfer_payments,
      COUNT(CASE WHEN ada_potongan = true THEN 1 END) AS billings_with_discounts,
      SUM(total_uang_diterima) AS total_revenue,
      AVG(total_uang_diterima) AS avg_billing_amount,
      MAX(total_uang_diterima) AS max_billing_amount,
      MIN(total_uang_diterima) AS min_billing_amount
    FROM penagihan
  `,

  // Replace mv_penagihan_with_totals
  penagihanWithTotals: `
    SELECT 
      p.id_penagihan,
      p.id_toko,
      p.total_uang_diterima,
      p.metode_pembayaran,
      p.ada_potongan,
      p.dibuat_pada,
      p.diperbarui_pada,
      COALESCE(SUM(dp.jumlah_terjual), 0) AS total_quantity_sold,
      COALESCE(SUM(dp.jumlah_kembali), 0) AS total_quantity_returned,
      COALESCE(COUNT(dp.id_detail_tagih), 0) AS detail_count,
      COALESCE(SUM(pot.jumlah_potongan), 0) AS total_deductions
    FROM penagihan p
    LEFT JOIN detail_penagihan dp ON p.id_penagihan = dp.id_penagihan
    LEFT JOIN potongan_penagihan pot ON p.id_penagihan = pot.id_penagihan
    GROUP BY p.id_penagihan, p.id_toko, p.total_uang_diterima, p.metode_pembayaran, p.ada_potongan, p.dibuat_pada, p.diperbarui_pada
  `,

  // Replace mv_sales_performance_real
  salesPerformanceReal: `
    SELECT 
      s.id_sales,
      s.nama_sales,
      COALESCE(SUM(pen.total_uang_diterima), 0) AS total_penjualan,
      COALESCE(SUM(CASE WHEN pen.metode_pembayaran = 'Cash' THEN pen.total_uang_diterima ELSE 0 END), 0) AS total_setoran_cash,
      COALESCE(SUM(CASE WHEN pen.metode_pembayaran = 'Transfer' THEN pen.total_uang_diterima ELSE 0 END), 0) AS piutang_transfer,
      (COALESCE(SUM(CASE WHEN pen.metode_pembayaran = 'Cash' THEN pen.total_uang_diterima ELSE 0 END), 0) - 
       COALESCE((SELECT SUM(set.total_setoran) FROM setoran set WHERE set.penerima_setoran = s.nama_sales), 0)) AS kas_di_tangan,
      COALESCE(AVG(DATE_PART('day', CURRENT_DATE - DATE(pen.dibuat_pada))), 0) AS rata_hari_penagihan,
      COUNT(DISTINCT pen.id_penagihan) AS total_transaksi,
      COUNT(DISTINCT pen.id_toko) AS total_toko_aktif
    FROM sales s
    LEFT JOIN toko t ON s.id_sales = t.id_sales
    LEFT JOIN penagihan pen ON t.id_toko = pen.id_toko
    WHERE s.status_aktif = true
    GROUP BY s.id_sales, s.nama_sales
  `,

  // Replace mv_asset_distribution_real
  assetDistributionReal: `
    SELECT 'Stok Gudang' AS category,
           COALESCE(SUM(pr.harga_satuan), 0) AS amount,
           COUNT(*) AS count_items,
           'IDR' AS currency
    FROM produk pr
    WHERE pr.status_produk = true
    UNION ALL
    SELECT 'Barang di Jalan' AS category,
           COALESCE(SUM(dp.jumlah_kirim::numeric * pr.harga_satuan), 0) AS amount,
           COUNT(DISTINCT p.id_pengiriman) AS count_items,
           'IDR' AS currency
    FROM pengiriman p
    JOIN detail_pengiriman dp ON p.id_pengiriman = dp.id_pengiriman
    JOIN produk pr ON dp.id_produk = pr.id_produk
    LEFT JOIN penagihan pen ON p.id_toko = pen.id_toko AND p.tanggal_kirim <= DATE(pen.dibuat_pada)
    WHERE pen.id_penagihan IS NULL
    UNION ALL
    SELECT 'Piutang Beredar' AS category,
           COALESCE(SUM(pen.total_uang_diterima), 0) AS amount,
           COUNT(*) AS count_items,
           'IDR' AS currency
    FROM penagihan pen
    WHERE pen.metode_pembayaran = 'Transfer'
    UNION ALL
    SELECT 'Kas di Tangan Sales' AS category,
           COALESCE(SUM(CASE WHEN pen.metode_pembayaran = 'Cash' THEN pen.total_uang_diterima ELSE 0 END) - 
                   SUM(COALESCE(set.total_setoran, 0)), 0) AS amount,
           COUNT(DISTINCT s.id_sales) AS count_items,
           'IDR' AS currency
    FROM sales s
    LEFT JOIN toko t ON s.id_sales = t.id_sales
    LEFT JOIN penagihan pen ON t.id_toko = pen.id_toko
    LEFT JOIN setoran set ON s.nama_sales = set.penerima_setoran
    WHERE s.status_aktif = true
  `,

  // Replace mv_receivables_aging_real
  receivablesAgingReal: `
    SELECT 
      CASE 
        WHEN (CURRENT_DATE - DATE(dibuat_pada)) <= 30 THEN '0-30 hari'
        WHEN (CURRENT_DATE - DATE(dibuat_pada)) <= 60 THEN '31-60 hari'
        WHEN (CURRENT_DATE - DATE(dibuat_pada)) <= 90 THEN '61-90 hari'
        ELSE '90+ hari'
      END AS aging_category,
      COUNT(*) AS count_items,
      COALESCE(SUM(total_uang_diterima), 0) AS total_amount,
      ROUND(AVG(CURRENT_DATE - DATE(dibuat_pada)), 0) AS avg_days,
      MAX(CURRENT_DATE - DATE(dibuat_pada)) AS max_days
    FROM penagihan pen
    WHERE metode_pembayaran = 'Transfer'
    GROUP BY 
      CASE 
        WHEN (CURRENT_DATE - DATE(dibuat_pada)) <= 30 THEN '0-30 hari'
        WHEN (CURRENT_DATE - DATE(dibuat_pada)) <= 60 THEN '31-60 hari'
        WHEN (CURRENT_DATE - DATE(dibuat_pada)) <= 90 THEN '61-90 hari'
        ELSE '90+ hari'
      END
    ORDER BY 
      CASE aging_category
        WHEN '0-30 hari' THEN 1
        WHEN '31-60 hari' THEN 2
        WHEN '61-90 hari' THEN 3
        ELSE 4
      END
  `,

  // Replace mv_dashboard_realtime_stats
  dashboardRealtimeStats: `
    SELECT 
      1 AS id,
      (SELECT COUNT(*) FROM pengiriman) AS total_pengiriman,
      (SELECT COUNT(*) FROM penagihan) AS total_penagihan,
      (SELECT COUNT(*) FROM setoran) AS total_setoran,
      (SELECT COUNT(*) FROM toko WHERE status_toko = true) AS total_toko,
      (SELECT COUNT(*) FROM produk WHERE status_produk = true) AS total_produk,
      (SELECT COUNT(*) FROM sales WHERE status_aktif = true) AS total_sales,
      (SELECT COALESCE(SUM(total_uang_diterima), 0) FROM penagihan WHERE DATE(dibuat_pada) = CURRENT_DATE) AS pendapatan_harian,
      (SELECT COALESCE(SUM(total_uang_diterima), 0) FROM penagihan WHERE DATE_TRUNC('month', dibuat_pada) = DATE_TRUNC('month', CURRENT_DATE)) AS pendapatan_bulanan
  `
}

// Helper function to add filters to base queries
export function addFilters(baseQuery: string, filters: Record<string, any>, tableAlias?: string): string {
  let query = baseQuery
  const conditions: string[] = []
  
  const prefix = tableAlias ? `${tableAlias}.` : ''

  if (filters.id) {
    conditions.push(`${prefix}id = $${conditions.length + 1}`)
  }
  
  if (filters.sales_id) {
    conditions.push(`${prefix}id_sales = $${conditions.length + 1}`)
  }
  
  if (filters.search) {
    // Add text search conditions based on context
    conditions.push(`(${prefix}nama ILIKE $${conditions.length + 1} OR ${prefix}nomor_telepon ILIKE $${conditions.length + 1})`)
  }
  
  if (filters.kabupaten) {
    conditions.push(`${prefix}kabupaten = $${conditions.length + 1}`)
  }
  
  if (filters.kecamatan) {
    conditions.push(`${prefix}kecamatan = $${conditions.length + 1}`)
  }
  
  if (filters.start_date) {
    conditions.push(`${prefix}dibuat_pada >= $${conditions.length + 1}`)
  }
  
  if (filters.end_date) {
    conditions.push(`${prefix}dibuat_pada <= $${conditions.length + 1}`)
  }
  
  if (conditions.length > 0) {
    const whereClause = query.includes('WHERE') ? ' AND ' : ' WHERE '
    query += whereClause + conditions.join(' AND ')
  }
  
  return query
}

// Helper function to get filter values in correct order
export function getFilterValues(filters: Record<string, any>): any[] {
  const values: any[] = []
  
  if (filters.id) values.push(filters.id)
  if (filters.sales_id) values.push(filters.sales_id)
  if (filters.search) {
    values.push(`%${filters.search}%`)
    values.push(`%${filters.search}%`)
  }
  if (filters.kabupaten) values.push(filters.kabupaten)
  if (filters.kecamatan) values.push(filters.kecamatan)
  if (filters.start_date) values.push(filters.start_date)
  if (filters.end_date) values.push(filters.end_date)
  
  return values
}