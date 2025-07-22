import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  // Return mock data that should show statistics for all products
  const mockData = [
    {
      id_produk: 1,
      nama_produk: "SMOOTH LOVE",
      harga_satuan: 30000,
      status_produk: true,
      is_priority: true,
      priority_order: 1,
      dibuat_pada: "2025-07-19T02:10:24.799052",
      diperbarui_pada: "2025-07-19T02:10:24.799052",
      stats: {
        total_terkirim: 4,
        total_terjual: 6,
        total_kembali: 0,
        total_terbayar: 6,
        sisa_stok: -2,
        has_data_inconsistency: true
      }
    },
    {
      id_produk: 2,
      nama_produk: "MR LOVER",
      harga_satuan: 30000,
      status_produk: true,
      is_priority: true,
      priority_order: 2,
      dibuat_pada: "2025-07-19T02:10:58.683807",
      diperbarui_pada: "2025-07-19T02:10:58.683807",
      stats: {
        total_terkirim: 4,
        total_terjual: 5,
        total_kembali: 0,
        total_terbayar: 5,
        sisa_stok: -1,
        has_data_inconsistency: true
      }
    },
    {
      id_produk: 3,
      nama_produk: "LUNCY",
      harga_satuan: 30000,
      status_produk: true,
      is_priority: true,
      priority_order: 3,
      dibuat_pada: "2025-07-19T02:11:28.151108",
      diperbarui_pada: "2025-07-19T02:11:28.151108",
      stats: {
        total_terkirim: 4,
        total_terjual: 2,
        total_kembali: 0,
        total_terbayar: 2,
        sisa_stok: 2,
        has_data_inconsistency: false
      }
    },
    {
      id_produk: 4,
      nama_produk: "LUNCY AMETHYIS",
      harga_satuan: 30000,
      status_produk: true,
      is_priority: true,
      priority_order: 4,
      dibuat_pada: "2025-07-19T02:11:45.696261",
      diperbarui_pada: "2025-07-19T02:11:45.696261",
      stats: {
        total_terkirim: 4,
        total_terjual: 2,
        total_kembali: 0,
        total_terbayar: 2,
        sisa_stok: 2,
        has_data_inconsistency: false
      }
    },
    {
      id_produk: 5,
      nama_produk: "SCADAL WOMEN",
      harga_satuan: 30000,
      status_produk: true,
      is_priority: true,
      priority_order: 5,
      dibuat_pada: "2025-07-19T02:12:03.704533",
      diperbarui_pada: "2025-07-19T02:12:03.704533",
      stats: {
        total_terkirim: 4,
        total_terjual: 2,
        total_kembali: 0,
        total_terbayar: 2,
        sisa_stok: 2,
        has_data_inconsistency: false
      }
    }
  ]

  return createSuccessResponse({
    data: mockData,
    pagination: {
      page: 1,
      limit: 20,
      total: 5,
      total_pages: 1
    },
    filters: {},
    sorting: {
      sortBy: 'nama_produk',
      sortOrder: 'asc'
    }
  })
}