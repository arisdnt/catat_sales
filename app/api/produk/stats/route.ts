import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    try {
      // Query untuk mendapatkan total produk terkirim per produk
      const { data: shippedData, error: shippedError } = await supabaseAdmin
        .from('detail_pengiriman')
        .select(`
          id_produk,
          jumlah_kirim
        `)

      if (shippedError) {
        return createErrorResponse('Failed to fetch shipped products data: ' + shippedError.message)
      }

      // Query untuk mendapatkan total produk terbayar per produk
      const { data: paidData, error: paidError } = await supabaseAdmin
        .from('detail_penagihan')
        .select(`
          id_produk,
          jumlah_terjual
        `)

      if (paidError) {
        return createErrorResponse('Failed to fetch paid products data: ' + paidError.message)
      }

      // Agregasi data terkirim
      const shippedStats = shippedData.reduce((acc: Record<number, number>, item) => {
        acc[item.id_produk] = (acc[item.id_produk] || 0) + item.jumlah_kirim
        return acc
      }, {})

      // Agregasi data terbayar
      const paidStats = paidData.reduce((acc: Record<number, number>, item) => {
        acc[item.id_produk] = (acc[item.id_produk] || 0) + item.jumlah_terjual
        return acc
      }, {})

      // Gabungkan semua ID produk
      const allProductIds = new Set([
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
    } catch (error) {
      return createErrorResponse('Failed to fetch product statistics')
    }
  })
}