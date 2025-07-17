-- Database Schema Extension for Priority Products
-- Upgrade untuk mendukung bulk shipment input dengan produk prioritas

-- 1. Tambah kolom prioritas pada tabel produk
ALTER TABLE produk ADD COLUMN is_priority BOOLEAN DEFAULT FALSE;
ALTER TABLE produk ADD COLUMN priority_order INTEGER DEFAULT 0;

-- 2. Buat index untuk query produk prioritas
CREATE INDEX idx_produk_priority ON produk(is_priority, priority_order);

-- 3. Update beberapa produk sample menjadi prioritas
UPDATE produk SET is_priority = TRUE, priority_order = 1 WHERE id_produk = 1; -- Sabun Mandi
UPDATE produk SET is_priority = TRUE, priority_order = 2 WHERE id_produk = 2; -- Shampoo
UPDATE produk SET is_priority = TRUE, priority_order = 3 WHERE id_produk = 3; -- Pasta Gigi

-- 4. Buat view untuk produk prioritas
CREATE VIEW v_produk_prioritas AS
SELECT 
    id_produk,
    nama_produk,
    harga_satuan,
    priority_order,
    status_produk
FROM produk 
WHERE is_priority = TRUE AND status_produk = TRUE
ORDER BY priority_order ASC;

-- 5. Buat view untuk produk non-prioritas
CREATE VIEW v_produk_non_prioritas AS
SELECT 
    id_produk,
    nama_produk,
    harga_satuan,
    status_produk
FROM produk 
WHERE (is_priority = FALSE OR is_priority IS NULL) AND status_produk = TRUE
ORDER BY nama_produk ASC;

-- 6. Tambah tabel untuk bulk pengiriman (optional, bisa langsung gunakan existing)
-- Ini akan membantu tracking bulk operations
CREATE TABLE bulk_pengiriman (
    id_bulk_pengiriman SERIAL PRIMARY KEY,
    id_sales INTEGER NOT NULL REFERENCES sales(id_sales),
    tanggal_kirim DATE NOT NULL,
    total_toko INTEGER NOT NULL,
    total_item INTEGER NOT NULL,
    keterangan TEXT,
    dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tambah kolom referensi ke bulk_pengiriman di tabel pengiriman
ALTER TABLE pengiriman ADD COLUMN id_bulk_pengiriman INTEGER REFERENCES bulk_pengiriman(id_bulk_pengiriman);

-- 8. Buat index untuk bulk pengiriman
CREATE INDEX idx_bulk_pengiriman_sales ON bulk_pengiriman(id_sales);
CREATE INDEX idx_bulk_pengiriman_tanggal ON bulk_pengiriman(tanggal_kirim);
CREATE INDEX idx_pengiriman_bulk ON pengiriman(id_bulk_pengiriman);

-- 9. Trigger untuk bulk pengiriman
CREATE TRIGGER update_bulk_pengiriman_diperbarui_pada 
    BEFORE UPDATE ON bulk_pengiriman 
    FOR EACH ROW EXECUTE FUNCTION update_diperbarui_pada_column();

-- 10. Grant permissions
GRANT SELECT ON v_produk_prioritas TO authenticated;
GRANT SELECT ON v_produk_non_prioritas TO authenticated;
GRANT ALL ON bulk_pengiriman TO authenticated;
GRANT USAGE ON SEQUENCE bulk_pengiriman_id_bulk_pengiriman_seq TO authenticated;

-- 11. RLS untuk bulk_pengiriman
ALTER TABLE bulk_pengiriman ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations for authenticated users" ON bulk_pengiriman 
    FOR ALL USING (auth.role() = 'authenticated');

-- 12. Function untuk get toko by sales
CREATE OR REPLACE FUNCTION get_toko_by_sales(sales_id INTEGER)
RETURNS TABLE (
    id_toko INTEGER,
    nama_toko VARCHAR(255),
    alamat TEXT,
    desa VARCHAR(100),
    kecamatan VARCHAR(100),
    kabupaten VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id_toko,
        t.nama_toko,
        t.alamat,
        t.desa,
        t.kecamatan,
        t.kabupaten
    FROM toko t
    WHERE t.id_sales = sales_id AND t.status_toko = TRUE
    ORDER BY t.nama_toko;
END;
$$ LANGUAGE plpgsql;

-- Grant execute pada function
GRANT EXECUTE ON FUNCTION get_toko_by_sales TO authenticated;

-- 13. Sample data untuk testing
INSERT INTO bulk_pengiriman (id_sales, tanggal_kirim, total_toko, total_item, keterangan) 
VALUES (1, CURRENT_DATE, 2, 6, 'Pengiriman bulk ke 2 toko sales Ahmad');