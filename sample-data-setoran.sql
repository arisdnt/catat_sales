-- Sample data untuk testing setoran dan penagihan

-- Insert sample penagihan data
INSERT INTO penagihan (id_toko, total_uang_diterima, metode_pembayaran, ada_potongan, dibuat_pada) VALUES
(1, 150000.00, 'Cash', FALSE, '2024-01-15 10:30:00'),
(2, 200000.00, 'Transfer', FALSE, '2024-01-15 14:20:00'),
(3, 175000.00, 'Cash', FALSE, '2024-01-15 16:45:00'),
(1, 120000.00, 'Cash', FALSE, '2024-01-16 09:15:00'),
(4, 300000.00, 'Transfer', FALSE, '2024-01-16 11:30:00'),
(2, 180000.00, 'Cash', TRUE, '2024-01-16 15:20:00'),
(3, 250000.00, 'Transfer', FALSE, '2024-01-17 08:45:00'),
(1, 190000.00, 'Cash', FALSE, '2024-01-17 13:10:00'),
(4, 220000.00, 'Cash', FALSE, '2024-01-17 17:30:00'),
(2, 160000.00, 'Transfer', FALSE, '2024-01-18 10:00:00');

-- Insert sample setoran data
INSERT INTO setoran (total_setoran, penerima_setoran, dibuat_pada) VALUES
(500000.00, 'Ahmad Susanto', '2024-01-15 18:00:00'),
(450000.00, 'Budi Santoso', '2024-01-16 18:30:00'),
(600000.00, 'Citra Dewi', '2024-01-17 19:00:00'),
(300000.00, 'Ahmad Susanto', '2024-01-18 17:45:00'),
(750000.00, 'Budi Santoso', '2024-01-19 18:15:00');

-- Insert sample detail_penagihan data
INSERT INTO detail_penagihan (id_penagihan, id_produk, jumlah_terjual, jumlah_kembali) VALUES
-- Penagihan 1
(1, 1, 10, 2),
(1, 2, 5, 0),
(1, 3, 8, 1),
-- Penagihan 2
(2, 1, 15, 1),
(2, 4, 6, 0),
(2, 5, 4, 0),
-- Penagihan 3
(3, 2, 8, 0),
(3, 3, 12, 2),
(3, 4, 5, 1),
-- Penagihan 4
(4, 1, 12, 0),
(4, 5, 3, 0),
-- Penagihan 5
(5, 1, 20, 0),
(5, 2, 10, 1),
(5, 3, 15, 0),
-- Penagihan 6
(6, 4, 8, 0),
(6, 5, 6, 1),
-- Penagihan 7
(7, 1, 18, 2),
(7, 2, 7, 0),
(7, 4, 9, 0),
-- Penagihan 8
(8, 3, 14, 1),
(8, 5, 8, 0),
-- Penagihan 9
(9, 1, 16, 0),
(9, 2, 6, 0),
(9, 3, 10, 1),
-- Penagihan 10
(10, 4, 7, 0),
(10, 5, 5, 0);

-- Insert sample potongan_penagihan data (untuk penagihan yang ada_potongan = TRUE)
INSERT INTO potongan_penagihan (id_penagihan, jumlah_potongan, alasan) VALUES
(6, 20000.00, 'Produk rusak saat pengiriman');