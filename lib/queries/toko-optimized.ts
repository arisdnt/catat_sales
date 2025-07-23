import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

// Types for optimized toko queries
export interface TokoWithStats {
  id_toko: number
  nama_toko: string
  kecamatan: string
  kabupaten: string
  no_telepon?: string
  link_gmaps?: string
  id_sales: number
  nama_sales?: string
  status_toko: boolean
  dibuat_pada: string
  diperbarui_pada: string
  barang_terkirim: number
  detail_barang_terkirim: any[]
  barang_terbayar: number
  detail_barang_terbayar: any[]
  sisa_stok: number
  detail_sisa_stok: any[]
}

export interface OptimizedTokoResponse {
  data: TokoWithStats[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  summary: {
    total_stores: number
    active_stores: number
    inactive_stores: number
    unique_kabupaten: number
    unique_kecamatan: number
  }
}

export interface SearchSuggestion {
  type: string
  value: string
  label: string
  metadata?: Record<string, any>
}

export interface FilterOption {
  label: string
  value: string
  count?: number
  description?: string
}

export interface FilterOptionsResponse {
  status: FilterOption[]
  sales: FilterOption[]
  kabupaten: FilterOption[]
  kecamatan: FilterOption[]
  summary: {
    total_stores: number
    active_stores: number
    inactive_stores: number
    unique_kabupaten: number
    unique_kecamatan: number
    unique_sales: number
  }
}

// Query keys for optimized toko queries
export const optimizedTokoKeys = {
  all: ['toko-optimized'] as const,
  lists: () => [...optimizedTokoKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...optimizedTokoKeys.lists(), { filters }] as const,
  suggestions: () => [...optimizedTokoKeys.all, 'suggestions'] as const,
  suggestion: (query: string) => [...optimizedTokoKeys.suggestions(), query] as const,
  filterOptions: () => [...optimizedTokoKeys.all, 'filter-options'] as const,
}

// Query parameters interface
interface TokoQueryParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  id_sales?: string
  kabupaten?: string
  kecamatan?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Optimized toko list query with server-side pagination and filtering
export function useOptimizedTokoQuery(params: TokoQueryParams = {}) {
  const {
    page = 1,
    limit = 20,
    search = '',
    status,
    id_sales,
    kabupaten = '',
    kecamatan = '',
    sortBy = 'nama_toko',
    sortOrder = 'asc'
  } = params

  return useQuery({
    queryKey: optimizedTokoKeys.list({
      page,
      limit,
      search,
      status,
      id_sales,
      kabupaten,
      kecamatan,
      sortBy,
      sortOrder
    }),
    queryFn: async (): Promise<OptimizedTokoResponse> => {
      try {
        const searchParams = new URLSearchParams()
        
        searchParams.set('page', page.toString())
        searchParams.set('limit', limit.toString())
        
        if (search) searchParams.set('search', search)
        if (status) searchParams.set('status', status)
        if (id_sales) searchParams.set('id_sales', id_sales)
        if (kabupaten) searchParams.set('kabupaten', kabupaten)
        if (kecamatan) searchParams.set('kecamatan', kecamatan)
        if (sortBy) searchParams.set('sortBy', sortBy)
        if (sortOrder) searchParams.set('sortOrder', sortOrder)

        const response = await apiClient.get(`/toko/optimized?${searchParams.toString()}`) as OptimizedTokoResponse
        
        
        
        // The API client returns the response directly, not wrapped in .data
        if (!response || !Array.isArray(response.data)) {
          
          return {
            data: [],
            pagination: {
              page: 1,
              limit: 20,
              total: 0,
              totalPages: 0,
              hasNextPage: false,
              hasPrevPage: false
            },
            summary: {
              total_stores: 0,
              active_stores: 0,
              inactive_stores: 0,
              unique_kabupaten: 0,
              unique_kecamatan: 0
            }
          }
        }
        
        // If response is an array (old format), wrap it
        if (Array.isArray(response)) {
          
          return {
            data: response,
            pagination: {
              page: 1,
              limit: response.length,
              total: response.length,
              totalPages: 1,
              hasNextPage: false,
              hasPrevPage: false
            },
            summary: {
              total_stores: response.length,
              active_stores: response.filter((t: any) => t.status_toko).length,
              inactive_stores: response.filter((t: any) => !t.status_toko).length,
              unique_kabupaten: new Set(response.map((t: any) => t.kabupaten).filter(Boolean)).size,
              unique_kecamatan: new Set(response.map((t: any) => t.kecamatan).filter(Boolean)).size
            }
          }
        }
        
        return response
      } catch (error) {
        console.error('Error fetching toko data:', error)
        
        // Return fallback data structure
        return {
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false
          },
          summary: {
            total_stores: 0,
            active_stores: 0,
            inactive_stores: 0,
            unique_kabupaten: 0,
            unique_kecamatan: 0
          }
        }
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry on authentication errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false
      }
      return failureCount < 3
    },
  })
}

// Search suggestions query with debouncing built-in
export function useOptimizedTokoSearchSuggestions(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: optimizedTokoKeys.suggestion(query),
    queryFn: async (): Promise<SearchSuggestion[]> => {
      if (!query || query.length < 2) {
        return []
      }

      try {
        const response = await apiClient.get(`/toko/search-suggestions/optimized?q=${encodeURIComponent(query)}&limit=10`) as { suggestions: SearchSuggestion[] }
        return response.suggestions || []
      } catch (error) {
        console.error('Error fetching toko search suggestions:', error)
        return []
      }
    },
    enabled: enabled && query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false
      }
      return failureCount < 2
    },
  })
}

// Filter options query for dropdowns
export function useOptimizedTokoFilterOptions() {
  return useQuery({
    queryKey: optimizedTokoKeys.filterOptions(),
    queryFn: async (): Promise<FilterOptionsResponse> => {
      try {
        
        
        // Check authentication session first
        const { supabase } = await import('@/lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.access_token) {
          throw new Error('No authenticated session found')
        }
        
        const response = await apiClient.get('/toko/filter-options/optimized') as FilterOptionsResponse
        
        
        // Ensure we always return a valid structure
        if (!response || typeof response !== 'object' || !response.summary) {
          console.warn('Filter options API returned invalid data, using fallback')
          return {
            status: [],
            sales: [],
            kabupaten: [],
            kecamatan: [],
            summary: {
              total_stores: 0,
              active_stores: 0,
              inactive_stores: 0,
              unique_kabupaten: 0,
              unique_kecamatan: 0,
              unique_sales: 0
            }
          }
        }
        
        
        return response
      } catch (error) {
        console.error('Error fetching toko filter options:', error)
        
        // Return fallback data structure
        return {
          status: [
            { label: 'Aktif', value: 'true', count: 0 },
            { label: 'Non-aktif', value: 'false', count: 0 }
          ],
          sales: [],
          kabupaten: [],
          kecamatan: [],
          summary: {
            total_stores: 0,
            active_stores: 0,
            inactive_stores: 0,
            unique_kabupaten: 0,
            unique_kecamatan: 0,
            unique_sales: 0
          }
        }
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false
      }
      return failureCount < 3
    },
  })
}

// Invalidation utilities
export function useInvalidateOptimizedToko() {
  const queryClient = useQueryClient()

  return {
    // Invalidate all toko queries
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: optimizedTokoKeys.all })
    },
    
    // Invalidate only list queries (preserves suggestions and filter options)
    invalidateLists: () => {
      queryClient.invalidateQueries({ queryKey: optimizedTokoKeys.lists() })
    },
    
    // Invalidate specific list query
    invalidateList: (filters: Record<string, any>) => {
      queryClient.invalidateQueries({ queryKey: optimizedTokoKeys.list(filters) })
    },
    
    // Invalidate suggestions
    invalidateSuggestions: () => {
      queryClient.invalidateQueries({ queryKey: optimizedTokoKeys.suggestions() })
    },
    
    // Invalidate filter options
    invalidateFilterOptions: () => {
      queryClient.invalidateQueries({ queryKey: optimizedTokoKeys.filterOptions() })
    },
    
    // Remove all cached data
    removeAll: () => {
      queryClient.removeQueries({ queryKey: optimizedTokoKeys.all })
    }
  }
}

// Prefetch utilities for better UX
export function usePrefetchOptimizedToko() {
  const queryClient = useQueryClient()

  return {
    // Prefetch next page
    prefetchNextPage: (currentParams: TokoQueryParams) => {
      const nextPage = (currentParams.page || 1) + 1
      queryClient.prefetchQuery({
        queryKey: optimizedTokoKeys.list({ ...currentParams, page: nextPage }),
        queryFn: async () => {
          const searchParams = new URLSearchParams()
          Object.entries({ ...currentParams, page: nextPage }).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
              searchParams.set(key, value.toString())
            }
          })
          const response = await apiClient.get(`/toko/optimized?${searchParams.toString()}`) as OptimizedTokoResponse
          return response
        },
        staleTime: 2 * 60 * 1000,
      })
    },

    // Prefetch filter options when user starts typing
    prefetchFilterOptions: () => {
      queryClient.prefetchQuery({
        queryKey: optimizedTokoKeys.filterOptions(),
        queryFn: async () => {
          const response = await apiClient.get('/toko/filter-options/optimized') as FilterOptionsResponse
          return response
        },
        staleTime: 10 * 60 * 1000,
      })
    },

    // Prefetch suggestions for common queries
    prefetchCommonSuggestions: (queries: string[]) => {
      queries.forEach(query => {
        if (query.length >= 2) {
          queryClient.prefetchQuery({
            queryKey: optimizedTokoKeys.suggestion(query),
            queryFn: async () => {
              const response = await apiClient.get(`/toko/search-suggestions/optimized?q=${encodeURIComponent(query)}&limit=10`) as { suggestions: SearchSuggestion[] }
              return response.suggestions || []
            },
            staleTime: 5 * 60 * 1000,
          })
        }
      })
    }
  }
}

// Background refresh utility
export function useOptimizedTokoBackgroundRefresh(params: TokoQueryParams, intervalMs: number = 5 * 60 * 1000) {
  const queryClient = useQueryClient()

  React.useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ 
        queryKey: optimizedTokoKeys.list(params),
        refetchType: 'active' // Only refetch if the query is currently being used
      })
    }, intervalMs)

    return () => clearInterval(interval)
  }, [queryClient, params, intervalMs])
}

// Hook for managing query state and UI interactions
export function useOptimizedTokoState(initialParams: TokoQueryParams = {}) {
  const [params, setParams] = React.useState<TokoQueryParams>(initialParams)
  const query = useOptimizedTokoQuery(params)
  const suggestions = useOptimizedTokoSearchSuggestions(params.search || '', !!params.search)
  const filterOptions = useOptimizedTokoFilterOptions()
  const invalidate = useInvalidateOptimizedToko()
  const prefetch = usePrefetchOptimizedToko()
  
  

  // Update params with automatic invalidation
  const updateParams = React.useCallback((newParams: Partial<TokoQueryParams>) => {
    setParams(prev => {
      const updated = { ...prev, ...newParams }
      
      // Reset page when filters change
      if (Object.keys(newParams).some(key => key !== 'page')) {
        updated.page = 1
      }
      
      return updated
    })
  }, [])

  // Prefetch next page when current page loads
  React.useEffect(() => {
    if (query.data?.pagination?.hasNextPage && !query.isLoading) {
      prefetch.prefetchNextPage(params)
    }
  }, [query.data, query.isLoading, params, prefetch])

  return {
    // Query states
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    
    // Suggestions
    suggestions: suggestions.data || [],
    suggestionsLoading: suggestions.isLoading,
    
    // Filter options
    filterOptions: filterOptions.data,
    filterOptionsLoading: filterOptions.isLoading,
    
    // Parameters
    params,
    updateParams,
    
    // Utilities
    invalidate,
    prefetch,
  }
}