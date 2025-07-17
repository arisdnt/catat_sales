-- Sistem Pencatatan Penjualan Titip Bayar
-- Database Schema untuk Supabase PostgreSQL
-- Tanggal: 16 Juli 2025

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabel Master: sales
CREATE TABLE sales (
    id_sales SERIAL PRIMARY KEY,
    nama_sales VARCHAR(255) NOT NULL,
    nomor_telepon VARCHAR(20),
    status_aktif BOOLEAN DEFAULT TRUE,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Master: produk
CREATE TABLE produk (
    id_produk SERIAL PRIMARY KEY,
    nama_produk VARCHAR(255) NOT NULL,
    harga_satuan DECIMAL(10, 2) NOT NULL,
    status_produk BOOLEAN DEFAULT TRUE,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Master: toko
CREATE TABLE toko (
    id_toko SERIAL PRIMARY KEY,
    id_sales INTEGER NOT NULL REFERENCES sales(id_sales) ON DELETE CASCADE,
    nama_toko VARCHAR(255) NOT NULL,
    alamat TEXT,
    desa VARCHAR(100),
    kecamatan VARCHAR(100),
    kabupaten VARCHAR(100),
    link_gmaps TEXT,
    status_toko BOOLEAN DEFAULT TRUE,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Transaksi: pengiriman
CREATE TABLE pengiriman (
    id_pengiriman SERIAL PRIMARY KEY,
    id_toko INTEGER NOT NULL REFERENCES toko(id_toko) ON DELETE CASCADE,
    tanggal_kirim DATE NOT NULL,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Transaksi: detail_pengiriman
CREATE TABLE detail_pengiriman (
    id_detail_kirim SERIAL PRIMARY KEY,
    id_pengiriman INTEGER NOT NULL REFERENCES pengiriman(id_pengiriman) ON DELETE CASCADE,
    id_produk INTEGER NOT NULL REFERENCES produk(id_produk) ON DELETE CASCADE,
    jumlah_kirim INTEGER NOT NULL CHECK (jumlah_kirim > 0),
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Transaksi: penagihan
CREATE TABLE penagihan (
    id_penagihan SERIAL PRIMARY KEY,
    id_toko INTEGER NOT NULL REFERENCES toko(id_toko) ON DELETE CASCADE,
    total_uang_diterima DECIMAL(12, 2) NOT NULL CHECK (total_uang_diterima >= 0),
    metode_pembayaran VARCHAR(20) NOT NULL CHECK (metode_pembayaran IN ('Cash', 'Transfer')),
    ada_potongan BOOLEAN DEFAULT FALSE,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Transaksi: detail_penagihan
CREATE TABLE detail_penagihan (
    id_detail_tagih SERIAL PRIMARY KEY,
    id_penagihan INTEGER NOT NULL REFERENCES penagihan(id_penagihan) ON DELETE CASCADE,
    id_produk INTEGER NOT NULL REFERENCES produk(id_produk) ON DELETE CASCADE,
    jumlah_terjual INTEGER NOT NULL CHECK (jumlah_terjual >= 0),
    jumlah_kembali INTEGER NOT NULL CHECK (jumlah_kembali >= 0),
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Transaksi: potongan_penagihan
CREATE TABLE potongan_penagihan (
    id_potongan SERIAL PRIMARY KEY,
    id_penagihan INTEGER NOT NULL REFERENCES penagihan(id_penagihan) ON DELETE CASCADE,
    jumlah_potongan DECIMAL(12, 2) NOT NULL CHECK (jumlah_potongan >= 0),
    alasan TEXT,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Transaksi: setoran
CREATE TABLE setoran (
    id_setoran SERIAL PRIMARY KEY,
    total_setoran DECIMAL(14, 2) NOT NULL CHECK (total_setoran >= 0),
    penerima_setoran VARCHAR(100) NOT NULL,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes untuk optimasi query
CREATE INDEX idx_toko_sales ON toko(id_sales);
CREATE INDEX idx_pengiriman_toko ON pengiriman(id_toko);
CREATE INDEX idx_pengiriman_tanggal ON pengiriman(tanggal_kirim);
CREATE INDEX idx_detail_pengiriman_pengiriman ON detail_pengiriman(id_pengiriman);
CREATE INDEX idx_detail_pengiriman_produk ON detail_pengiriman(id_produk);
CREATE INDEX idx_penagihan_toko ON penagihan(id_toko);
CREATE INDEX idx_penagihan_tanggal ON penagihan(dibuat_pada);
CREATE INDEX idx_detail_penagihan_penagihan ON detail_penagihan(id_penagihan);
CREATE INDEX idx_detail_penagihan_produk ON detail_penagihan(id_produk);
CREATE INDEX idx_potongan_penagihan ON potongan_penagihan(id_penagihan);
CREATE INDEX idx_setoran_tanggal ON setoran(dibuat_pada);

-- Triggers untuk auto-update timestamps
CREATE OR REPLACE FUNCTION update_diperbarui_pada_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.diperbarui_pada = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sales_diperbarui_pada BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_diperbarui_pada_column();
CREATE TRIGGER update_produk_diperbarui_pada BEFORE UPDATE ON produk FOR EACH ROW EXECUTE FUNCTION update_diperbarui_pada_column();
CREATE TRIGGER update_toko_diperbarui_pada BEFORE UPDATE ON toko FOR EACH ROW EXECUTE FUNCTION update_diperbarui_pada_column();
CREATE TRIGGER update_pengiriman_diperbarui_pada BEFORE UPDATE ON pengiriman FOR EACH ROW EXECUTE FUNCTION update_diperbarui_pada_column();
CREATE TRIGGER update_detail_pengiriman_diperbarui_pada BEFORE UPDATE ON detail_pengiriman FOR EACH ROW EXECUTE FUNCTION update_diperbarui_pada_column();
CREATE TRIGGER update_penagihan_diperbarui_pada BEFORE UPDATE ON penagihan FOR EACH ROW EXECUTE FUNCTION update_diperbarui_pada_column();
CREATE TRIGGER update_detail_penagihan_diperbarui_pada BEFORE UPDATE ON detail_penagihan FOR EACH ROW EXECUTE FUNCTION update_diperbarui_pada_column();
CREATE TRIGGER update_potongan_penagihan_diperbarui_pada BEFORE UPDATE ON potongan_penagihan FOR EACH ROW EXECUTE FUNCTION update_diperbarui_pada_column();
CREATE TRIGGER update_setoran_diperbarui_pada BEFORE UPDATE ON setoran FOR EACH ROW EXECUTE FUNCTION update_diperbarui_pada_column();

-- Sample data untuk testing
INSERT INTO sales (nama_sales, nomor_telepon, status_aktif) VALUES
('Ahmad Susanto', '081234567890', TRUE),
('Budi Santoso', '081234567891', TRUE),
('Citra Dewi', '081234567892', TRUE);

INSERT INTO produk (nama_produk, harga_satuan, status_produk) VALUES
('Sabun Mandi 100gr', 5000.00, TRUE),
('Shampo Botol 200ml', 15000.00, TRUE),
('Pasta Gigi 75gr', 8000.00, TRUE),
('Detergen Bubuk 1kg', 12000.00, TRUE),
('Minyak Goreng 1L', 18000.00, TRUE);

INSERT INTO toko (id_sales, nama_toko, alamat, desa, kecamatan, kabupaten, status_toko) VALUES
(1, 'Toko Berkah', 'Jl. Raya No. 123', 'Sukamaju', 'Kec. Sukamaju', 'Kab. Sukabumi', TRUE),
(1, 'Warung Sari', 'Jl. Pasar No. 45', 'Makmur', 'Kec. Makmur', 'Kab. Sukabumi', TRUE),
(2, 'Toko Sejahtera', 'Jl. Utama No. 67', 'Damai', 'Kec. Damai', 'Kab. Bogor', TRUE),
(3, 'Minimarket Indah', 'Jl. Raya Utara No. 89', 'Sentosa', 'Kec. Sentosa', 'Kab. Bogor', TRUE);

-- RLS (Row Level Security) policies
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE produk ENABLE ROW LEVEL SECURITY;
ALTER TABLE toko ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengiriman ENABLE ROW LEVEL SECURITY;
ALTER TABLE detail_pengiriman ENABLE ROW LEVEL SECURITY;
ALTER TABLE penagihan ENABLE ROW LEVEL SECURITY;
ALTER TABLE detail_penagihan ENABLE ROW LEVEL SECURITY;
ALTER TABLE potongan_penagihan ENABLE ROW LEVEL SECURITY;
ALTER TABLE setoran ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (authenticated users can access all data)
CREATE POLICY "Enable all operations for authenticated users" ON sales FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON produk FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON toko FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON pengiriman FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON detail_pengiriman FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON penagihan FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON detail_penagihan FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON potongan_penagihan FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON setoran FOR ALL USING (auth.role() = 'authenticated');

-- Views untuk laporan
CREATE VIEW v_laporan_pengiriman AS
SELECT 
    p.id_pengiriman,
    p.tanggal_kirim,
    t.nama_toko,
    s.nama_sales,
    pr.nama_produk,
    dp.jumlah_kirim,
    (dp.jumlah_kirim * pr.harga_satuan) AS nilai_kirim
FROM pengiriman p
JOIN toko t ON p.id_toko = t.id_toko
JOIN sales s ON t.id_sales = s.id_sales
JOIN detail_pengiriman dp ON p.id_pengiriman = dp.id_pengiriman
JOIN produk pr ON dp.id_produk = pr.id_produk;

CREATE VIEW v_laporan_penagihan AS
SELECT 
    pn.id_penagihan,
    pn.dibuat_pada::DATE as tanggal_tagih,
    t.nama_toko,
    s.nama_sales,
    pr.nama_produk,
    dp.jumlah_terjual,
    dp.jumlah_kembali,
    (dp.jumlah_terjual * pr.harga_satuan) AS nilai_terjual,
    pn.total_uang_diterima,
    pn.metode_pembayaran,
    pn.ada_potongan
FROM penagihan pn
JOIN toko t ON pn.id_toko = t.id_toko
JOIN sales s ON t.id_sales = s.id_sales
JOIN detail_penagihan dp ON pn.id_penagihan = dp.id_penagihan
JOIN produk pr ON dp.id_produk = pr.id_produk;

CREATE VIEW v_rekonsiliasi_setoran AS
SELECT 
    s.id_setoran,
    s.dibuat_pada::DATE as tanggal_setoran,
    s.total_setoran,
    s.penerima_setoran,
    COALESCE(SUM(pn.total_uang_diterima), 0) as total_penagihan_cash,
    (s.total_setoran - COALESCE(SUM(pn.total_uang_diterima), 0)) as selisih
FROM setoran s
LEFT JOIN penagihan pn ON pn.dibuat_pada::DATE = s.dibuat_pada::DATE 
    AND pn.metode_pembayaran = 'Cash'
GROUP BY s.id_setoran, s.dibuat_pada, s.total_setoran, s.penerima_setoran;

-- Grant permissions for views
GRANT SELECT ON v_laporan_pengiriman TO authenticated;
GRANT SELECT ON v_laporan_penagihan TO authenticated;
GRANT SELECT ON v_rekonsiliasi_setoran TO authenticated;

-- Dashboard analytics functions
CREATE OR REPLACE FUNCTION get_sales_performance(month_filter text)
RETURNS TABLE(
  nama_sales text,
  total_penjualan numeric,
  total_setoran numeric,
  piutang numeric,
  rata_hari_penagihan numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.nama_sales,
    COALESCE(SUM(pn.total_uang_diterima), 0) as total_penjualan,
    COALESCE(SUM(st.total_setoran), 0) as total_setoran,
    COALESCE(SUM(pn.total_uang_diterima) - SUM(st.total_setoran), 0) as piutang,
    COALESCE(AVG(EXTRACT(DAY FROM (st.dibuat_pada - pn.dibuat_pada))), 0) as rata_hari_penagihan
  FROM sales s
  LEFT JOIN toko t ON s.id_sales = t.id_sales
  LEFT JOIN penagihan pn ON t.id_toko = pn.id_toko 
    AND to_char(pn.dibuat_pada, 'YYYY-MM') = month_filter
  LEFT JOIN setoran st ON DATE(st.dibuat_pada) = DATE(pn.dibuat_pada)
  WHERE s.status_aktif = true
  GROUP BY s.id_sales, s.nama_sales;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_top_products(month_filter text)
RETURNS TABLE(
  nama_produk text,
  total_terjual bigint,
  total_nilai numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.nama_produk,
    SUM(dp.jumlah_terjual) as total_terjual,
    SUM(dp.jumlah_terjual * p.harga_satuan) as total_nilai
  FROM produk p
  JOIN detail_penagihan dp ON p.id_produk = dp.id_produk
  JOIN penagihan pn ON dp.id_penagihan = pn.id_penagihan
  WHERE to_char(pn.dibuat_pada, 'YYYY-MM') = month_filter
  GROUP BY p.id_produk, p.nama_produk
  ORDER BY total_terjual DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_top_stores(month_filter text)
RETURNS TABLE(
  nama_toko text,
  nama_sales text,
  total_pembelian numeric,
  total_transaksi bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.nama_toko,
    s.nama_sales,
    SUM(pn.total_uang_diterima) as total_pembelian,
    COUNT(pn.id_penagihan) as total_transaksi
  FROM toko t
  JOIN sales s ON t.id_sales = s.id_sales
  JOIN penagihan pn ON t.id_toko = pn.id_toko
  WHERE to_char(pn.dibuat_pada, 'YYYY-MM') = month_filter
  GROUP BY t.id_toko, t.nama_toko, s.nama_sales
  ORDER BY total_pembelian DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_asset_distribution()
RETURNS TABLE(
  category text,
  amount numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'Stok Gudang' as category, SUM(p.harga_satuan * 100) as amount FROM produk p WHERE p.status_produk = true
  UNION ALL
  SELECT 'Barang di Jalan' as category, 
    COALESCE(SUM(dp.jumlah_kirim * pr.harga_satuan), 0) as amount
  FROM detail_pengiriman dp
  JOIN produk pr ON dp.id_produk = pr.id_produk
  JOIN pengiriman pg ON dp.id_pengiriman = pg.id_pengiriman
  WHERE pg.tanggal_kirim >= CURRENT_DATE - INTERVAL '30 days'
  UNION ALL
  SELECT 'Piutang Beredar' as category,
    COALESCE(SUM(pn.total_uang_diterima), 0) - COALESCE(SUM(st.total_setoran), 0) as amount
  FROM penagihan pn
  LEFT JOIN setoran st ON DATE(st.dibuat_pada) = DATE(pn.dibuat_pada)
  WHERE pn.dibuat_pada >= CURRENT_DATE - INTERVAL '30 days'
  UNION ALL
  SELECT 'Kas di Tangan Sales' as category,
    COALESCE(SUM(pn.total_uang_diterima), 0) as amount
  FROM penagihan pn
  LEFT JOIN setoran st ON DATE(st.dibuat_pada) = DATE(pn.dibuat_pada)
  WHERE pn.metode_pembayaran = 'Cash' 
    AND pn.dibuat_pada >= CURRENT_DATE - INTERVAL '7 days'
    AND st.id_setoran IS NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_sales_ranking(month_filter text)
RETURNS TABLE(
  nama_sales text,
  total_setoran numeric,
  total_penjualan numeric,
  efektivitas_persen numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.nama_sales,
    COALESCE(SUM(st.total_setoran), 0) as total_setoran,
    COALESCE(SUM(pn.total_uang_diterima), 0) as total_penjualan,
    CASE 
      WHEN COALESCE(SUM(pn.total_uang_diterima), 0) = 0 THEN 0
      ELSE (COALESCE(SUM(st.total_setoran), 0) / COALESCE(SUM(pn.total_uang_diterima), 0)) * 100
    END as efektivitas_persen
  FROM sales s
  LEFT JOIN toko t ON s.id_sales = t.id_sales
  LEFT JOIN penagihan pn ON t.id_toko = pn.id_toko 
    AND to_char(pn.dibuat_pada, 'YYYY-MM') = month_filter
  LEFT JOIN setoran st ON DATE(st.dibuat_pada) = DATE(pn.dibuat_pada)
  WHERE s.status_aktif = true
  GROUP BY s.id_sales, s.nama_sales
  ORDER BY total_setoran DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_monthly_trends(start_date date)
RETURNS TABLE(
  month text,
  total_penjualan numeric,
  total_setoran numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_char(pn.dibuat_pada, 'YYYY-MM') as month,
    SUM(pn.total_uang_diterima) as total_penjualan,
    COALESCE(SUM(st.total_setoran), 0) as total_setoran
  FROM penagihan pn
  LEFT JOIN setoran st ON DATE(st.dibuat_pada) = DATE(pn.dibuat_pada)
  WHERE pn.dibuat_pada >= start_date
  GROUP BY to_char(pn.dibuat_pada, 'YYYY-MM')
  ORDER BY month;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_cash_in_hand()
RETURNS TABLE(
  nama_sales text,
  kas_di_tangan numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.nama_sales,
    COALESCE(SUM(pn.total_uang_diterima), 0) as kas_di_tangan
  FROM sales s
  LEFT JOIN toko t ON s.id_sales = t.id_sales
  LEFT JOIN penagihan pn ON t.id_toko = pn.id_toko
  LEFT JOIN setoran st ON DATE(st.dibuat_pada) = DATE(pn.dibuat_pada)
  WHERE pn.metode_pembayaran = 'Cash' 
    AND pn.dibuat_pada >= CURRENT_DATE - INTERVAL '7 days'
    AND st.id_setoran IS NULL
    AND s.status_aktif = true
  GROUP BY s.id_sales, s.nama_sales
  HAVING SUM(pn.total_uang_diterima) > 0;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_receivables_aging()
RETURNS TABLE(
  aging_category text,
  total_amount numeric,
  count_items bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN EXTRACT(DAY FROM (CURRENT_DATE - pn.dibuat_pada::date)) <= 30 THEN '0-30 hari'
      WHEN EXTRACT(DAY FROM (CURRENT_DATE - pn.dibuat_pada::date)) <= 60 THEN '31-60 hari'
      WHEN EXTRACT(DAY FROM (CURRENT_DATE - pn.dibuat_pada::date)) <= 90 THEN '61-90 hari'
      ELSE '90+ hari'
    END as aging_category,
    SUM(pn.total_uang_diterima) as total_amount,
    COUNT(*) as count_items
  FROM penagihan pn
  LEFT JOIN setoran st ON DATE(st.dibuat_pada) = DATE(pn.dibuat_pada)
  WHERE st.id_setoran IS NULL
  GROUP BY aging_category
  ORDER BY 
    CASE aging_category
      WHEN '0-30 hari' THEN 1
      WHEN '31-60 hari' THEN 2
      WHEN '61-90 hari' THEN 3
      ELSE 4
    END;
END;
$$ LANGUAGE plpgsql;