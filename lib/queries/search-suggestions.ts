import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useDebounce } from '@/lib/hooks/use-debounce'

export interface SearchSuggestion {
  id: string
  type: 'toko' | 'kabupaten' | 'kecamatan' | 'sales' | 'telepon'
  value: string
  label: string
  description?: string
  metadata?: Record<string, any>
  frequency?: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
}

// Search suggestions hook with debouncing
export function useSearchSuggestions(
  query: string,
  options: {
    limit?: number
    types?: string[]
    debounceDelay?: number
    enabled?: boolean
  } = {}
) {
  const {
    limit = 10,
    types = ['toko', 'kabupaten', 'kecamatan', 'sales'],
    debounceDelay = 300,
    enabled = true
  } = options
  
  const debouncedQuery = useDebounce(query, debounceDelay)
  
  return useQuery({
    queryKey: ['search-suggestions', 'toko', debouncedQuery, limit, types.join(',')],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 1) {
        console.log('Search suggestions: Query too short, returning empty')
        return { suggestions: [] }
      }
      
      const params = new URLSearchParams({
        q: debouncedQuery,
        limit: limit.toString(),
        types: types.join(',')
      })
      
      // console.log('Making search suggestions API call:', `/toko/search-suggestions?${params}`)
      
      try {
        const response = await apiClient.get(`/toko/search-suggestions?${params}`)
        // console.log('Search suggestions response:', response)
        return response as ApiResponse<{ suggestions: SearchSuggestion[] }>
      } catch (error) {
        console.error('Search suggestions API error:', error)
        throw error
      }
    },
    enabled: enabled && debouncedQuery.length >= 1,
    staleTime: 1000 * 30, // 30 seconds - shorter for more responsive search
    gcTime: 1000 * 60 * 2, // 2 minutes - shorter cache
    refetchOnWindowFocus: false,
    retry: 1, // Reduce retry attempts
    retryDelay: 300, // Faster retry
  })
}

// Complete filter options hook - loads all available filter options regardless of current page
export function useCompleteFilterOptions(
  options: {
    includeCount?: boolean
    onlyActive?: boolean
    enabled?: boolean
  } = {}
) {
  const {
    includeCount = true,
    onlyActive = true,
    enabled = true
  } = options
  
  return useQuery({
    queryKey: ['complete-filter-options', 'toko', includeCount, onlyActive],
    queryFn: async () => {
      const params = new URLSearchParams({
        include_count: includeCount.toString(),
        only_active: onlyActive.toString()
      })
      
      const response = await apiClient.get(`/toko/complete-filter-options?${params}`)
      return response as ApiResponse<{
        kabupaten: Array<{ value: string; label: string; count?: number }>
        kecamatan: Array<{ value: string; label: string; description?: string; count?: number }>
        sales: Array<{ value: string; label: string; description?: string; count?: number }>
        status: Array<{ value: string; label: string; count?: number }>
        summary: {
          total_stores: number
          active_stores: number
          inactive_stores: number
          unique_kabupaten: number
          unique_kecamatan: number
          active_sales: number
          last_updated: string
        }
      }>
    },
    enabled,
    staleTime: 1000 * 60 * 10, // 10 minutes - filter options don't change often
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
  })
}

// Smart search hook that combines search suggestions with filter application
export function useSmartTokoSearch(
  searchQuery: string,
  selectedFilters: Record<string, string>,
  options: {
    enableSuggestions?: boolean
    enableCompleteFilters?: boolean
  } = {}
) {
  const {
    enableSuggestions = true,
    enableCompleteFilters = true
  } = options
  
  // Only fetch suggestions when search query has meaningful length
  const suggestions = useSearchSuggestions(searchQuery, {
    enabled: enableSuggestions && searchQuery.length >= 1,
    debounceDelay: 300, // Slightly faster debounce
    limit: 6 // Fewer suggestions for faster response
  })
  
  const completeFilters = useCompleteFilterOptions({
    enabled: enableCompleteFilters
  })
  
  return {
    suggestions: (suggestions.data as any)?.data?.suggestions || [],
    suggestionsLoading: suggestions.isLoading && searchQuery.length >= 1,
    suggestionsError: suggestions.error,
    
    filterOptions: completeFilters.data?.data || null,
    filterOptionsLoading: completeFilters.isLoading,
    filterOptionsError: completeFilters.error,
    
    summary: completeFilters.data?.data?.summary || null,
    
    refetchSuggestions: suggestions.refetch,
    refetchFilterOptions: completeFilters.refetch,
  }
}