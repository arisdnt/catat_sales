-- Sample data untuk testing dengan tanggal current (Juli 2025)

-- Insert sample penagihan data untuk Juli 2025
INSERT INTO penagihan (id_toko, total_uang_diterima, metode_pembayaran, ada_potongan, dibuat_pada) VALUES
(1, 250000.00, 'Cash', FALSE, '2025-07-15 10:30:00'),
(2, 300000.00, 'Transfer', FALSE, '2025-07-15 14:20:00'),
(3, 275000.00, 'Cash', FALSE, '2025-07-16 16:45:00'),
(1, 220000.00, 'Cash', FALSE, '2025-07-17 09:15:00'),
(4, 400000.00, 'Transfer', FALSE, '2025-07-18 11:30:00'),
(2, 280000.00, 'Cash', TRUE, '2025-07-19 15:20:00'),
(3, 350000.00, 'Transfer', FALSE, '2025-07-20 08:45:00'),
(1, 290000.00, 'Cash', FALSE, '2025-07-21 13:10:00'),
(4, 320000.00, 'Cash', FALSE, '2025-07-22 17:30:00'),
(2, 260000.00, 'Transfer', FALSE, '2025-07-23 10:00:00');

-- Insert sample setoran data untuk Juli 2025
INSERT INTO setoran (total_setoran, penerima_setoran, dibuat_pada) VALUES
(800000.00, 'Ahmad Susanto', '2025-07-15 18:00:00'),
(750000.00, 'Budi Santoso', '2025-07-16 18:30:00'),
(900000.00, 'Citra Dewi', '2025-07-17 19:00:00'),
(600000.00, 'Ahmad Susanto', '2025-07-18 17:45:00'),
(850000.00, 'Budi Santoso', '2025-07-19 18:15:00');

-- Note: Untuk detail_penagihan, perlu disesuaikan dengan ID penagihan yang baru dibuat
-- Silakan jalankan query SELECT untuk mendapatkan ID penagihan terbaru, lalu tambahkan detail_penagihan sesuai kebutuhan