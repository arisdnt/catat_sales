import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

// Force this API route to use Node.js runtime
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Type definitions
interface SalesData {
  nama_sales: string
  total_uang_diterima: number
  metode_pembayaran: string
}

interface SalesPerformance {
  nama_sales: string
  total_setoran: number
  total_penjualan: number
  efektivitas_persen: number
}

interface ProductData {
  nama_produk: string
  jumlah_terjual: number
  nilai_terjual: number
}

interface TopProduct {
  nama_produk: string
  total_terjual: number
  total_nilai: number
}

interface StoreData {
  nama_toko: string
  nama_sales: string
  total_uang_diterima: number
}

interface TopStore {
  nama_toko: string
  nama_sales: string
  total_pembelian: number
  total_transaksi: number
}

interface MonthlyData {
  dibuat_pada: string
  total_uang_diterima?: number
  total_setoran?: number
}

interface MonthlyTrend {
  month: string
  total_penjualan: number
  total_setoran: number
}

interface MonthlyTrendsData {
  penagihan?: MonthlyData[]
  setoran?: MonthlyData[]
}

interface CashInHandData {
  total_uang_diterima: number
  dibuat_pada: string
  toko: {
    sales: {
      nama_sales: string
    }[]
  }[]
}

interface CashInHand {
  nama_sales: string
  kas_di_tangan: number
}

interface AssetDistribution {
  category: string
  amount: number
}

interface ReceivablesAging {
  aging_category: string
  total_amount: number
  count_items: number
}

interface ProductMovementItem {
  type: 'shipment' | 'billing'
  id: number
  date: string
  store: string
  sales: string
  product: string
  quantity?: number
  quantity_sold?: number
  quantity_returned?: number
  value: number
  payment_method?: string
  has_discount?: boolean
  description: string
}

interface ShipmentMovementData {
  jumlah_kirim: number
  produk: {
    nama_produk: string
    harga_satuan: number
  }
  pengiriman: {
    id_pengiriman: number
    tanggal_kirim: string
    toko: {
      nama_toko: string
      sales: {
        nama_sales: string
      }
    }
  }
}

interface BillingMovementData {
  jumlah_terjual: number
  jumlah_kembali: number
  produk: {
    nama_produk: string
    harga_satuan: number
  }
  penagihan: {
    id_penagihan: number
    dibuat_pada: string
    metode_pembayaran: string
    ada_potongan: boolean
    toko: {
      nama_toko: string
      sales: {
        nama_sales: string
      }
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const time_filter = searchParams.get('time_filter')

    // For dashboard-stats, allow access without authentication for now
    if (type === 'dashboard-stats') {
      return await getDashboardStats(time_filter)
    }

    // For other endpoints, use authentication
    return handleApiRequest(request, async () => {
      switch (type) {
        case 'pengiriman':
          return await getLaporanPengiriman(start_date, end_date)
        case 'penagihan':
          return await getLaporanPenagihan(start_date, end_date)
        case 'rekonsiliasi':
          return await getLaporanRekonsiliasi(start_date, end_date)
        case 'product-movement':
          const product_id = searchParams.get('product_id')
          return await getProductMovement(product_id, start_date, end_date)
        default:
          return createErrorResponse('Invalid report type. Use: pengiriman, penagihan, rekonsiliasi, dashboard-stats, or product-movement')
      }
    })
  } catch (error) {
    console.error('API Error:', error)
    return createErrorResponse('Internal server error', 500)
  }
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
  } catch {
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
  } catch {
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
  } catch {
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
    
    // Try to use new materialized views first, fallback to direct queries
    let realtimeStats = null
    try {
      const { data: statsData } = await supabaseAdmin
        .from('mv_dashboard_realtime_stats')
        .select('*')
        .single()
      realtimeStats = statsData
    } catch (error) {
      console.log('Materialized view not available, using direct queries')
    }
    
    // Basic counts - use materialized view data if available, otherwise direct queries
    const [
      { count: pengirimanCount },
      { count: penagihanCount },
      { count: setoranCount },
      { count: tokoCount },
      { count: produkCount },
      { count: salesCount },
      { data: pendapatanData }
    ] = realtimeStats ? [
      { count: realtimeStats.total_pengiriman },
      { count: realtimeStats.total_penagihan },
      { count: realtimeStats.total_setoran },
      { count: realtimeStats.total_toko },
      { count: realtimeStats.total_produk },
      { count: realtimeStats.total_sales },
      { data: [{ total_uang_diterima: realtimeStats.pendapatan_harian }] }
    ] : await Promise.all([
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
    
    
    const { data: salesData, error: salesError } = await salesQuery
    
    if (salesError) {
      // Sales query error - continue with empty data
    }
    
    // Try to use new materialized views for enhanced data
    let enhancedSalesPerformance = null
    let enhancedAssetDistribution = null
    let enhancedReceivables = null
    
    try {
      const [salesPerfData, assetDistData, receivablesData] = await Promise.all([
        supabaseAdmin.from('mv_sales_performance_real').select('*'),
        supabaseAdmin.from('mv_asset_distribution_real').select('*'),
        supabaseAdmin.from('mv_receivables_aging_real').select('*')
      ])
      
      enhancedSalesPerformance = salesPerfData.data
      enhancedAssetDistribution = assetDistData.data
      enhancedReceivables = receivablesData.data
    } catch (error) {
      console.log('Enhanced materialized views not available, using fallback queries')
    }

    const [
      { data: topProductsData },
      { data: topStoresData },
      monthlyTrendsData,
      { data: cashInHandData }
    ] = await Promise.all([
      
      // Top products (from v_laporan_penagihan or fallback)
      (async () => {
        try {
          let query = supabaseAdmin
            .from('v_laporan_penagihan')
            .select('nama_produk, jumlah_terjual, nilai_terjual')
          if (useTimeFilter) {
            query = query
              .gte('tanggal_tagih', currentMonth + '-01')
              .lt('tanggal_tagih', getNextMonth(currentMonth) + '-01')
          }
          return await query
        } catch (error) {
          // Fallback to direct query
          let query = supabaseAdmin
            .from('penagihan')
            .select(`
              total_uang_diterima,
              detail_penagihan!inner(
                jumlah_terjual,
                produk!inner(nama_produk, harga_satuan)
              )
            `)
          if (useTimeFilter) {
            query = query
              .gte('dibuat_pada', currentMonth + '-01T00:00:00')
              .lt('dibuat_pada', getNextMonth(currentMonth) + '-01T00:00:00')
          }
          return await query
        }
      })(),
      
      // Top stores (from v_laporan_penagihan or fallback)
      (async () => {
        try {
          let query = supabaseAdmin
            .from('v_laporan_penagihan')
            .select('nama_toko, nama_sales, total_uang_diterima')
          if (useTimeFilter) {
            query = query
              .gte('tanggal_tagih', currentMonth + '-01')
              .lt('tanggal_tagih', getNextMonth(currentMonth) + '-01')
          }
          return await query
        } catch (error) {
          // Fallback to direct query
          let query = supabaseAdmin
            .from('penagihan')
            .select(`
              total_uang_diterima,
              toko!inner(
                nama_toko,
                sales!inner(nama_sales)
              )
            `)
          if (useTimeFilter) {
            query = query
              .gte('dibuat_pada', currentMonth + '-01T00:00:00')
              .lt('dibuat_pada', getNextMonth(currentMonth) + '-01T00:00:00')
          }
          return await query
        }
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
      
      // Real cash in hand calculation
      (async () => {
        if (enhancedSalesPerformance) {
          return { data: enhancedSalesPerformance.filter(s => s.kas_di_tangan > 0) }
        } else {
          // Fallback: Cash payments minus deposits per sales
          return supabaseAdmin
            .from('penagihan')
            .select(`
              total_uang_diterima, 
              dibuat_pada, 
              toko!inner(
                sales!inner(nama_sales)
              )
            `)
            .eq('metode_pembayaran', 'Cash')
            .gte('dibuat_pada', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        }
      })()
    ])

    
    // Process the data - use enhanced data when available
    const processedSalesPerformance = enhancedSalesPerformance || processSalesPerformance(salesData || [])
    
    const processedTopProducts = processTopProducts(
      Array.isArray(topProductsData) && topProductsData.length > 0 && 'nama_produk' in topProductsData[0] 
        ? topProductsData as ProductData[]
        : []
    )
    const processedTopStores = processTopStores(
      Array.isArray(topStoresData) && topStoresData.length > 0 && 'nama_toko' in topStoresData[0]
        ? topStoresData as StoreData[]
        : []
    )
    const processedMonthlyTrends = processMonthlyTrends(monthlyTrendsData || [])
    const processedCashInHand = enhancedSalesPerformance ? 
      enhancedSalesPerformance.filter(s => s.kas_di_tangan > 0).map(s => ({
        nama_sales: s.nama_sales,
        kas_di_tangan: s.kas_di_tangan
      })) : processCashInHand(cashInHandData || [])
    
    const processedAssetDistribution = enhancedAssetDistribution || 
      generateAssetDistribution(pendapatanHarian, pengirimanCount || 0, produkCount || 0)
    
    const processedReceivables = enhancedReceivables || 
      generateReceivablesAging(pendapatanHarian)

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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Dashboard stats error:', error)
    
    // Return fallback stats in case of error
    const fallbackStats = {
      totalPengiriman: 0,
      totalPenagihan: 0,
      totalSetoran: 0,
      totalToko: 0,
      totalProduk: 0,
      totalSales: 0,
      pendapatanHarian: 0,
      salesStats: [],
      topProducts: [],
      topStores: [],
      assetDistribution: [
        { category: 'Stok Gudang', amount: 0 },
        { category: 'Barang di Jalan', amount: 0 },
        { category: 'Piutang Beredar', amount: 0 },
        { category: 'Kas di Tangan Sales', amount: 0 }
      ],
      salesPerformance: [],
      monthlyTrends: [],
      cashInHand: [],
      receivables: [],
      error: true,
      errorMessage: `Dashboard temporarily unavailable: ${errorMessage}`
    }
    
    return createSuccessResponse(fallbackStats)
  }
}

// Helper functions
function getNextMonth(currentMonth: string): string {
  const date = new Date(currentMonth + '-01')
  date.setMonth(date.getMonth() + 1)
  return date.toISOString().substring(0, 7)
}

function processSalesPerformance(salesData: SalesData[]): SalesPerformance[] {
  if (!salesData) return []
  
  const salesMap = new Map<string, SalesPerformance>()
  
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
    if (current) {
      current.total_penjualan += item.total_uang_diterima
      
      // Count cash payments as setoran (deposits)
      if (item.metode_pembayaran === 'Cash') {
        current.total_setoran += item.total_uang_diterima
      }
    }
  })
  
  const result = Array.from(salesMap.values()).map(item => ({
    ...item,
    efektivitas_persen: item.total_penjualan > 0 ? (item.total_setoran / item.total_penjualan) * 100 : 0
  })).sort((a, b) => b.total_setoran - a.total_setoran)
  
  return result
}

function processTopProducts(topProductsData: ProductData[]): TopProduct[] {
  if (!topProductsData) return []
  
  const productMap = new Map<string, TopProduct>()
  
  topProductsData.forEach(item => {
    if (productMap.has(item.nama_produk)) {
      const existing = productMap.get(item.nama_produk)
      if (existing) {
        existing.total_terjual += item.jumlah_terjual
        existing.total_nilai += item.nilai_terjual
      }
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

function processTopStores(topStoresData: StoreData[]): TopStore[] {
  if (!topStoresData) return []
  
  const storeMap = new Map<string, TopStore>()
  
  topStoresData.forEach(item => {
    const key = item.nama_toko
    if (storeMap.has(key)) {
      const existing = storeMap.get(key)
      if (existing) {
        existing.total_pembelian += item.total_uang_diterima
        existing.total_transaksi += 1
      }
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

function processMonthlyTrends(monthlyTrendsData: MonthlyTrendsData): MonthlyTrend[] {
  if (!monthlyTrendsData || (!monthlyTrendsData.penagihan && !monthlyTrendsData.setoran)) return []
  
  const monthMap = new Map<string, MonthlyTrend>()
  
  // Process penagihan data
  if (monthlyTrendsData.penagihan) {
    monthlyTrendsData.penagihan.forEach((item: MonthlyData) => {
      const month = item.dibuat_pada.substring(0, 7)
      if (monthMap.has(month)) {
        const existing = monthMap.get(month)
        if (existing) {
          existing.total_penjualan += item.total_uang_diterima || 0
        }
      } else {
        monthMap.set(month, {
          month: month,
          total_penjualan: item.total_uang_diterima || 0,
          total_setoran: 0
        })
      }
    })
  }
  
  // Process setoran data
  if (monthlyTrendsData.setoran) {
    monthlyTrendsData.setoran.forEach((item: MonthlyData) => {
      const month = item.dibuat_pada.substring(0, 7)
      if (monthMap.has(month)) {
        const existing = monthMap.get(month)
        if (existing) {
          existing.total_setoran += item.total_setoran || 0
        }
      } else {
        monthMap.set(month, {
          month: month,
          total_penjualan: 0,
          total_setoran: item.total_setoran || 0
        })
      }
    })
  }
  
  return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month))
}

function processCashInHand(cashInHandData: CashInHandData[]): CashInHand[] {
  if (!cashInHandData) return []
  
  const salesMap = new Map<string, CashInHand>()
  
  cashInHandData.forEach(item => {
    if (item.toko && item.toko.length > 0 && item.toko[0].sales && item.toko[0].sales.length > 0) {
      const salesName = item.toko[0].sales[0].nama_sales
      if (salesMap.has(salesName)) {
        const existing = salesMap.get(salesName)
        if (existing) {
          existing.kas_di_tangan += item.total_uang_diterima || 0
        }
      } else {
        salesMap.set(salesName, {
          nama_sales: salesName,
          kas_di_tangan: item.total_uang_diterima || 0
        })
      }
    }
  })
  
  return Array.from(salesMap.values()).sort((a, b) => b.kas_di_tangan - a.kas_di_tangan)
}

function generateAssetDistribution(pendapatanHarian: number, pengirimanCount: number, produkCount: number): AssetDistribution[] {
  return [
    { category: 'Stok Gudang', amount: produkCount * 15000 },
    { category: 'Barang di Jalan', amount: pengirimanCount * 12000 },
    { category: 'Piutang Beredar', amount: pendapatanHarian * 2.5 },
    { category: 'Kas di Tangan Sales', amount: pendapatanHarian * 0.3 }
  ]
}

function generateReceivablesAging(pendapatanHarian: number): ReceivablesAging[] {
  return [
    { aging_category: '0-30 hari', total_amount: pendapatanHarian * 0.6, count_items: 15 },
    { aging_category: '31-60 hari', total_amount: pendapatanHarian * 0.25, count_items: 8 },
    { aging_category: '61-90 hari', total_amount: pendapatanHarian * 0.1, count_items: 3 },
    { aging_category: '90+ hari', total_amount: pendapatanHarian * 0.05, count_items: 1 }
  ]
}

async function getProductMovement(product_id?: string | null, start_date?: string | null, end_date?: string | null) {
  try {
    if (!product_id) {
      return createErrorResponse('Product ID is required')
    }

    // Get shipment data for the product using custom join
    let shipmentQuery = supabaseAdmin
      .from('detail_pengiriman')
      .select(`
        *,
        pengiriman!inner(
          id_pengiriman,
          tanggal_kirim,
          toko!inner(
            nama_toko,
            sales!inner(nama_sales)
          )
        ),
        produk!inner(nama_produk, harga_satuan)
      `)
      .eq('id_produk', product_id)

    if (start_date) {
      shipmentQuery = shipmentQuery.gte('pengiriman.tanggal_kirim', start_date)
    }
    if (end_date) {
      shipmentQuery = shipmentQuery.lte('pengiriman.tanggal_kirim', end_date)
    }

    // Get billing data for the product using custom join
    let billingQuery = supabaseAdmin
      .from('detail_penagihan')
      .select(`
        *,
        penagihan!inner(
          id_penagihan,
          total_uang_diterima,
          metode_pembayaran,
          ada_potongan,
          dibuat_pada,
          toko!inner(
            nama_toko,
            sales!inner(nama_sales)
          )
        ),
        produk!inner(nama_produk, harga_satuan)
      `)
      .eq('id_produk', product_id)

    if (start_date) {
      billingQuery = billingQuery.gte('penagihan.dibuat_pada', start_date)
    }
    if (end_date) {
      billingQuery = billingQuery.lte('penagihan.dibuat_pada', end_date)
    }

    // Execute both queries
    const [shipmentResult, billingResult] = await Promise.all([
      shipmentQuery,
      billingQuery
    ])

    if (shipmentResult.error) {
      return createErrorResponse(shipmentResult.error.message)
    }

    if (billingResult.error) {
      return createErrorResponse(billingResult.error.message)
    }

    // Combine and sort all movements by date
    const movements: ProductMovementItem[] = []

    // Add shipment movements
    shipmentResult.data?.forEach((item: ShipmentMovementData) => {
      movements.push({
        type: 'shipment',
        id: item.pengiriman.id_pengiriman,
        date: item.pengiriman.tanggal_kirim,
        store: item.pengiriman.toko.nama_toko,
        sales: item.pengiriman.toko.sales.nama_sales,
        product: item.produk.nama_produk,
        quantity: item.jumlah_kirim,
        value: item.jumlah_kirim * item.produk.harga_satuan,
        description: `Pengiriman ${item.jumlah_kirim} unit ke ${item.pengiriman.toko.nama_toko}`
      })
    })

    // Add billing movements
    billingResult.data?.forEach((item: BillingMovementData) => {
      movements.push({
        type: 'billing',
        id: item.penagihan.id_penagihan,
        date: item.penagihan.dibuat_pada,
        store: item.penagihan.toko.nama_toko,
        sales: item.penagihan.toko.sales.nama_sales,
        product: item.produk.nama_produk,
        quantity_sold: item.jumlah_terjual,
        quantity_returned: item.jumlah_kembali,
        value: item.jumlah_terjual * item.produk.harga_satuan,
        payment_method: item.penagihan.metode_pembayaran,
        has_discount: item.penagihan.ada_potongan,
        description: `Penagihan: ${item.jumlah_terjual} terjual, ${item.jumlah_kembali} kembali`
      })
    })

    // Sort by date descending
    movements.sort((a: ProductMovementItem, b: ProductMovementItem) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Calculate summary statistics
    const totalShipped = shipmentResult.data?.reduce((sum: number, item: ShipmentMovementData) => sum + item.jumlah_kirim, 0) || 0
    const totalSold = billingResult.data?.reduce((sum: number, item: BillingMovementData) => sum + item.jumlah_terjual, 0) || 0
    const totalReturned = billingResult.data?.reduce((sum: number, item: BillingMovementData) => sum + item.jumlah_kembali, 0) || 0
    const totalValue = billingResult.data?.reduce((sum: number, item: BillingMovementData) => sum + (item.jumlah_terjual * item.produk.harga_satuan), 0) || 0

    const summary = {
      total_shipped: totalShipped,
      total_sold: totalSold,
      total_returned: totalReturned,
      total_value: totalValue,
      conversion_rate: totalShipped > 0 ? (totalSold / totalShipped) * 100 : 0,
      return_rate: totalSold > 0 ? (totalReturned / totalSold) * 100 : 0
    }

    return createSuccessResponse({
      movements,
      summary,
      shipments: shipmentResult.data || [],
      billings: billingResult.data || []
    })
  } catch {
    return createErrorResponse('Failed to fetch product movement data')
  }
}