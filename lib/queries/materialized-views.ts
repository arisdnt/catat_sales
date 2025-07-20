import { useQuery, useQueries } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

// Query keys for materialized views
export const mvKeys = {
  all: ['mv'] as const,
  sales: () => [...mvKeys.all, 'sales'] as const,
  salesDetail: (id: number) => [...mvKeys.sales(), id] as const,
  produk: () => [...mvKeys.all, 'produk'] as const,
  produkDetail: (id: number, withStats: boolean = false) => [...mvKeys.produk(), id, { withStats }] as const,
  toko: () => [...mvKeys.all, 'toko'] as const,
  tokoDetail: (id: number) => [...mvKeys.toko(), id] as const,
  tokoByFilter: (filters: Record<string, any>) => [...mvKeys.toko(), { filters }] as const,
  penagihan: () => [...mvKeys.all, 'penagihan'] as const,
  penagihanDetail: (id: number) => [...mvKeys.penagihan(), id] as const,
  penagihanAggregates: () => [...mvKeys.penagihan(), 'aggregates'] as const,
  pengiriman: () => [...mvKeys.all, 'pengiriman'] as const,
  pengirimanDetail: (id: number) => [...mvKeys.pengiriman(), id] as const,
  pengirimanByFilter: (filters: Record<string, any>) => [...mvKeys.pengiriman(), { filters }] as const,
}

// Sales materialized view hooks
export function useSalesAggregatesQuery() {
  return useQuery({
    queryKey: mvKeys.sales(),
    queryFn: () => apiClient.get('/mv/sales'),
    staleTime: 1000 * 60 * 2, // 2 minutes for fresh aggregated data
  })
}

export function useSalesAggregateDetailQuery(id: number, enabled: boolean = true) {
  return useQuery({
    queryKey: mvKeys.salesDetail(id),
    queryFn: () => apiClient.get(`/mv/sales?id=${id}`),
    enabled: enabled && !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes for detail views
  })
}

// Product materialized view hooks
export function useProdukAggregatesQuery(withStats: boolean = false) {
  return useQuery({
    queryKey: mvKeys.produk(),
    queryFn: () => apiClient.get(`/mv/produk?withStats=${withStats}`),
    staleTime: 1000 * 60 * 3, // 3 minutes for product data
  })
}

export function useProdukAggregateDetailQuery(id: number, withStats: boolean = true, enabled: boolean = true) {
  return useQuery({
    queryKey: mvKeys.produkDetail(id, withStats),
    queryFn: () => apiClient.get(`/mv/produk?id=${id}&withStats=${withStats}`),
    enabled: enabled && !!id,
    staleTime: 1000 * 60 * 5,
  })
}

// Store materialized view hooks
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
    staleTime: 1000 * 60 * 3,
  })
}

export function useTokoAggregateDetailQuery(id: number, enabled: boolean = true) {
  return useQuery({
    queryKey: mvKeys.tokoDetail(id),
    queryFn: () => apiClient.get(`/mv/toko?id=${id}`),
    enabled: enabled && !!id,
    staleTime: 1000 * 60 * 5,
  })
}

// Billing materialized view hooks
export function usePenagihanAggregatesQuery(type: 'aggregates' | 'with_totals' = 'with_totals') {
  return useQuery({
    queryKey: type === 'aggregates' ? mvKeys.penagihanAggregates() : mvKeys.penagihan(),
    queryFn: () => apiClient.get(`/mv/penagihan?type=${type}`),
    staleTime: 1000 * 60 * 2, // Fresh data for billing
  })
}

export function usePenagihanAggregateDetailQuery(id: number, enabled: boolean = true) {
  return useQuery({
    queryKey: mvKeys.penagihanDetail(id),
    queryFn: () => apiClient.get(`/mv/penagihan?id=${id}`),
    enabled: enabled && !!id,
    staleTime: 1000 * 60 * 5,
  })
}

// Shipment materialized view hooks
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
    staleTime: 1000 * 60 * 3,
  })
}

export function usePengirimanAggregateDetailQuery(id: number, enabled: boolean = true) {
  return useQuery({
    queryKey: mvKeys.pengirimanDetail(id),
    queryFn: () => apiClient.get(`/mv/pengiriman?id=${id}`),
    enabled: enabled && !!id,
    staleTime: 1000 * 60 * 5,
  })
}

// Batch queries for forms that need multiple related data
export function useFormRelatedDataQueries(entityType: 'pengiriman' | 'penagihan' | 'setoran') {
  return useQueries({
    queries: [
      {
        queryKey: mvKeys.sales(),
        queryFn: () => apiClient.get('/mv/sales'),
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: mvKeys.produk(),
        queryFn: () => apiClient.get('/mv/produk?withStats=true'),
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: mvKeys.toko(),
        queryFn: () => apiClient.get('/mv/toko'),
        staleTime: 1000 * 60 * 5,
      },
    ],
  })
}

// Prefetch utilities for edit pages
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
        staleTime: 1000 * 60 * 5,
      })
      break
    case 'produk':
      queryClient.prefetchQuery({
        queryKey: mvKeys.produkDetail(id, true),
        queryFn: () => apiClient.get(`/mv/produk?id=${id}&withStats=true`),
        staleTime: 1000 * 60 * 5,
      })
      break
    case 'toko':
      queryClient.prefetchQuery({
        queryKey: mvKeys.tokoDetail(id),
        queryFn: () => apiClient.get(`/mv/toko?id=${id}`),
        staleTime: 1000 * 60 * 5,
      })
      break
    case 'penagihan':
      queryClient.prefetchQuery({
        queryKey: mvKeys.penagihanDetail(id),
        queryFn: () => apiClient.get(`/mv/penagihan?id=${id}`),
        staleTime: 1000 * 60 * 5,
      })
      break
    case 'pengiriman':
      queryClient.prefetchQuery({
        queryKey: mvKeys.pengirimanDetail(id),
        queryFn: () => apiClient.get(`/mv/pengiriman?id=${id}`),
        staleTime: 1000 * 60 * 5,
      })
      break
  }
}