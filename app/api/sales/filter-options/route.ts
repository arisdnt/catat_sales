import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    console.log('Sales filter options API called')
    
    try {
      // Get all filter options and summary statistics
      const [
        statusResult,
        phoneResult,
        summaryResult
      ] = await Promise.all([
        // Status options
        supabaseAdmin
          .from('sales')
          .select('status_aktif')
          .order('status_aktif'),
          
        // Phone number data  
        supabaseAdmin
          .from('sales')
          .select('nomor_telepon')
          .order('nomor_telepon'),
          
        // Summary statistics with sales performance data
        supabaseAdmin
          .from('sales')
          .select(`
            id_sales,
            nama_sales,
            nomor_telepon,
            status_aktif,
            dibuat_pada
          `)
      ])
      
      // Process status options
      const statusCounts = new Map()
      statusResult.data?.forEach((item: any) => {
        const status = item.status_aktif
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1)
      })
      
      const statusOptions = [
        { 
          value: 'true', 
          label: 'Aktif', 
          count: statusCounts.get(true) || 0 
        },
        { 
          value: 'false', 
          label: 'Non-aktif', 
          count: statusCounts.get(false) || 0 
        }
      ]
      
      // Process phone number options
      const phoneCounts = new Map()
      phoneResult.data?.forEach((item: any) => {
        const hasPhone = !!item.nomor_telepon
        phoneCounts.set(hasPhone, (phoneCounts.get(hasPhone) || 0) + 1)
      })
      
      const phoneOptions = [
        { 
          value: 'true', 
          label: 'Ada Nomor Telepon', 
          count: phoneCounts.get(true) || 0 
        },
        { 
          value: 'false', 
          label: 'Tanpa Nomor Telepon', 
          count: phoneCounts.get(false) || 0 
        }
      ]
      
      // Get sales performance statistics (stores, shipments, revenue)
      let salesStats = []
      if (summaryResult.data && summaryResult.data.length > 0) {
        try {
          const salesIds = summaryResult.data.map((s: any) => s.id_sales)
          
          // Get store data for each sales
          const { data: storeData } = await supabaseAdmin
            .from('toko')
            .select('id_sales')
            .in('id_sales', salesIds)
          
          // Get shipment data (join through toko)
          const { data: shipmentData } = await supabaseAdmin
            .from('pengiriman')
            .select('toko(id_sales), detail_pengiriman(jumlah_kirim)')
            .in('toko.id_sales', salesIds)
          
          // Get billing/revenue data (join through toko)
          const { data: billingData } = await supabaseAdmin
            .from('penagihan')
            .select('toko(id_sales), total_uang_diterima, detail_penagihan(jumlah_terjual, jumlah_kembali)')
            .in('toko.id_sales', salesIds)
          
          // Calculate stats for each sales
          salesStats = summaryResult.data.map((sales: any) => {
            const stores = storeData?.filter((s: any) => s.id_sales === sales.id_sales) || []
            const shipments = shipmentData?.filter((s: any) => s.toko?.id_sales === sales.id_sales) || []
            const billings = billingData?.filter((b: any) => b.toko?.id_sales === sales.id_sales) || []
            
            const total_stores = stores.length
            
            const total_shipped_items = shipments.reduce((sum: number, shipment: any) => {
              const details = Array.isArray(shipment.detail_pengiriman) ? shipment.detail_pengiriman : []
              return sum + details.reduce((detailSum: number, detail: any) => detailSum + (detail.jumlah_kirim || 0), 0)
            }, 0)
            
            const total_revenue = billings.reduce((sum: number, billing: any) => sum + (billing.total_uang_diterima || 0), 0)
            
            const total_items_sold = billings.reduce((sum: number, billing: any) => {
              const details = Array.isArray(billing.detail_penagihan) ? billing.detail_penagihan : []
              return sum + details.reduce((detailSum: number, detail: any) => detailSum + (detail.jumlah_terjual || 0), 0)
            }, 0)
            
            const total_items_returned = billings.reduce((sum: number, billing: any) => {
              const details = Array.isArray(billing.detail_penagihan) ? billing.detail_penagihan : []
              return sum + details.reduce((detailSum: number, detail: any) => detailSum + (detail.jumlah_kembali || 0), 0)
            }, 0)
            
            return {
              ...sales,
              total_stores,
              total_shipped_items,
              total_revenue,
              total_items_sold,
              total_items_returned
            }
          })
        } catch (error) {
          console.warn('Failed to fetch sales performance stats:', error)
          salesStats = summaryResult.data || []
        }
      }
      
      // Calculate summary statistics
      const totalSales = summaryResult.data?.length || 0
      const activeSales = summaryResult.data?.filter((s: any) => s.status_aktif).length || 0
      const inactiveSales = totalSales - activeSales
      const salesWithPhone = summaryResult.data?.filter((s: any) => s.nomor_telepon).length || 0
      const salesWithoutPhone = totalSales - salesWithPhone
      
      const today = new Date().toDateString()
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)
      
      const todaySales = summaryResult.data?.filter((s: any) => 
        new Date(s.dibuat_pada).toDateString() === today
      ).length || 0
      
      const thisWeekSales = summaryResult.data?.filter((s: any) => 
        new Date(s.dibuat_pada) >= weekAgo
      ).length || 0
      
      const thisMonthSales = summaryResult.data?.filter((s: any) => 
        new Date(s.dibuat_pada) >= monthAgo
      ).length || 0
      
      // Calculate performance statistics
      const totalStores = salesStats.reduce((sum: number, s: any) => sum + (s.total_stores || 0), 0)
      const totalShippedItems = salesStats.reduce((sum: number, s: any) => sum + (s.total_shipped_items || 0), 0)
      const totalRevenue = salesStats.reduce((sum: number, s: any) => sum + (s.total_revenue || 0), 0)
      const totalItemsSold = salesStats.reduce((sum: number, s: any) => sum + (s.total_items_sold || 0), 0)
      const totalItemsReturned = salesStats.reduce((sum: number, s: any) => sum + (s.total_items_returned || 0), 0)
      
      // Calculate averages
      const avgStoresPerSales = activeSales > 0 ? Math.round((totalStores / activeSales) * 100) / 100 : 0
      const avgRevenuePerSales = activeSales > 0 ? Math.round((totalRevenue / activeSales) * 100) / 100 : 0
      const avgItemsPerSales = activeSales > 0 ? Math.round((totalShippedItems / activeSales) * 100) / 100 : 0
      
      const summary = {
        total_sales: totalSales,
        active_sales: activeSales,
        inactive_sales: inactiveSales,
        sales_with_phone: salesWithPhone,
        sales_without_phone: salesWithoutPhone,
        today_sales: todaySales,
        this_week_sales: thisWeekSales,
        this_month_sales: thisMonthSales,
        total_stores_managed: totalStores,
        total_shipped_items: totalShippedItems,
        total_revenue: Math.round(totalRevenue),
        total_items_sold: totalItemsSold,
        total_items_returned: totalItemsReturned,
        avg_stores_per_sales: avgStoresPerSales,
        avg_revenue_per_sales: Math.round(avgRevenuePerSales),
        avg_items_per_sales: avgItemsPerSales
      }
      
      const response = {
        status_aktif: statusOptions,
        telepon_exists: phoneOptions,
        summary
      }
      
      console.log('Sales filter options response:', {
        statusCount: statusOptions.length,
        phoneCount: phoneOptions.length,
        summary
      })
      
      return createSuccessResponse(response)
      
    } catch (error) {
      console.error('Sales filter options error:', error)
      
      // Return fallback data structure
      return createSuccessResponse({
        status_aktif: [
          { value: 'true', label: 'Aktif', count: 0 },
          { value: 'false', label: 'Non-aktif', count: 0 }
        ],
        telepon_exists: [
          { value: 'true', label: 'Ada Nomor Telepon', count: 0 },
          { value: 'false', label: 'Tanpa Nomor Telepon', count: 0 }
        ],
        summary: {
          total_sales: 0,
          active_sales: 0,
          inactive_sales: 0,
          sales_with_phone: 0,
          sales_without_phone: 0,
          today_sales: 0,
          this_week_sales: 0,
          this_month_sales: 0,
          total_stores_managed: 0,
          total_shipped_items: 0,
          total_revenue: 0,
          total_items_sold: 0,
          total_items_returned: 0,
          avg_stores_per_sales: 0,
          avg_revenue_per_sales: 0,
          avg_items_per_sales: 0
        }
      })
    }
  })
}