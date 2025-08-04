import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

// Dashboard View Types
export interface DashboardPenagihan {
  id_penagihan: number
  tanggal_penagihan: string
  metode_pembayaran: 'Cash' | 'Transfer'
  total_uang_diterima: number
  ada_potongan: boolean
  id_toko: number
  nama_toko: string
  no_telepon?: string
  link_gmaps?: string
  kecamatan: string
  kabupaten: string
  id_sales: number
  nama_sales: string
  kuantitas_terjual: number
  kuantitas_kembali: number
  detail_terjual: string
  detail_kembali: string
}

export interface DashboardPengiriman {
  id_pengiriman: number
  tanggal_kirim: string
  tanggal_input: string
  is_autorestock: boolean
  nama_toko: string
  kecamatan: string
  kabupaten: string
  nama_sales: string
  detail_produk: string
  total_quantity_kirim: number
  total_nilai_kirim: number
  jumlah_jenis_produk: number
  link_gmaps?: string
  no_telepon?: string
  id_sales: number
}

export interface DashboardSetoran {
  id_setoran: number
  tanggal_setoran: string
  total_setoran: number
  penerima_setoran: string
  waktu_setoran: string
  pembayaran_cash_hari_ini: number
  pembayaran_transfer_hari_ini: number
  total_pembayaran_hari_ini: number
  total_setoran_hari_ini: number
  selisih_cash_setoran: number
  status_setoran: 'SESUAI' | 'KURANG_SETOR' | 'LEBIH_SETOR'
  cash_balance_kumulatif?: number
  // New transaction-level fields from v_setoran_dashboard_fixed
  event_type: 'PEMBAYARAN_CASH' | 'PEMBAYARAN_TRANSFER' | 'SETORAN'
  description: string
  transaction_category: string
  nama_toko?: string
  kecamatan?: string
  kabupaten?: string
  nama_sales?: string
}

export interface DashboardOverview {
  tanggal_dashboard: string
  waktu_update: string
  // Today's stats
  pengiriman_hari_ini: number
  penagihan_hari_ini: number
  pendapatan_hari_ini: number
  setoran_hari_ini: number
  selisih_hari_ini: number
  // This month stats
  pengiriman_bulan_ini: number
  penagihan_bulan_ini: number
  pendapatan_bulan_ini: number
  setoran_bulan_ini: number
  selisih_bulan_ini: number
  // Overall stats
  total_pengiriman: number
  total_penagihan: number
  total_pendapatan: number
  total_setoran: number
  selisih_keseluruhan: number
  // Master data counts
  total_sales_aktif: number
  total_toko_aktif: number
  total_produk_aktif: number
}

export interface MasterProduk {
  id_produk: number
  nama_produk: string
  harga_satuan: number
  status_produk: boolean
  is_priority: boolean
  priority_order?: number
  dibuat_pada: string
  diperbarui_pada: string
  // Statistics from v_master_produk view
  total_dikirim: number
  total_terjual: number
  total_dikembalikan: number
  stok_di_toko: number
  total_dibayar: number
  // Calculated fields for compatibility
  total_dibayar_cash: number
  total_dibayar_transfer: number
  nilai_total_dikirim: number
  nilai_total_terjual: number
  nilai_total_dikembalikan: number
}

export interface MasterToko {
  id_toko: number
  nama_toko: string
  kecamatan: string
  kabupaten: string
  link_gmaps?: string
  no_telepon?: string
  status_toko: boolean
  nama_sales: string
  telepon_sales?: string
  dibuat_pada: string
  diperbarui_pada: string
  // Statistics - matching v_master_toko view
  quantity_shipped: number
  quantity_sold: number
  quantity_returned: number
  remaining_stock: number
  total_revenue: number
  // Detail strings for tooltips
  detail_shipped?: string
  detail_sold?: string
  // Legacy fields for compatibility
  total_pengiriman?: number
  total_quantity_dikirim?: number
  total_nilai_dikirim?: number
  total_penagihan?: number
  total_quantity_terjual?: number
  total_quantity_dikembalikan?: number
  stok_di_toko?: number
  total_uang_diterima?: number
  total_cash?: number
  total_transfer?: number
}

export interface MasterSales {
  id_sales: number
  nama_sales: string
  nomor_telepon?: string
  status_aktif: boolean
  dibuat_pada: string
  diperbarui_pada: string
  // Data from v_master_sales view
  total_stores: number
  total_revenue: number
  quantity_shipped: number
  quantity_sold: number
  detail_shipped: string
  detail_sold: string
}

// Filter Options Types
export interface SalesOption {
  id_sales: number
  nama_sales: string
  status_aktif: boolean
}

export interface KabupatenOption {
  kabupaten: string
}

export interface KecamatanOption {
  kabupaten: string
  kecamatan: string
}

export interface TokoOption {
  id_toko: number
  nama_toko: string
  kecamatan: string
  kabupaten: string
  nama_sales: string
  status_toko: boolean
}

export interface ProdukOption {
  id_produk: number
  nama_produk: string
  harga_satuan: number
  status_produk: boolean
  is_priority: boolean
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data: T
}

// Query Keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  penagihan: () => [...dashboardKeys.all, 'penagihan'] as const,
  pengiriman: () => [...dashboardKeys.all, 'pengiriman'] as const,
  setoran: () => [...dashboardKeys.all, 'setoran'] as const,
  overview: () => [...dashboardKeys.all, 'overview'] as const,
  master: () => [...dashboardKeys.all, 'master'] as const,
  masterProduk: () => [...dashboardKeys.master(), 'produk'] as const,
  masterToko: () => [...dashboardKeys.master(), 'toko'] as const,
  masterSales: () => [...dashboardKeys.master(), 'sales'] as const,
  filters: () => [...dashboardKeys.all, 'filters'] as const,
  salesOptions: () => [...dashboardKeys.filters(), 'sales'] as const,
  kabupatenOptions: () => [...dashboardKeys.filters(), 'kabupaten'] as const,
  kecamatanOptions: (kabupaten?: string) => [...dashboardKeys.filters(), 'kecamatan', { kabupaten }] as const,
  tokoOptions: (filters?: { sales_id?: number; kabupaten?: string; kecamatan?: string }) => 
    [...dashboardKeys.filters(), 'toko', filters] as const,
  produkOptions: () => [...dashboardKeys.filters(), 'produk'] as const,
}

// Dashboard Queries
export function useDashboardPenagihanQuery(params?: {
  page?: number
  limit?: number
  search?: string
  metode_pembayaran?: string
  ada_potongan?: string
  sales_id?: string
  kabupaten?: string
  kecamatan?: string
  date_range?: string
}) {
  return useQuery({
    queryKey: [...dashboardKeys.penagihan(), params],
    queryFn: () => apiClient.getDashboardPenagihan(params) as Promise<ApiResponse<{
      data: DashboardPenagihan[]
      pagination: {
        page: number
        limit: number
        total: number
        total_pages: number
        has_next: boolean
        has_prev: boolean
      }
      metadata?: {
        totalItems: number
        totalRevenue: number
        totalPages: number
        currentPage: number
      }
    }>>,
    staleTime: 0, // Always consider data stale to ensure fresh data
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
  })
}

export function useDashboardPengirimanQuery(params?: {
  page?: number
  limit?: number
  search?: string
  is_autorestock?: string
  sales_id?: string
  kabupaten?: string
  kecamatan?: string
  date_range?: string
}) {
  return useQuery({
    queryKey: [...dashboardKeys.pengiriman(), params],
    queryFn: () => apiClient.getDashboardPengiriman(params) as Promise<ApiResponse<{
      data: DashboardPengiriman[]
      pagination: {
        page: number
        limit: number
        total: number
        total_pages: number
        has_next: boolean
        has_prev: boolean
      }
    }>>,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function useDashboardSetoranQuery(params?: {
  page?: number
  limit?: number
  search?: string
  status_setoran?: string
  date_range?: string
  event_type?: string
}) {
  return useQuery({
    queryKey: [...dashboardKeys.setoran(), params],
    queryFn: () => apiClient.getDashboardSetoran(params) as Promise<ApiResponse<{
      data: DashboardSetoran[]
      pagination: {
        page: number
        limit: number
        total: number
        total_pages: number
        has_next: boolean
        has_prev: boolean
      }
      summary: {
        total_cash_in: number
        total_transfer_in: number
        total_setoran: number
        net_cash_flow: number
        total_cash_transactions: number
        total_transfer_transactions: number
        total_setoran_transactions: number
        total_events: number
      }
    }>>,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function useDashboardOverviewQuery() {
  return useQuery({
    queryKey: dashboardKeys.overview(),
    queryFn: () => apiClient.getDashboardOverview() as Promise<ApiResponse<DashboardOverview>>,
    staleTime: 1000 * 60 * 1, // 1 minute for overview
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes
  })
}

// Master Data Queries
export function useMasterProdukQuery(params?: {
  page?: number
  limit?: number
  search?: string
  status_produk?: string
  is_priority?: string
  date_range?: string
}) {
  return useQuery({
    queryKey: [...dashboardKeys.masterProduk(), params],
    queryFn: () => apiClient.getMasterProduk(params) as Promise<ApiResponse<{
      data: MasterProduk[]
      pagination: {
        page: number
        limit: number
        total: number
        total_pages: number
        has_next: boolean
        has_prev: boolean
      }
    }>>,
    staleTime: 1000 * 60 * 5, // 5 minutes for master data
  })
}

export function useMasterTokoQuery(params?: {
  page?: number
  limit?: number
  search?: string
  kabupaten?: string
  kecamatan?: string
  status_toko?: string
  sales_id?: string
}) {
  return useQuery({
    queryKey: [...dashboardKeys.masterToko(), params],
    queryFn: () => apiClient.getMasterToko(params) as Promise<ApiResponse<{
      data: MasterToko[]
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
        hasNextPage: boolean
        hasPrevPage: boolean
        from: number
        to: number
      }
    }>>,
    staleTime: 1000 * 60 * 5, // 5 minutes for master data
  })
}

export function useMasterSalesQuery(params?: {
  start_date?: string
  end_date?: string
}) {
  return useQuery({
    queryKey: [...dashboardKeys.masterSales(), params],
    queryFn: () => apiClient.getMasterSales(params) as Promise<ApiResponse<MasterSales[]>>,
    staleTime: 1000 * 60 * 5, // 5 minutes for master data
  })
}

// Filter Options Queries
export function useSalesOptionsQuery() {
  return useQuery({
    queryKey: dashboardKeys.salesOptions(),
    queryFn: () => apiClient.getSalesOptions() as Promise<ApiResponse<SalesOption[]>>,
    staleTime: 1000 * 60 * 10, // 10 minutes for options data
  })
}

export function useKabupatenOptionsQuery() {
  return useQuery({
    queryKey: dashboardKeys.kabupatenOptions(),
    queryFn: () => apiClient.getKabupatenOptions() as Promise<ApiResponse<KabupatenOption[]>>,
    staleTime: 1000 * 60 * 10, // 10 minutes for options data
  })
}

export function useKecamatanOptionsQuery(kabupaten?: string) {
  return useQuery({
    queryKey: dashboardKeys.kecamatanOptions(kabupaten),
    queryFn: () => apiClient.getKecamatanOptions(kabupaten) as Promise<ApiResponse<KecamatanOption[]>>,
    staleTime: 1000 * 60 * 10, // 10 minutes for options data
    enabled: !!kabupaten,
  })
}

export function useTokoOptionsQuery(filters?: { sales_id?: number; kabupaten?: string; kecamatan?: string }) {
  return useQuery({
    queryKey: dashboardKeys.tokoOptions(filters),
    queryFn: () => apiClient.getTokoOptions(filters) as Promise<ApiResponse<TokoOption[]>>,
    staleTime: 1000 * 60 * 10, // 10 minutes for options data
  })
}

export function useProdukOptionsQuery() {
  return useQuery({
    queryKey: dashboardKeys.produkOptions(),
    queryFn: () => apiClient.getProdukOptions() as Promise<ApiResponse<ProdukOption[]>>,
    staleTime: 1000 * 60 * 10, // 10 minutes for options data
  })
}

// ====================================================================
// NEW DASHBOARD ANALYTICS QUERIES
// ====================================================================
// These queries use the new dashboard analytics functions from catatan.txt
// All functions are safe additions that don't conflict with existing system

// Dashboard Analytics Types
export interface DashboardMainStats {
  total_barang_terkirim: number
  total_barang_terjual: number
  total_stok_di_toko: number
  total_pendapatan: number
  estimasi_aset_di_toko: number
  period: {
    start_date: string
    end_date: string
  }
}

export interface DashboardSalesPerformance {
  id_sales: number
  nama_sales: string
  jumlah_toko: number
  total_pendapatan: number
  total_barang_terjual: number
}

export interface DashboardTokoPerformance {
  id_toko: number
  nama_toko: string
  kabupaten: string
  kecamatan: string
  nama_sales: string
  total_pendapatan: number
  jumlah_transaksi: number
  tanggal_transaksi_terakhir: string
}

export interface DashboardProdukPerformance {
  id_produk: number
  nama_produk: string
  harga_satuan: number
  total_terjual: number
  total_kembali: number
  total_terkirim: number
  total_pendapatan: number
  tingkat_konversi_penjualan: number
}

export interface DashboardRegionalPerformance {
  kabupaten: string
  jumlah_toko: number
  total_pendapatan: number
  total_barang_terjual: number
}

export interface DashboardRecentTransaction {
  id_transaksi: number
  tanggal: string
  tipe_transaksi: 'Pengiriman' | 'Penagihan'
  nama_toko: string
  nama_sales: string
  nilai: number
}

// Analytics Query Keys - extending existing pattern
export const analyticsKeys = {
  all: ['analytics'] as const,
  mainStats: (startDate: string, endDate: string) => [...analyticsKeys.all, 'main-stats', { startDate, endDate }] as const,
  salesPerformance: (startDate: string, endDate: string) => [...analyticsKeys.all, 'sales-performance', { startDate, endDate }] as const,
  tokoPerformance: (startDate: string, endDate: string) => [...analyticsKeys.all, 'toko-performance', { startDate, endDate }] as const,
  produkPerformance: (startDate: string, endDate: string) => [...analyticsKeys.all, 'produk-performance', { startDate, endDate }] as const,
  regionalPerformance: (startDate: string, endDate: string) => [...analyticsKeys.all, 'regional-performance', { startDate, endDate }] as const,
  recentTransactions: (startDate: string, endDate: string) => [...analyticsKeys.all, 'recent-transactions', { startDate, endDate }] as const,
}

// New Analytics Query Hooks
export function useDashboardMainStatsQuery(startDate: string, endDate: string) {
  return useQuery({
    queryKey: analyticsKeys.mainStats(startDate, endDate),
    queryFn: async (): Promise<ApiResponse<DashboardMainStats>> => {
      const response = await fetch(`/api/dashboard/analytics/main-stats?start_date=${startDate}&end_date=${endDate}`)
      if (!response.ok) {
        throw new Error('Failed to fetch main stats')
      }
      return response.json()
    },
    staleTime: 1000 * 60 * 2, // 2 minutes - fresh data for KPIs
    enabled: !!startDate && !!endDate,
  })
}

export function useDashboardSalesPerformanceQuery(startDate: string, endDate: string) {
  return useQuery({
    queryKey: analyticsKeys.salesPerformance(startDate, endDate),
    queryFn: async (): Promise<ApiResponse<DashboardSalesPerformance[]>> => {
      const response = await fetch(`/api/dashboard/analytics/sales-performance?start_date=${startDate}&end_date=${endDate}`)
      if (!response.ok) {
        throw new Error('Failed to fetch sales performance')
      }
      return response.json()
    },
    staleTime: 1000 * 60 * 5, // 5 minutes for chart data
    enabled: !!startDate && !!endDate,
  })
}

export function useDashboardTokoPerformanceQuery(startDate: string, endDate: string) {
  return useQuery({
    queryKey: analyticsKeys.tokoPerformance(startDate, endDate),
    queryFn: async (): Promise<ApiResponse<DashboardTokoPerformance[]>> => {
      const response = await fetch(`/api/dashboard/analytics/toko-performance?start_date=${startDate}&end_date=${endDate}`)
      if (!response.ok) {
        throw new Error('Failed to fetch store performance')
      }
      return response.json()
    },
    staleTime: 1000 * 60 * 5, // 5 minutes for chart data
    enabled: !!startDate && !!endDate,
  })
}

export function useDashboardProdukPerformanceQuery(startDate: string, endDate: string) {
  return useQuery({
    queryKey: analyticsKeys.produkPerformance(startDate, endDate),
    queryFn: async (): Promise<ApiResponse<DashboardProdukPerformance[]>> => {
      const response = await fetch(`/api/dashboard/analytics/produk-performance?start_date=${startDate}&end_date=${endDate}`)
      if (!response.ok) {
        throw new Error('Failed to fetch product performance')
      }
      return response.json()
    },
    staleTime: 1000 * 60 * 5, // 5 minutes for chart data
    enabled: !!startDate && !!endDate,
  })
}

export function useDashboardRegionalPerformanceQuery(startDate: string, endDate: string) {
  return useQuery({
    queryKey: analyticsKeys.regionalPerformance(startDate, endDate),
    queryFn: async (): Promise<ApiResponse<DashboardRegionalPerformance[]>> => {
      const response = await fetch(`/api/dashboard/analytics/regional-performance?start_date=${startDate}&end_date=${endDate}`)
      if (!response.ok) {
        throw new Error('Failed to fetch regional performance')
      }
      return response.json()
    },
    staleTime: 1000 * 60 * 5, // 5 minutes for chart data
    enabled: !!startDate && !!endDate,
  })
}

export function useDashboardRecentTransactionsQuery(startDate: string, endDate: string) {
  return useQuery({
    queryKey: analyticsKeys.recentTransactions(startDate, endDate),
    queryFn: async (): Promise<ApiResponse<DashboardRecentTransaction[]>> => {
      const response = await fetch(`/api/dashboard/analytics/recent-transactions?start_date=${startDate}&end_date=${endDate}`)
      if (!response.ok) {
        throw new Error('Failed to fetch recent transactions')
      }
      return response.json()
    },
    staleTime: 1000 * 60 * 1, // 1 minute for real-time transaction feed
    enabled: !!startDate && !!endDate,
  })
}

// Master Produk Statistics Query
export interface MasterProdukStats {
  total_produk: number
  produk_aktif: number
  produk_priority: number
  total_dikirim: number
  total_terjual: number
  total_dikembalikan: number
  sisa_stok_total: number
  nilai_total_dikirim: number
  nilai_total_terjual: number
  nilai_total_dikembalikan: number
  total_dibayar: number
}

export function useMasterProdukStatsQuery(params?: {
  search?: string
  status_produk?: string
  is_priority?: string
  date_range?: string
}) {
  return useQuery({
    queryKey: [...dashboardKeys.masterProduk(), 'stats', params],
    queryFn: () => apiClient.getMasterProdukStats(params) as Promise<ApiResponse<MasterProdukStats>>,
    staleTime: 1000 * 60 * 2, // 2 minutes for stats
  })
}