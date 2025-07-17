import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export type ReportType = 'pengiriman' | 'penagihan' | 'rekonsiliasi' | 'dashboard-stats'

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface RekonsiliasiData {
  id_setoran: number
  tanggal_setoran: string
  total_setoran: number
  penerima_setoran: string
  total_penagihan_cash: number
  selisih: number
}

export interface DashboardStats {
  totalPengiriman: number
  totalPenagihan: number
  totalSetoran: number
  totalToko: number
  totalProduk: number
  totalSales: number
  pendapatanHarian: number
  salesStats: SalesPerformance[]
  topProducts: TopProduct[]
  topStores: TopStore[]
  assetDistribution: AssetDistribution[]
  salesPerformance: SalesRanking[]
  monthlyTrends: MonthlyTrend[]
  cashInHand: CashInHand[]
  receivables: ReceivableAging[]
}

export interface SalesPerformance {
  nama_sales: string
  total_penjualan: number
  total_setoran: number
  piutang: number
  rata_hari_penagihan: number
}

export interface TopProduct {
  nama_produk: string
  total_terjual: number
  total_nilai: number
}

export interface TopStore {
  nama_toko: string
  nama_sales: string
  total_pembelian: number
  total_transaksi: number
}

export interface AssetDistribution {
  category: string
  amount: number
}

export interface SalesRanking {
  nama_sales: string
  total_setoran: number
  total_penjualan: number
  efektivitas_persen: number
}

export interface MonthlyTrend {
  month: string
  total_penjualan: number
  total_setoran: number
}

export interface CashInHand {
  nama_sales: string
  kas_di_tangan: number
}

export interface ReceivableAging {
  aging_category: string
  total_amount: number
  count_items: number
}

// Query Keys
export const laporanKeys = {
  all: ['laporan'] as const,
  reports: () => [...laporanKeys.all, 'report'] as const,
  report: (type: ReportType, startDate?: string, endDate?: string) => 
    [...laporanKeys.reports(), { type, startDate, endDate }] as const,
  dashboardStats: (timeFilter?: string) => [...laporanKeys.all, 'dashboard-stats', { timeFilter }] as const,
}

// Queries
export function useLaporanQuery(
  type: ReportType, 
  startDate?: string, 
  endDate?: string
) {
  return useQuery({
    queryKey: laporanKeys.report(type, startDate, endDate),
    queryFn: () => apiClient.getReport(type, startDate, endDate) as Promise<ApiResponse<any>>,
    staleTime: 1000 * 60 * 2, // 2 minutes - reports need fresher data
    enabled: !!type,
  })
}

export function useDashboardStatsQuery(timeFilter?: string) {
  return useQuery({
    queryKey: laporanKeys.dashboardStats(timeFilter),
    queryFn: () => apiClient.getDashboardStats(timeFilter) as Promise<ApiResponse<DashboardStats>>,
    staleTime: 1000 * 60 * 1, // 1 minute - dashboard needs fresh data
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes
  })
}