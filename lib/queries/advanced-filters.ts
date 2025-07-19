import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface FilterOption {
  value: string
  label: string
  count?: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
}

// Advanced filter hooks for different entities
export function useAdvancedTokoFilters(searchTerm?: string) {
  return useQuery({
    queryKey: ['advanced-filters', 'toko', searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      
      const response = await apiClient.get(`/toko/advanced-filters?${params}`)
      return response as ApiResponse<{
        kabupaten: FilterOption[]
        kecamatan: FilterOption[]
        sales: FilterOption[]
        status: FilterOption[]
      }>
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: true,
  })
}

export function useAdvancedSalesFilters(searchTerm?: string) {
  return useQuery({
    queryKey: ['advanced-filters', 'sales', searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      
      const response = await apiClient.get(`/sales/advanced-filters?${params}`)
      return response as ApiResponse<{
        status: FilterOption[]
        dateRanges: FilterOption[]
      }>
    },
    staleTime: 1000 * 60 * 5,
    enabled: true,
  })
}

export function useAdvancedProdukFilters(searchTerm?: string) {
  return useQuery({
    queryKey: ['advanced-filters', 'produk', searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      
      const response = await apiClient.get(`/produk/advanced-filters?${params}`)
      return response as ApiResponse<{
        status: FilterOption[]
        priority: FilterOption[]
        priceRanges: FilterOption[]
      }>
    },
    staleTime: 1000 * 60 * 5,
    enabled: true,
  })
}

export function useAdvancedPengirimanFilters(searchTerm?: string) {
  return useQuery({
    queryKey: ['advanced-filters', 'pengiriman', searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      
      const response = await apiClient.get(`/pengiriman/advanced-filters?${params}`)
      return response as ApiResponse<{
        sales: FilterOption[]
        toko: FilterOption[]
        produk: FilterOption[]
        dateRanges: FilterOption[]
        status: FilterOption[]
      }>
    },
    staleTime: 1000 * 60 * 5,
    enabled: true,
  })
}

export function useAdvancedPenagihanFilters(searchTerm?: string) {
  return useQuery({
    queryKey: ['advanced-filters', 'penagihan', searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      
      const response = await apiClient.get(`/penagihan/advanced-filters?${params}`)
      return response as ApiResponse<{
        sales: FilterOption[]
        toko: FilterOption[]
        status: FilterOption[]
        dateRanges: FilterOption[]
        amountRanges: FilterOption[]
      }>
    },
    staleTime: 1000 * 60 * 5,
    enabled: true,
  })
}

export function useAdvancedSetoranFilters(searchTerm?: string) {
  return useQuery({
    queryKey: ['advanced-filters', 'setoran', searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      
      const response = await apiClient.get(`/setoran/advanced-filters?${params}`)
      return response as ApiResponse<{
        sales: FilterOption[]
        dateRanges: FilterOption[]
        amountRanges: FilterOption[]
      }>
    },
    staleTime: 1000 * 60 * 5,
    enabled: true,
  })
}