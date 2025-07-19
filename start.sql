-- =====================================================
-- SISTEM PENJUALAN TITIP BAYAR - DATABASE SETUP
-- Clean Database Setup Script
-- =====================================================

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to auto-update diperbarui_pada column
CREATE OR REPLACE FUNCTION public.update_diperbarui_pada_column() 
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.diperbarui_pada = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Function to get toko by sales ID
CREATE OR REPLACE FUNCTION public.get_toko_by_sales(sales_id integer) 
RETURNS TABLE(id_toko integer, nama_toko character varying, kecamatan character varying, kabupaten character varying)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id_toko,
        t.nama_toko,
        t.kecamatan,
        t.kabupaten
    FROM toko t
    WHERE t.id_sales = sales_id AND t.status_toko = TRUE
    ORDER BY t.nama_toko;
END;
$$;

-- =====================================================
-- MAIN TABLES
-- =====================================================

-- Sales Table
CREATE TABLE public.sales (
    id_sales SERIAL PRIMARY KEY,
    nama_sales VARCHAR(255) NOT NULL,
    nomor_telepon VARCHAR(20),
    status_aktif BOOLEAN DEFAULT true,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE public.produk (
    id_produk SERIAL PRIMARY KEY,
    nama_produk VARCHAR(255) NOT NULL,
    harga_satuan NUMERIC(10,2) NOT NULL CHECK (harga_satuan >= 0),
    status_produk BOOLEAN DEFAULT true,
    is_priority BOOLEAN DEFAULT false,
    priority_order INTEGER DEFAULT 0,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stores Table
CREATE TABLE public.toko (
    id_toko SERIAL PRIMARY KEY,
    id_sales INTEGER NOT NULL,
    nama_toko VARCHAR(255) NOT NULL,
    kecamatan VARCHAR(100),
    kabupaten VARCHAR(100),
    no_telepon VARCHAR(20),
    link_gmaps TEXT,
    status_toko BOOLEAN DEFAULT true,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_sales) REFERENCES sales(id_sales) ON DELETE RESTRICT
);

-- Bulk Shipment Table
CREATE TABLE public.bulk_pengiriman (
    id_bulk_pengiriman SERIAL PRIMARY KEY,
    id_sales INTEGER NOT NULL,
    tanggal_kirim DATE NOT NULL,
    total_toko INTEGER NOT NULL CHECK (total_toko > 0),
    total_item INTEGER NOT NULL CHECK (total_item > 0),
    keterangan TEXT,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_sales) REFERENCES sales(id_sales) ON DELETE RESTRICT
);

-- Shipment Table
CREATE TABLE public.pengiriman (
    id_pengiriman SERIAL PRIMARY KEY,
    id_toko INTEGER NOT NULL,
    tanggal_kirim DATE NOT NULL,
    id_bulk_pengiriman INTEGER,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_toko) REFERENCES toko(id_toko) ON DELETE RESTRICT,
    FOREIGN KEY (id_bulk_pengiriman) REFERENCES bulk_pengiriman(id_bulk_pengiriman) ON DELETE SET NULL
);

-- Shipment Details Table
CREATE TABLE public.detail_pengiriman (
    id_detail_kirim SERIAL PRIMARY KEY,
    id_pengiriman INTEGER NOT NULL,
    id_produk INTEGER NOT NULL,
    jumlah_kirim INTEGER NOT NULL CHECK (jumlah_kirim > 0),
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_pengiriman) REFERENCES pengiriman(id_pengiriman) ON DELETE CASCADE,
    FOREIGN KEY (id_produk) REFERENCES produk(id_produk) ON DELETE RESTRICT
);

-- Billing Table
CREATE TABLE public.penagihan (
    id_penagihan SERIAL PRIMARY KEY,
    id_toko INTEGER NOT NULL,
    total_uang_diterima NUMERIC(12,2) NOT NULL CHECK (total_uang_diterima >= 0),
    metode_pembayaran VARCHAR(20) NOT NULL CHECK (metode_pembayaran IN ('Cash', 'Transfer')),
    ada_potongan BOOLEAN DEFAULT false,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_toko) REFERENCES toko(id_toko) ON DELETE RESTRICT
);

-- Billing Details Table
CREATE TABLE public.detail_penagihan (
    id_detail_tagih SERIAL PRIMARY KEY,
    id_penagihan INTEGER NOT NULL,
    id_produk INTEGER NOT NULL,
    jumlah_terjual INTEGER NOT NULL CHECK (jumlah_terjual >= 0),
    jumlah_kembali INTEGER NOT NULL CHECK (jumlah_kembali >= 0),
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_penagihan) REFERENCES penagihan(id_penagihan) ON DELETE CASCADE,
    FOREIGN KEY (id_produk) REFERENCES produk(id_produk) ON DELETE RESTRICT
);

-- Billing Deductions Table
CREATE TABLE public.potongan_penagihan (
    id_potongan SERIAL PRIMARY KEY,
    id_penagihan INTEGER NOT NULL,
    jumlah_potongan NUMERIC(12,2) NOT NULL CHECK (jumlah_potongan >= 0),
    alasan TEXT,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_penagihan) REFERENCES penagihan(id_penagihan) ON DELETE CASCADE
);

-- Deposits Table
CREATE TABLE public.setoran (
    id_setoran SERIAL PRIMARY KEY,
    total_setoran NUMERIC(14,2) NOT NULL CHECK (total_setoran >= 0),
    penerima_setoran VARCHAR(100) NOT NULL,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update diperbarui_pada triggers
CREATE TRIGGER trigger_update_sales_diperbarui_pada
    BEFORE UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_diperbarui_pada_column();

CREATE TRIGGER trigger_update_produk_diperbarui_pada
    BEFORE UPDATE ON produk
    FOR EACH ROW
    EXECUTE FUNCTION update_diperbarui_pada_column();

CREATE TRIGGER trigger_update_toko_diperbarui_pada
    BEFORE UPDATE ON toko
    FOR EACH ROW
    EXECUTE FUNCTION update_diperbarui_pada_column();

CREATE TRIGGER trigger_update_bulk_pengiriman_diperbarui_pada
    BEFORE UPDATE ON bulk_pengiriman
    FOR EACH ROW
    EXECUTE FUNCTION update_diperbarui_pada_column();

CREATE TRIGGER trigger_update_pengiriman_diperbarui_pada
    BEFORE UPDATE ON pengiriman
    FOR EACH ROW
    EXECUTE FUNCTION update_diperbarui_pada_column();

CREATE TRIGGER trigger_update_detail_pengiriman_diperbarui_pada
    BEFORE UPDATE ON detail_pengiriman
    FOR EACH ROW
    EXECUTE FUNCTION update_diperbarui_pada_column();

CREATE TRIGGER trigger_update_penagihan_diperbarui_pada
    BEFORE UPDATE ON penagihan
    FOR EACH ROW
    EXECUTE FUNCTION update_diperbarui_pada_column();

CREATE TRIGGER trigger_update_detail_penagihan_diperbarui_pada
    BEFORE UPDATE ON detail_penagihan
    FOR EACH ROW
    EXECUTE FUNCTION update_diperbarui_pada_column();

CREATE TRIGGER trigger_update_potongan_penagihan_diperbarui_pada
    BEFORE UPDATE ON potongan_penagihan
    FOR EACH ROW
    EXECUTE FUNCTION update_diperbarui_pada_column();

CREATE TRIGGER trigger_update_setoran_diperbarui_pada
    BEFORE UPDATE ON setoran
    FOR EACH ROW
    EXECUTE FUNCTION update_diperbarui_pada_column();

-- =====================================================
-- VIEWS
-- =====================================================

-- View for shipment reports
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
JOIN produk pr ON dp.id_produk = pr.id_produk
WHERE t.status_toko = true AND s.status_aktif = true;

-- View for billing reports
CREATE VIEW v_laporan_penagihan AS
SELECT 
    pn.id_penagihan,
    pn.dibuat_pada::date AS tanggal_tagih,
    t.nama_toko,
    s.nama_sales,
    pr.nama_produk,
    dp.jumlah_terjual,
    dp.jumlah_kembali,
    (dp.jumlah_terjual * pr.harga_satuan) AS nilai_terjual,
    pn.metode_pembayaran,
    pn.ada_potongan
FROM penagihan pn
JOIN toko t ON pn.id_toko = t.id_toko
JOIN sales s ON t.id_sales = s.id_sales
JOIN detail_penagihan dp ON pn.id_penagihan = dp.id_penagihan
JOIN produk pr ON dp.id_produk = pr.id_produk
WHERE t.status_toko = true AND s.status_aktif = true;

-- View for deposit reconciliation
CREATE VIEW v_rekonsiliasi_setoran AS
SELECT 
    s.nama_sales,
    COALESCE(SUM(pn.total_uang_diterima), 0) AS total_penjualan_cash,
    COALESCE(SUM(st.total_setoran), 0) AS total_setoran,
    (COALESCE(SUM(pn.total_uang_diterima), 0) - COALESCE(SUM(st.total_setoran), 0)) AS selisih
FROM sales s
LEFT JOIN toko t ON s.id_sales = t.id_sales
LEFT JOIN penagihan pn ON t.id_toko = pn.id_toko AND pn.metode_pembayaran = 'Cash'
LEFT JOIN setoran st ON DATE(st.dibuat_pada) = DATE(pn.dibuat_pada)
WHERE s.status_aktif = true
GROUP BY s.id_sales, s.nama_sales
ORDER BY s.nama_sales;

-- View for priority products
CREATE VIEW v_produk_prioritas AS
SELECT 
    id_produk,
    nama_produk,
    harga_satuan,
    priority_order,
    status_produk
FROM produk
WHERE is_priority = true AND status_produk = true
ORDER BY priority_order ASC, nama_produk ASC;

-- View for non-priority products
CREATE VIEW v_produk_non_prioritas AS
SELECT 
    id_produk,
    nama_produk,
    harga_satuan,
    status_produk
FROM produk
WHERE (is_priority = false OR is_priority IS NULL) AND status_produk = true
ORDER BY nama_produk ASC;

-- =====================================================
-- INDEXES for Performance
-- =====================================================

-- Indexes on foreign keys
CREATE INDEX idx_toko_id_sales ON toko(id_sales);
CREATE INDEX idx_pengiriman_id_toko ON pengiriman(id_toko);
CREATE INDEX idx_pengiriman_id_bulk ON pengiriman(id_bulk_pengiriman);
CREATE INDEX idx_detail_pengiriman_id_pengiriman ON detail_pengiriman(id_pengiriman);
CREATE INDEX idx_detail_pengiriman_id_produk ON detail_pengiriman(id_produk);
CREATE INDEX idx_penagihan_id_toko ON penagihan(id_toko);
CREATE INDEX idx_detail_penagihan_id_penagihan ON detail_penagihan(id_penagihan);
CREATE INDEX idx_detail_penagihan_id_produk ON detail_penagihan(id_produk);
CREATE INDEX idx_potongan_penagihan_id_penagihan ON potongan_penagihan(id_penagihan);
CREATE INDEX idx_bulk_pengiriman_id_sales ON bulk_pengiriman(id_sales);

-- Indexes for commonly queried fields
CREATE INDEX idx_produk_is_priority ON produk(is_priority);
CREATE INDEX idx_produk_status ON produk(status_produk);
CREATE INDEX idx_sales_status ON sales(status_aktif);
CREATE INDEX idx_toko_status ON toko(status_toko);
CREATE INDEX idx_pengiriman_tanggal ON pengiriman(tanggal_kirim);
CREATE INDEX idx_penagihan_tanggal ON penagihan(dibuat_pada);
CREATE INDEX idx_penagihan_metode ON penagihan(metode_pembayaran);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE produk ENABLE ROW LEVEL SECURITY;
ALTER TABLE toko ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengiriman ENABLE ROW LEVEL SECURITY;
ALTER TABLE detail_pengiriman ENABLE ROW LEVEL SECURITY;
ALTER TABLE penagihan ENABLE ROW LEVEL SECURITY;
ALTER TABLE detail_penagihan ENABLE ROW LEVEL SECURITY;
ALTER TABLE potongan_penagihan ENABLE ROW LEVEL SECURITY;
ALTER TABLE setoran ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_pengiriman ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON sales FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON sales FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON produk FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON produk FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON toko FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON toko FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON pengiriman FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON pengiriman FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON detail_pengiriman FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON detail_pengiriman FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON penagihan FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON penagihan FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON detail_penagihan FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON detail_penagihan FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON potongan_penagihan FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON potongan_penagihan FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON setoran FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON setoran FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON bulk_pengiriman FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON bulk_pengiriman FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- SAMPLE DATA for Testing (Optional)
-- =====================================================

-- Uncomment below to insert sample data for development/testing

/*
-- Sample Sales
INSERT INTO sales (nama_sales, nomor_telepon) VALUES 
('Ahmad Fauzi', '081234567890'),
('Budi Santoso', '081987654321'),
('Citra Dewi', '082111222333');

-- Sample Products (including priority products)
INSERT INTO produk (nama_produk, harga_satuan, is_priority, priority_order) VALUES 
('Produk A', 15000.00, true, 1),
('Produk B', 20000.00, true, 2),
('Produk C', 25000.00, true, 3),
('Produk D', 18000.00, false, 0),
('Produk E', 22000.00, false, 0);

-- Sample Stores
INSERT INTO toko (id_sales, nama_toko, kecamatan, kabupaten, no_telepon) VALUES 
(1, 'Toko Sejahtera', 'Bandung Wetan', 'Bandung', '022-1234567'),
(1, 'Toko Makmur', 'Coblong', 'Bandung', '022-2345678'),
(2, 'Toko Berkah', 'Sukajadi', 'Bandung', '022-3456789'),
(3, 'Toko Jaya', 'Cicendo', 'Bandung', '022-4567890');
*/

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- Create a completion log
DO $$
BEGIN
    RAISE NOTICE 'Database setup completed successfully!';
    RAISE NOTICE 'Tables created: sales, produk, toko, pengiriman, detail_pengiriman, penagihan, detail_penagihan, potongan_penagihan, setoran, bulk_pengiriman';
    RAISE NOTICE 'Views created: v_laporan_pengiriman, v_laporan_penagihan, v_rekonsiliasi_setoran, v_produk_prioritas, v_produk_non_prioritas';
    RAISE NOTICE 'Indexes and triggers configured for optimal performance';
    RAISE NOTICE 'Row Level Security enabled with authentication policies';
    RAISE NOTICE 'Ready for production use!';
END $$;