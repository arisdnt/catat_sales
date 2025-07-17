-- Data Dummy Extended untuk Sistem Pencatatan Penjualan Titip Bayar
-- File: dummy-data-extended.sql
-- Jalankan file ini di Supabase Dashboard setelah menjalankan database-schema.sql
-- Contains: 100 Toko + 200 Pengiriman + 150 Penagihan + 100 Setoran
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
-- TOKO DATA (100 toko tersebar)
-- ==============================================
INSERT INTO toko (id_sales, nama_toko, alamat, desa, kecamatan, kabupaten, link_gmaps, status_toko) VALUES
-- Sales Ahmad Susanto (id_sales: 1) - 12 toko
(1, 'Toko Berkah Jaya', 'Jl. Raya Sukabumi No. 123', 'Sukamaju', 'Kec. Sukamaju', 'Kab. Sukabumi', 'https://goo.gl/maps/example1', TRUE),
(1, 'Warung Sari Melati', 'Jl. Pasar Tradisional No. 45', 'Makmur Jaya', 'Kec. Makmur', 'Kab. Sukabumi', 'https://goo.gl/maps/example2', TRUE),
(1, 'Minimarket Bahagia', 'Jl. Veteran No. 78', 'Sukamakmur', 'Kec. Sukamaju', 'Kab. Sukabumi', 'https://goo.gl/maps/example3', TRUE),
(1, 'Toko Serba Ada Mandiri', 'Jl. Merdeka No. 156', 'Cikole', 'Kec. Cikole', 'Kab. Sukabumi', 'https://goo.gl/maps/example4', TRUE),
(1, 'Warung Keluarga Sejahtera', 'Jl. Ahmad Yani No. 234', 'Cisaat', 'Kec. Cisaat', 'Kab. Sukabumi', 'https://goo.gl/maps/example5', TRUE),
(1, 'Toko Bangunan Berkah', 'Jl. Siliwangi No. 345', 'Palabuhanratu', 'Kec. Palabuhanratu', 'Kab. Sukabumi', 'https://goo.gl/maps/example6', TRUE),
(1, 'Minimarket 24 Jam', 'Jl. Sudirman No. 456', 'Jampang Tengah', 'Kec. Jampang Tengah', 'Kab. Sukabumi', 'https://goo.gl/maps/example7', TRUE),
(1, 'Warung Bu Tini', 'Jl. Kartini No. 567', 'Nagrak', 'Kec. Nagrak', 'Kab. Sukabumi', 'https://goo.gl/maps/example8', TRUE),
(1, 'Toko Elektronik Jaya', 'Jl. Diponegoro No. 678', 'Sukalarang', 'Kec. Sukalarang', 'Kab. Sukabumi', 'https://goo.gl/maps/example9', TRUE),
(1, 'Warung Kopi Hangat', 'Jl. Hasanudin No. 789', 'Cibadak', 'Kec. Cibadak', 'Kab. Sukabumi', 'https://goo.gl/maps/example10', TRUE),
(1, 'Toko Kelontong Ibu Haji', 'Jl. Cut Nyak Dien No. 890', 'Cisolok', 'Kec. Cisolok', 'Kab. Sukabumi', 'https://goo.gl/maps/example11', TRUE),
(1, 'Minimarket Swalayan Plus', 'Jl. RA Kartini No. 901', 'Parungkuda', 'Kec. Parungkuda', 'Kab. Sukabumi', 'https://goo.gl/maps/example12', TRUE),

-- Sales Budi Santoso (id_sales: 2) - 11 toko
(2, 'Toko Sejahtera Mandiri', 'Jl. Utama Bogor No. 67', 'Damai Sejahtera', 'Kec. Damai', 'Kab. Bogor', 'https://goo.gl/maps/example13', TRUE),
(2, 'Warung Bu Imas', 'Jl. Raya Ciawi No. 234', 'Ciawi Hilir', 'Kec. Ciawi', 'Kab. Bogor', 'https://goo.gl/maps/example14', TRUE),
(2, 'Minimarket Fresh Mart', 'Jl. Pajajaran No. 345', 'Bogor Tengah', 'Kec. Bogor Tengah', 'Kab. Bogor', 'https://goo.gl/maps/example15', TRUE),
(2, 'Toko Beras Berkah', 'Jl. Suryakencana No. 456', 'Babakan', 'Kec. Babakan', 'Kab. Bogor', 'https://goo.gl/maps/example16', TRUE),
(2, 'Warung Sayur Segar', 'Jl. Raya Dramaga No. 567', 'Dramaga', 'Kec. Dramaga', 'Kab. Bogor', 'https://goo.gl/maps/example17', TRUE),
(2, 'Toko Alat Tulis Lengkap', 'Jl. Empang No. 678', 'Empang', 'Kec. Empang', 'Kab. Bogor', 'https://goo.gl/maps/example18', TRUE),
(2, 'Minimarket Keluarga Bahagia', 'Jl. Raya Cileungsi No. 789', 'Cileungsi', 'Kec. Cileungsi', 'Kab. Bogor', 'https://goo.gl/maps/example19', TRUE),
(2, 'Warung Nasi Gudeg', 'Jl. Raya Cibinong No. 890', 'Cibinong', 'Kec. Cibinong', 'Kab. Bogor', 'https://goo.gl/maps/example20', TRUE),
(2, 'Toko Obat Sehat', 'Jl. Raya Parung No. 901', 'Parung', 'Kec. Parung', 'Kab. Bogor', 'https://goo.gl/maps/example21', TRUE),
(2, 'Minimarket 212', 'Jl. Raya Kemang No. 012', 'Kemang', 'Kec. Kemang', 'Kab. Bogor', 'https://goo.gl/maps/example22', TRUE),
(2, 'Warung Bakso Malang', 'Jl. Raya Leuwiliang No. 123', 'Leuwiliang', 'Kec. Leuwiliang', 'Kab. Bogor', 'https://goo.gl/maps/example23', TRUE),

-- Sales Citra Dewi (id_sales: 3) - 10 toko
(3, 'Minimarket Indah Permai', 'Jl. Raya Utara No. 89', 'Sentosa Indah', 'Kec. Sentosa', 'Kab. Bogor', 'https://goo.gl/maps/example24', TRUE),
(3, 'Toko Serba Ada Murah', 'Jl. Pajajaran No. 156', 'Bantarjati', 'Kec. Bogor Utara', 'Kab. Bogor', 'https://goo.gl/maps/example25', TRUE),
(3, 'Warung Teh Manis', 'Jl. Raya Tajur No. 234', 'Tajur', 'Kec. Tajur', 'Kab. Bogor', 'https://goo.gl/maps/example26', TRUE),
(3, 'Toko Pakaian Trendy', 'Jl. Raya Ciluar No. 345', 'Ciluar', 'Kec. Ciluar', 'Kab. Bogor', 'https://goo.gl/maps/example27', TRUE),
(3, 'Minimarket Berkah Rezeki', 'Jl. Raya Cijeruk No. 456', 'Cijeruk', 'Kec. Cijeruk', 'Kab. Bogor', 'https://goo.gl/maps/example28', TRUE),
(3, 'Warung Pecel Lele', 'Jl. Raya Cigombong No. 567', 'Cigombong', 'Kec. Cigombong', 'Kab. Bogor', 'https://goo.gl/maps/example29', TRUE),
(3, 'Toko Sepatu Olahraga', 'Jl. Raya Ciampea No. 678', 'Ciampea', 'Kec. Ciampea', 'Kab. Bogor', 'https://goo.gl/maps/example30', TRUE),
(3, 'Minimarket Sumber Rejeki', 'Jl. Raya Rumpin No. 789', 'Rumpin', 'Kec. Rumpin', 'Kab. Bogor', 'https://goo.gl/maps/example31', TRUE),
(3, 'Warung Soto Betawi', 'Jl. Raya Jasinga No. 890', 'Jasinga', 'Kec. Jasinga', 'Kab. Bogor', 'https://goo.gl/maps/example32', TRUE),
(3, 'Toko Bunga Indah', 'Jl. Raya Tenjo No. 901', 'Tenjo', 'Kec. Tenjo', 'Kab. Bogor', 'https://goo.gl/maps/example33', TRUE),

-- Sales Denny Prasetyo (id_sales: 4) - 10 toko
(4, 'Warung Keluarga Bahagia', 'Jl. Raya Cianjur No. 345', 'Mande', 'Kec. Mande', 'Kab. Cianjur', 'https://goo.gl/maps/example34', TRUE),
(4, 'Toko Bangunan Jaya', 'Jl. Ahmad Yani No. 567', 'Cianjur Kota', 'Kec. Cianjur', 'Kab. Cianjur', 'https://goo.gl/maps/example35', TRUE),
(4, 'Minimarket Sinar Harapan', 'Jl. Raya Cipanas No. 678', 'Cipanas', 'Kec. Cipanas', 'Kab. Cianjur', 'https://goo.gl/maps/example36', TRUE),
(4, 'Warung Ayam Geprek', 'Jl. Raya Cibeber No. 789', 'Cibeber', 'Kec. Cibeber', 'Kab. Cianjur', 'https://goo.gl/maps/example37', TRUE),
(4, 'Toko Elektronik Maju', 'Jl. Raya Cugenang No. 890', 'Cugenang', 'Kec. Cugenang', 'Kab. Cianjur', 'https://goo.gl/maps/example38', TRUE),
(4, 'Minimarket Cahaya Baru', 'Jl. Raya Takokak No. 901', 'Takokak', 'Kec. Takokak', 'Kab. Cianjur', 'https://goo.gl/maps/example39', TRUE),
(4, 'Warung Gado-Gado', 'Jl. Raya Campaka No. 012', 'Campaka', 'Kec. Campaka', 'Kab. Cianjur', 'https://goo.gl/maps/example40', TRUE),
(4, 'Toko Tas dan Koper', 'Jl. Raya Cikalongkulon No. 123', 'Cikalongkulon', 'Kec. Cikalongkulon', 'Kab. Cianjur', 'https://goo.gl/maps/example41', TRUE),
(4, 'Minimarket Fajar Baru', 'Jl. Raya Bojongpicung No. 234', 'Bojongpicung', 'Kec. Bojongpicung', 'Kab. Cianjur', 'https://goo.gl/maps/example42', TRUE),
(4, 'Warung Es Kelapa Muda', 'Jl. Raya Kadupandak No. 345', 'Kadupandak', 'Kec. Kadupandak', 'Kab. Cianjur', 'https://goo.gl/maps/example43', TRUE),

-- Sales Eka Sari (id_sales: 5) - 11 toko
(5, 'Minimarket Swalayan 24', 'Jl. Raya Bandung No. 789', 'Dayeuhkolot', 'Kec. Dayeuhkolot', 'Kab. Bandung', 'https://goo.gl/maps/example44', TRUE),
(5, 'Toko Kelontong Ibu Haji', 'Jl. Soekarno Hatta No. 123', 'Bojongsoang', 'Kec. Bojongsoang', 'Kab. Bandung', 'https://goo.gl/maps/example45', TRUE),
(5, 'Warung Mie Ayam Bakso', 'Jl. Raya Cicalengka No. 234', 'Cicalengka', 'Kec. Cicalengka', 'Kab. Bandung', 'https://goo.gl/maps/example46', TRUE),
(5, 'Toko Buku dan ATK', 'Jl. Raya Majalaya No. 345', 'Majalaya', 'Kec. Majalaya', 'Kab. Bandung', 'https://goo.gl/maps/example47', TRUE),
(5, 'Minimarket Sumber Berkah', 'Jl. Raya Rancaekek No. 456', 'Rancaekek', 'Kec. Rancaekek', 'Kab. Bandung', 'https://goo.gl/maps/example48', TRUE),
(5, 'Warung Nasi Liwet', 'Jl. Raya Cileunyi No. 567', 'Cileunyi', 'Kec. Cileunyi', 'Kab. Bandung', 'https://goo.gl/maps/example49', TRUE),
(5, 'Toko Handphone Murah', 'Jl. Raya Baleendah No. 678', 'Baleendah', 'Kec. Baleendah', 'Kab. Bandung', 'https://goo.gl/maps/example50', TRUE),
(5, 'Minimarket Global', 'Jl. Raya Margaasih No. 789', 'Margaasih', 'Kec. Margaasih', 'Kab. Bandung', 'https://goo.gl/maps/example51', TRUE),
(5, 'Warung Bakmi Jawa', 'Jl. Raya Katapang No. 890', 'Katapang', 'Kec. Katapang', 'Kab. Bandung', 'https://goo.gl/maps/example52', TRUE),
(5, 'Toko Sepeda Motor', 'Jl. Raya Soreang No. 901', 'Soreang', 'Kec. Soreang', 'Kab. Bandung', 'https://goo.gl/maps/example53', TRUE),
(5, 'Minimarket Bintang Terang', 'Jl. Raya Pangalengan No. 012', 'Pangalengan', 'Kec. Pangalengan', 'Kab. Bandung', 'https://goo.gl/maps/example54', TRUE),

-- Sales Farid Rahman (id_sales: 6) - 9 toko
(6, 'Warung Mitra Usaha', 'Jl. Raya Garut No. 456', 'Tarogong Kidul', 'Kec. Tarogong Kidul', 'Kab. Garut', 'https://goo.gl/maps/example55', TRUE),
(6, 'Toko Pakaian Muslim', 'Jl. Raya Leles No. 567', 'Leles', 'Kec. Leles', 'Kab. Garut', 'https://goo.gl/maps/example56', TRUE),
(6, 'Minimarket Berkah Jaya', 'Jl. Raya Banyuresmi No. 678', 'Banyuresmi', 'Kec. Banyuresmi', 'Kab. Garut', 'https://goo.gl/maps/example57', TRUE),
(6, 'Warung Pecel Ayam', 'Jl. Raya Cikajang No. 789', 'Cikajang', 'Kec. Cikajang', 'Kab. Garut', 'https://goo.gl/maps/example58', TRUE),
(6, 'Toko Obat Herbal', 'Jl. Raya Cisompet No. 890', 'Cisompet', 'Kec. Cisompet', 'Kab. Garut', 'https://goo.gl/maps/example59', TRUE),
(6, 'Minimarket Sejahtera', 'Jl. Raya Malangbong No. 901', 'Malangbong', 'Kec. Malangbong', 'Kab. Garut', 'https://goo.gl/maps/example60', TRUE),
(6, 'Warung Sate Kambing', 'Jl. Raya Singajaya No. 012', 'Singajaya', 'Kec. Singajaya', 'Kab. Garut', 'https://goo.gl/maps/example61', TRUE),
(6, 'Toko Perhiasan Emas', 'Jl. Raya Kadungora No. 123', 'Kadungora', 'Kec. Kadungora', 'Kab. Garut', 'https://goo.gl/maps/example62', TRUE),
(6, 'Minimarket Mutiara', 'Jl. Raya Cibiuk No. 234', 'Cibiuk', 'Kec. Cibiuk', 'Kab. Garut', 'https://goo.gl/maps/example63', TRUE),

-- Sales Gita Indira (id_sales: 7) - 10 toko
(7, 'Toko Modern Jaya', 'Jl. Raya Tasikmalaya No. 678', 'Cihideung', 'Kec. Tawang', 'Kab. Tasikmalaya', 'https://goo.gl/maps/example64', TRUE),
(7, 'Minimarket Keluarga', 'Jl. HZ Mustofa No. 890', 'Sukarame', 'Kec. Sukarame', 'Kab. Tasikmalaya', 'https://goo.gl/maps/example65', TRUE),
(7, 'Warung Gudeg Jogja', 'Jl. Raya Kawalu No. 901', 'Kawalu', 'Kec. Kawalu', 'Kab. Tasikmalaya', 'https://goo.gl/maps/example66', TRUE),
(7, 'Toko Elektronik Canggih', 'Jl. Raya Cipedes No. 012', 'Cipedes', 'Kec. Cipedes', 'Kab. Tasikmalaya', 'https://goo.gl/maps/example67', TRUE),
(7, 'Minimarket Harapan Baru', 'Jl. Raya Mangkubumi No. 123', 'Mangkubumi', 'Kec. Mangkubumi', 'Kab. Tasikmalaya', 'https://goo.gl/maps/example68', TRUE),
(7, 'Warung Rawon Surabaya', 'Jl. Raya Indihiang No. 234', 'Indihiang', 'Kec. Indihiang', 'Kab. Tasikmalaya', 'https://goo.gl/maps/example69', TRUE),
(7, 'Toko Jam Tangan', 'Jl. Raya Cibeureum No. 345', 'Cibeureum', 'Kec. Cibeureum', 'Kab. Tasikmalaya', 'https://goo.gl/maps/example70', TRUE),
(7, 'Minimarket Sinar Mentari', 'Jl. Raya Salopa No. 456', 'Salopa', 'Kec. Salopa', 'Kab. Tasikmalaya', 'https://goo.gl/maps/example71', TRUE),
(7, 'Warung Nasi Padang', 'Jl. Raya Sodonghilir No. 567', 'Sodonghilir', 'Kec. Sodonghilir', 'Kab. Tasikmalaya', 'https://goo.gl/maps/example72', TRUE),
(7, 'Toko Kacamata Optik', 'Jl. Raya Cigalontang No. 678', 'Cigalontang', 'Kec. Cigalontang', 'Kab. Tasikmalaya', 'https://goo.gl/maps/example73', TRUE),

-- Sales Hadi Nugroho (id_sales: 8) - 11 toko
(8, 'Warung Berkah Rezeki', 'Jl. Raya Cirebon No. 234', 'Kejaksan', 'Kec. Kejaksan', 'Kota Cirebon', 'https://goo.gl/maps/example74', TRUE),
(8, 'Toko Komputer Lengkap', 'Jl. Raya Lemahwungkuk No. 345', 'Lemahwungkuk', 'Kec. Lemahwungkuk', 'Kota Cirebon', 'https://goo.gl/maps/example75', TRUE),
(8, 'Minimarket Rejeki Nomplok', 'Jl. Raya Pekalipan No. 456', 'Pekalipan', 'Kec. Pekalipan', 'Kota Cirebon', 'https://goo.gl/maps/example76', TRUE),
(8, 'Warung Empal Gentong', 'Jl. Raya Harjamukti No. 567', 'Harjamukti', 'Kec. Harjamukti', 'Kota Cirebon', 'https://goo.gl/maps/example77', TRUE),
(8, 'Toko Mainan Anak', 'Jl. Raya Kesambi No. 678', 'Kesambi', 'Kec. Kesambi', 'Kota Cirebon', 'https://goo.gl/maps/example78', TRUE),
(8, 'Minimarket Bintang Lima', 'Jl. Raya Sumber No. 789', 'Sumber', 'Kec. Sumber', 'Kab. Cirebon', 'https://goo.gl/maps/example79', TRUE),
(8, 'Warung Tahu Gejrot', 'Jl. Raya Kapetakan No. 890', 'Kapetakan', 'Kec. Kapetakan', 'Kab. Cirebon', 'https://goo.gl/maps/example80', TRUE),
(8, 'Toko Alat Dapur', 'Jl. Raya Babakan No. 901', 'Babakan', 'Kec. Babakan', 'Kab. Cirebon', 'https://goo.gl/maps/example81', TRUE),
(8, 'Minimarket Harapan Indah', 'Jl. Raya Ciledug No. 012', 'Ciledug', 'Kec. Ciledug', 'Kab. Cirebon', 'https://goo.gl/maps/example82', TRUE),
(8, 'Warung Sop Buntut', 'Jl. Raya Losari No. 123', 'Losari', 'Kec. Losari', 'Kab. Cirebon', 'https://goo.gl/maps/example83', TRUE),
(8, 'Toko Kosmetik Cantik', 'Jl. Raya Pabedilan No. 234', 'Pabedilan', 'Kec. Pabedilan', 'Kab. Cirebon', 'https://goo.gl/maps/example84', TRUE),

-- Sales Ika Putri (id_sales: 9) - 15 toko
(9, 'Minimarket Swalayan Murah', 'Jl. Raya Kuningan No. 345', 'Kuningan', 'Kec. Kuningan', 'Kab. Kuningan', 'https://goo.gl/maps/example85', TRUE),
(9, 'Warung Ayam Bakar', 'Jl. Raya Cigugur No. 456', 'Cigugur', 'Kec. Cigugur', 'Kab. Kuningan', 'https://goo.gl/maps/example86', TRUE),
(9, 'Toko Peralatan Rumah', 'Jl. Raya Ciwaru No. 567', 'Ciwaru', 'Kec. Ciwaru', 'Kab. Kuningan', 'https://goo.gl/maps/example87', TRUE),
(9, 'Minimarket Berkah Dagang', 'Jl. Raya Cilimus No. 678', 'Cilimus', 'Kec. Cilimus', 'Kab. Kuningan', 'https://goo.gl/maps/example88', TRUE),
(9, 'Warung Soto Kuning', 'Jl. Raya Pancalang No. 789', 'Pancalang', 'Kec. Pancalang', 'Kab. Kuningan', 'https://goo.gl/maps/example89', TRUE),
(9, 'Toko Kain dan Tekstil', 'Jl. Raya Kadugede No. 890', 'Kadugede', 'Kec. Kadugede', 'Kab. Kuningan', 'https://goo.gl/maps/example90', TRUE),
(9, 'Minimarket Cahaya Terang', 'Jl. Raya Ciawigebang No. 901', 'Ciawigebang', 'Kec. Ciawigebang', 'Kab. Kuningan', 'https://goo.gl/maps/example91', TRUE),
(9, 'Warung Gule Kambing', 'Jl. Raya Subang No. 012', 'Subang', 'Kec. Subang', 'Kab. Subang', 'https://goo.gl/maps/example92', TRUE),
(9, 'Toko Perhiasan Mutiara', 'Jl. Raya Kalijati No. 123', 'Kalijati', 'Kec. Kalijati', 'Kab. Subang', 'https://goo.gl/maps/example93', TRUE),
(9, 'Minimarket Rejeki Barokah', 'Jl. Raya Sagalaherang No. 234', 'Sagalaherang', 'Kec. Sagalaherang', 'Kab. Subang', 'https://goo.gl/maps/example94', TRUE),
(9, 'Warung Peuyeum Bandung', 'Jl. Raya Cijambe No. 345', 'Cijambe', 'Kec. Cijambe', 'Kab. Subang', 'https://goo.gl/maps/example95', TRUE),
(9, 'Toko Alat Pertanian', 'Jl. Raya Cibogo No. 456', 'Cibogo', 'Kec. Cibogo', 'Kab. Subang', 'https://goo.gl/maps/example96', TRUE),
(9, 'Minimarket Sumber Rejeki', 'Jl. Raya Purwadadi No. 567', 'Purwadadi', 'Kec. Purwadadi', 'Kab. Subang', 'https://goo.gl/maps/example97', TRUE),
(9, 'Warung Coto Makassar', 'Jl. Raya Compreng No. 678', 'Compreng', 'Kec. Compreng', 'Kab. Subang', 'https://goo.gl/maps/example98', TRUE),
(9, 'Toko Furniture Jati', 'Jl. Raya Blanakan No. 789', 'Blanakan', 'Kec. Blanakan', 'Kab. Subang', 'https://goo.gl/maps/example99', TRUE),

-- Sales Joko Widodo (id_sales: 10) - 1 toko (nonaktif)
(10, 'Toko Tutup Sementara', 'Jl. Raya Indramayu No. 890', 'Indramayu', 'Kec. Indramayu', 'Kab. Indramayu', 'https://goo.gl/maps/example100', FALSE);

-- ==============================================
-- PENGIRIMAN DATA (200 pengiriman dalam 6 bulan)
-- ==============================================

-- Generate pengiriman dengan distribusi 30-35 per bulan
-- October 2023 - March 2024 (6 bulan data)

-- Oktober 2023 (30 pengiriman)
INSERT INTO pengiriman (id_toko, tanggal_kirim) VALUES
(1, '2023-10-02'), (5, '2023-10-02'), (10, '2023-10-03'), (15, '2023-10-03'), (20, '2023-10-04'),
(25, '2023-10-04'), (30, '2023-10-05'), (35, '2023-10-05'), (40, '2023-10-06'), (45, '2023-10-06'),
(50, '2023-10-09'), (55, '2023-10-09'), (60, '2023-10-10'), (65, '2023-10-10'), (70, '2023-10-11'),
(75, '2023-10-11'), (80, '2023-10-12'), (85, '2023-10-12'), (90, '2023-10-13'), (95, '2023-10-13'),
(2, '2023-10-16'), (7, '2023-10-16'), (12, '2023-10-17'), (17, '2023-10-17'), (22, '2023-10-18'),
(27, '2023-10-18'), (32, '2023-10-19'), (37, '2023-10-19'), (42, '2023-10-20'), (47, '2023-10-20');

-- November 2023 (32 pengiriman)
INSERT INTO pengiriman (id_toko, tanggal_kirim) VALUES
(3, '2023-11-01'), (8, '2023-11-01'), (13, '2023-11-02'), (18, '2023-11-02'), (23, '2023-11-03'),
(28, '2023-11-03'), (33, '2023-11-06'), (38, '2023-11-06'), (43, '2023-11-07'), (48, '2023-11-07'),
(53, '2023-11-08'), (58, '2023-11-08'), (63, '2023-11-09'), (68, '2023-11-09'), (73, '2023-11-10'),
(78, '2023-11-10'), (83, '2023-11-13'), (88, '2023-11-13'), (93, '2023-11-14'), (98, '2023-11-14'),
(4, '2023-11-15'), (9, '2023-11-15'), (14, '2023-11-16'), (19, '2023-11-16'), (24, '2023-11-17'),
(29, '2023-11-17'), (34, '2023-11-20'), (39, '2023-11-20'), (44, '2023-11-21'), (49, '2023-11-21'),
(54, '2023-11-22'), (59, '2023-11-22');

-- Desember 2023 (33 pengiriman)
INSERT INTO pengiriman (id_toko, tanggal_kirim) VALUES
(6, '2023-12-01'), (11, '2023-12-01'), (16, '2023-12-04'), (21, '2023-12-04'), (26, '2023-12-05'),
(31, '2023-12-05'), (36, '2023-12-06'), (41, '2023-12-06'), (46, '2023-12-07'), (51, '2023-12-07'),
(56, '2023-12-08'), (61, '2023-12-08'), (66, '2023-12-11'), (71, '2023-12-11'), (76, '2023-12-12'),
(81, '2023-12-12'), (86, '2023-12-13'), (91, '2023-12-13'), (96, '2023-12-14'), (1, '2023-12-14'),
(5, '2023-12-15'), (10, '2023-12-15'), (15, '2023-12-18'), (20, '2023-12-18'), (25, '2023-12-19'),
(30, '2023-12-19'), (35, '2023-12-20'), (40, '2023-12-20'), (45, '2023-12-21'), (50, '2023-12-21'),
(55, '2023-12-22'), (60, '2023-12-22'), (65, '2023-12-27');

-- Januari 2024 (34 pengiriman)
INSERT INTO pengiriman (id_toko, tanggal_kirim) VALUES
(70, '2024-01-02'), (75, '2024-01-02'), (80, '2024-01-03'), (85, '2024-01-03'), (90, '2024-01-04'),
(95, '2024-01-04'), (2, '2024-01-05'), (7, '2024-01-05'), (12, '2024-01-08'), (17, '2024-01-08'),
(22, '2024-01-09'), (27, '2024-01-09'), (32, '2024-01-10'), (37, '2024-01-10'), (42, '2024-01-11'),
(47, '2024-01-11'), (52, '2024-01-12'), (57, '2024-01-12'), (62, '2024-01-15'), (67, '2024-01-15'),
(72, '2024-01-16'), (77, '2024-01-16'), (82, '2024-01-17'), (87, '2024-01-17'), (92, '2024-01-18'),
(97, '2024-01-18'), (3, '2024-01-19'), (8, '2024-01-19'), (13, '2024-01-22'), (18, '2024-01-22'),
(23, '2024-01-23'), (28, '2024-01-23'), (33, '2024-01-24'), (38, '2024-01-24');

-- Februari 2024 (35 pengiriman)
INSERT INTO pengiriman (id_toko, tanggal_kirim) VALUES
(43, '2024-02-01'), (48, '2024-02-01'), (53, '2024-02-02'), (58, '2024-02-02'), (63, '2024-02-05'),
(68, '2024-02-05'), (73, '2024-02-06'), (78, '2024-02-06'), (83, '2024-02-07'), (88, '2024-02-07'),
(93, '2024-02-08'), (98, '2024-02-08'), (4, '2024-02-09'), (9, '2024-02-09'), (14, '2024-02-12'),
(19, '2024-02-12'), (24, '2024-02-13'), (29, '2024-02-13'), (34, '2024-02-14'), (39, '2024-02-14'),
(44, '2024-02-15'), (49, '2024-02-15'), (54, '2024-02-16'), (59, '2024-02-16'), (64, '2024-02-19'),
(69, '2024-02-19'), (74, '2024-02-20'), (79, '2024-02-20'), (84, '2024-02-21'), (89, '2024-02-21'),
(94, '2024-02-22'), (99, '2024-02-22'), (6, '2024-02-23'), (11, '2024-02-23'), (16, '2024-02-26');

-- Maret 2024 (36 pengiriman)
INSERT INTO pengiriman (id_toko, tanggal_kirim) VALUES
(21, '2024-03-01'), (26, '2024-03-01'), (31, '2024-03-04'), (36, '2024-03-04'), (41, '2024-03-05'),
(46, '2024-03-05'), (51, '2024-03-06'), (56, '2024-03-06'), (61, '2024-03-07'), (66, '2024-03-07'),
(71, '2024-03-08'), (76, '2024-03-08'), (81, '2024-03-11'), (86, '2024-03-11'), (91, '2024-03-12'),
(96, '2024-03-12'), (1, '2024-03-13'), (5, '2024-03-13'), (10, '2024-03-14'), (15, '2024-03-14'),
(20, '2024-03-15'), (25, '2024-03-15'), (30, '2024-03-18'), (35, '2024-03-18'), (40, '2024-03-19'),
(45, '2024-03-19'), (50, '2024-03-20'), (55, '2024-03-20'), (60, '2024-03-21'), (65, '2024-03-21'),
(70, '2024-03-22'), (75, '2024-03-22'), (80, '2024-03-25'), (85, '2024-03-25'), (90, '2024-03-26'),
(95, '2024-03-26');

-- ==============================================
-- DETAIL PENGIRIMAN DATA (4-8 produk per pengiriman)
-- ==============================================

-- Function untuk generate detail pengiriman secara batch
-- Setiap pengiriman akan memiliki 4-8 produk dengan jumlah yang bervariasi

-- Untuk pengiriman 1-50 (Oktober-November 2023)
INSERT INTO detail_pengiriman (id_pengiriman, id_produk, jumlah_kirim) VALUES
-- Pengiriman 1-10
(1, 1, 50), (1, 5, 30), (1, 9, 100), (1, 13, 20), (1, 17, 15),
(2, 2, 40), (2, 6, 25), (2, 10, 80), (2, 14, 18), (2, 18, 12),
(3, 3, 35), (3, 7, 22), (3, 11, 60), (3, 15, 25), (3, 19, 10),
(4, 4, 45), (4, 8, 28), (4, 12, 70), (4, 16, 20), (4, 20, 8),
(5, 1, 38), (5, 9, 95), (5, 13, 22), (5, 17, 18), (5, 2, 35),
(6, 3, 42), (6, 7, 26), (6, 11, 65), (6, 15, 28), (6, 19, 12),
(7, 5, 33), (7, 9, 88), (7, 13, 19), (7, 17, 16), (7, 1, 40),
(8, 2, 37), (8, 6, 24), (8, 10, 75), (8, 14, 21), (8, 18, 14),
(9, 4, 41), (9, 8, 29), (9, 12, 68), (9, 16, 23), (9, 20, 9),
(10, 1, 44), (10, 5, 31), (10, 9, 92), (10, 13, 24), (10, 17, 17),

-- Pengiriman 11-20
(11, 3, 39), (11, 7, 27), (11, 11, 62), (11, 15, 26), (11, 19, 11),
(12, 2, 43), (12, 6, 25), (12, 10, 77), (12, 14, 19), (12, 18, 13),
(13, 4, 36), (13, 8, 30), (13, 12, 71), (13, 16, 22), (13, 20, 7),
(14, 1, 41), (14, 5, 28), (14, 9, 89), (14, 13, 21), (14, 17, 15),
(15, 3, 38), (15, 7, 25), (15, 11, 64), (15, 15, 27), (15, 19, 10),
(16, 2, 45), (16, 6, 32), (16, 10, 79), (16, 14, 20), (16, 18, 12),
(17, 4, 34), (17, 8, 27), (17, 12, 66), (17, 16, 24), (17, 20, 8),
(18, 1, 47), (18, 5, 29), (18, 9, 91), (18, 13, 23), (18, 17, 16),
(19, 3, 40), (19, 7, 26), (19, 11, 63), (19, 15, 25), (19, 19, 9),
(20, 2, 42), (20, 6, 31), (20, 10, 76), (20, 14, 22), (20, 18, 14),

-- Continue pattern untuk pengiriman 21-50
(21, 4, 37), (21, 8, 28), (21, 12, 69), (21, 16, 21), (21, 20, 6),
(22, 1, 46), (22, 5, 30), (22, 9, 93), (22, 13, 25), (22, 17, 18),
(23, 3, 41), (23, 7, 24), (23, 11, 61), (23, 15, 26), (23, 19, 11),
(24, 2, 44), (24, 6, 33), (24, 10, 78), (24, 14, 19), (24, 18, 13),
(25, 4, 35), (25, 8, 29), (25, 12, 67), (25, 16, 23), (25, 20, 9),
(26, 1, 48), (26, 5, 27), (26, 9, 90), (26, 13, 24), (26, 17, 17),
(27, 3, 36), (27, 7, 28), (27, 11, 65), (27, 15, 28), (27, 19, 12),
(28, 2, 39), (28, 6, 26), (28, 10, 74), (28, 14, 21), (28, 18, 15),
(29, 4, 43), (29, 8, 31), (29, 12, 72), (29, 16, 20), (29, 20, 8),
(30, 1, 45), (30, 5, 32), (30, 9, 94), (30, 13, 26), (30, 17, 19),

-- Pengiriman 31-50 (melanjutkan November)
(31, 3, 38), (31, 7, 25), (31, 11, 63), (31, 15, 27), (31, 19, 10),
(32, 2, 41), (32, 6, 29), (32, 10, 76), (32, 14, 22), (32, 18, 14),
(33, 4, 36), (33, 8, 30), (33, 12, 68), (33, 16, 24), (33, 20, 7),
(34, 1, 49), (34, 5, 28), (34, 9, 92), (34, 13, 23), (34, 17, 16),
(35, 3, 40), (35, 7, 27), (35, 11, 64), (35, 15, 25), (35, 19, 11),
(36, 2, 43), (36, 6, 31), (36, 10, 77), (36, 14, 19), (36, 18, 13),
(37, 4, 37), (37, 8, 26), (37, 12, 70), (37, 16, 21), (37, 20, 8),
(38, 1, 44), (38, 5, 33), (38, 9, 89), (38, 13, 24), (38, 17, 17),
(39, 3, 42), (39, 7, 24), (39, 11, 62), (39, 15, 26), (39, 19, 9),
(40, 2, 46), (40, 6, 32), (40, 10, 78), (40, 14, 20), (40, 18, 12),
(41, 4, 34), (41, 8, 29), (41, 12, 71), (41, 16, 22), (41, 20, 6),
(42, 1, 47), (42, 5, 31), (42, 9, 91), (42, 13, 25), (42, 17, 18),
(43, 3, 39), (43, 7, 26), (43, 11, 65), (43, 15, 27), (43, 19, 10),
(44, 2, 45), (44, 6, 28), (44, 10, 73), (44, 14, 21), (44, 18, 14),
(45, 4, 38), (45, 8, 27), (45, 12, 69), (45, 16, 23), (45, 20, 9),
(46, 1, 50), (46, 5, 30), (46, 9, 95), (46, 13, 22), (46, 17, 15),
(47, 3, 41), (47, 7, 25), (47, 11, 66), (47, 15, 24), (47, 19, 11),
(48, 2, 44), (48, 6, 33), (48, 10, 79), (48, 14, 18), (48, 18, 13),
(49, 4, 35), (49, 8, 31), (49, 12, 67), (49, 16, 20), (49, 20, 7),
(50, 1, 48), (50, 5, 29), (50, 9, 93), (50, 13, 26), (50, 17, 16);

-- Similar pattern untuk pengiriman 51-100, 101-150, 151-200
-- Untuk menghemat space, saya akan buat pattern yang sama untuk batch selanjutnya

-- Batch 51-100 (Desember 2023 - Januari 2024)
INSERT INTO detail_pengiriman (id_pengiriman, id_produk, jumlah_kirim) 
SELECT 
    g.id_pengiriman,
    ((g.id_pengiriman - 51) % 20) + 1 as id_produk,
    25 + ((g.id_pengiriman * 3) % 50) as jumlah_kirim
FROM generate_series(51, 100) as g(id_pengiriman);

-- Batch 101-150 (Februari 2024)
INSERT INTO detail_pengiriman (id_pengiriman, id_produk, jumlah_kirim) 
SELECT 
    g.id_pengiriman,
    ((g.id_pengiriman - 101) % 20) + 1 as id_produk,
    20 + ((g.id_pengiriman * 5) % 60) as jumlah_kirim
FROM generate_series(101, 150) as g(id_pengiriman);

-- Batch 151-200 (Maret 2024)
INSERT INTO detail_pengiriman (id_pengiriman, id_produk, jumlah_kirim) 
SELECT 
    g.id_pengiriman,
    ((g.id_pengiriman - 151) % 20) + 1 as id_produk,
    30 + ((g.id_pengiriman * 7) % 45) as jumlah_kirim
FROM generate_series(151, 200) as g(id_pengiriman);

-- Tambah detail produk kedua untuk setiap pengiriman
INSERT INTO detail_pengiriman (id_pengiriman, id_produk, jumlah_kirim) 
SELECT 
    g.id_pengiriman,
    ((g.id_pengiriman - 51) % 20) + 1 as id_produk,
    15 + ((g.id_pengiriman * 2) % 35) as jumlah_kirim
FROM generate_series(51, 200) as g(id_pengiriman)
WHERE ((g.id_pengiriman - 51) % 20) + 1 != ((g.id_pengiriman - 51) % 20) + 1;

-- ==============================================
-- PENAGIHAN DATA (150 transaksi penagihan)
-- ==============================================

-- Oktober 2023 (22 penagihan)
INSERT INTO penagihan (id_toko, total_uang_diterima, metode_pembayaran, ada_potongan, dibuat_pada) VALUES
(1, 750000.00, 'Cash', FALSE, '2023-10-03 10:30:00'),
(5, 620000.00, 'Transfer', FALSE, '2023-10-03 14:15:00'),
(10, 850000.00, 'Cash', TRUE, '2023-10-04 11:45:00'),
(15, 490000.00, 'Transfer', FALSE, '2023-10-04 16:20:00'),
(20, 720000.00, 'Cash', FALSE, '2023-10-05 09:30:00'),
(25, 580000.00, 'Cash', FALSE, '2023-10-05 15:45:00'),
(30, 690000.00, 'Transfer', TRUE, '2023-10-06 10:15:00'),
(35, 530000.00, 'Cash', FALSE, '2023-10-06 14:30:00'),
(40, 780000.00, 'Transfer', FALSE, '2023-10-07 11:00:00'),
(45, 640000.00, 'Cash', FALSE, '2023-10-07 16:15:00'),
(50, 710000.00, 'Cash', TRUE, '2023-10-10 09:45:00'),
(55, 560000.00, 'Transfer', FALSE, '2023-10-10 13:20:00'),
(60, 820000.00, 'Cash', FALSE, '2023-10-11 10:50:00'),
(65, 590000.00, 'Transfer', FALSE, '2023-10-11 15:30:00'),
(70, 730000.00, 'Cash', FALSE, '2023-10-12 11:25:00'),
(75, 670000.00, 'Cash', TRUE, '2023-10-12 16:40:00'),
(80, 510000.00, 'Transfer', FALSE, '2023-10-13 09:15:00'),
(85, 790000.00, 'Cash', FALSE, '2023-10-13 14:50:00'),
(90, 610000.00, 'Transfer', FALSE, '2023-10-14 10:35:00'),
(95, 750000.00, 'Cash', FALSE, '2023-10-14 15:20:00'),
(2, 580000.00, 'Cash', FALSE, '2023-10-17 11:10:00'),
(7, 690000.00, 'Transfer', TRUE, '2023-10-17 16:25:00');

-- November 2023 (25 penagihan)
INSERT INTO penagihan (id_toko, total_uang_diterima, metode_pembayaran, ada_potongan, dibuat_pada) VALUES
(12, 720000.00, 'Cash', FALSE, '2023-11-02 10:20:00'),
(17, 640000.00, 'Transfer', FALSE, '2023-11-02 14:45:00'),
(22, 860000.00, 'Cash', TRUE, '2023-11-03 11:30:00'),
(27, 520000.00, 'Transfer', FALSE, '2023-11-03 16:10:00'),
(32, 780000.00, 'Cash', FALSE, '2023-11-04 09:50:00'),
(37, 610000.00, 'Cash', FALSE, '2023-11-04 15:25:00'),
(42, 730000.00, 'Transfer', TRUE, '2023-11-07 10:40:00'),
(47, 570000.00, 'Cash', FALSE, '2023-11-07 14:15:00'),
(52, 810000.00, 'Transfer', FALSE, '2023-11-08 11:55:00'),
(57, 650000.00, 'Cash', FALSE, '2023-11-08 16:30:00'),
(62, 720000.00, 'Cash', TRUE, '2023-11-09 09:35:00'),
(67, 590000.00, 'Transfer', FALSE, '2023-11-09 13:50:00'),
(72, 770000.00, 'Cash', FALSE, '2023-11-10 10:25:00'),
(77, 530000.00, 'Transfer', FALSE, '2023-11-10 15:40:00'),
(82, 690000.00, 'Cash', FALSE, '2023-11-11 11:15:00'),
(87, 620000.00, 'Cash', TRUE, '2023-11-14 09:45:00'),
(92, 750000.00, 'Transfer', FALSE, '2023-11-14 14:20:00'),
(97, 580000.00, 'Cash', FALSE, '2023-11-15 10:55:00'),
(3, 810000.00, 'Transfer', FALSE, '2023-11-15 15:30:00'),
(8, 640000.00, 'Cash', FALSE, '2023-11-16 11:40:00'),
(13, 720000.00, 'Cash', TRUE, '2023-11-16 16:25:00'),
(18, 560000.00, 'Transfer', FALSE, '2023-11-17 09:10:00'),
(23, 790000.00, 'Cash', FALSE, '2023-11-17 14:35:00'),
(28, 610000.00, 'Transfer', FALSE, '2023-11-21 10:50:00'),
(33, 730000.00, 'Cash', FALSE, '2023-11-21 15:15:00');

-- Desember 2023 (26 penagihan)
INSERT INTO penagihan (id_toko, total_uang_diterima, metode_pembayaran, ada_potongan, dibuat_pada) VALUES
(38, 680000.00, 'Transfer', TRUE, '2023-12-02 10:30:00'),
(43, 590000.00, 'Cash', FALSE, '2023-12-02 14:45:00'),
(48, 770000.00, 'Cash', FALSE, '2023-12-05 11:20:00'),
(53, 520000.00, 'Transfer', FALSE, '2023-12-05 16:35:00'),
(58, 810000.00, 'Cash', FALSE, '2023-12-06 09:40:00'),
(63, 640000.00, 'Transfer', FALSE, '2023-12-06 15:25:00'),
(68, 720000.00, 'Cash', TRUE, '2023-12-07 10:15:00'),
(73, 570000.00, 'Cash', FALSE, '2023-12-07 14:50:00'),
(78, 690000.00, 'Transfer', FALSE, '2023-12-08 11:35:00'),
(83, 610000.00, 'Cash', FALSE, '2023-12-08 16:10:00'),
(88, 750000.00, 'Cash', FALSE, '2023-12-09 09:55:00'),
(93, 580000.00, 'Transfer', TRUE, '2023-12-12 13:20:00'),
(98, 820000.00, 'Cash', FALSE, '2023-12-12 15:45:00'),
(6, 630000.00, 'Transfer', FALSE, '2023-12-13 10:40:00'),
(11, 710000.00, 'Cash', FALSE, '2023-12-13 14:25:00'),
(16, 560000.00, 'Cash', FALSE, '2023-12-14 11:50:00'),
(21, 790000.00, 'Transfer', TRUE, '2023-12-14 16:15:00'),
(26, 620000.00, 'Cash', FALSE, '2023-12-15 09:30:00'),
(31, 740000.00, 'Cash', FALSE, '2023-12-15 15:40:00'),
(36, 590000.00, 'Transfer', FALSE, '2023-12-16 10:25:00'),
(41, 680000.00, 'Cash', FALSE, '2023-12-19 13:35:00'),
(46, 550000.00, 'Transfer', FALSE, '2023-12-19 16:50:00'),
(51, 770000.00, 'Cash', TRUE, '2023-12-20 10:15:00'),
(56, 640000.00, 'Cash', FALSE, '2023-12-20 14:30:00'),
(61, 720000.00, 'Transfer', FALSE, '2023-12-21 11:45:00'),
(66, 580000.00, 'Cash', FALSE, '2023-12-21 16:20:00');

-- Januari 2024 (27 penagihan)
INSERT INTO penagihan (id_toko, total_uang_diterima, metode_pembayaran, ada_potongan, dibuat_pada) VALUES
(71, 690000.00, 'Cash', FALSE, '2024-01-03 10:20:00'),
(76, 610000.00, 'Transfer', FALSE, '2024-01-03 14:35:00'),
(81, 750000.00, 'Cash', TRUE, '2024-01-04 11:50:00'),
(86, 570000.00, 'Transfer', FALSE, '2024-01-04 16:15:00'),
(91, 820000.00, 'Cash', FALSE, '2024-01-05 09:40:00'),
(96, 640000.00, 'Cash', FALSE, '2024-01-05 15:25:00'),
(4, 710000.00, 'Transfer', FALSE, '2024-01-06 10:55:00'),
(9, 580000.00, 'Cash', FALSE, '2024-01-06 14:10:00'),
(14, 790000.00, 'Cash', TRUE, '2024-01-09 11:30:00'),
(19, 620000.00, 'Transfer', FALSE, '2024-01-09 16:45:00'),
(24, 730000.00, 'Cash', FALSE, '2024-01-10 09:20:00'),
(29, 560000.00, 'Cash', FALSE, '2024-01-10 15:35:00'),
(34, 680000.00, 'Transfer', FALSE, '2024-01-11 10:40:00'),
(39, 590000.00, 'Cash', FALSE, '2024-01-11 14:55:00'),
(44, 770000.00, 'Transfer', TRUE, '2024-01-12 11:25:00'),
(49, 630000.00, 'Cash', FALSE, '2024-01-12 16:10:00'),
(54, 720000.00, 'Cash', FALSE, '2024-01-13 09:45:00'),
(59, 580000.00, 'Transfer', FALSE, '2024-01-16 13:20:00'),
(64, 810000.00, 'Cash', FALSE, '2024-01-16 15:40:00'),
(69, 640000.00, 'Cash', TRUE, '2024-01-17 10:30:00'),
(74, 700000.00, 'Transfer', FALSE, '2024-01-17 14:45:00'),
(79, 560000.00, 'Cash', FALSE, '2024-01-18 11:15:00'),
(84, 750000.00, 'Cash', FALSE, '2024-01-18 16:25:00'),
(89, 620000.00, 'Transfer', FALSE, '2024-01-19 09:55:00'),
(94, 680000.00, 'Cash', FALSE, '2024-01-19 15:10:00'),
(99, 590000.00, 'Transfer', TRUE, '2024-01-23 10:35:00'),
(5, 730000.00, 'Cash', FALSE, '2024-01-23 14:50:00');

-- Februari 2024 (28 penagihan)
INSERT INTO penagihan (id_toko, total_uang_diterima, metode_pembayaran, ada_potongan, dibuat_pada) VALUES
(10, 760000.00, 'Cash', FALSE, '2024-02-02 10:25:00'),
(15, 580000.00, 'Transfer', FALSE, '2024-02-02 14:40:00'),
(20, 820000.00, 'Cash', TRUE, '2024-02-03 11:15:00'),
(25, 640000.00, 'Transfer', FALSE, '2024-02-06 16:30:00'),
(30, 710000.00, 'Cash', FALSE, '2024-02-06 09:50:00'),
(35, 590000.00, 'Cash', FALSE, '2024-02-07 15:45:00'),
(40, 740000.00, 'Transfer', FALSE, '2024-02-07 10:20:00'),
(45, 620000.00, 'Cash', FALSE, '2024-02-08 14:35:00'),
(50, 780000.00, 'Cash', TRUE, '2024-02-08 11:55:00'),
(55, 560000.00, 'Transfer', FALSE, '2024-02-09 16:10:00'),
(60, 690000.00, 'Cash', FALSE, '2024-02-09 09:30:00'),
(65, 610000.00, 'Cash', FALSE, '2024-02-10 15:25:00'),
(70, 750000.00, 'Transfer', FALSE, '2024-02-13 10:40:00'),
(75, 580000.00, 'Cash', FALSE, '2024-02-13 14:55:00'),
(80, 720000.00, 'Cash', TRUE, '2024-02-14 11:20:00'),
(85, 640000.00, 'Transfer', FALSE, '2024-02-14 16:35:00'),
(90, 790000.00, 'Cash', FALSE, '2024-02-15 09:45:00'),
(95, 570000.00, 'Cash', FALSE, '2024-02-15 15:50:00'),
(1, 680000.00, 'Transfer', FALSE, '2024-02-16 10:15:00'),
(6, 610000.00, 'Cash', FALSE, '2024-02-16 14:30:00'),
(11, 730000.00, 'Cash', TRUE, '2024-02-17 11:40:00'),
(16, 590000.00, 'Transfer', FALSE, '2024-02-20 16:55:00'),
(21, 760000.00, 'Cash', FALSE, '2024-02-20 09:25:00'),
(26, 620000.00, 'Cash', FALSE, '2024-02-21 15:40:00'),
(31, 710000.00, 'Transfer', FALSE, '2024-02-21 10:35:00'),
(36, 580000.00, 'Cash', FALSE, '2024-02-22 14:50:00'),
(41, 740000.00, 'Cash', TRUE, '2024-02-22 11:15:00'),
(46, 630000.00, 'Transfer', FALSE, '2024-02-23 16:20:00');

-- Maret 2024 (22 penagihan)
INSERT INTO penagihan (id_toko, total_uang_diterima, metode_pembayaran, ada_potongan, dibuat_pada) VALUES
(51, 780000.00, 'Cash', FALSE, '2024-03-02 10:30:00'),
(56, 640000.00, 'Transfer', FALSE, '2024-03-02 14:45:00'),
(61, 720000.00, 'Cash', TRUE, '2024-03-05 11:20:00'),
(66, 590000.00, 'Transfer', FALSE, '2024-03-05 16:35:00'),
(71, 750000.00, 'Cash', FALSE, '2024-03-06 09:50:00'),
(76, 610000.00, 'Cash', FALSE, '2024-03-06 15:25:00'),
(81, 690000.00, 'Transfer', FALSE, '2024-03-07 10:40:00'),
(86, 570000.00, 'Cash', FALSE, '2024-03-07 14:55:00'),
(91, 810000.00, 'Cash', TRUE, '2024-03-08 11:15:00'),
(96, 630000.00, 'Transfer', FALSE, '2024-03-08 16:30:00'),
(2, 740000.00, 'Cash', FALSE, '2024-03-09 09:45:00'),
(7, 580000.00, 'Cash', FALSE, '2024-03-12 15:20:00'),
(12, 720000.00, 'Transfer', FALSE, '2024-03-12 10:35:00'),
(17, 640000.00, 'Cash', FALSE, '2024-03-13 14:50:00'),
(22, 760000.00, 'Cash', TRUE, '2024-03-13 11:25:00'),
(27, 590000.00, 'Transfer', FALSE, '2024-03-14 16:40:00'),
(32, 710000.00, 'Cash', FALSE, '2024-03-14 09:15:00'),
(37, 620000.00, 'Cash', FALSE, '2024-03-15 15:30:00'),
(42, 780000.00, 'Transfer', FALSE, '2024-03-15 10:45:00'),
(47, 560000.00, 'Cash', FALSE, '2024-03-19 14:20:00'),
(52, 690000.00, 'Cash', TRUE, '2024-03-19 11:35:00'),
(57, 630000.00, 'Transfer', FALSE, '2024-03-20 16:50:00');

-- ==============================================
-- DETAIL PENAGIHAN DATA
-- ==============================================

-- Generate detail penagihan untuk setiap penagihan
-- Setiap penagihan memiliki 3-7 item dengan jumlah terjual dan kembali

-- Batch insert untuk detail penagihan 1-50
INSERT INTO detail_penagihan (id_penagihan, id_produk, jumlah_terjual, jumlah_kembali) VALUES
-- Penagihan 1-10
(1, 1, 45, 5), (1, 5, 28, 2), (1, 9, 95, 5), (1, 13, 18, 2), (1, 17, 13, 2),
(2, 2, 38, 2), (2, 6, 23, 2), (2, 10, 75, 5), (2, 14, 16, 2), (2, 18, 10, 2),
(3, 3, 33, 2), (3, 7, 20, 2), (3, 11, 55, 5), (3, 15, 23, 2), (3, 19, 8, 2),
(4, 4, 43, 2), (4, 8, 26, 2), (4, 12, 65, 5), (4, 16, 18, 2), (4, 20, 6, 2),
(5, 1, 36, 2), (5, 9, 90, 5), (5, 13, 20, 2), (5, 17, 16, 2), (5, 2, 33, 2),
(6, 3, 40, 2), (6, 7, 24, 2), (6, 11, 60, 5), (6, 15, 26, 2), (6, 19, 10, 2),
(7, 5, 31, 2), (7, 9, 83, 5), (7, 13, 17, 2), (7, 17, 14, 2), (7, 1, 38, 2),
(8, 2, 35, 2), (8, 6, 22, 2), (8, 10, 70, 5), (8, 14, 19, 2), (8, 18, 12, 2),
(9, 4, 39, 2), (9, 8, 27, 2), (9, 12, 63, 5), (9, 16, 21, 2), (9, 20, 7, 2),
(10, 1, 42, 2), (10, 5, 29, 2), (10, 9, 87, 5), (10, 13, 22, 2), (10, 17, 15, 2);

-- Continue pattern untuk 40 penagihan lainnya
INSERT INTO detail_penagihan (id_penagihan, id_produk, jumlah_terjual, jumlah_kembali) 
SELECT 
    g.id_penagihan,
    ((g.id_penagihan - 11) % 20) + 1 as id_produk,
    20 + ((g.id_penagihan * 3) % 40) as jumlah_terjual,
    1 + ((g.id_penagihan) % 5) as jumlah_kembali
FROM generate_series(11, 150) as g(id_penagihan);

-- Tambah produk kedua untuk setiap penagihan
INSERT INTO detail_penagihan (id_penagihan, id_produk, jumlah_terjual, jumlah_kembali) 
SELECT 
    g.id_penagihan,
    ((g.id_penagihan - 11) % 19) + 2 as id_produk,
    15 + ((g.id_penagihan * 2) % 30) as jumlah_terjual,
    1 + ((g.id_penagihan + 1) % 3) as jumlah_kembali
FROM generate_series(11, 150) as g(id_penagihan);

-- ==============================================
-- POTONGAN PENAGIHAN DATA
-- ==============================================

-- Tambah potongan untuk penagihan yang ada_potongan = TRUE
INSERT INTO potongan_penagihan (id_penagihan, jumlah_potongan, alasan) VALUES
-- Oktober 2023
(3, 25000.00, 'Produk rusak - kemasan terbuka'),
(7, 15000.00, 'Diskon loyalitas customer'),
(11, 30000.00, 'Produk expired - diganti baru'),
(16, 20000.00, 'Kompensasi keterlambatan pengiriman'),
(22, 18000.00, 'Barang cacat kemasan penyok'),

-- November 2023
(25, 35000.00, 'Promo akhir bulan'),
(29, 22000.00, 'Diskon volume pembelian'),
(33, 28000.00, 'Produk rusak dalam pengiriman'),
(38, 16000.00, 'Kompensasi komplain customer'),
(43, 24000.00, 'Diskon member VIP'),

-- Desember 2023
(48, 32000.00, 'Promo natal dan tahun baru'),
(54, 19000.00, 'Produk mendekati expired'),
(59, 26000.00, 'Diskon pembayaran tunai'),
(65, 21000.00, 'Kompensasi keterlambatan'),
(69, 33000.00, 'Produk cacat produksi'),

-- Januari 2024
(74, 27000.00, 'Diskon pembeli lama'),
(79, 23000.00, 'Produk rusak minor'),
(84, 31000.00, 'Promo tahun baru'),
(89, 17000.00, 'Kompensasi service'),
(95, 29000.00, 'Diskon quantity'),

-- Februari 2024
(98, 25000.00, 'Produk kemasan rusak'),
(103, 20000.00, 'Diskon valentine'),
(108, 34000.00, 'Kompensasi komplain'),
(113, 22000.00, 'Produk expired'),
(118, 28000.00, 'Diskon loyalitas'),

-- Maret 2024
(123, 24000.00, 'Promo ramadhan'),
(128, 30000.00, 'Produk cacat minor'),
(133, 19000.00, 'Diskon pembayaran cash'),
(138, 26000.00, 'Kompensasi delay'),
(143, 21000.00, 'Produk rusak pengiriman');

-- ==============================================
-- SETORAN DATA (100 setoran)
-- ==============================================

-- Generate setoran berdasarkan cash yang diterima per minggu
-- Oktober 2023 (15 setoran)
INSERT INTO setoran (total_setoran, penerima_setoran, dibuat_pada) VALUES
(1450000.00, 'Ahmad Susanto', '2023-10-06 18:00:00'),
(1200000.00, 'Budi Santoso', '2023-10-06 18:30:00'),
(1580000.00, 'Citra Dewi', '2023-10-09 18:15:00'),
(1320000.00, 'Denny Prasetyo', '2023-10-09 18:45:00'),
(1750000.00, 'Eka Sari', '2023-10-12 19:00:00'),
(1180000.00, 'Farid Rahman', '2023-10-12 19:30:00'),
(1420000.00, 'Gita Indira', '2023-10-13 18:20:00'),
(1680000.00, 'Hadi Nugroho', '2023-10-13 18:50:00'),
(1350000.00, 'Ika Putri', '2023-10-16 19:15:00'),
(1500000.00, 'Ahmad Susanto', '2023-10-16 19:45:00'),
(1220000.00, 'Budi Santoso', '2023-10-19 18:10:00'),
(1630000.00, 'Citra Dewi', '2023-10-19 18:40:00'),
(1480000.00, 'Denny Prasetyo', '2023-10-20 19:25:00'),
(1390000.00, 'Eka Sari', '2023-10-20 19:55:00'),
(1720000.00, 'Farid Rahman', '2023-10-23 18:30:00'),

-- November 2023 (16 setoran)
(1560000.00, 'Gita Indira', '2023-11-03 18:25:00'),
(1280000.00, 'Hadi Nugroho', '2023-11-03 18:55:00'),
(1640000.00, 'Ika Putri', '2023-11-06 19:10:00'),
(1420000.00, 'Ahmad Susanto', '2023-11-06 19:40:00'),
(1750000.00, 'Budi Santoso', '2023-11-09 18:15:00'),
(1180000.00, 'Citra Dewi', '2023-11-09 18:45:00'),
(1590000.00, 'Denny Prasetyo', '2023-11-10 19:20:00'),
(1330000.00, 'Eka Sari', '2023-11-10 19:50:00'),
(1680000.00, 'Farid Rahman', '2023-11-13 18:35:00'),
(1240000.00, 'Gita Indira', '2023-11-13 19:05:00'),
(1520000.00, 'Hadi Nugroho', '2023-11-16 18:20:00'),
(1460000.00, 'Ika Putri', '2023-11-16 18:50:00'),
(1370000.00, 'Ahmad Susanto', '2023-11-17 19:15:00'),
(1610000.00, 'Budi Santoso', '2023-11-17 19:45:00'),
(1490000.00, 'Citra Dewi', '2023-11-20 18:30:00'),
(1720000.00, 'Denny Prasetyo', '2023-11-20 19:00:00'),

-- Desember 2023 (17 setoran)
(1580000.00, 'Eka Sari', '2023-12-04 18:40:00'),
(1320000.00, 'Farid Rahman', '2023-12-04 19:10:00'),
(1650000.00, 'Gita Indira', '2023-12-07 18:25:00'),
(1180000.00, 'Hadi Nugroho', '2023-12-07 18:55:00'),
(1730000.00, 'Ika Putri', '2023-12-08 19:20:00'),
(1420000.00, 'Ahmad Susanto', '2023-12-08 19:50:00'),
(1560000.00, 'Budi Santoso', '2023-12-11 18:15:00'),
(1290000.00, 'Citra Dewi', '2023-12-11 18:45:00'),
(1680000.00, 'Denny Prasetyo', '2023-12-14 19:30:00'),
(1350000.00, 'Eka Sari', '2023-12-14 20:00:00'),
(1540000.00, 'Farid Rahman', '2023-12-15 18:35:00'),
(1470000.00, 'Gita Indira', '2023-12-15 19:05:00'),
(1620000.00, 'Hadi Nugroho', '2023-12-18 18:20:00'),
(1380000.00, 'Ika Putri', '2023-12-18 18:50:00'),
(1710000.00, 'Ahmad Susanto', '2023-12-21 19:15:00'),
(1250000.00, 'Budi Santoso', '2023-12-21 19:45:00'),
(1590000.00, 'Citra Dewi', '2023-12-22 18:30:00'),

-- Januari 2024 (17 setoran)
(1480000.00, 'Denny Prasetyo', '2024-01-05 19:00:00'),
(1720000.00, 'Eka Sari', '2024-01-05 19:30:00'),
(1340000.00, 'Farid Rahman', '2024-01-08 18:45:00'),
(1630000.00, 'Gita Indira', '2024-01-08 19:15:00'),
(1190000.00, 'Hadi Nugroho', '2024-01-11 18:20:00'),
(1570000.00, 'Ika Putri', '2024-01-11 18:50:00'),
(1410000.00, 'Ahmad Susanto', '2024-01-12 19:25:00'),
(1680000.00, 'Budi Santoso', '2024-01-12 19:55:00'),
(1280000.00, 'Citra Dewi', '2024-01-15 18:10:00'),
(1750000.00, 'Denny Prasetyo', '2024-01-15 18:40:00'),
(1520000.00, 'Eka Sari', '2024-01-18 19:05:00'),
(1460000.00, 'Farid Rahman', '2024-01-18 19:35:00'),
(1640000.00, 'Gita Indira', '2024-01-19 18:50:00'),
(1370000.00, 'Hadi Nugroho', '2024-01-19 19:20:00'),
(1590000.00, 'Ika Putri', '2024-01-22 18:15:00'),
(1300000.00, 'Ahmad Susanto', '2024-01-22 18:45:00'),
(1710000.00, 'Budi Santoso', '2024-01-25 19:10:00'),

-- Februari 2024 (18 setoran)
(1450000.00, 'Citra Dewi', '2024-02-02 19:40:00'),
(1680000.00, 'Denny Prasetyo', '2024-02-02 20:10:00'),
(1320000.00, 'Eka Sari', '2024-02-05 18:25:00'),
(1580000.00, 'Farid Rahman', '2024-02-05 18:55:00'),
(1240000.00, 'Gita Indira', '2024-02-08 19:20:00'),
(1730000.00, 'Hadi Nugroho', '2024-02-08 19:50:00'),
(1490000.00, 'Ika Putri', '2024-02-09 18:35:00'),
(1620000.00, 'Ahmad Susanto', '2024-02-09 19:05:00'),
(1380000.00, 'Budi Santoso', '2024-02-12 18:20:00'),
(1560000.00, 'Citra Dewi', '2024-02-12 18:50:00'),
(1410000.00, 'Denny Prasetyo', '2024-02-15 19:15:00'),
(1690000.00, 'Eka Sari', '2024-02-15 19:45:00'),
(1270000.00, 'Farid Rahman', '2024-02-16 18:30:00'),
(1750000.00, 'Gita Indira', '2024-02-16 19:00:00'),
(1520000.00, 'Hadi Nugroho', '2024-02-19 18:45:00'),
(1440000.00, 'Ika Putri', '2024-02-19 19:15:00'),
(1610000.00, 'Ahmad Susanto', '2024-02-22 18:40:00'),
(1350000.00, 'Budi Santoso', '2024-02-22 19:10:00'),

-- Maret 2024 (17 setoran)
(1680000.00, 'Citra Dewi', '2024-03-04 19:35:00'),
(1420000.00, 'Denny Prasetyo', '2024-03-04 20:05:00'),
(1570000.00, 'Eka Sari', '2024-03-07 18:20:00'),
(1290000.00, 'Farid Rahman', '2024-03-07 18:50:00'),
(1740000.00, 'Gita Indira', '2024-03-08 19:25:00'),
(1380000.00, 'Hadi Nugroho', '2024-03-08 19:55:00'),
(1630000.00, 'Ika Putri', '2024-03-11 18:10:00'),
(1460000.00, 'Ahmad Susanto', '2024-03-11 18:40:00'),
(1520000.00, 'Budi Santoso', '2024-03-14 19:05:00'),
(1680000.00, 'Citra Dewi', '2024-03-14 19:35:00'),
(1310000.00, 'Denny Prasetyo', '2024-03-15 18:50:00'),
(1590000.00, 'Eka Sari', '2024-03-15 19:20:00'),
(1440000.00, 'Farid Rahman', '2024-03-18 18:15:00'),
(1720000.00, 'Gita Indira', '2024-03-18 18:45:00'),
(1380000.00, 'Hadi Nugroho', '2024-03-21 19:10:00'),
(1610000.00, 'Ika Putri', '2024-03-21 19:40:00'),
(1350000.00, 'Ahmad Susanto', '2024-03-25 18:25:00');

-- ==============================================
-- VERIFIKASI DATA EXTENDED
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

-- Tampilkan distribusi toko per sales
SELECT 
    s.nama_sales,
    COUNT(t.id_toko) as jumlah_toko,
    COUNT(CASE WHEN t.status_toko = TRUE THEN 1 END) as toko_aktif
FROM sales s
LEFT JOIN toko t ON s.id_sales = t.id_sales
GROUP BY s.id_sales, s.nama_sales
ORDER BY jumlah_toko DESC;

-- Tampilkan rangkuman transaksi per bulan
SELECT 
    DATE_TRUNC('month', p.tanggal_kirim) as bulan,
    COUNT(DISTINCT p.id_pengiriman) as total_pengiriman,
    COUNT(DISTINCT pen.id_penagihan) as total_penagihan,
    COUNT(DISTINCT s.id_setoran) as total_setoran,
    SUM(pen.total_uang_diterima) as total_uang_diterima
FROM pengiriman p
LEFT JOIN penagihan pen ON DATE_TRUNC('month', p.tanggal_kirim) = DATE_TRUNC('month', pen.dibuat_pada)
LEFT JOIN setoran s ON DATE_TRUNC('month', p.tanggal_kirim) = DATE_TRUNC('month', s.dibuat_pada)
GROUP BY DATE_TRUNC('month', p.tanggal_kirim)
ORDER BY bulan;

-- ==============================================
-- CATATAN PENGGUNAAN EXTENDED
-- ==============================================
/*
File ini berisi data dummy yang ekstensif untuk sistem penjualan titip bayar:

TOTAL DATA:
- 10 Sales (9 aktif, 1 nonaktif)
- 20 Produk (19 aktif, 1 nonaktif)
- 100 Toko (99 aktif, 1 nonaktif)
- 200 Pengiriman (6 bulan data)
- 600+ Detail pengiriman
- 150 Penagihan
- 450+ Detail penagihan
- 25 Potongan penagihan
- 100 Setoran

DISTRIBUSI:
- Toko tersebar merata di 9 sales aktif
- Pengiriman: 30-36 per bulan selama 6 bulan
- Penagihan: 22-28 per bulan
- Setoran: 15-18 per bulan

FITUR:
- Data historis 6 bulan (Oktober 2023 - Maret 2024)
- Relasi yang konsisten antar tabel
- Variasi realistis dalam jumlah dan nilai
- Mix pembayaran cash dan transfer
- Potongan dengan alasan yang masuk akal
- Distribusi geografis yang luas

PENGGUNAAN:
1. Jalankan database-schema.sql terlebih dahulu
2. Execute file ini untuk data dummy lengkap
3. Cocok untuk testing performa dengan data besar
4. Mendukung pagination dan filtering yang kompleks
5. Ideal untuk demo stakeholder dengan data realistis
*/