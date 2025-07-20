import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    console.log('Penagihan filter options API called')
    
    try {
      // Get all unique filter options from penagihan data
      const [salesResult, kabupatenResult, kecamatanResult, summaryResult] = await Promise.all([
        // Sales options
        supabaseAdmin
          .from('penagihan')
          .select(`
            toko!inner(
              sales!inner(
                id_sales,
                nama_sales
              )
            )
          `)
          .eq('toko.sales.status_aktif', true)
          .order('toko.sales.nama_sales'),
          
        // Kabupaten options
        supabaseAdmin
          .from('penagihan')
          .select(`
            toko!inner(
              kabupaten
            )
          `)
          .not('toko.kabupaten', 'is', null)
          .eq('toko.status_toko', true)
          .order('toko.kabupaten'),
          
        // Kecamatan options
        supabaseAdmin
          .from('penagihan')
          .select(`
            toko!inner(
              kecamatan,
              kabupaten
            )
          `)
          .not('toko.kecamatan', 'is', null)
          .eq('toko.status_toko', true)
          .order('toko.kecamatan'),
          
        // Summary statistics
        supabaseAdmin
          .from('penagihan')
          .select(`
            id_penagihan,
            total_uang_diterima,
            metode_pembayaran,
            ada_potongan,
            dibuat_pada,
            toko!inner(
              id_toko,
              kabupaten,
              kecamatan,
              sales!inner(
                id_sales
              )
            ),
            detail_penagihan(
              jumlah_terjual,
              jumlah_kembali
            ),
            potongan_penagihan(
              jumlah_potongan
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
      const totalBillings = summaryResult.data?.length || 0
      const today = new Date().toDateString()
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      const todayBillings = summaryResult.data?.filter((item: any) => 
        new Date(item.dibuat_pada).toDateString() === today
      ).length || 0
      
      const thisWeekBillings = summaryResult.data?.filter((item: any) => 
        new Date(item.dibuat_pada) >= weekAgo
      ).length || 0
      
      const uniqueTokoCount = summaryResult.data ? 
        new Set(summaryResult.data.map((item: any) => item.toko.id_toko)).size : 0
      
      const uniqueSalesCount = summaryResult.data ? 
        new Set(summaryResult.data.map((item: any) => item.toko.sales.id_sales)).size : 0
      
      // Calculate financial statistics
      const totalRevenue = summaryResult.data?.reduce((sum: number, item: any) => 
        sum + (item.total_uang_diterima || 0), 0) || 0
      
      const cashPayments = summaryResult.data?.filter((item: any) => 
        item.metode_pembayaran === 'Cash').length || 0
      
      const transferPayments = summaryResult.data?.filter((item: any) => 
        item.metode_pembayaran === 'Transfer').length || 0
      
      const withDeductions = summaryResult.data?.filter((item: any) => 
        item.ada_potongan).length || 0
      
      const totalDeductions = summaryResult.data?.reduce((sum: number, item: any) => {
        if (item.potongan_penagihan && item.potongan_penagihan.length > 0) {
          return sum + item.potongan_penagihan.reduce((potSum: number, pot: any) => 
            potSum + (pot.jumlah_potongan || 0), 0)
        }
        return sum
      }, 0) || 0
      
      const totalQuantitySold = summaryResult.data?.reduce((sum: number, item: any) => {
        if (item.detail_penagihan && item.detail_penagihan.length > 0) {
          return sum + item.detail_penagihan.reduce((detSum: number, detail: any) => 
            detSum + (detail.jumlah_terjual || 0), 0)
        }
        return sum
      }, 0) || 0
      
      const totalQuantityReturned = summaryResult.data?.reduce((sum: number, item: any) => {
        if (item.detail_penagihan && item.detail_penagihan.length > 0) {
          return sum + item.detail_penagihan.reduce((detSum: number, detail: any) => 
            detSum + (detail.jumlah_kembali || 0), 0)
        }
        return sum
      }, 0) || 0
      
      const summary = {
        total_billings: totalBillings,
        today_billings: todayBillings,
        this_week_billings: thisWeekBillings,
        unique_toko: uniqueTokoCount,
        unique_kabupaten: uniqueKabupaten.length,
        unique_kecamatan: uniqueKecamatan.length,
        unique_sales: uniqueSalesCount,
        total_revenue: totalRevenue,
        cash_payments: cashPayments,
        transfer_payments: transferPayments,
        with_deductions: withDeductions,
        total_deductions: totalDeductions,
        total_quantity_sold: totalQuantitySold,
        total_quantity_returned: totalQuantityReturned
      }
      
      const response = {
        sales: uniqueSales,
        kabupaten: uniqueKabupaten,
        kecamatan: uniqueKecamatan,
        metode_pembayaran: [
          { value: 'Cash', label: 'Cash', count: cashPayments },
          { value: 'Transfer', label: 'Transfer', count: transferPayments }
        ],
        ada_potongan: [
          { value: 'true', label: 'Ada Potongan', count: withDeductions },
          { value: 'false', label: 'Tanpa Potongan', count: totalBillings - withDeductions }
        ],
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
        metode_pembayaran: [
          { value: 'Cash', label: 'Cash', count: 0 },
          { value: 'Transfer', label: 'Transfer', count: 0 }
        ],
        ada_potongan: [
          { value: 'true', label: 'Ada Potongan', count: 0 },
          { value: 'false', label: 'Tanpa Potongan', count: 0 }
        ],
        summary: {
          total_billings: 0,
          today_billings: 0,
          this_week_billings: 0,
          unique_toko: 0,
          unique_kabupaten: 0,
          unique_kecamatan: 0,
          unique_sales: 0,
          total_revenue: 0,
          cash_payments: 0,
          transfer_payments: 0,
          with_deductions: 0,
          total_deductions: 0,
          total_quantity_sold: 0,
          total_quantity_returned: 0
        }
      })
    }
  })
}