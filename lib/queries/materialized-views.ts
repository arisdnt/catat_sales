// Direct query hooks to replace materialized views for data consistency
import { useQuery, useQueries } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

// Query keys for direct queries (formerly materialized views)
export const directQueryKeys = {
  all: ['direct-query'] as const,
  sales: () => [...directQueryKeys.all, 'sales'] as const,
  salesDetail: (id: number) => [...directQueryKeys.sales(), id] as const,
  produk: () => [...directQueryKeys.all, 'produk'] as const,
  produkDetail: (id: number, withStats: boolean = false) => [...directQueryKeys.produk(), id, { withStats }] as const,
  toko: () => [...directQueryKeys.all, 'toko'] as const,
  tokoDetail: (id: number) => [...directQueryKeys.toko(), id] as const,
  tokoByFilter: (filters: Record<string, any>) => [...directQueryKeys.toko(), { filters }] as const,
  penagihan: () => [...directQueryKeys.all, 'penagihan'] as const,
  penagihanDetail: (id: number) => [...directQueryKeys.penagihan(), id] as const,
  penagihanAggregates: () => [...directQueryKeys.penagihan(), 'aggregates'] as const,
  pengiriman: () => [...directQueryKeys.all, 'pengiriman'] as const,
  pengirimanDetail: (id: number) => [...directQueryKeys.pengiriman(), id] as const,
  pengirimanByFilter: (filters: Record<string, any>) => [...directQueryKeys.pengiriman(), { filters }] as const,
}

// Legacy alias for backward compatibility
export const mvKeys = directQueryKeys

// Sales direct query hooks (replacing materialized views)
export function useSalesAggregatesQuery() {
  return useQuery({
    queryKey: mvKeys.sales(),
    queryFn: () => apiClient.get('/mv/sales'), // Still uses same API endpoint but with direct queries
    staleTime: 1000 * 30, // Reduced to 30 seconds for more real-time data
  })
}

export function useSalesAggregateDetailQuery(id: number, enabled: boolean = true) {
  return useQuery({
    queryKey: mvKeys.salesDetail(id),
    queryFn: () => apiClient.get(`/mv/sales?id=${id}`),
    enabled: enabled && !!id,
    staleTime: 1000 * 30, // Reduced for real-time data consistency
  })
}

// Product direct query hooks (replacing materialized views)
export function useProdukAggregatesQuery(withStats: boolean = false) {
  return useQuery({
    queryKey: mvKeys.produk(),
    queryFn: () => apiClient.get(`/mv/produk?withStats=${withStats}`),
    staleTime: 1000 * 30, // Reduced for real-time data consistency
  })
}

export function useProdukAggregateDetailQuery(id: number, withStats: boolean = true, enabled: boolean = true) {
  return useQuery({
    queryKey: mvKeys.produkDetail(id, withStats),
    queryFn: () => apiClient.get(`/mv/produk?id=${id}&withStats=${withStats}`),
    enabled: enabled && !!id,
    staleTime: 1000 * 30, // Reduced for real-time data consistency
  })
}

// Store direct query hooks (replacing materialized views)
export function useTokoAggregatesQuery(filters?: {
  sales_id?: number
  search?: string
  kabupaten?: string
  kecamatan?: string
}) {
  const params = new URLSearchParams()
  if (filters?.sales_id) params.append('sales_id', filters.sales_id.toString())
  if (filters?.search) params.append('search', filters.search)
  if (filters?.kabupaten) params.append('kabupaten', filters.kabupaten)
  if (filters?.kecamatan) params.append('kecamatan', filters.kecamatan)
  
  return useQuery({
    queryKey: mvKeys.tokoByFilter(filters || {}),
    queryFn: () => apiClient.get(`/mv/toko?${params.toString()}`),
    staleTime: 1000 * 30, // Reduced for real-time data consistency
  })
}

export function useTokoAggregateDetailQuery(id: number, enabled: boolean = true) {
  return useQuery({
    queryKey: mvKeys.tokoDetail(id),
    queryFn: () => apiClient.get(`/mv/toko?id=${id}`),
    enabled: enabled && !!id,
    staleTime: 1000 * 30, // Reduced for real-time data consistency
  })
}

// Billing direct query hooks (replacing materialized views)
export function usePenagihanAggregatesQuery(type: 'aggregates' | 'with_totals' = 'with_totals') {
  return useQuery({
    queryKey: type === 'aggregates' ? mvKeys.penagihanAggregates() : mvKeys.penagihan(),
    queryFn: () => apiClient.get(`/mv/penagihan?type=${type}`),
    staleTime: 1000 * 30, // Reduced for real-time data consistency
  })
}

export function usePenagihanAggregateDetailQuery(id: number, enabled: boolean = true) {
  return useQuery({
    queryKey: mvKeys.penagihanDetail(id),
    queryFn: () => apiClient.get(`/mv/penagihan?id=${id}`),
    enabled: enabled && !!id,
    staleTime: 1000 * 30, // Reduced for real-time data consistency
  })
}

// Shipment direct query hooks (replacing materialized views)
export function usePengirimanAggregatesQuery(filters?: {
  sales_id?: number
  search?: string
  kabupaten?: string
  kecamatan?: string
  start_date?: string
  end_date?: string
}) {
  const params = new URLSearchParams()
  if (filters?.sales_id) params.append('sales_id', filters.sales_id.toString())
  if (filters?.search) params.append('search', filters.search)
  if (filters?.kabupaten) params.append('kabupaten', filters.kabupaten)
  if (filters?.kecamatan) params.append('kecamatan', filters.kecamatan)
  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)
  
  return useQuery({
    queryKey: mvKeys.pengirimanByFilter(filters || {}),
    queryFn: () => apiClient.get(`/mv/pengiriman?${params.toString()}`),
    staleTime: 1000 * 30, // Reduced for real-time data consistency
  })
}

export function usePengirimanAggregateDetailQuery(id: number, enabled: boolean = true) {
  return useQuery({
    queryKey: mvKeys.pengirimanDetail(id),
    queryFn: () => apiClient.get(`/mv/pengiriman?id=${id}`),
    enabled: enabled && !!id,
    staleTime: 1000 * 30, // Reduced for real-time data consistency
  })
}

// Batch queries for forms that need multiple related data
// Now using direct queries for consistent real-time data
export function useFormRelatedDataQueries(_entityType: 'pengiriman' | 'penagihan' | 'setoran') {
  return useQueries({
    queries: [
      {
        queryKey: mvKeys.sales(),
        queryFn: () => apiClient.get('/mv/sales'),
        staleTime: 1000 * 30, // Reduced for real-time data consistency
      },
      {
        queryKey: mvKeys.produk(),
        queryFn: () => apiClient.get('/mv/produk?withStats=true'),
        staleTime: 1000 * 30, // Reduced for real-time data consistency
      },
      {
        queryKey: mvKeys.toko(),
        queryFn: () => apiClient.get('/mv/toko'),
        staleTime: 1000 * 30, // Reduced for real-time data consistency
      },
    ],
  })
}

// Prefetch utilities for edit pages
// Now using direct queries for consistent real-time data
export function prefetchEditPageData(
  queryClient: any,
  entityType: 'sales' | 'produk' | 'toko' | 'penagihan' | 'pengiriman' | 'setoran',
  id: number
) {
  switch (entityType) {
    case 'sales':
      queryClient.prefetchQuery({
        queryKey: mvKeys.salesDetail(id),
        queryFn: () => apiClient.get(`/mv/sales?id=${id}`),
        staleTime: 1000 * 30, // Reduced for real-time data consistency
      })
      break
    case 'produk':
      queryClient.prefetchQuery({
        queryKey: mvKeys.produkDetail(id, true),
        queryFn: () => apiClient.get(`/mv/produk?id=${id}&withStats=true`),
        staleTime: 1000 * 30, // Reduced for real-time data consistency
      })
      break
    case 'toko':
      queryClient.prefetchQuery({
        queryKey: mvKeys.tokoDetail(id),
        queryFn: () => apiClient.get(`/mv/toko?id=${id}`),
        staleTime: 1000 * 30, // Reduced for real-time data consistency
      })
      break
    case 'penagihan':
      queryClient.prefetchQuery({
        queryKey: mvKeys.penagihanDetail(id),
        queryFn: () => apiClient.get(`/mv/penagihan?id=${id}`),
        staleTime: 1000 * 30, // Reduced for real-time data consistency
      })
      break
    case 'pengiriman':
      queryClient.prefetchQuery({
        queryKey: mvKeys.pengirimanDetail(id),
        queryFn: () => apiClient.get(`/mv/pengiriman?id=${id}`),
        staleTime: 1000 * 30, // Reduced for real-time data consistency
      })
      break
  }
}