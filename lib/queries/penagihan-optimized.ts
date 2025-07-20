// @ts-nocheck
'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/components/ui/use-toast'

// Types
export interface FilterOptions {
  sales: Array<{ value: string; label: string; count: number }>
  kabupaten: Array<{ value: string; label: string; count: number }>
  kecamatan: Array<{ value: string; label: string; description: string; count: number }>
  metode_pembayaran: Array<{ value: string; label: string; count: number }>
  ada_potongan: Array<{ value: string; label: string; count: number }>
  summary: {
    total_billings: number
    today_billings: number
    this_week_billings: number
    unique_toko: number
    unique_kabupaten: number
    unique_kecamatan: number
    unique_sales: number
    total_revenue: number
    cash_payments: number
    transfer_payments: number
    with_deductions: number
    total_deductions: number
    total_quantity_sold: number
    total_quantity_returned: number
  }
}

export interface SearchSuggestion {
  id: string
  type: 'penagihan' | 'toko' | 'sales' | 'kabupaten' | 'kecamatan' | 'tanggal'
  value: string
  label: string
  description: string
  metadata: any
}

export interface PenagihanParams {
  page: number
  limit: number
  search: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  sales?: string
  kabupaten?: string
  kecamatan?: string
  metode_pembayaran?: string
  ada_potongan?: string
  date_from?: string
  date_to?: string
}

export interface OptimizedPenagihanResponse {
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

// Query Keys
export const penagihanOptimizedKeys = {
  all: ['penagihan-optimized'] as const,
  lists: () => [...penagihanOptimizedKeys.all, 'list'] as const,
  list: (params: PenagihanParams) => [...penagihanOptimizedKeys.lists(), params] as const,
  suggestions: () => [...penagihanOptimizedKeys.all, 'suggestions'] as const,
  suggestion: (query: string) => [...penagihanOptimizedKeys.suggestions(), query] as const,
  filterOptions: () => [...penagihanOptimizedKeys.all, 'filter-options'] as const,
}

// Optimized Penagihan Query
export function useOptimizedPenagihanQuery(params: PenagihanParams) {
  return useQuery({
    queryKey: penagihanOptimizedKeys.list(params),
    queryFn: async (): Promise<OptimizedPenagihanResponse> => {
      const searchParams = new URLSearchParams()
      
      // Add all parameters to search params
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString())
        }
      })
      
      const response = await apiClient.get(`/penagihan/optimized?${searchParams.toString()}`)
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
export function usePenagihanSearchSuggestions(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: penagihanOptimizedKeys.suggestion(query),
    queryFn: async (): Promise<{ suggestions: SearchSuggestion[] }> => {
      if (!query || query.length < 1) {
        return { suggestions: [] }
      }
      
      const searchParams = new URLSearchParams({
        q: query,
        limit: '10'
      })
      
      const response = await apiClient.get(`/penagihan/search-suggestions?${searchParams.toString()}`)
      return response.data
    },
    enabled: enabled && query.length >= 1,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Filter Options Query
export function usePenagihanFilterOptions() {
  return useQuery({
    queryKey: penagihanOptimizedKeys.filterOptions(),
    queryFn: async (): Promise<FilterOptions> => {
      const response = await apiClient.get('/penagihan/filter-options')
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  })
}

// Combined hook for penagihan state management
export function useOptimizedPenagihanState(initialParams: PenagihanParams) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  // State for parameters
  const [params, setParams] = useState<PenagihanParams>(initialParams)
  
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
  } = useOptimizedPenagihanQuery({ ...params, search: debouncedSearch })
  
  // Search suggestions query
  const { 
    data: suggestionsResponse, 
    isLoading: suggestionsLoading 
  } = usePenagihanSearchSuggestions(searchInput, searchInput.length >= 1)
  
  // Filter options query
  const { 
    data: filterOptions, 
    isLoading: filterOptionsLoading 
  } = usePenagihanFilterOptions()
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchInput])
  
  // Update parameters function
  const updateParams = useCallback((newParams: Partial<PenagihanParams>) => {
    setParams(prev => {
      const updated = { ...prev, ...newParams }
      
      // Reset page when changing filters or search
      if (newParams.search !== undefined || 
          newParams.sales !== undefined ||
          newParams.kabupaten !== undefined ||
          newParams.kecamatan !== undefined ||
          newParams.metode_pembayaran !== undefined ||
          newParams.ada_potongan !== undefined ||
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
      sales: undefined,
      kabupaten: undefined,
      kecamatan: undefined,
      metode_pembayaran: undefined,
      ada_potongan: undefined,
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
        description: "Data penagihan berhasil diperbarui",
      })
    } catch (_error) {
      toast({
        title: "Error",
        description: "Gagal memperbarui data penagihan",
        variant: "destructive",
      })
    }
  }, [refetch, toast])
  
  // Prefetch next page
  const prefetchNextPage = useCallback(() => {
    if (response?.pagination && response.pagination.page < response.pagination.total_pages) {
      const nextPageParams = { ...params, search: debouncedSearch, page: response.pagination.page + 1 }
      queryClient.prefetchQuery({
        queryKey: penagihanOptimizedKeys.list(nextPageParams),
        queryFn: async () => {
          const searchParams = new URLSearchParams()
          Object.entries(nextPageParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              searchParams.append(key, value.toString())
            }
          })
          const response = await apiClient.get(`/penagihan/optimized?${searchParams.toString()}`)
          return response.data
        },
        staleTime: 2 * 60 * 1000,
      })
    }
  }, [response, params, debouncedSearch, queryClient])
  
  // Invalidate cache
  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: penagihanOptimizedKeys.all })
  }, [queryClient])
  
  // Computed values
  const hasFilters = useMemo(() => {
    return !!(
      debouncedSearch ||
      params.sales ||
      params.kabupaten ||
      params.kecamatan ||
      params.metode_pembayaran ||
      params.ada_potongan ||
      params.date_from ||
      params.date_to
    )
  }, [debouncedSearch, params])
  
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (debouncedSearch) count++
    if (params.sales) count++
    if (params.kabupaten) count++
    if (params.kecamatan) count++
    if (params.metode_pembayaran) count++
    if (params.ada_potongan) count++
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
export const penagihanOptimizedUtils = {
  invalidateAll: (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: penagihanOptimizedKeys.all })
  },
  
  invalidateList: (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: penagihanOptimizedKeys.lists() })
  },
  
  prefetchFilterOptions: (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.prefetchQuery({
      queryKey: penagihanOptimizedKeys.filterOptions(),
      queryFn: async () => {
        const response = await apiClient.get('/penagihan/filter-options')
        return response.data
      },
      staleTime: 5 * 60 * 1000,
    })
  }
}