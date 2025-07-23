'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/components/ui/use-toast'

// Types
export interface FilterOptions {
  penerima: Array<{ value: string; label: string; count: number }>
  summary: {
    total_setoran: number
    total_amount: number
    avg_amount: number
    min_amount: number
    max_amount: number
    median_amount: number
    unique_penerima: number
    today_setoran: number
    today_amount: number
    this_week_setoran: number
    this_week_amount: number
    this_month_setoran: number
    this_month_amount: number
  }
}

export interface SearchSuggestion {
  id: string
  type: 'penerima' | 'amount_from' | 'amount_to' | 'date_from' | 'date_to'
  value: string
  label: string
  description: string
  metadata: any
}

export interface SetoranParams {
  page: number
  limit: number
  search: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  penerima?: string
  amount_from?: string
  amount_to?: string
  date_from?: string
  date_to?: string
}

export interface OptimizedSetoranResponse {
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

export interface SetoranWithStats {
  id_setoran: number
  total_setoran: number
  penerima_setoran: string
  dibuat_pada: string
  diperbarui_pada: string
}

// Query Keys
export const setoranOptimizedKeys = {
  all: ['setoran-optimized'] as const,
  lists: () => [...setoranOptimizedKeys.all, 'list'] as const,
  list: (params: SetoranParams) => [...setoranOptimizedKeys.lists(), params] as const,
  suggestions: () => [...setoranOptimizedKeys.all, 'suggestions'] as const,
  suggestion: (query: string) => [...setoranOptimizedKeys.suggestions(), query] as const,
  filterOptions: () => [...setoranOptimizedKeys.all, 'filter-options'] as const,
}

// Optimized Setoran Query
export function useOptimizedSetoranQuery(params: SetoranParams) {
  return useQuery({
    queryKey: setoranOptimizedKeys.list(params),
    queryFn: async (): Promise<OptimizedSetoranResponse> => {
      const searchParams = new URLSearchParams()
      
      // Add all parameters to search params
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString())
        }
      })
      
      const response = await apiClient.get(`/setoran/optimized?${searchParams.toString()}`) as OptimizedSetoranResponse
      return response
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
export function useSetoranSearchSuggestions(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: setoranOptimizedKeys.suggestion(query),
    queryFn: async (): Promise<{ suggestions: SearchSuggestion[] }> => {
      if (!query || query.length < 1) {
        return { suggestions: [] }
      }
      
      const searchParams = new URLSearchParams({
        q: query,
        limit: '10'
      })
      
      const response = await apiClient.get(`/setoran/search-suggestions?${searchParams.toString()}`) as { suggestions: SearchSuggestion[] }
      return response
    },
    enabled: enabled && query.length >= 1,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Filter Options Query
export function useSetoranFilterOptions() {
  return useQuery({
    queryKey: setoranOptimizedKeys.filterOptions(),
    queryFn: async (): Promise<FilterOptions> => {
      const response = await apiClient.get('/setoran/filter-options') as FilterOptions
      return response
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  })
}

// Combined hook for setoran state management
export function useOptimizedSetoranState(initialParams: SetoranParams) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  // State for parameters
  const [params, setParams] = useState<SetoranParams>(initialParams)
  
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
  } = useOptimizedSetoranQuery({ ...params, search: debouncedSearch })
  
  // Search suggestions query
  const { 
    data: suggestionsResponse, 
    isLoading: suggestionsLoading 
  } = useSetoranSearchSuggestions(searchInput, searchInput.length >= 1)
  
  // Filter options query
  const { 
    data: filterOptions, 
    isLoading: filterOptionsLoading 
  } = useSetoranFilterOptions()
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchInput])
  
  // Update parameters function
  const updateParams = useCallback((newParams: Partial<SetoranParams>) => {
    setParams(prev => {
      const updated = { ...prev, ...newParams }
      
      // Reset page when changing filters or search
      if (newParams.search !== undefined || 
          newParams.penerima !== undefined ||
          newParams.amount_from !== undefined ||
          newParams.amount_to !== undefined ||
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
      penerima: undefined,
      amount_from: undefined,
      amount_to: undefined,
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
        description: "Data setoran berhasil diperbarui",
      })
    } catch (error) {
      console.error('Error refreshing setoran data:', error)
      toast({
        title: "Error",
        description: "Gagal memperbarui data setoran",
        variant: "destructive",
      })
    }
  }, [refetch, toast])
  
  // Prefetch next page
  const prefetchNextPage = useCallback(() => {
    if (response?.pagination && response.pagination.page < response.pagination.total_pages) {
      const nextPageParams = { ...params, search: debouncedSearch, page: response.pagination.page + 1 }
      queryClient.prefetchQuery({
        queryKey: setoranOptimizedKeys.list(nextPageParams),
        queryFn: async () => {
          const searchParams = new URLSearchParams()
          Object.entries(nextPageParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              searchParams.append(key, value.toString())
            }
          })
          const response = await apiClient.get(`/setoran/optimized?${searchParams.toString()}`) as OptimizedSetoranResponse
          return response
        },
        staleTime: 2 * 60 * 1000,
      })
    }
  }, [response, params, debouncedSearch, queryClient])
  
  // Invalidate cache
  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: setoranOptimizedKeys.all })
  }, [queryClient])
  
  // Computed values
  const hasFilters = useMemo(() => {
    return !!(
      debouncedSearch ||
      params.penerima ||
      params.amount_from ||
      params.amount_to ||
      params.date_from ||
      params.date_to
    )
  }, [debouncedSearch, params])
  
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (debouncedSearch) count++
    if (params.penerima) count++
    if (params.amount_from) count++
    if (params.amount_to) count++
    if (params.date_from) count++
    if (params.date_to) count++
    return count
  }, [debouncedSearch, params])
  
  return {
    // Data - return object with data and pagination structure like toko
    data: {
      data: response?.data || [],
      pagination: response?.pagination || { page: 1, limit: 20, total: 0, total_pages: 0 }
    },
    // Legacy compatibility
    pagination: response?.pagination || { page: 1, limit: 20, total: 0, total_pages: 0 },
    
    // Loading states
    isLoading,
    isRefetching,
    suggestionsLoading,
    filterOptionsLoading,
    
    // Error
    error,
    
    // Search suggestions - handle wrapped response
    suggestions: suggestionsResponse?.suggestions || [],
    
    // Filter options - handle wrapped response
    filterOptions: filterOptions,
    
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
export const setoranOptimizedUtils = {
  invalidateAll: (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: setoranOptimizedKeys.all })
  },
  
  invalidateList: (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: setoranOptimizedKeys.lists() })
  },
  
  prefetchFilterOptions: (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.prefetchQuery({
      queryKey: setoranOptimizedKeys.filterOptions(),
      queryFn: async () => {
        const response = await apiClient.get('/setoran/filter-options') as FilterOptions
        return response
      },
      staleTime: 5 * 60 * 1000,
    })
  }
}

// Hook for invalidating setoran cache (similar to toko)
export function useInvalidateOptimizedSetoran() {
  const queryClient = useQueryClient()
  
  return {
    invalidateAll: () => setoranOptimizedUtils.invalidateAll(queryClient),
    invalidateList: () => setoranOptimizedUtils.invalidateList(queryClient),
    invalidateLists: () => setoranOptimizedUtils.invalidateList(queryClient), // Alias for consistency
  }
}