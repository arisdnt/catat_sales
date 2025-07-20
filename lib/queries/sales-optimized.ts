// @ts-nocheck
'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/components/ui/use-toast'

// Types
export interface FilterOptions {
  status_aktif: Array<{ value: string; label: string; count: number }>
  telepon_exists: Array<{ value: string; label: string; count: number }>
  summary: {
    total_sales: number
    active_sales: number
    inactive_sales: number
    sales_with_phone: number
    sales_without_phone: number
    today_sales: number
    this_week_sales: number
    this_month_sales: number
    total_stores_managed: number
    total_shipped_items: number
    total_revenue: number
    total_items_sold: number
    total_items_returned: number
    avg_stores_per_sales: number
    avg_revenue_per_sales: number
    avg_items_per_sales: number
  }
}

export interface SearchSuggestion {
  id: string
  type: 'sales' | 'telepon' | 'status' | 'telepon_exists' | 'tanggal'
  value: string
  label: string
  description: string
  metadata: any
}

export interface SalesParams {
  page: number
  limit: number
  search: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  status_aktif?: string
  telepon_exists?: string
  date_from?: string
  date_to?: string
}

export interface OptimizedSalesResponse {
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

export interface SalesWithStats {
  id_sales: number
  nama_sales: string
  nomor_telepon: string | null
  status_aktif: boolean
  dibuat_pada: string
  diperbarui_pada: string
  stats?: {
    total_stores: number
    total_shipped_items: number
    total_revenue: number
  }
}

// Query Keys
export const salesOptimizedKeys = {
  all: ['sales-optimized'] as const,
  lists: () => [...salesOptimizedKeys.all, 'list'] as const,
  list: (params: SalesParams) => [...salesOptimizedKeys.lists(), params] as const,
  suggestions: () => [...salesOptimizedKeys.all, 'suggestions'] as const,
  suggestion: (query: string) => [...salesOptimizedKeys.suggestions(), query] as const,
  filterOptions: () => [...salesOptimizedKeys.all, 'filter-options'] as const,
}

// Optimized Sales Query
export function useOptimizedSalesQuery(params: SalesParams) {
  return useQuery({
    queryKey: salesOptimizedKeys.list(params),
    queryFn: async (): Promise<OptimizedSalesResponse> => {
      const searchParams = new URLSearchParams()
      
      // Add all parameters to search params
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString())
        }
      })
      
      const response = await apiClient.get(`/sales/optimized?${searchParams.toString()}`)
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
export function useSalesSearchSuggestions(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: salesOptimizedKeys.suggestion(query),
    queryFn: async (): Promise<{ suggestions: SearchSuggestion[] }> => {
      if (!query || query.length < 1) {
        return { suggestions: [] }
      }
      
      const searchParams = new URLSearchParams({
        q: query,
        limit: '10'
      })
      
      const response = await apiClient.get(`/sales/search-suggestions?${searchParams.toString()}`)
      return response.data
    },
    enabled: enabled && query.length >= 1,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Filter Options Query
export function useSalesFilterOptions() {
  return useQuery({
    queryKey: salesOptimizedKeys.filterOptions(),
    queryFn: async (): Promise<FilterOptions> => {
      const response = await apiClient.get('/sales/filter-options')
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  })
}

// Combined hook for sales state management
export function useOptimizedSalesState(initialParams: SalesParams) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  // State for parameters
  const [params, setParams] = useState<SalesParams>(initialParams)
  
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
  } = useOptimizedSalesQuery({ ...params, search: debouncedSearch })
  
  // Search suggestions query
  const { 
    data: suggestionsResponse, 
    isLoading: suggestionsLoading 
  } = useSalesSearchSuggestions(searchInput, searchInput.length >= 1)
  
  // Filter options query
  const { 
    data: filterOptions, 
    isLoading: filterOptionsLoading 
  } = useSalesFilterOptions()
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchInput])
  
  // Update parameters function
  const updateParams = useCallback((newParams: Partial<SalesParams>) => {
    setParams(prev => {
      const updated = { ...prev, ...newParams }
      
      // Reset page when changing filters or search
      if (newParams.search !== undefined || 
          newParams.status_aktif !== undefined ||
          newParams.telepon_exists !== undefined ||
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
      status_aktif: undefined,
      telepon_exists: undefined,
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
        description: "Data sales berhasil diperbarui",
      })
    } catch (_error) {
      toast({
        title: "Error",
        description: "Gagal memperbarui data sales",
        variant: "destructive",
      })
    }
  }, [refetch, toast])
  
  // Prefetch next page
  const prefetchNextPage = useCallback(() => {
    if (response?.pagination && response.pagination.page < response.pagination.total_pages) {
      const nextPageParams = { ...params, search: debouncedSearch, page: response.pagination.page + 1 }
      queryClient.prefetchQuery({
        queryKey: salesOptimizedKeys.list(nextPageParams),
        queryFn: async () => {
          const searchParams = new URLSearchParams()
          Object.entries(nextPageParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              searchParams.append(key, value.toString())
            }
          })
          const response = await apiClient.get(`/sales/optimized?${searchParams.toString()}`)
          return response.data
        },
        staleTime: 2 * 60 * 1000,
      })
    }
  }, [response, params, debouncedSearch, queryClient])
  
  // Invalidate cache
  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: salesOptimizedKeys.all })
  }, [queryClient])
  
  // Computed values
  const hasFilters = useMemo(() => {
    return !!(
      debouncedSearch ||
      params.status_aktif ||
      params.telepon_exists ||
      params.date_from ||
      params.date_to
    )
  }, [debouncedSearch, params])
  
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (debouncedSearch) count++
    if (params.status_aktif) count++
    if (params.telepon_exists) count++
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
export const salesOptimizedUtils = {
  invalidateAll: (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: salesOptimizedKeys.all })
  },
  
  invalidateList: (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: salesOptimizedKeys.lists() })
  },
  
  prefetchFilterOptions: (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.prefetchQuery({
      queryKey: salesOptimizedKeys.filterOptions(),
      queryFn: async () => {
        const response = await apiClient.get('/sales/filter-options')
        return response.data
      },
      staleTime: 5 * 60 * 1000,
    })
  }
}

// Hook for invalidating sales cache (similar to toko)
export function useInvalidateOptimizedSales() {
  const queryClient = useQueryClient()
  
  return {
    invalidateAll: () => salesOptimizedUtils.invalidateAll(queryClient),
    invalidateList: () => salesOptimizedUtils.invalidateList(queryClient),
    invalidateLists: () => salesOptimizedUtils.invalidateList(queryClient), // Alias for consistency
  }
}