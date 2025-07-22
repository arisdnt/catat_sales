import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createSuccessResponse } from '@/lib/api-helpers'

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
          
        // Summary statistics using direct table queries (mv_sales_aggregates removed)
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
      
      // Calculate basic statistics from direct sales data
      const salesData = summaryResult.data || []
      
      // Basic sales counts
      const totalSales = salesData.length
      const activeSales = salesData.filter((s: any) => s.status_aktif).length
      const inactiveSales = totalSales - activeSales
      const salesWithPhone = salesData.filter((s: any) => s.nomor_telepon).length
      const salesWithoutPhone = totalSales - salesWithPhone
      
      const today = new Date().toDateString()
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)
      
      const todaySales = salesData.filter((s: any) => 
        new Date(s.dibuat_pada).toDateString() === today
      ).length
      
      const thisWeekSales = salesData.filter((s: any) => 
        new Date(s.dibuat_pada) >= weekAgo
      ).length
      
      const thisMonthSales = salesData.filter((s: any) => 
        new Date(s.dibuat_pada) >= monthAgo
      ).length
      
      // Calculate performance statistics by querying related tables
      let totalStores = 0
      let totalShippedItems = 0  
      let totalRevenue = 0
      let totalItemsSold = 0
      let totalItemsReturned = 0
      
      try {
        // Get total stores count
        const { count: storesCount } = await supabaseAdmin
          .from('toko')
          .select('*', { count: 'exact', head: true })
        totalStores = storesCount || 0
        
        // Get shipped items total
        const { data: shippedData } = await supabaseAdmin
          .from('detail_pengiriman')
          .select('jumlah_kirim')
        totalShippedItems = shippedData?.reduce((sum, item: any) => sum + (item.jumlah_kirim || 0), 0) || 0
        
        // Get sold and returned items
        const { data: billingData } = await supabaseAdmin
          .from('detail_penagihan')
          .select('jumlah_terjual, jumlah_kembali, produk(harga_satuan)')
        
        if (billingData) {
          totalItemsSold = billingData.reduce((sum, item: any) => sum + (item.jumlah_terjual || 0), 0)
          totalItemsReturned = billingData.reduce((sum, item: any) => sum + (item.jumlah_kembali || 0), 0)
          totalRevenue = billingData.reduce((sum, item: any) => {
            const revenue = (item.jumlah_terjual || 0) * (item.produk?.harga_satuan || 0)
            return sum + revenue
          }, 0)
        }
      } catch (perfError) {
        console.warn('Failed to calculate performance statistics:', perfError)
        // Use defaults
      }
      
      // Calculate averages
      const avgStoresPerSales = activeSales > 0 ? Math.round((totalStores / activeSales) * 100) / 100 : 0
      const avgRevenuePerSales = activeSales > 0 ? Math.round((totalRevenue / activeSales) * 100) / 100 : 0
      const avgItemsPerSales = activeSales > 0 ? Math.round((totalShippedItems / activeSales) * 100) / 100 : 0
      
      // Calculate total remaining stock
      const totalRemainingStock = Math.max(0, totalShippedItems - totalItemsSold - totalItemsReturned)
      
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
        total_remaining_stock: totalRemainingStock,
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
          total_remaining_stock: 0,
          avg_stores_per_sales: 0,
          avg_revenue_per_sales: 0,
          avg_items_per_sales: 0
        }
      })
    }
  })
}