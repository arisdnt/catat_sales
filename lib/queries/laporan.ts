import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export type ReportType = 'pengiriman' | 'penagihan' | 'rekonsiliasi' | 'dashboard-stats'

// Query Keys
export const laporanKeys = {
  all: ['laporan'] as const,
  reports: () => [...laporanKeys.all, 'report'] as const,
  report: (type: ReportType, startDate?: string, endDate?: string) => 
    [...laporanKeys.reports(), { type, startDate, endDate }] as const,
  dashboardStats: () => [...laporanKeys.all, 'dashboard-stats'] as const,
}

// Queries
export function useLaporanQuery(
  type: ReportType, 
  startDate?: string, 
  endDate?: string
) {
  return useQuery({
    queryKey: laporanKeys.report(type, startDate, endDate),
    queryFn: () => apiClient.getReport(type, startDate, endDate),
    staleTime: 1000 * 60 * 2, // 2 minutes - reports need fresher data
    enabled: !!type,
  })
}

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: laporanKeys.dashboardStats(),
    queryFn: () => apiClient.getDashboardStats(),
    staleTime: 1000 * 60 * 1, // 1 minute - dashboard needs fresh data
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes
  })
}