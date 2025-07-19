import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

// Type definitions
interface ShippedItem {
  id_produk: number
  jumlah_kirim: number
}

interface PaidItem {
  id_produk: number
  jumlah_terjual: number
}

interface Product {
  id_produk: number
}

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    try {
      // Query untuk mendapatkan total produk terkirim per produk
      const { data: shippedData, error: shippedError } = await supabaseAdmin
        .from('detail_pengiriman')
        .select(`
          id_produk,
          jumlah_kirim,
          pengiriman!inner(
            id_pengiriman,
            tanggal_kirim
          )
        `)

      if (shippedError) {
        return createErrorResponse('Failed to fetch shipped products data: ' + shippedError.message)
      }

      // Query untuk mendapatkan total produk terbayar per produk
      const { data: paidData, error: paidError } = await supabaseAdmin
        .from('detail_penagihan')
        .select(`
          id_produk,
          jumlah_terjual,
          penagihan!inner(
            id_penagihan,
            total_uang_diterima
          )
        `)

      if (paidError) {
        return createErrorResponse('Failed to fetch paid products data: ' + paidError.message)
      }


      // Agregasi data terkirim
      const shippedStats = (shippedData || []).reduce((acc: Record<number, number>, item: ShippedItem) => {
        if (item.id_produk && item.jumlah_kirim) {
          acc[item.id_produk] = (acc[item.id_produk] || 0) + item.jumlah_kirim
        }
        return acc
      }, {})

      // Agregasi data terbayar
      const paidStats = (paidData || []).reduce((acc: Record<number, number>, item: PaidItem) => {
        if (item.id_produk && item.jumlah_terjual) {
          acc[item.id_produk] = (acc[item.id_produk] || 0) + item.jumlah_terjual
        }
        return acc
      }, {})


      // Dapatkan semua produk dari database untuk memastikan semua produk ditampilkan
      const { data: allProducts, error: productsError } = await supabaseAdmin
        .from('produk')
        .select('id_produk')
        .eq('status_produk', true)

      if (productsError) {
        return createErrorResponse('Failed to fetch products: ' + productsError.message)
      }

      // Gabungkan semua ID produk (termasuk yang tidak memiliki statistik)
      const allProductIds = new Set([
        ...(allProducts || []).map((p: Product) => p.id_produk),
        ...Object.keys(shippedStats).map(Number),
        ...Object.keys(paidStats).map(Number)
      ])

      // Format hasil
      const result = Array.from(allProductIds).map(id_produk => ({
        id_produk,
        total_terkirim: shippedStats[id_produk] || 0,
        total_terbayar: paidStats[id_produk] || 0
      }))

      return createSuccessResponse(result)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return createErrorResponse('Failed to fetch product statistics: ' + errorMessage)
    }
  })
}