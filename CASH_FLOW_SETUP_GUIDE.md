# 🚀 Panduan Setup Cash Flow Dashboard

Panduan ini akan membantu Anda mengintegrasikan data penagihan yang sudah ada ke dalam dashboard cash flow yang baru.

## 📋 Langkah-Langkah Setup

### 1. **Verifikasi Data Existing**
Jalankan queries di file `test_cash_flow_data.sql` untuk memastikan data penagihan Anda ada:

```sql
-- Check total penagihan records
SELECT 
    'Total Penagihan Records' as info,
    COUNT(*) as jumlah,
    MIN(dibuat_pada) as data_pertama,
    MAX(dibuat_pada) as data_terakhir
FROM penagihan;

-- Check by payment method  
SELECT 
    metode_pembayaran,
    COUNT(*) as jumlah_transaksi,
    SUM(total_uang_diterima) as total_amount
FROM penagihan 
GROUP BY metode_pembayaran;
```

### 2. **Update Database Views**
Jalankan file `update_cash_flow_views.sql` di database Anda:

```bash
# Jika menggunakan psql:
psql -d your_database_name -f update_cash_flow_views.sql

# Atau copy-paste isi file ke Supabase Dashboard SQL Editor
```

File ini akan:
- ✅ Drop views lama yang mungkin konflik
- ✅ Membuat `v_cash_flow_dashboard` yang kompatibel dengan data existing
- ✅ Update `v_setoran_dashboard` dengan field baru  
- ✅ Membuat indexes untuk performa
- ✅ Menyediakan test queries

### 3. **Test Views Baru**
Setelah menjalankan views, test dengan query ini:

```sql
-- Test new view
SELECT 
    tanggal_setoran,
    total_setoran,
    pembayaran_cash_hari_ini,
    pembayaran_transfer_hari_ini,
    selisih_cash_setoran,
    status_setoran,
    cash_balance_kumulatif
FROM v_setoran_dashboard 
WHERE tanggal_setoran >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY waktu_setoran DESC
LIMIT 5;
```

### 4. **Restart Application**
Restart aplikasi Next.js Anda agar frontend bisa mengakses data baru:

```bash
npm run dev
# atau
yarn dev
```

### 5. **Akses Dashboard**
Buka halaman setoran: `http://localhost:3000/dashboard/setoran`

Anda akan melihat:
- 🟢 **Cards Summary**: Cash masuk, Transfer masuk, Setoran, Balance
- 📊 **Enhanced Table**: Kolom dengan breakdown cash vs transfer  
- ⚡ **Real-time Balance**: Perhitungan cash di tangan sales
- 🎯 **Status Colors**: Visual indicators untuk balance status

## 🔧 Troubleshooting

### Problem: View tidak ada
**Solusi**: Pastikan Anda menjalankan `update_cash_flow_views.sql` dengan benar di database.

### Problem: Data tidak muncul  
**Solusi**: 
1. Check apakah ada data penagihan dengan metode 'Cash':
```sql
SELECT COUNT(*) FROM penagihan WHERE metode_pembayaran = 'Cash';
```

2. Pastikan format tanggal konsisten:
```sql
SELECT DATE(dibuat_pada), COUNT(*) FROM penagihan GROUP BY DATE(dibuat_pada) ORDER BY 1 DESC LIMIT 5;
```

### Problem: Balance tidak akurat
**Solusi**: Check apakah data penagihan dan setoran ada di tanggal yang sama:
```sql
-- Compare dates
SELECT 'penagihan' as source, DATE(dibuat_pada) as tanggal, COUNT(*) 
FROM penagihan GROUP BY DATE(dibuat_pada)
UNION ALL
SELECT 'setoran' as source, DATE(dibuat_pada) as tanggal, COUNT(*) 
FROM setoran GROUP BY DATE(dibuat_pada)
ORDER BY tanggal DESC, source;
```

## 📊 Fitur Cash Flow Dashboard

### Summary Cards
1. **Pembayaran Cash Hari Ini**: Total cash yang masuk + jumlah transaksi
2. **Pembayaran Transfer Hari Ini**: Total transfer yang masuk + jumlah transaksi  
3. **Total Setoran Hari Ini**: Total yang sudah disetor
4. **Cash di Tangan Sales**: Sisa cash yang belum disetor (dengan status warna)

### Enhanced Table Columns
- **ID Setoran**: ID dan tanggal setoran
- **Jumlah Setoran vs Cash**: Breakdown setoran, cash, dan transfer dengan jumlah transaksi
- **Penerima & Balance**: Nama penerima + status balance cash
- **Waktu Setoran**: Tanggal dan jam setoran
- **Status Setoran**: Visual status sesuai/kurang/lebih setor

### Logika Perhitungan
```
Cash di Tangan Sales = Pembayaran Cash Hari Ini - Total Setoran Hari Ini
```

- 🟠 **Positive Balance**: Cash belum disetor (perlu tindakan)
- 🔴 **Negative Balance**: Lebih setor (audit diperlukan)  
- ✅ **Zero Balance**: Seimbang (ideal)

## 🎯 Next Steps

Setelah setup berhasil, Anda bisa:
1. **Monitor Daily**: Cek balance cash setiap hari
2. **Set Alerts**: Buat notifikasi untuk balance > threshold tertentu
3. **Historical Analysis**: Analisis trend cash flow historical
4. **Export Data**: Gunakan fitur export untuk reporting

---

💡 **Tips**: Untuk data accuracy terbaik, pastikan input penagihan dan setoran dilakukan di hari yang sama dengan transaksi aktual.