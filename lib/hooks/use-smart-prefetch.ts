import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'

// Prefetch related data when hovering over links or buttons
export function usePrefetchOnHover() {
  const queryClient = useQueryClient()

  const prefetchEntity = (
    entityType: 'sales' | 'produk' | 'toko' | 'penagihan' | 'pengiriman' | 'setoran',
    id: number
  ) => {
    queryClient.prefetchQuery({
      queryKey: [entityType, id],
      queryFn: () => apiClient.get(`/mv/${entityType}/${id}`),
      staleTime: 1000 * 60 * 5,
    })
  }

  return { prefetchEntity }
}

// Prefetch next/previous items in list views
export function usePrefetchNavigation(
  currentItems: any[],
  currentIndex: number,
  entityType: 'sales' | 'produk' | 'toko' | 'penagihan' | 'pengiriman' | 'setoran',
  idField: string = 'id'
) {
  const queryClient = useQueryClient()

  useEffect(() => {
    // Prefetch next and previous items
    const prefetchRange = [-1, 1] // Previous and next item
    
    prefetchRange.forEach(offset => {
      const targetIndex = currentIndex + offset
      if (targetIndex >= 0 && targetIndex < currentItems.length) {
        const item = currentItems[targetIndex]
        const id = item[idField]
        
        if (id) {
          queryClient.prefetchQuery({
            queryKey: [entityType, id],
            queryFn: () => apiClient.get(`/mv/${entityType}/${id}`),
            staleTime: 1000 * 60 * 5,
          })
        }
      }
    })
  }, [currentIndex, currentItems, entityType, idField, queryClient])
}

// Prefetch related entities for edit forms
export function usePrefetchFormDependencies(entityType: 'pengiriman' | 'penagihan' | 'setoran' | null | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    // Only prefetch if entityType is provided
    if (!entityType) return

    // Always prefetch sales data for forms
    queryClient.prefetchQuery({
      queryKey: ['sales'],
      queryFn: () => apiClient.get('/mv/sales'),
      staleTime: 1000 * 60 * 5,
    })

    // Prefetch products for shipment and billing forms
    if (entityType === 'pengiriman' || entityType === 'penagihan') {
      queryClient.prefetchQuery({
        queryKey: ['produk'],
        queryFn: () => apiClient.get('/mv/produk?withStats=true'),
        staleTime: 1000 * 60 * 5,
      })
    }

    // Prefetch stores for shipment and billing forms
    if (entityType === 'pengiriman' || entityType === 'penagihan') {
      queryClient.prefetchQuery({
        queryKey: ['toko'],
        queryFn: () => apiClient.get('/mv/toko'),
        staleTime: 1000 * 60 * 5,
      })
    }
  }, [entityType, queryClient])
}

// Background refresh for stale data
export function useBackgroundRefresh() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      // Refresh all materialized view queries that are stale
      queryClient.refetchQueries({
        predicate: (query) => {
          const queryKey = query.queryKey
          return Array.isArray(queryKey) && ['sales', 'produk', 'toko', 'penagihan', 'pengiriman', 'setoran'].includes(queryKey[0] as string)
        },
        type: 'active',
      })
    }, 1000 * 60 * 2) // Every 2 minutes

    return () => clearInterval(refreshInterval)
  }, [queryClient])
}

// Smart cache warming based on user behavior
export function useSmartCacheWarming() {
  const queryClient = useQueryClient()
  const router = useRouter()

  useEffect(() => {
    // Track page views to predict next likely navigation
    const handleRouteChange = () => {
      const currentPath = window.location.pathname

      // If viewing a list page, prefetch detail pages for first few items
      if (currentPath.includes('/dashboard/master-data/')) {
        // Prefetch the first 3 items of any master data list
        setTimeout(() => {
          ['sales', 'produk', 'toko'].forEach(entity => {
            if (currentPath.includes(entity)) {
              // Prefetch route
              router.prefetch(`/dashboard/master-data/${entity}`)
              
              // Prefetch data
              queryClient.prefetchQuery({
                queryKey: [entity],
                queryFn: () => apiClient.get(`/mv/${entity}`),
                staleTime: 1000 * 60 * 5,
              })
            }
          })
        }, 1000) // Delay to avoid blocking initial page load
      }

      // If viewing detail page, prefetch edit page data
      if (currentPath.includes('/dashboard/') && /\/\d+$/.test(currentPath)) {
        const pathParts = currentPath.split('/')
        const id = parseInt(pathParts[pathParts.length - 1])
        
        if (id && !isNaN(id)) {
          let entityType: any = null
          if (currentPath.includes('sales')) entityType = 'sales'
          else if (currentPath.includes('produk')) entityType = 'produk'
          else if (currentPath.includes('toko')) entityType = 'toko'
          else if (currentPath.includes('penagihan')) entityType = 'penagihan'
          else if (currentPath.includes('pengiriman')) entityType = 'pengiriman'
          else if (currentPath.includes('setoran')) entityType = 'setoran'

          if (entityType) {
            // Prefetch edit page data
            setTimeout(() => {
              queryClient.prefetchQuery({
                queryKey: [entityType, id],
                queryFn: () => apiClient.get(`/mv/${entityType}/${id}`),
                staleTime: 1000 * 60 * 5,
              })
            }, 500)
          }
        }
      }
    }

    // Initial check
    handleRouteChange()

    // Listen for route changes
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState

    history.pushState = function(...args) {
      originalPushState.apply(history, args)
      handleRouteChange()
    }

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args)
      handleRouteChange()
    }

    window.addEventListener('popstate', handleRouteChange)

    return () => {
      history.pushState = originalPushState
      history.replaceState = originalReplaceState
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [queryClient, router])
}

// Intelligent prefetching based on user interactions
export function useIntelligentPrefetch() {
  const queryClient = useQueryClient()

  const prefetchOnInteraction = (element: HTMLElement, entityType: string, id: number) => {
    const handleMouseEnter = () => {
      // Prefetch data when user hovers over a link/button for 500ms
      const timeout = setTimeout(() => {
        queryClient.prefetchQuery({
          queryKey: [entityType, id],
          queryFn: () => apiClient.get(`/mv/${entityType}/${id}`),
          staleTime: 1000 * 60 * 5,
        })
      }, 500)

      const handleMouseLeave = () => {
        clearTimeout(timeout)
        element.removeEventListener('mouseleave', handleMouseLeave)
      }

      element.addEventListener('mouseleave', handleMouseLeave, { once: true })
    }

    element.addEventListener('mouseenter', handleMouseEnter)

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter)
    }
  }

  return { prefetchOnInteraction }
}

// Optimized cache management
export function useOptimizedCacheManagement() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const manageCache = () => {
      // Remove old cached data to prevent memory leaks
      const oneHourAgo = Date.now() - 1000 * 60 * 60
      
      queryClient.getQueryCache().getAll().forEach(query => {
        if (query.state.dataUpdatedAt < oneHourAgo && !query.getObserversCount()) {
          queryClient.removeQueries({ queryKey: query.queryKey })
        }
      })
    }

    // Run cache management every 10 minutes
    const interval = setInterval(manageCache, 1000 * 60 * 10)

    return () => clearInterval(interval)
  }, [queryClient])
}

// Combined hook for all prefetching strategies
export function useComprehensivePrefetch(
  entityType?: 'sales' | 'produk' | 'toko' | 'penagihan' | 'pengiriman' | 'setoran',
  formType?: 'pengiriman' | 'penagihan' | 'setoran'
) {
  useBackgroundRefresh()
  useSmartCacheWarming()
  useOptimizedCacheManagement()
  
  // Always call form dependencies hook, but pass formType as parameter
  usePrefetchFormDependencies(formType)

  const { prefetchEntity } = usePrefetchOnHover()
  const { prefetchOnInteraction } = useIntelligentPrefetch()

  return {
    prefetchEntity,
    prefetchOnInteraction,
  }
}