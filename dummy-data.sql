-- Data Dummy untuk Sistem Pencatatan Penjualan Titip Bayar
-- File: dummy-data.sql
-- Jalankan file ini di Supabase Dashboard setelah menjalankan database-schema.sql
-- Tanggal: 16 Juli 2025

-- ==============================================
-- CLEAR EXISTING DATA (OPTIONAL)
-- ==============================================
-- Uncomment jika ingin menghapus data existing terlebih dahulu
-- TRUNCATE TABLE potongan_penagihan, detail_penagihan, detail_pengiriman, penagihan, pengiriman, setoran, toko, sales, produk RESTART IDENTITY CASCADE;

-- ==============================================
-- SALES DATA (10 sales representatif)
-- ==============================================
INSERT INTO sales (nama_sales, nomor_telepon, status_aktif) VALUES
('Ahmad Susanto', '081234567890', TRUE),
('Budi Santoso', '081234567891', TRUE),
('Citra Dewi', '081234567892', TRUE),
('Denny Prasetyo', '081234567893', TRUE),
('Eka Sari', '081234567894', TRUE),
('Farid Rahman', '081234567895', TRUE),
('Gita Indira', '081234567896', TRUE),
('Hadi Nugroho', '081234567897', TRUE),
('Ika Putri', '081234567898', TRUE),
('Joko Widodo', '081234567899', FALSE);

-- ==============================================
-- PRODUK DATA (20 produk berbagai kategori)
-- ==============================================
INSERT INTO produk (nama_produk, harga_satuan, status_produk) VALUES
-- Kategori: Kebersihan
('Sabun Mandi Lifebuoy 100gr', 4500.00, TRUE),
('Sabun Mandi Dettol 100gr', 5200.00, TRUE),
('Shampo Pantene 170ml', 18000.00, TRUE),
('Shampo Head & Shoulders 170ml', 22000.00, TRUE),
('Pasta Gigi Pepsodent 75gr', 7500.00, TRUE),
('Pasta Gigi Close Up 75gr', 8200.00, TRUE),
('Detergen Rinso 1kg', 14000.00, TRUE),
('Detergen Surf 1kg', 13500.00, TRUE),

-- Kategori: Makanan & Minuman
('Mie Instan Indomie Goreng', 3000.00, TRUE),
('Mie Instan Indomie Kuah', 3000.00, TRUE),
('Beras Premium 5kg', 75000.00, TRUE),
('Minyak Goreng Tropical 1L', 16000.00, TRUE),
('Gula Pasir 1kg', 15000.00, TRUE),
('Kopi Kapal Api 165gr', 12000.00, TRUE),
('Teh Sariwangi 50 kantong', 8500.00, TRUE),

-- Kategori: Kebutuhan Rumah Tangga
('Tissue Paseo 250 lembar', 12000.00, TRUE),
('Pembersih Lantai Vixal 800ml', 9500.00, TRUE),
('Sabun Cuci Piring Sunlight 800ml', 11000.00, TRUE),
('Pemutih Pakaian Bayclin 1L', 13000.00, TRUE),
('Pengharum Ruangan Stella 300ml', 15500.00, FALSE);

-- ==============================================
-- TOKO DATA (15 toko tersebar di berbagai sales)
-- ==============================================
INSERT INTO toko (id_sales, nama_toko, alamat, desa, kecamatan, kabupaten, link_gmaps, status_toko) VALUES
-- Sales Ahmad Susanto (id_sales: 1)
(1, 'Toko Berkah Jaya', 'Jl. Raya Sukabumi No. 123', 'Sukamaju', 'Kec. Sukamaju', 'Kab. Sukabumi', 'https://goo.gl/maps/example1', TRUE),
(1, 'Warung Sari Melati', 'Jl. Pasar Tradisional No. 45', 'Makmur Jaya', 'Kec. Makmur', 'Kab. Sukabumi', 'https://goo.gl/maps/example2', TRUE),
(1, 'Minimarket Bahagia', 'Jl. Veteran No. 78', 'Sukamakmur', 'Kec. Sukamaju', 'Kab. Sukabumi', 'https://goo.gl/maps/example3', TRUE),

-- Sales Budi Santoso (id_sales: 2)
(2, 'Toko Sejahtera Mandiri', 'Jl. Utama Bogor No. 67', 'Damai Sejahtera', 'Kec. Damai', 'Kab. Bogor', 'https://goo.gl/maps/example4', TRUE),
(2, 'Warung Bu Imas', 'Jl. Raya Ciawi No. 234', 'Ciawi Hilir', 'Kec. Ciawi', 'Kab. Bogor', 'https://goo.gl/maps/example5', TRUE),

-- Sales Citra Dewi (id_sales: 3)
(3, 'Minimarket Indah Permai', 'Jl. Raya Utara No. 89', 'Sentosa Indah', 'Kec. Sentosa', 'Kab. Bogor', 'https://goo.gl/maps/example6', TRUE),
(3, 'Toko Serba Ada Murah', 'Jl. Pajajaran No. 156', 'Bantarjati', 'Kec. Bogor Utara', 'Kab. Bogor', 'https://goo.gl/maps/example7', TRUE),

-- Sales Denny Prasetyo (id_sales: 4)
(4, 'Warung Keluarga Bahagia', 'Jl. Raya Cianjur No. 345', 'Mande', 'Kec. Mande', 'Kab. Cianjur', 'https://goo.gl/maps/example8', TRUE),
(4, 'Toko Bangunan Jaya', 'Jl. Ahmad Yani No. 567', 'Cianjur Kota', 'Kec. Cianjur', 'Kab. Cianjur', 'https://goo.gl/maps/example9', TRUE),

-- Sales Eka Sari (id_sales: 5)
(5, 'Minimarket Swalayan 24', 'Jl. Raya Bandung No. 789', 'Dayeuhkolot', 'Kec. Dayeuhkolot', 'Kab. Bandung', 'https://goo.gl/maps/example10', TRUE),
(5, 'Toko Kelontong Ibu Haji', 'Jl. Soekarno Hatta No. 123', 'Bojongsoang', 'Kec. Bojongsoang', 'Kab. Bandung', 'https://goo.gl/maps/example11', TRUE),

-- Sales Farid Rahman (id_sales: 6)
(6, 'Warung Mitra Usaha', 'Jl. Raya Garut No. 456', 'Tarogong Kidul', 'Kec. Tarogong Kidul', 'Kab. Garut', 'https://goo.gl/maps/example12', TRUE),

-- Sales Gita Indira (id_sales: 7)
(7, 'Toko Modern Jaya', 'Jl. Raya Tasikmalaya No. 678', 'Cihideung', 'Kec. Tawang', 'Kab. Tasikmalaya', 'https://goo.gl/maps/example13', TRUE),
(7, 'Minimarket Keluarga', 'Jl. HZ Mustofa No. 890', 'Sukarame', 'Kec. Sukarame', 'Kab. Tasikmalaya', 'https://goo.gl/maps/example14', TRUE),

-- Sales Hadi Nugroho (id_sales: 8)
(8, 'Warung Berkah Rezeki', 'Jl. Raya Cirebon No. 234', 'Kejaksan', 'Kec. Kejaksan', 'Kota Cirebon', 'https://goo.gl/maps/example15', TRUE);

-- ==============================================
-- PENGIRIMAN DATA (30 pengiriman dalam 3 bulan terakhir)
-- ==============================================
INSERT INTO pengiriman (id_toko, tanggal_kirim) VALUES
-- Januari 2024
(1, '2024-01-05'), (2, '2024-01-05'), (3, '2024-01-06'),
(4, '2024-01-08'), (5, '2024-01-10'), (6, '2024-01-12'),
(7, '2024-01-15'), (8, '2024-01-18'), (9, '2024-01-20'),
(10, '2024-01-22'), (1, '2024-01-25'), (2, '2024-01-28'),

-- Februari 2024
(3, '2024-02-02'), (4, '2024-02-05'), (5, '2024-02-08'),
(6, '2024-02-10'), (7, '2024-02-12'), (8, '2024-02-15'),
(9, '2024-02-18'), (10, '2024-02-20'), (11, '2024-02-22'),
(12, '2024-02-25'), (13, '2024-02-27'),

-- Maret 2024 (bulan ini)
(1, '2024-03-02'), (2, '2024-03-05'), (3, '2024-03-08'),
(4, '2024-03-10'), (5, '2024-03-12'), (6, '2024-03-15'),
(7, '2024-03-18');

-- ==============================================
-- DETAIL PENGIRIMAN DATA
-- ==============================================
-- Pengiriman 1 (Toko Berkah Jaya)
INSERT INTO detail_pengiriman (id_pengiriman, id_produk, jumlah_kirim) VALUES
(1, 1, 50), (1, 2, 30), (1, 5, 25), (1, 9, 100), (1, 12, 20);

-- Pengiriman 2 (Warung Sari Melati)
INSERT INTO detail_pengiriman (id_pengiriman, id_produk, jumlah_kirim) VALUES
(2, 1, 30), (2, 3, 20), (2, 7, 15), (2, 10, 80), (2, 14, 25);

-- Pengiriman 3 (Minimarket Bahagia)
INSERT INTO detail_pengiriman (id_pengiriman, id_produk, jumlah_kirim) VALUES
(3, 2, 40), (3, 4, 25), (3, 6, 35), (3, 11, 10), (3, 13, 30);

-- Pengiriman 4 (Toko Sejahtera Mandiri)
INSERT INTO detail_pengiriman (id_pengiriman, id_produk, jumlah_kirim) VALUES
(4, 1, 60), (4, 5, 40), (4, 8, 20), (4, 12, 25), (4, 16, 15);

-- Pengiriman 5 (Warung Bu Imas)
INSERT INTO detail_pengiriman (id_pengiriman, id_produk, jumlah_kirim) VALUES
(5, 3, 35), (5, 7, 25), (5, 9, 90), (5, 15, 20), (5, 17, 18);

-- Lanjutkan pola yang sama untuk pengiriman lainnya
INSERT INTO detail_pengiriman (id_pengiriman, id_produk, jumlah_kirim) VALUES
-- Pengiriman 6-10
(6, 1, 45), (6, 4, 30), (6, 11, 12), (6, 14, 22),
(7, 2, 35), (7, 6, 28), (7, 13, 35), (7, 18, 15),
(8, 5, 50), (8, 8, 18), (8, 12, 30), (8, 19, 10),
(9, 1, 40), (9, 9, 85), (9, 15, 25), (9, 16, 20),
(10, 3, 32), (10, 7, 22), (10, 10, 75), (10, 17, 16),

-- Pengiriman 11-15
(11, 2, 38), (11, 5, 45), (11, 11, 15), (11, 14, 28),
(12, 4, 42), (12, 8, 20), (12, 13, 40), (12, 18, 12),
(13, 1, 55), (13, 6, 33), (13, 12, 28), (13, 19, 8),
(14, 3, 48), (14, 9, 95), (14, 15, 30), (14, 16, 25),
(15, 2, 33), (15, 7, 19), (15, 10, 70), (15, 17, 14),

-- Pengiriman 16-20
(16, 1, 42), (16, 8, 23), (16, 13, 38), (16, 18, 11),
(17, 4, 37), (17, 11, 18), (17, 14, 32), (17, 19, 9),
(18, 5, 51), (18, 9, 88), (18, 15, 27), (18, 16, 22),
(19, 2, 39), (19, 6, 29), (19, 12, 26), (19, 17, 17),
(20, 3, 44), (20, 7, 21), (20, 10, 82), (20, 18, 13),

-- Pengiriman 21-25
(21, 1, 47), (21, 8, 24), (21, 13, 41), (21, 19, 7),
(22, 4, 36), (22, 11, 16), (22, 14, 29), (22, 16, 24),
(23, 5, 49), (23, 9, 92), (23, 15, 31), (23, 17, 19),
(24, 2, 41), (24, 6, 31), (24, 12, 24), (24, 18, 15),
(25, 3, 46), (25, 7, 18), (25, 10, 78), (25, 19, 6),

-- Pengiriman 26-30 (Maret 2024)
(26, 1, 52), (26, 8, 26), (26, 13, 43), (26, 16, 26),
(27, 4, 38), (27, 11, 19), (27, 14, 34), (27, 17, 21),
(28, 5, 54), (28, 9, 96), (28, 15, 33), (28, 18, 17),
(29, 2, 43), (29, 6, 32), (29, 12, 27), (29, 19, 5),
(30, 3, 48), (30, 7, 20), (30, 10, 85), (30, 16, 28);

-- ==============================================
-- PENAGIHAN DATA (25 transaksi penagihan)
-- ==============================================
INSERT INTO penagihan (id_toko, total_uang_diterima, metode_pembayaran, ada_potongan) VALUES
-- Januari 2024
(1, 750000.00, 'Cash', FALSE),
(2, 420000.00, 'Transfer', FALSE),
(3, 650000.00, 'Cash', TRUE),
(4, 890000.00, 'Transfer', FALSE),
(5, 520000.00, 'Cash', FALSE),
(6, 680000.00, 'Cash', TRUE),
(7, 470000.00, 'Transfer', FALSE),
(8, 720000.00, 'Cash', FALSE),

-- Februari 2024
(9, 580000.00, 'Transfer', FALSE),
(10, 640000.00, 'Cash', FALSE),
(11, 760000.00, 'Cash', TRUE),
(12, 390000.00, 'Transfer', FALSE),
(13, 820000.00, 'Cash', FALSE),
(14, 590000.00, 'Transfer', FALSE),
(15, 710000.00, 'Cash', TRUE),
(1, 680000.00, 'Cash', FALSE),
(2, 450000.00, 'Transfer', FALSE),

-- Maret 2024
(3, 720000.00, 'Cash', FALSE),
(4, 950000.00, 'Transfer', TRUE),
(5, 630000.00, 'Cash', FALSE),
(6, 780000.00, 'Cash', FALSE),
(7, 520000.00, 'Transfer', FALSE),
(8, 840000.00, 'Cash', TRUE),
(9, 670000.00, 'Transfer', FALSE),
(10, 750000.00, 'Cash', FALSE);

-- ==============================================
-- DETAIL PENAGIHAN DATA
-- ==============================================
-- Penagihan 1 (Toko Berkah Jaya - Cash 750000)
INSERT INTO detail_penagihan (id_penagihan, id_produk, jumlah_terjual, jumlah_kembali) VALUES
(1, 1, 45, 5), (1, 2, 28, 2), (1, 5, 23, 2), (1, 9, 95, 5), (1, 12, 18, 2);

-- Penagihan 2 (Warung Sari Melati - Transfer 420000)
INSERT INTO detail_penagihan (id_penagihan, id_produk, jumlah_terjual, jumlah_kembali) VALUES
(2, 1, 28, 2), (2, 3, 18, 2), (2, 7, 13, 2), (2, 10, 75, 5), (2, 14, 22, 3);

-- Penagihan 3 (Minimarket Bahagia - Cash 650000 dengan potongan)
INSERT INTO detail_penagihan (id_penagihan, id_produk, jumlah_terjual, jumlah_kembali) VALUES
(3, 2, 38, 2), (3, 4, 23, 2), (3, 6, 32, 3), (3, 11, 9, 1), (3, 13, 28, 2);

-- Penagihan 4 (Toko Sejahtera Mandiri - Transfer 890000)
INSERT INTO detail_penagihan (id_penagihan, id_produk, jumlah_terjual, jumlah_kembali) VALUES
(4, 1, 58, 2), (4, 5, 38, 2), (4, 8, 18, 2), (4, 12, 23, 2), (4, 16, 13, 2);

-- Penagihan 5 (Warung Bu Imas - Cash 520000)
INSERT INTO detail_penagihan (id_penagihan, id_produk, jumlah_terjual, jumlah_kembali) VALUES
(5, 3, 33, 2), (5, 7, 23, 2), (5, 9, 85, 5), (5, 15, 18, 2), (5, 17, 16, 2);

-- Lanjutkan dengan pola yang sama untuk penagihan lainnya
INSERT INTO detail_penagihan (id_penagihan, id_produk, jumlah_terjual, jumlah_kembali) VALUES
-- Penagihan 6-10
(6, 1, 43, 2), (6, 4, 28, 2), (6, 11, 11, 1), (6, 14, 20, 2),
(7, 2, 33, 2), (7, 6, 26, 2), (7, 13, 33, 2), (7, 18, 13, 2),
(8, 5, 48, 2), (8, 8, 16, 2), (8, 12, 28, 2), (8, 19, 8, 2),
(9, 1, 38, 2), (9, 9, 80, 5), (9, 15, 23, 2), (9, 16, 18, 2),
(10, 3, 30, 2), (10, 7, 20, 2), (10, 10, 70, 5), (10, 17, 14, 2),

-- Penagihan 11-15
(11, 2, 36, 2), (11, 5, 43, 2), (11, 11, 13, 2), (11, 14, 26, 2),
(12, 4, 40, 2), (12, 8, 18, 2), (12, 13, 38, 2), (12, 18, 10, 2),
(13, 1, 53, 2), (13, 6, 31, 2), (13, 12, 26, 2), (13, 19, 6, 2),
(14, 3, 46, 2), (14, 9, 90, 5), (14, 15, 28, 2), (14, 16, 23, 2),
(15, 2, 31, 2), (15, 7, 17, 2), (15, 10, 65, 5), (15, 17, 12, 2),

-- Penagihan 16-20
(16, 1, 40, 2), (16, 8, 21, 2), (16, 13, 36, 2), (16, 18, 9, 2),
(17, 4, 35, 2), (17, 11, 16, 2), (17, 14, 30, 2), (17, 19, 7, 2),
(18, 5, 49, 2), (18, 9, 83, 5), (18, 15, 25, 2), (18, 16, 20, 2),
(19, 2, 37, 2), (19, 6, 27, 2), (19, 12, 24, 2), (19, 17, 15, 2),
(20, 3, 42, 2), (20, 7, 19, 2), (20, 10, 77, 5), (20, 18, 11, 2),

-- Penagihan 21-25
(21, 1, 45, 2), (21, 8, 22, 2), (21, 13, 39, 2), (21, 19, 5, 2),
(22, 4, 34, 2), (22, 11, 14, 2), (22, 14, 27, 2), (22, 16, 22, 2),
(23, 5, 47, 2), (23, 9, 87, 5), (23, 15, 29, 2), (23, 17, 17, 2),
(24, 2, 39, 2), (24, 6, 29, 2), (24, 12, 22, 2), (24, 18, 13, 2),
(25, 3, 44, 2), (25, 7, 16, 2), (25, 10, 80, 5), (25, 19, 3, 2);

-- ==============================================
-- POTONGAN PENAGIHAN DATA (untuk transaksi dengan potongan)
-- ==============================================
INSERT INTO potongan_penagihan (id_penagihan, jumlah_potongan, alasan) VALUES
(3, 25000.00, 'Produk rusak - kemasan terbuka'),
(6, 15000.00, 'Diskon loyalitas customer'),
(11, 30000.00, 'Produk expired - diganti baru'),
(15, 20000.00, 'Kompensasi keterlambatan pengiriman'),
(19, 40000.00, 'Promo akhir bulan'),
(24, 18000.00, 'Barang cacat kemasan penyok');

-- ==============================================
-- SETORAN DATA (20 setoran dalam 3 bulan)
-- ==============================================
-- Generate setoran berdasarkan total cash yang diterima per hari
INSERT INTO setoran (total_setoran, penerima_setoran) VALUES
-- Januari 2024
(1450000.00, 'Ahmad Susanto'),   -- Gabungan cash 5 Jan
(850000.00, 'Budi Santoso'),     -- Gabungan cash 8 Jan  
(1200000.00, 'Citra Dewi'),      -- Gabungan cash 10 Jan
(920000.00, 'Ahmad Susanto'),    -- Gabungan cash 12 Jan
(1100000.00, 'Denny Prasetyo'),  -- Gabungan cash 15 Jan
(750000.00, 'Eka Sari'),         -- Gabungan cash 18 Jan
(1350000.00, 'Farid Rahman'),    -- Gabungan cash 20 Jan
(980000.00, 'Gita Indira'),      -- Gabungan cash 22 Jan
(1250000.00, 'Hadi Nugroho'),    -- Gabungan cash 25 Jan
(820000.00, 'Ahmad Susanto'),    -- Gabungan cash 28 Jan

-- Februari 2024
(1180000.00, 'Budi Santoso'),    -- Gabungan cash 2 Feb
(900000.00, 'Citra Dewi'),       -- Gabungan cash 5 Feb
(1420000.00, 'Denny Prasetyo'),  -- Gabungan cash 8 Feb
(1050000.00, 'Eka Sari'),        -- Gabungan cash 10 Feb
(780000.00, 'Farid Rahman'),     -- Gabungan cash 12 Feb
(1320000.00, 'Gita Indira'),     -- Gabungan cash 15 Feb
(950000.00, 'Hadi Nugroho'),     -- Gabungan cash 18 Feb

-- Maret 2024
(1480000.00, 'Ahmad Susanto'),   -- Gabungan cash 2 Mar
(1100000.00, 'Budi Santoso'),    -- Gabungan cash 5 Mar
(1650000.00, 'Citra Dewi');      -- Gabungan cash 8 Mar

-- ==============================================
-- UPDATE TIMESTAMPS (untuk simulasi data historis)
-- ==============================================

-- Update tanggal pembuatan penagihan agar sesuai dengan pengiriman
UPDATE penagihan SET dibuat_pada = '2024-01-06 10:30:00' WHERE id_penagihan = 1;
UPDATE penagihan SET dibuat_pada = '2024-01-06 14:15:00' WHERE id_penagihan = 2;
UPDATE penagihan SET dibuat_pada = '2024-01-07 11:45:00' WHERE id_penagihan = 3;
UPDATE penagihan SET dibuat_pada = '2024-01-09 09:20:00' WHERE id_penagihan = 4;
UPDATE penagihan SET dibuat_pada = '2024-01-11 16:00:00' WHERE id_penagihan = 5;
UPDATE penagihan SET dibuat_pada = '2024-01-13 13:30:00' WHERE id_penagihan = 6;
UPDATE penagihan SET dibuat_pada = '2024-01-16 10:45:00' WHERE id_penagihan = 7;
UPDATE penagihan SET dibuat_pada = '2024-01-19 15:20:00' WHERE id_penagihan = 8;

-- Update untuk Februari
UPDATE penagihan SET dibuat_pada = '2024-02-03 11:15:00' WHERE id_penagihan = 9;
UPDATE penagihan SET dibuat_pada = '2024-02-06 14:30:00' WHERE id_penagihan = 10;
UPDATE penagihan SET dibuat_pada = '2024-02-09 09:45:00' WHERE id_penagihan = 11;
UPDATE penagihan SET dibuat_pada = '2024-02-11 16:20:00' WHERE id_penagihan = 12;
UPDATE penagihan SET dibuat_pada = '2024-02-13 12:10:00' WHERE id_penagihan = 13;
UPDATE penagihan SET dibuat_pada = '2024-02-16 10:55:00' WHERE id_penagihan = 14;
UPDATE penagihan SET dibuat_pada = '2024-02-19 15:40:00' WHERE id_penagihan = 15;
UPDATE penagihan SET dibuat_pada = '2024-02-21 13:25:00' WHERE id_penagihan = 16;
UPDATE penagihan SET dibuat_pada = '2024-02-23 11:35:00' WHERE id_penagihan = 17;

-- Update untuk Maret
UPDATE penagihan SET dibuat_pada = '2024-03-03 10:20:00' WHERE id_penagihan = 18;
UPDATE penagihan SET dibuat_pada = '2024-03-06 14:45:00' WHERE id_penagihan = 19;
UPDATE penagihan SET dibuat_pada = '2024-03-09 12:30:00' WHERE id_penagihan = 20;
UPDATE penagihan SET dibuat_pada = '2024-03-11 16:15:00' WHERE id_penagihan = 21;
UPDATE penagihan SET dibuat_pada = '2024-03-13 09:50:00' WHERE id_penagihan = 22;
UPDATE penagihan SET dibuat_pada = '2024-03-16 15:25:00' WHERE id_penagihan = 23;
UPDATE penagihan SET dibuat_pada = '2024-03-19 11:40:00' WHERE id_penagihan = 24;
UPDATE penagihan SET dibuat_pada = '2024-03-21 13:55:00' WHERE id_penagihan = 25;

-- Update tanggal setoran
UPDATE setoran SET dibuat_pada = '2024-01-06 18:00:00' WHERE id_setoran = 1;
UPDATE setoran SET dibuat_pada = '2024-01-09 18:30:00' WHERE id_setoran = 2;
UPDATE setoran SET dibuat_pada = '2024-01-11 19:00:00' WHERE id_setoran = 3;
UPDATE setoran SET dibuat_pada = '2024-01-13 18:15:00' WHERE id_setoran = 4;
UPDATE setoran SET dibuat_pada = '2024-01-16 17:45:00' WHERE id_setoran = 5;
UPDATE setoran SET dibuat_pada = '2024-01-19 18:20:00' WHERE id_setoran = 6;
UPDATE setoran SET dibuat_pada = '2024-01-21 19:30:00' WHERE id_setoran = 7;
UPDATE setoran SET dibuat_pada = '2024-01-23 18:45:00' WHERE id_setoran = 8;
UPDATE setoran SET dibuat_pada = '2024-01-26 17:30:00' WHERE id_setoran = 9;
UPDATE setoran SET dibuat_pada = '2024-01-29 18:50:00' WHERE id_setoran = 10;

UPDATE setoran SET dibuat_pada = '2024-02-03 18:10:00' WHERE id_setoran = 11;
UPDATE setoran SET dibuat_pada = '2024-02-06 19:15:00' WHERE id_setoran = 12;
UPDATE setoran SET dibuat_pada = '2024-02-09 17:40:00' WHERE id_setoran = 13;
UPDATE setoran SET dibuat_pada = '2024-02-11 18:25:00' WHERE id_setoran = 14;
UPDATE setoran SET dibuat_pada = '2024-02-13 19:05:00' WHERE id_setoran = 15;
UPDATE setoran SET dibuat_pada = '2024-02-16 18:35:00' WHERE id_setoran = 16;
UPDATE setoran SET dibuat_pada = '2024-02-19 17:55:00' WHERE id_setoran = 17;

UPDATE setoran SET dibuat_pada = '2024-03-03 18:40:00' WHERE id_setoran = 18;
UPDATE setoran SET dibuat_pada = '2024-03-06 19:20:00' WHERE id_setoran = 19;
UPDATE setoran SET dibuat_pada = '2024-03-09 18:15:00' WHERE id_setoran = 20;

-- ==============================================
-- VERIFIKASI DATA
-- ==============================================

-- Tampilkan ringkasan data yang telah dimasukkan
SELECT 'Sales' as tabel, COUNT(*) as jumlah_record FROM sales
UNION ALL
SELECT 'Produk' as tabel, COUNT(*) as jumlah_record FROM produk
UNION ALL
SELECT 'Toko' as tabel, COUNT(*) as jumlah_record FROM toko
UNION ALL
SELECT 'Pengiriman' as tabel, COUNT(*) as jumlah_record FROM pengiriman
UNION ALL
SELECT 'Detail Pengiriman' as tabel, COUNT(*) as jumlah_record FROM detail_pengiriman
UNION ALL
SELECT 'Penagihan' as tabel, COUNT(*) as jumlah_record FROM penagihan
UNION ALL
SELECT 'Detail Penagihan' as tabel, COUNT(*) as jumlah_record FROM detail_penagihan
UNION ALL
SELECT 'Potongan Penagihan' as tabel, COUNT(*) as jumlah_record FROM potongan_penagihan
UNION ALL
SELECT 'Setoran' as tabel, COUNT(*) as jumlah_record FROM setoran;

-- ==============================================
-- QUERY TESTING UNTUK MEMVERIFIKASI RELASI
-- ==============================================

-- Test 1: Lihat pengiriman dengan detail
SELECT 
    p.id_pengiriman,
    p.tanggal_kirim,
    t.nama_toko,
    s.nama_sales,
    COUNT(dp.id_detail_kirim) as jumlah_item
FROM pengiriman p
JOIN toko t ON p.id_toko = t.id_toko
JOIN sales s ON t.id_sales = s.id_sales
LEFT JOIN detail_pengiriman dp ON p.id_pengiriman = dp.id_pengiriman
GROUP BY p.id_pengiriman, p.tanggal_kirim, t.nama_toko, s.nama_sales
ORDER BY p.tanggal_kirim DESC
LIMIT 5;

-- Test 2: Lihat penagihan dengan total nilai
SELECT 
    pn.id_penagihan,
    pn.dibuat_pada::DATE as tanggal,
    t.nama_toko,
    pn.total_uang_diterima,
    pn.metode_pembayaran,
    COUNT(dp.id_detail_tagih) as jumlah_item,
    CASE WHEN pn.ada_potongan THEN 'Ada' ELSE 'Tidak' END as potongan
FROM penagihan pn
JOIN toko t ON pn.id_toko = t.id_toko
LEFT JOIN detail_penagihan dp ON pn.id_penagihan = dp.id_penagihan
GROUP BY pn.id_penagihan, pn.dibuat_pada, t.nama_toko, pn.total_uang_diterima, pn.metode_pembayaran, pn.ada_potongan
ORDER BY pn.dibuat_pada DESC
LIMIT 5;

-- Test 3: Lihat setoran per bulan
SELECT 
    DATE_TRUNC('month', dibuat_pada) as bulan,
    COUNT(*) as jumlah_setoran,
    SUM(total_setoran) as total_nilai_setoran
FROM setoran
GROUP BY DATE_TRUNC('month', dibuat_pada)
ORDER BY bulan DESC;

-- ==============================================
-- CATATAN PENGGUNAAN
-- ==============================================
/*
File ini berisi data dummy yang representatif untuk sistem penjualan titip bayar:

1. 10 Sales (9 aktif, 1 nonaktif)
2. 20 Produk (19 aktif, 1 nonaktif) - 3 kategori
3. 15 Toko tersebar di 8 sales
4. 30 Pengiriman dalam 3 bulan
5. 150+ Detail pengiriman
6. 25 Penagihan (mix cash & transfer)
7. 125+ Detail penagihan
8. 6 Potongan penagihan
9. 20 Setoran

Data ini akan memberikan gambaran realistis untuk:
- Testing dashboard dan laporan
- Simulasi workflow lengkap
- Validasi perhitungan rekonsiliasi
- Demo kepada stakeholder

Untuk menjalankan:
1. Pastikan database-schema.sql sudah dijalankan
2. Copy dan paste seluruh content file ini ke SQL Editor Supabase
3. Execute untuk memasukkan semua data dummy
4. Gunakan query verifikasi di bagian akhir untuk memastikan data berhasil masuk
*/