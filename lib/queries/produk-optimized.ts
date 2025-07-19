'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/components/ui/use-toast'

// Types
export interface FilterOptions {
  status_produk: Array<{ value: string; label: string; count: number }>
  is_priority: Array<{ value: string; label: string; count: number }>
  price_ranges: Array<{ value: string; label: string; count: number }>
  price_stats: {
    min: number
    max: number
    avg: number
  }
  summary: {
    total_products: number
    active_products: number
    inactive_products: number
    priority_products: number
    standard_products: number
    today_products: number
    this_week_products: number
    min_price: number
    max_price: number
    avg_price: number
    total_shipped: number
    total_sold: number
    total_returned: number
    total_paid: number
    total_stock: number
    total_value: number
  }
}

export interface SearchSuggestion {
  id: string
  type: 'produk' | 'harga' | 'priority' | 'tanggal'
  value: string
  label: string
  description: string
  metadata: any
}

export interface ProdukParams {
  page: number
  limit: number
  search: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  status_produk?: string
  is_priority?: string
  price_from?: string
  price_to?: string
  date_from?: string
  date_to?: string
}

export interface OptimizedProdukResponse {
  data: any[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
  filters: Record<string, any>
  sorting: {
    sortBy: string
    sortOrder: string
  }
}

export interface ProdukWithStats {
  id_produk: number
  nama_produk: string
  harga_satuan: number
  status_produk: boolean
  is_priority: boolean
  priority_order: number
  dibuat_pada: string
  diperbarui_pada: string
  stats?: {
    total_terkirim: number
    total_terjual: number
    total_kembali: number
    total_terbayar: number
    sisa_stok: number
  }
}

// Query Keys
export const produkOptimizedKeys = {
  all: ['produk-optimized'] as const,
  lists: () => [...produkOptimizedKeys.all, 'list'] as const,
  list: (params: ProdukParams) => [...produkOptimizedKeys.lists(), params] as const,
  suggestions: () => [...produkOptimizedKeys.all, 'suggestions'] as const,
  suggestion: (query: string) => [...produkOptimizedKeys.suggestions(), query] as const,
  filterOptions: () => [...produkOptimizedKeys.all, 'filter-options'] as const,
}

// Optimized Produk Query
export function useOptimizedProdukQuery(params: ProdukParams) {
  return useQuery({
    queryKey: produkOptimizedKeys.list(params),
    queryFn: async (): Promise<OptimizedProdukResponse> => {
      const searchParams = new URLSearchParams()
      
      // Add all parameters to search params
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString())
        }
      })
      
      const response = await apiClient.get(`/produk/optimized?${searchParams.toString()}`)
      return response.data
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false
      }
      return failureCount < 3
    }
  })
}

// Search Suggestions Query
export function useProdukSearchSuggestions(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: produkOptimizedKeys.suggestion(query),
    queryFn: async (): Promise<{ suggestions: SearchSuggestion[] }> => {
      if (!query || query.length < 1) {
        return { suggestions: [] }
      }
      
      const searchParams = new URLSearchParams({
        q: query,
        limit: '10'
      })
      
      const response = await apiClient.get(`/produk/search-suggestions?${searchParams.toString()}`)
      return response.data
    },
    enabled: enabled && query.length >= 1,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Filter Options Query
export function useProdukFilterOptions() {
  return useQuery({
    queryKey: produkOptimizedKeys.filterOptions(),
    queryFn: async (): Promise<FilterOptions> => {
      const response = await apiClient.get('/produk/filter-options')
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  })
}

// Combined hook for produk state management
export function useOptimizedProdukState(initialParams: ProdukParams) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  // State for parameters
  const [params, setParams] = useState<ProdukParams>(initialParams)
  
  // Debounced search state
  const [searchInput, setSearchInput] = useState(initialParams.search)
  const [debouncedSearch, setDebouncedSearch] = useState(initialParams.search)
  
  // Main data query
  const { 
    data: response, 
    isLoading, 
    error, 
    refetch,
    isRefetching
  } = useOptimizedProdukQuery({ ...params, search: debouncedSearch })
  
  // Search suggestions query
  const { 
    data: suggestionsResponse, 
    isLoading: suggestionsLoading 
  } = useProdukSearchSuggestions(searchInput, searchInput.length >= 1)
  
  // Filter options query
  const { 
    data: filterOptions, 
    isLoading: filterOptionsLoading 
  } = useProdukFilterOptions()
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchInput])
  
  // Update parameters function
  const updateParams = useCallback((newParams: Partial<ProdukParams>) => {
    setParams(prev => {
      const updated = { ...prev, ...newParams }
      
      // Reset page when changing filters or search
      if (newParams.search !== undefined || 
          newParams.status_produk !== undefined ||
          newParams.is_priority !== undefined ||
          newParams.price_from !== undefined ||
          newParams.price_to !== undefined ||
          newParams.date_from !== undefined ||
          newParams.date_to !== undefined) {
        updated.page = 1
      }
      
      return updated
    })
  }, [])
  
  // Update search input
  const updateSearch = useCallback((search: string) => {
    setSearchInput(search)
    // Don't update params immediately - let debouncing handle it
  }, [])
  
  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchInput('')
    setDebouncedSearch('')
    setParams(prev => ({
      ...prev,
      page: 1,
      search: '',
      status_produk: undefined,
      is_priority: undefined,
      price_from: undefined,
      price_to: undefined,
      date_from: undefined,
      date_to: undefined
    }))
  }, [])
  
  // Refresh data
  const refresh = useCallback(async () => {
    try {
      await refetch()
      toast({
        title: "Data Diperbarui",
        description: "Data produk berhasil diperbarui",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memperbarui data produk",
        variant: "destructive",
      })
    }
  }, [refetch, toast])
  
  // Prefetch next page
  const prefetchNextPage = useCallback(() => {
    if (response?.pagination && response.pagination.page < response.pagination.total_pages) {
      const nextPageParams = { ...params, search: debouncedSearch, page: response.pagination.page + 1 }
      queryClient.prefetchQuery({
        queryKey: produkOptimizedKeys.list(nextPageParams),
        queryFn: async () => {
          const searchParams = new URLSearchParams()
          Object.entries(nextPageParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              searchParams.append(key, value.toString())
            }
          })
          const response = await apiClient.get(`/produk/optimized?${searchParams.toString()}`)
          return response.data
        },
        staleTime: 2 * 60 * 1000,
      })
    }
  }, [response, params, debouncedSearch, queryClient])
  
  // Invalidate cache
  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: produkOptimizedKeys.all })
  }, [queryClient])
  
  // Computed values
  const hasFilters = useMemo(() => {
    return !!(
      debouncedSearch ||
      params.status_produk ||
      params.is_priority ||
      params.price_from ||
      params.price_to ||
      params.date_from ||
      params.date_to
    )
  }, [debouncedSearch, params])
  
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (debouncedSearch) count++
    if (params.status_produk) count++
    if (params.is_priority) count++
    if (params.price_from) count++
    if (params.price_to) count++
    if (params.date_from) count++
    if (params.date_to) count++
    return count
  }, [debouncedSearch, params])
  
  return {
    // Data - return object with data and pagination structure like toko
    data: {
      data: response?.data?.data || response?.data || [],
      pagination: response?.data?.pagination || response?.pagination || { page: 1, limit: 20, total: 0, total_pages: 0 }
    },
    // Legacy compatibility
    pagination: response?.data?.pagination || response?.pagination || { page: 1, limit: 20, total: 0, total_pages: 0 },
    
    // Loading states
    isLoading,
    isRefetching,
    suggestionsLoading,
    filterOptionsLoading,
    
    // Error
    error,
    
    // Search suggestions - handle wrapped response
    suggestions: suggestionsResponse?.data?.suggestions || suggestionsResponse?.suggestions || [],
    
    // Filter options - handle wrapped response
    filterOptions: filterOptions?.data || filterOptions,
    
    // Parameters and search
    params,
    searchInput,
    debouncedSearch,
    
    // Actions
    updateParams,
    updateSearch,
    clearFilters,
    refresh,
    refetch,
    prefetchNextPage,
    invalidateCache,
    
    // Computed
    hasFilters,
    activeFiltersCount,
  }
}

// Export utility functions for cache management
export const produkOptimizedUtils = {
  invalidateAll: (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: produkOptimizedKeys.all })
  },
  
  invalidateList: (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: produkOptimizedKeys.lists() })
  },
  
  prefetchFilterOptions: (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.prefetchQuery({
      queryKey: produkOptimizedKeys.filterOptions(),
      queryFn: async () => {
        const response = await apiClient.get('/produk/filter-options')
        return response.data
      },
      staleTime: 5 * 60 * 1000,
    })
  }
}

// Hook for invalidating produk cache (similar to toko)
export function useInvalidateOptimizedProduk() {
  const queryClient = useQueryClient()
  
  return {
    invalidateAll: () => produkOptimizedUtils.invalidateAll(queryClient),
    invalidateList: () => produkOptimizedUtils.invalidateList(queryClient),
    invalidateLists: () => produkOptimizedUtils.invalidateList(queryClient), // Alias for consistency
  }
}