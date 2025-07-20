// @ts-nocheck
import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

// Types for optimized pengiriman queries
export interface PengirimanWithDetails {
  id_pengiriman: number
  tanggal_kirim: string
  dibuat_pada: string
  diperbarui_pada: string
  id_toko: number
  nama_toko: string
  kecamatan?: string
  kabupaten?: string
  link_gmaps?: string
  id_sales: number
  nama_sales: string
  nomor_telepon?: string
  total_quantity: number
  detail_pengiriman: Array<{
    id_detail_kirim: number
    id_produk: number
    nama_produk: string
    jumlah_kirim: number
    harga_satuan: number
  }>
}

export interface OptimizedPengirimanResponse {
  data: PengirimanWithDetails[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  summary: {
    total_shipments: number
    today_shipments: number
    this_week_shipments: number
    unique_kabupaten: number
    unique_kecamatan: number
    unique_sales: number
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
  sales: FilterOption[]
  kabupaten: FilterOption[]
  kecamatan: FilterOption[]
  summary: {
    total_shipments: number
    today_shipments: number
    this_week_shipments: number
    unique_toko: number
    unique_kabupaten: number
    unique_kecamatan: number
    unique_sales: number
  }
}

// Query keys for optimized pengiriman queries
export const optimizedPengirimanKeys = {
  all: ['pengiriman-optimized'] as const,
  lists: () => [...optimizedPengirimanKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...optimizedPengirimanKeys.lists(), { filters }] as const,
  suggestions: () => [...optimizedPengirimanKeys.all, 'suggestions'] as const,
  suggestion: (query: string) => [...optimizedPengirimanKeys.suggestions(), query] as const,
  filterOptions: () => [...optimizedPengirimanKeys.all, 'filter-options'] as const,
}

// Query parameters interface
interface PengirimanQueryParams {
  page?: number
  limit?: number
  search?: string
  id_sales?: string
  kabupaten?: string
  kecamatan?: string
  date_from?: string
  date_to?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Optimized pengiriman list query with server-side pagination and filtering
export function useOptimizedPengirimanQuery(params: PengirimanQueryParams = {}) {
  const {
    page = 1,
    limit = 20,
    search = '',
    id_sales,
    kabupaten = '',
    kecamatan = '',
    date_from,
    date_to,
    sortBy = 'tanggal_kirim',
    sortOrder = 'desc'
  } = params

  return useQuery({
    queryKey: optimizedPengirimanKeys.list({
      page,
      limit,
      search,
      id_sales,
      kabupaten,
      kecamatan,
      date_from,
      date_to,
      sortBy,
      sortOrder
    }),
    queryFn: async (): Promise<OptimizedPengirimanResponse> => {
      try {
        const searchParams = new URLSearchParams()
        
        searchParams.set('page', page.toString())
        searchParams.set('limit', limit.toString())
        
        if (search) searchParams.set('search', search)
        if (id_sales) searchParams.set('id_sales', id_sales)
        if (kabupaten) searchParams.set('kabupaten', kabupaten)
        if (kecamatan) searchParams.set('kecamatan', kecamatan)
        if (date_from) searchParams.set('date_from', date_from)
        if (date_to) searchParams.set('date_to', date_to)
        if (sortBy) searchParams.set('sortBy', sortBy)
        if (sortOrder) searchParams.set('sortOrder', sortOrder)

        const response = await apiClient.get(`/pengiriman/optimized?${searchParams.toString()}`)
        
        // The API client returns the response directly, not wrapped in .data
        if (!response || (!response.data && !Array.isArray(response))) {
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
              total_shipments: 0,
              today_shipments: 0,
              this_week_shipments: 0,
              unique_kabupaten: 0,
              unique_kecamatan: 0,
              unique_sales: 0
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
              total_shipments: response.length,
              today_shipments: 0,
              this_week_shipments: 0,
              unique_kabupaten: new Set(response.map((p: any) => p.kabupaten).filter(Boolean)).size,
              unique_kecamatan: new Set(response.map((p: any) => p.kecamatan).filter(Boolean)).size,
              unique_sales: new Set(response.map((p: any) => p.id_sales)).size
            }
          }
        }
        
        return response
      } catch (error) {
        console.error('Optimized pengiriman query error:', error)
        
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
            total_shipments: 0,
            today_shipments: 0,
            this_week_shipments: 0,
            unique_kabupaten: 0,
            unique_kecamatan: 0,
            unique_sales: 0
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
export function useOptimizedPengirimanSearchSuggestions(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: optimizedPengirimanKeys.suggestion(query),
    queryFn: async (): Promise<SearchSuggestion[]> => {
      if (!query || query.length < 2) {
        return []
      }

      try {
        const response = await apiClient.get(`/pengiriman/search-suggestions?q=${encodeURIComponent(query)}&limit=10`)
        return response.data?.suggestions || []
      } catch (error) {
        console.error('Pengiriman search suggestions error:', error)
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
export function useOptimizedPengirimanFilterOptions() {
  return useQuery({
    queryKey: optimizedPengirimanKeys.filterOptions(),
    queryFn: async (): Promise<FilterOptionsResponse> => {
      try {
        // Check authentication session first
        const { supabase } = await import('@/lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.access_token) {
          throw new Error('No authenticated session found')
        }
        
        const response = await apiClient.get('/pengiriman/filter-options')
        
        // Ensure we always return a valid structure
        if (!response?.data || typeof response.data !== 'object' || !response.data.summary) {
          console.warn('Pengiriman filter options API returned invalid data, using fallback')
          return {
            sales: [],
            kabupaten: [],
            kecamatan: [],
            summary: {
              total_shipments: 0,
              today_shipments: 0,
              this_week_shipments: 0,
              unique_toko: 0,
              unique_kabupaten: 0,
              unique_kecamatan: 0,
              unique_sales: 0
            }
          }
        }
        
        return response.data
      } catch (error) {
        console.error('Pengiriman filter options error:', error)
        
        // Return fallback data structure
        return {
          sales: [],
          kabupaten: [],
          kecamatan: [],
          summary: {
            total_shipments: 0,
            today_shipments: 0,
            this_week_shipments: 0,
            unique_toko: 0,
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
export function useInvalidateOptimizedPengiriman() {
  const queryClient = useQueryClient()

  return {
    // Invalidate all pengiriman queries
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: optimizedPengirimanKeys.all })
    },
    
    // Invalidate only list queries (preserves suggestions and filter options)
    invalidateLists: () => {
      queryClient.invalidateQueries({ queryKey: optimizedPengirimanKeys.lists() })
    },
    
    // Invalidate specific list query
    invalidateList: (filters: Record<string, any>) => {
      queryClient.invalidateQueries({ queryKey: optimizedPengirimanKeys.list(filters) })
    },
    
    // Invalidate suggestions
    invalidateSuggestions: () => {
      queryClient.invalidateQueries({ queryKey: optimizedPengirimanKeys.suggestions() })
    },
    
    // Invalidate filter options
    invalidateFilterOptions: () => {
      queryClient.invalidateQueries({ queryKey: optimizedPengirimanKeys.filterOptions() })
    },
    
    // Remove all cached data
    removeAll: () => {
      queryClient.removeQueries({ queryKey: optimizedPengirimanKeys.all })
    }
  }
}

// Prefetch utilities for better UX
export function usePrefetchOptimizedPengiriman() {
  const queryClient = useQueryClient()

  return {
    // Prefetch next page
    prefetchNextPage: (currentParams: PengirimanQueryParams) => {
      const nextPage = (currentParams.page || 1) + 1
      queryClient.prefetchQuery({
        queryKey: optimizedPengirimanKeys.list({ ...currentParams, page: nextPage }),
        queryFn: async () => {
          const searchParams = new URLSearchParams()
          Object.entries({ ...currentParams, page: nextPage }).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
              searchParams.set(key, value.toString())
            }
          })
          const response = await apiClient.get(`/pengiriman/optimized?${searchParams.toString()}`)
          return response.data
        },
        staleTime: 2 * 60 * 1000,
      })
    },

    // Prefetch filter options when user starts typing
    prefetchFilterOptions: () => {
      queryClient.prefetchQuery({
        queryKey: optimizedPengirimanKeys.filterOptions(),
        queryFn: async () => {
          const response = await apiClient.get('/pengiriman/filter-options')
          return response.data
        },
        staleTime: 10 * 60 * 1000,
      })
    },

    // Prefetch suggestions for common queries
    prefetchCommonSuggestions: (queries: string[]) => {
      queries.forEach(query => {
        if (query.length >= 2) {
          queryClient.prefetchQuery({
            queryKey: optimizedPengirimanKeys.suggestion(query),
            queryFn: async () => {
              const response = await apiClient.get(`/pengiriman/search-suggestions?q=${encodeURIComponent(query)}&limit=10`)
              return response.data.suggestions || []
            },
            staleTime: 5 * 60 * 1000,
          })
        }
      })
    }
  }
}

// Background refresh utility
export function useOptimizedPengirimanBackgroundRefresh(params: PengirimanQueryParams, intervalMs: number = 5 * 60 * 1000) {
  const queryClient = useQueryClient()

  React.useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ 
        queryKey: optimizedPengirimanKeys.list(params),
        refetchType: 'active' // Only refetch if the query is currently being used
      })
    }, intervalMs)

    return () => clearInterval(interval)
  }, [queryClient, params, intervalMs])
}

// Hook for managing query state and UI interactions
export function useOptimizedPengirimanState(initialParams: PengirimanQueryParams = {}) {
  const [params, setParams] = React.useState<PengirimanQueryParams>(initialParams)
  const query = useOptimizedPengirimanQuery(params)
  const suggestions = useOptimizedPengirimanSearchSuggestions(params.search || '', !!params.search)
  const filterOptions = useOptimizedPengirimanFilterOptions()
  const invalidate = useInvalidateOptimizedPengiriman()
  const prefetch = usePrefetchOptimizedPengiriman()

  // Update params with automatic invalidation
  const updateParams = React.useCallback((newParams: Partial<PengirimanQueryParams>) => {
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
    // Query states - return object with data and pagination structure like toko
    data: {
      data: query.data?.data?.data || query.data?.data || [],
      pagination: query.data?.data?.pagination || query.data?.pagination || { page: 1, limit: 20, total: 0, total_pages: 0 }
    },
    // Legacy compatibility
    pagination: query.data?.data?.pagination || query.data?.pagination || { page: 1, limit: 20, total: 0, total_pages: 0 },
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    
    // Suggestions - handle wrapped response
    suggestions: suggestions.data?.data?.suggestions || suggestions.data?.suggestions || suggestions.data || [],
    suggestionsLoading: suggestions.isLoading,
    
    // Filter options - handle wrapped response
    filterOptions: filterOptions.data?.data || filterOptions.data,
    filterOptionsLoading: filterOptions.isLoading,
    
    // Parameters
    params,
    updateParams,
    
    // Utilities
    invalidate,
    prefetch,
  }
}