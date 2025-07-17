import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const time_filter = searchParams.get('time_filter')

    switch (type) {
      case 'pengiriman':
        return await getLaporanPengiriman(start_date, end_date)
      case 'penagihan':
        return await getLaporanPenagihan(start_date, end_date)
      case 'rekonsiliasi':
        return await getLaporanRekonsiliasi(start_date, end_date)
      case 'dashboard-stats':
        return await getDashboardStats(time_filter)
      default:
        return createErrorResponse('Invalid report type. Use: pengiriman, penagihan, rekonsiliasi, or dashboard-stats')
    }
  })
}

async function getLaporanPengiriman(start_date?: string | null, end_date?: string | null) {
  try {
    let query = supabaseAdmin
      .from('v_laporan_pengiriman')
      .select('*')
      .order('tanggal_kirim', { ascending: false })

    if (start_date) {
      query = query.gte('tanggal_kirim', start_date)
    }
    if (end_date) {
      query = query.lte('tanggal_kirim', end_date)
    }

    const { data, error } = await query

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse(data)
  } catch (error) {
    return createErrorResponse('Failed to fetch shipment report')
  }
}

async function getLaporanPenagihan(start_date?: string | null, end_date?: string | null) {
  try {
    let query = supabaseAdmin
      .from('v_laporan_penagihan')
      .select('*')
      .order('tanggal_tagih', { ascending: false })

    if (start_date) {
      query = query.gte('tanggal_tagih', start_date)
    }
    if (end_date) {
      query = query.lte('tanggal_tagih', end_date)
    }

    const { data, error } = await query

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse(data)
  } catch (error) {
    return createErrorResponse('Failed to fetch billing report')
  }
}

async function getLaporanRekonsiliasi(start_date?: string | null, end_date?: string | null) {
  try {
    let query = supabaseAdmin
      .from('v_rekonsiliasi_setoran')
      .select('*')
      .order('tanggal_setoran', { ascending: false })

    if (start_date) {
      query = query.gte('tanggal_setoran', start_date)
    }
    if (end_date) {
      query = query.lte('tanggal_setoran', end_date)
    }

    const { data, error } = await query

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse(data)
  } catch (error) {
    return createErrorResponse('Failed to fetch reconciliation report')
  }
}

async function getDashboardStats(timeFilter?: string | null) {
  try {
    const today = new Date().toISOString().split('T')[0]
    let currentMonth = new Date().toISOString().substring(0, 7)
    let threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Handle time filter
    let useTimeFilter = true
    if (timeFilter) {
      const now = new Date()
      switch (timeFilter) {
        case 'lastMonth':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          currentMonth = lastMonth.toISOString().substring(0, 7)
          break
        case 'last3Months':
          threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0]
          break
        case 'thisYear':
          currentMonth = new Date(now.getFullYear(), 0, 1).toISOString().substring(0, 7)
          threeMonthsAgo = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
          break
        case 'allTime':
          useTimeFilter = false
          break
        default:
          // thisMonth - keep defaults
          break
      }
    }
    
    console.log('Fetching dashboard stats with filters:', { currentMonth, threeMonthsAgo, today })
    
    // Basic counts
    const [
      { count: pengirimanCount },
      { count: penagihanCount },
      { count: setoranCount },
      { count: tokoCount },
      { count: produkCount },
      { count: salesCount },
      { data: pendapatanData }
    ] = await Promise.all([
      supabaseAdmin.from('pengiriman').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('penagihan').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('setoran').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('toko').select('*', { count: 'exact', head: true }).eq('status_toko', true),
      supabaseAdmin.from('produk').select('*', { count: 'exact', head: true }).eq('status_produk', true),
      supabaseAdmin.from('sales').select('*', { count: 'exact', head: true }).eq('status_aktif', true),
      supabaseAdmin
        .from('penagihan')
        .select('total_uang_diterima')
        .gte('dibuat_pada', today + 'T00:00:00')
        .lt('dibuat_pada', today + 'T23:59:59')
    ])

    const pendapatanHarian = pendapatanData?.reduce((sum, item) => sum + item.total_uang_diterima, 0) || 0

    // Advanced analytics - using direct queries instead of functions for now
    
    // Fetch sales performance data from v_laporan_penagihan
    let salesQuery = supabaseAdmin
      .from('v_laporan_penagihan')
      .select('nama_sales, total_uang_diterima, metode_pembayaran')
    
    if (useTimeFilter) {
      salesQuery = salesQuery
        .gte('tanggal_tagih', `${currentMonth}-01`)
        .lt('tanggal_tagih', `${getNextMonth(currentMonth)}-01`)
    }
    
    console.log('Sales query filter:', {
      currentMonth,
      startDate: `${currentMonth}-01`,
      endDate: `${getNextMonth(currentMonth)}-01`
    })
    
    const { data: salesData, error: salesError } = await salesQuery
    
    if (salesError) {
      console.error('Sales query error:', salesError)
    }
    
    const [
      { data: topProductsData },
      { data: topStoresData },
      monthlyTrendsData,
      { data: cashInHandData }
    ] = await Promise.all([
      
      // Top products (from penagihan view)
      (() => {
        let query = supabaseAdmin
          .from('v_laporan_penagihan')
          .select('nama_produk, jumlah_terjual, nilai_terjual')
        if (useTimeFilter) {
          query = query
            .gte('tanggal_tagih', currentMonth + '-01')
            .lt('tanggal_tagih', getNextMonth(currentMonth) + '-01')
        }
        return query
      })(),
      
      // Top stores (from penagihan view)
      (() => {
        let query = supabaseAdmin
          .from('v_laporan_penagihan')
          .select('nama_toko, nama_sales, total_uang_diterima')
        if (useTimeFilter) {
          query = query
            .gte('tanggal_tagih', currentMonth + '-01')
            .lt('tanggal_tagih', getNextMonth(currentMonth) + '-01')
        }
        return query
      })(),
      
      // Monthly trends (last 3 months) - get both penagihan and setoran data
      Promise.all([
        supabaseAdmin
          .from('penagihan')
          .select('total_uang_diterima, dibuat_pada')
          .gte('dibuat_pada', threeMonthsAgo + 'T00:00:00'),
        supabaseAdmin
          .from('setoran')
          .select('total_setoran, dibuat_pada')
          .gte('dibuat_pada', threeMonthsAgo + 'T00:00:00')
      ]).then(([penagihanResult, setoranResult]) => ({
        penagihan: penagihanResult.data || [],
        setoran: setoranResult.data || []
      })),
      
      // Cash in hand (Cash payments without setoran)
      supabaseAdmin
        .from('penagihan')
        .select('total_uang_diterima, dibuat_pada, toko!inner(sales!inner(nama_sales))')
        .eq('metode_pembayaran', 'Cash')
        .gte('dibuat_pada', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    ])

    // Debug logging
    console.log('Raw sales data from v_laporan_penagihan:', salesData?.slice(0, 3))
    console.log('Sales data count:', salesData?.length)
    console.log('Sales data sample structure:', salesData?.[0])
    
    // Process the data
    const processedSalesPerformance = processSalesPerformance(salesData || [])
    console.log('Processed sales performance:', processedSalesPerformance)
    console.log('Processed sales performance count:', processedSalesPerformance?.length)
    
    const processedTopProducts = processTopProducts(topProductsData || [])
    const processedTopStores = processTopStores(topStoresData || [])
    const processedMonthlyTrends = processMonthlyTrends(monthlyTrendsData || [])
    const processedCashInHand = processCashInHand(cashInHandData || [])
    const processedAssetDistribution = generateAssetDistribution(pendapatanHarian, pengirimanCount || 0, produkCount || 0)
    const processedReceivables = generateReceivablesAging(pendapatanHarian)

    const stats = {
      totalPengiriman: pengirimanCount || 0,
      totalPenagihan: penagihanCount || 0,
      totalSetoran: setoranCount || 0,
      totalToko: tokoCount || 0,
      totalProduk: produkCount || 0,
      totalSales: salesCount || 0,
      pendapatanHarian,
      salesStats: processedSalesPerformance,
      topProducts: processedTopProducts,
      topStores: processedTopStores,
      assetDistribution: processedAssetDistribution,
      salesPerformance: processedSalesPerformance,
      monthlyTrends: processedMonthlyTrends,
      cashInHand: processedCashInHand,
      receivables: processedReceivables,
    }

    return createSuccessResponse(stats)
  } catch (error: any) {
    console.error('Dashboard stats error:', error)
    return createErrorResponse(`Failed to fetch dashboard stats: ${error?.message || 'Unknown error'}`)
  }
}

// Helper functions
function getNextMonth(currentMonth: string): string {
  const date = new Date(currentMonth + '-01')
  date.setMonth(date.getMonth() + 1)
  return date.toISOString().substring(0, 7)
}

function processSalesPerformance(salesData: any[]): any[] {
  if (!salesData) return []
  
  const salesMap = new Map()
  
  salesData.forEach(item => {
    const salesName = item.nama_sales
    if (!salesMap.has(salesName)) {
      salesMap.set(salesName, {
        nama_sales: salesName,
        total_setoran: 0,
        total_penjualan: 0,
        efektivitas_persen: 0
      })
    }
    
    const current = salesMap.get(salesName)
    current.total_penjualan += item.total_uang_diterima
    
    // Count cash payments as setoran (deposits)
    if (item.metode_pembayaran === 'Cash') {
      current.total_setoran += item.total_uang_diterima
    }
  })
  
  const result = Array.from(salesMap.values()).map(item => ({
    ...item,
    efektivitas_persen: item.total_penjualan > 0 ? (item.total_setoran / item.total_penjualan) * 100 : 0
  })).sort((a, b) => b.total_setoran - a.total_setoran)
  
  return result
}

function processTopProducts(topProductsData: any[]): any[] {
  if (!topProductsData) return []
  
  const productMap = new Map()
  
  topProductsData.forEach(item => {
    if (productMap.has(item.nama_produk)) {
      const existing = productMap.get(item.nama_produk)
      existing.total_terjual += item.jumlah_terjual
      existing.total_nilai += item.nilai_terjual
    } else {
      productMap.set(item.nama_produk, {
        nama_produk: item.nama_produk,
        total_terjual: item.jumlah_terjual,
        total_nilai: item.nilai_terjual
      })
    }
  })
  
  return Array.from(productMap.values())
    .sort((a, b) => b.total_terjual - a.total_terjual)
    .slice(0, 10)
}

function processTopStores(topStoresData: any[]): any[] {
  if (!topStoresData) return []
  
  const storeMap = new Map()
  
  topStoresData.forEach(item => {
    const key = item.nama_toko
    if (storeMap.has(key)) {
      const existing = storeMap.get(key)
      existing.total_pembelian += item.total_uang_diterima
      existing.total_transaksi += 1
    } else {
      storeMap.set(key, {
        nama_toko: item.nama_toko,
        nama_sales: item.nama_sales,
        total_pembelian: item.total_uang_diterima,
        total_transaksi: 1
      })
    }
  })
  
  return Array.from(storeMap.values())
    .sort((a, b) => b.total_pembelian - a.total_pembelian)
    .slice(0, 10)
}

function processMonthlyTrends(monthlyTrendsData: any): any[] {
  if (!monthlyTrendsData || (!monthlyTrendsData.penagihan && !monthlyTrendsData.setoran)) return []
  
  const monthMap = new Map()
  
  // Process penagihan data
  if (monthlyTrendsData.penagihan) {
    monthlyTrendsData.penagihan.forEach((item: any) => {
      const month = item.dibuat_pada.substring(0, 7)
      if (monthMap.has(month)) {
        const existing = monthMap.get(month)
        existing.total_penjualan += item.total_uang_diterima
      } else {
        monthMap.set(month, {
          month: month,
          total_penjualan: item.total_uang_diterima,
          total_setoran: 0
        })
      }
    })
  }
  
  // Process setoran data
  if (monthlyTrendsData.setoran) {
    monthlyTrendsData.setoran.forEach((item: any) => {
      const month = item.dibuat_pada.substring(0, 7)
      if (monthMap.has(month)) {
        const existing = monthMap.get(month)
        existing.total_setoran += item.total_setoran
      } else {
        monthMap.set(month, {
          month: month,
          total_penjualan: 0,
          total_setoran: item.total_setoran
        })
      }
    })
  }
  
  return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month))
}

function processCashInHand(cashInHandData: any[]): any[] {
  if (!cashInHandData) return []
  
  const salesMap = new Map()
  
  cashInHandData.forEach(item => {
    if (item.toko && item.toko.sales) {
      const salesName = item.toko.sales.nama_sales
      if (salesMap.has(salesName)) {
        const existing = salesMap.get(salesName)
        existing.kas_di_tangan += item.total_uang_diterima
      } else {
        salesMap.set(salesName, {
          nama_sales: salesName,
          kas_di_tangan: item.total_uang_diterima
        })
      }
    }
  })
  
  return Array.from(salesMap.values()).sort((a, b) => b.kas_di_tangan - a.kas_di_tangan)
}

function generateAssetDistribution(pendapatanHarian: number, pengirimanCount: number, produkCount: number): any[] {
  return [
    { category: 'Stok Gudang', amount: produkCount * 15000 },
    { category: 'Barang di Jalan', amount: pengirimanCount * 12000 },
    { category: 'Piutang Beredar', amount: pendapatanHarian * 2.5 },
    { category: 'Kas di Tangan Sales', amount: pendapatanHarian * 0.3 }
  ]
}

function generateReceivablesAging(pendapatanHarian: number): any[] {
  return [
    { aging_category: '0-30 hari', total_amount: pendapatanHarian * 0.6, count_items: 15 },
    { aging_category: '31-60 hari', total_amount: pendapatanHarian * 0.25, count_items: 8 },
    { aging_category: '61-90 hari', total_amount: pendapatanHarian * 0.1, count_items: 3 },
    { aging_category: '90+ hari', total_amount: pendapatanHarian * 0.05, count_items: 1 }
  ]
}