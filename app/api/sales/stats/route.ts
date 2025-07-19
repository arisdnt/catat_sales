import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

// Type definitions
interface StoreData {
  id_sales: number
}

interface ShipmentData {
  jumlah_kirim: number
  pengiriman?: {
    toko?: {
      id_sales: number
    }
  }
}

interface RevenueData {
  total_uang_diterima: number
  toko?: {
    id_sales: number
  }
}

interface SalesData {
  id_sales: number
  nama_sales: string
}

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    try {
      // Get store count for each sales
      const { data: storeStats, error: storeError } = await supabaseAdmin
        .from('toko')
        .select('id_sales')
        .eq('status_toko', true)

      if (storeError) {
        return createErrorResponse('Failed to fetch store statistics: ' + storeError.message)
      }

      // Get shipment stats for each sales
      const { data: shipmentStats, error: shipmentError } = await supabaseAdmin
        .from('detail_pengiriman')
        .select(`
          jumlah_kirim,
          pengiriman!inner(
            toko!inner(id_sales)
          )
        `)

      if (shipmentError) {
        return createErrorResponse('Failed to fetch shipment statistics: ' + shipmentError.message)
      }

      // Get revenue stats for each sales
      const { data: revenueStats, error: revenueError } = await supabaseAdmin
        .from('penagihan')
        .select(`
          total_uang_diterima,
          toko!inner(id_sales)
        `)

      if (revenueError) {
        return createErrorResponse('Failed to fetch revenue statistics: ' + revenueError.message)
      }

      // Get all sales
      const { data: allSales, error: salesError } = await supabaseAdmin
        .from('sales')
        .select('id_sales, nama_sales')
        .eq('status_aktif', true)

      if (salesError) {
        return createErrorResponse('Failed to fetch sales: ' + salesError.message)
      }

      // Process statistics
      const storeCountMap = new Map<number, number>()
      const shipmentCountMap = new Map<number, number>()
      const revenueCountMap = new Map<number, number>()

      // Count stores per sales
      storeStats?.forEach((store: StoreData) => {
        const salesId = store.id_sales
        storeCountMap.set(salesId, (storeCountMap.get(salesId) || 0) + 1)
      })

      // Count shipments per sales
      shipmentStats?.forEach((item: ShipmentData) => {
        const salesId = item.pengiriman?.toko?.id_sales
        if (salesId) {
          shipmentCountMap.set(salesId, (shipmentCountMap.get(salesId) || 0) + (item.jumlah_kirim || 0))
        }
      })

      // Count revenue per sales
      revenueStats?.forEach((item: RevenueData) => {
        const salesId = item.toko?.id_sales
        if (salesId) {
          revenueCountMap.set(salesId, (revenueCountMap.get(salesId) || 0) + (item.total_uang_diterima || 0))
        }
      })

      // Build final result
      const result = (allSales || []).map((sales: SalesData) => ({
        id_sales: sales.id_sales,
        nama_sales: sales.nama_sales,
        total_stores: storeCountMap.get(sales.id_sales) || 0,
        total_shipped_items: shipmentCountMap.get(sales.id_sales) || 0,
        total_revenue: revenueCountMap.get(sales.id_sales) || 0
      }))

      return createSuccessResponse(result)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return createErrorResponse('Failed to fetch sales statistics: ' + errorMessage)
    }
  })
}