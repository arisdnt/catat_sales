# API Documentation - Sistem Penjualan Titip Bayar

## Overview
API ini menggunakan arsitektur REST dengan JSON format untuk request dan response. Semua endpoint memerlukan autentikasi menggunakan Bearer token dari Supabase Auth.

## Authentication
```
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
```

## Base URL
```
/api
```

## Error Responses
```json
{
  "error": "Error message description"
}
```

## Success Responses
```json
{
  "data": { ... },
  "status": 200
}
```

---

## Sales API

### Get All Sales
```
GET /api/sales
```

**Response:**
```json
[
  {
    "id_sales": 1,
    "nama_sales": "Ahmad Susanto",
    "nomor_telepon": "081234567890",
    "status_aktif": true,
    "dibuat_pada": "2025-01-15T10:30:00Z",
    "diperbarui_pada": "2025-01-15T10:30:00Z"
  }
]
```

### Get Sales by ID
```
GET /api/sales/{id}
```

### Create Sales
```
POST /api/sales
```

**Request Body:**
```json
{
  "nama_sales": "Ahmad Susanto",
  "nomor_telepon": "081234567890"
}
```

### Update Sales
```
PUT /api/sales/{id}
```

**Request Body:**
```json
{
  "nama_sales": "Ahmad Susanto",
  "nomor_telepon": "081234567890",
  "status_aktif": true
}
```

### Delete Sales
```
DELETE /api/sales/{id}
```

---

## Products API

### Get All Products
```
GET /api/produk
GET /api/produk?status=active
```

### Get Product by ID
```
GET /api/produk/{id}
```

### Create Product
```
POST /api/produk
```

**Request Body:**
```json
{
  "nama_produk": "Sabun Mandi 100gr",
  "harga_satuan": 5000.00
}
```

### Update Product
```
PUT /api/produk/{id}
```

**Request Body:**
```json
{
  "nama_produk": "Sabun Mandi 100gr",
  "harga_satuan": 5000.00,
  "status_produk": true
}
```

### Delete Product
```
DELETE /api/produk/{id}
```

---

## Stores API

### Get All Stores
```
GET /api/toko
GET /api/toko?status=active&include_sales=true
```

### Get Store by ID
```
GET /api/toko/{id}
```

### Create Store
```
POST /api/toko
```

**Request Body:**
```json
{
  "nama_toko": "Toko Berkah",
  "id_sales": 1,
  "alamat": "Jl. Raya No. 123",
  "desa": "Sukamaju",
  "kecamatan": "Kec. Sukamaju",
  "kabupaten": "Kab. Sukabumi",
  "link_gmaps": "https://maps.google.com/..."
}
```

### Update Store
```
PUT /api/toko/{id}
```

### Delete Store
```
DELETE /api/toko/{id}
```

---

## Shipments API

### Get All Shipments
```
GET /api/pengiriman
GET /api/pengiriman?include_details=true
```

### Get Shipment by ID
```
GET /api/pengiriman/{id}
```

### Create Shipment
```
POST /api/pengiriman
```

**Request Body:**
```json
{
  "id_toko": 1,
  "tanggal_kirim": "2025-01-15",
  "details": [
    {
      "id_produk": 1,
      "jumlah_kirim": 10
    },
    {
      "id_produk": 2,
      "jumlah_kirim": 5
    }
  ]
}
```

### Update Shipment
```
PUT /api/pengiriman/{id}
```

### Delete Shipment
```
DELETE /api/pengiriman/{id}
```

---

## Billing API

### Get All Billings
```
GET /api/penagihan
GET /api/penagihan?include_details=true
```

### Get Billing by ID
```
GET /api/penagihan/{id}
```

### Create Billing
```
POST /api/penagihan
```

**Request Body:**
```json
{
  "id_toko": 1,
  "total_uang_diterima": 85000.00,
  "metode_pembayaran": "Cash",
  "details": [
    {
      "id_produk": 1,
      "jumlah_terjual": 8,
      "jumlah_kembali": 2
    },
    {
      "id_produk": 2,
      "jumlah_terjual": 3,
      "jumlah_kembali": 2
    }
  ],
  "potongan": {
    "jumlah_potongan": 5000.00,
    "alasan": "Produk rusak"
  }
}
```

### Update Billing
```
PUT /api/penagihan/{id}
```

### Delete Billing
```
DELETE /api/penagihan/{id}
```

---

## Deposits API

### Get All Deposits
```
GET /api/setoran
```

### Get Deposit by ID
```
GET /api/setoran/{id}
```

### Create Deposit
```
POST /api/setoran
```

**Request Body:**
```json
{
  "total_setoran": 500000.00,
  "penerima_setoran": "Bagian Keuangan"
}
```

### Update Deposit
```
PUT /api/setoran/{id}
```

### Delete Deposit
```
DELETE /api/setoran/{id}
```

---

## Reports API

### Get Reports
```
GET /api/laporan?type={report_type}
GET /api/laporan?type={report_type}&start_date=2025-01-01&end_date=2025-01-31
```

#### Report Types:

**1. Dashboard Stats**
```
GET /api/laporan?type=dashboard-stats
```

**Response:**
```json
{
  "totalPengiriman": 25,
  "totalPenagihan": 18,
  "totalSetoran": 12,
  "totalToko": 15,
  "pendapatanHarian": 250000.00
}
```

**2. Shipment Report**
```
GET /api/laporan?type=pengiriman&start_date=2025-01-01&end_date=2025-01-31
```

**3. Billing Report**
```
GET /api/laporan?type=penagihan&start_date=2025-01-01&end_date=2025-01-31
```

**4. Reconciliation Report**
```
GET /api/laporan?type=rekonsiliasi&start_date=2025-01-01&end_date=2025-01-31
```

**Response:**
```json
[
  {
    "id_setoran": 1,
    "tanggal_setoran": "2025-01-15",
    "total_setoran": 500000.00,
    "penerima_setoran": "Bagian Keuangan",
    "total_penagihan_cash": 485000.00,
    "selisih": 15000.00
  }
]
```

---

## API Client Usage

### Frontend Integration
```typescript
import { apiClient } from '@/lib/api-client'

// Example usage
const sales = await apiClient.getSales()
const product = await apiClient.createProduct({
  nama_produk: "New Product",
  harga_satuan: 10000
})
```

### Error Handling
```typescript
try {
  const result = await apiClient.createSales(salesData)
  // Handle success
} catch (error) {
  // Handle error
  console.error('API Error:', error.message)
}
```

---

## Database Views

The API uses these database views for optimized reporting:

1. **v_laporan_pengiriman** - Shipment report with joins
2. **v_laporan_penagihan** - Billing report with joins  
3. **v_rekonsiliasi_setoran** - Deposit reconciliation report

---

## Security Notes

1. All API endpoints require authentication
2. Row Level Security (RLS) is enabled on all tables
3. Input validation is performed on all endpoints
4. SQL injection protection through parameterized queries
5. JWT token validation on every request

---

## Rate Limiting

Currently no rate limiting is implemented, but it can be added using middleware.

## Pagination

For large datasets, consider implementing pagination:
```
GET /api/pengiriman?page=1&limit=10
```

## Caching

API responses are not cached by default. Consider implementing caching for frequently accessed data like products and stores.