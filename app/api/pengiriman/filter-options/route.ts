import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    console.log('Pengiriman filter options API called')
    
    try {
      // Get all unique filter options from pengiriman data
      const [salesResult, kabupatenResult, kecamatanResult, summaryResult] = await Promise.all([
        // Sales options
        supabaseAdmin
          .from('pengiriman')
          .select(`
            toko!inner(
              sales!inner(
                id_sales,
                nama_sales
              )
            )
          `)
          .eq('toko.sales.status_aktif', true),
          
        // Kabupaten options
        supabaseAdmin
          .from('pengiriman')
          .select(`
            toko!inner(
              kabupaten
            )
          `)
          .not('toko.kabupaten', 'is', null)
          .eq('toko.status_toko', true),
          
        // Kecamatan options
        supabaseAdmin
          .from('pengiriman')
          .select(`
            toko!inner(
              kecamatan,
              kabupaten
            )
          `)
          .not('toko.kecamatan', 'is', null)
          .eq('toko.status_toko', true),
          
        // Summary statistics
        supabaseAdmin
          .from('pengiriman')
          .select(`
            id_pengiriman,
            tanggal_kirim,
            toko!inner(
              id_toko,
              kabupaten,
              kecamatan,
              sales!inner(
                id_sales
              )
            )
          `)
      ])
      
      // Process sales options (remove duplicates)
      const uniqueSales = salesResult.data ? 
        Array.from(
          new Map(salesResult.data.map((item: any) => [
            item.toko.sales.id_sales, 
            {
              value: item.toko.sales.id_sales.toString(),
              label: item.toko.sales.nama_sales,
              count: 0 // Will be calculated below
            }
          ])).values()
        ) : []
      
      // Process kabupaten options (remove duplicates and count)
      const kabupatenCounts = new Map()
      kabupatenResult.data?.forEach((item: any) => {
        const kabupaten = item.toko.kabupaten
        if (kabupaten) {
          kabupatenCounts.set(kabupaten, (kabupatenCounts.get(kabupaten) || 0) + 1)
        }
      })
      
      const uniqueKabupaten = Array.from(kabupatenCounts.entries()).map(([kabupaten, count]) => ({
        value: kabupaten,
        label: kabupaten,
        count
      })).sort((a, b) => a.label.localeCompare(b.label))
      
      // Process kecamatan options (remove duplicates and count)
      const kecamatanCounts = new Map()
      kecamatanResult.data?.forEach((item: any) => {
        const kecamatan = item.toko.kecamatan
        if (kecamatan) {
          const key = `${kecamatan}|${item.toko.kabupaten || ''}`
          kecamatanCounts.set(key, {
            kecamatan,
            kabupaten: item.toko.kabupaten,
            count: (kecamatanCounts.get(key)?.count || 0) + 1
          })
        }
      })
      
      const uniqueKecamatan = Array.from(kecamatanCounts.values()).map(item => ({
        value: item.kecamatan,
        label: item.kecamatan,
        description: item.kabupaten ? `di ${item.kabupaten}` : '',
        count: item.count
      })).sort((a, b) => a.label.localeCompare(b.label))
      
      // Calculate sales counts from summary data
      if (summaryResult.data) {
        const salesCounts = new Map()
        summaryResult.data.forEach((item: any) => {
          const salesId = item.toko.sales.id_sales
          salesCounts.set(salesId, (salesCounts.get(salesId) || 0) + 1)
        })
        
        // Update sales options with counts
        uniqueSales.forEach((sales: any) => {
          sales.count = salesCounts.get(parseInt(sales.value)) || 0
        })
      }
      
      // Calculate summary statistics
      const totalShipments = summaryResult.data?.length || 0
      const today = new Date().toDateString()
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      const todayShipments = summaryResult.data?.filter((item: any) => 
        new Date(item.tanggal_kirim).toDateString() === today
      ).length || 0
      
      const thisWeekShipments = summaryResult.data?.filter((item: any) => 
        new Date(item.tanggal_kirim) >= weekAgo
      ).length || 0
      
      const uniqueTokoCount = summaryResult.data ? 
        new Set(summaryResult.data.map((item: any) => item.toko.id_toko)).size : 0
      
      const uniqueSalesCount = summaryResult.data ? 
        new Set(summaryResult.data.map((item: any) => item.toko.sales.id_sales)).size : 0
      
      const summary = {
        total_shipments: totalShipments,
        today_shipments: todayShipments,
        this_week_shipments: thisWeekShipments,
        unique_toko: uniqueTokoCount,
        unique_kabupaten: uniqueKabupaten.length,
        unique_kecamatan: uniqueKecamatan.length,
        unique_sales: uniqueSalesCount
      }
      
      const response = {
        sales: uniqueSales,
        kabupaten: uniqueKabupaten,
        kecamatan: uniqueKecamatan,
        summary
      }
      
      console.log('Filter options response:', {
        salesCount: uniqueSales.length,
        kabupatenCount: uniqueKabupaten.length,
        kecamatanCount: uniqueKecamatan.length,
        summary
      })
      
      return createSuccessResponse(response)
      
    } catch (error) {
      console.error('Filter options error:', error)
      
      // Return fallback data structure
      return createSuccessResponse({
        sales: [],
        kabupaten: [],
        kecamatan: [],
        summary: {
          total_shipments: 0,
          today_shipments: 0,
          this_week_shipments: 0,
          unique_toko: 0,
          unique_kabupaten: 0,
          unique_kecamatan: 0,
          unique_sales: 0
        }
      })
    }
  })
}