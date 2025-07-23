import { useMemo, useCallback, useState } from 'react'
import { type RowData } from '@tanstack/react-table'

// Performance optimization utilities for large datasets

export interface TablePerformanceConfig {
  enableVirtualization: boolean
  enableMemoization: boolean
  debounceDelay: number
  pageSize: number
  maxRowsBeforeVirtualization: number
  enableIncrementalLoading: boolean
}

export const DEFAULT_PERFORMANCE_CONFIG: TablePerformanceConfig = {
  enableVirtualization: true,
  enableMemoization: true,
  debounceDelay: 300,
  pageSize: 50,
  maxRowsBeforeVirtualization: 100,
  enableIncrementalLoading: true,
}

// Memoized data processing hook
export function useMemoizedTableData<T extends RowData>(
  data: T[],
  searchTerm: string,
  filters: Record<string, unknown>,
  enableMemoization: boolean = true
) {
  return useMemo(() => {
    if (!enableMemoization) return data

    let filteredData = [...data]

    // Apply search filter
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filteredData = filteredData.filter((item) => {
        return Object.values(item as any).some((value) => {
          if (value === null || value === undefined) return false
          return String(value).toLowerCase().includes(searchLower)
        })
      })
    }

    // Apply additional filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        if (Array.isArray(value) && value.length > 0) {
          filteredData = filteredData.filter((item) => {
            const itemValue = (item as any)[key]
            return value.includes(String(itemValue))
          })
        } else {
          filteredData = filteredData.filter((item) => {
            const itemValue = (item as any)[key]
            return String(itemValue) === String(value)
          })
        }
      }
    })

    return filteredData
  }, [data, searchTerm, filters, enableMemoization])
}

// Optimized column definition with memoization
export function useMemoizedColumns(
  columnFactory: () => any[],
  dependencies: any[] = []
) {
  return useMemo(() => columnFactory(), [columnFactory, ...dependencies])
}

// Optimized action handlers
export function useOptimizedActionHandlers<T extends RowData>() {
  const handleView = useCallback((row: T, navigate: (path: string) => void, basePath: string) => {
    const id = (row as any).id || (row as any).id_toko || (row as any).id_sales || (row as any).id_produk
    if (id) {
      navigate(`${basePath}/${id}`)
    }
  }, [])

  const handleEdit = useCallback((row: T, navigate: (path: string) => void, basePath: string) => {
    const id = (row as any).id || (row as any).id_toko || (row as any).id_sales || (row as any).id_produk
    if (id) {
      navigate(`${basePath}/${id}/edit`)
    }
  }, [])

  const handleDelete = useCallback((row: T, deleteHandler: (id: number) => void) => {
    const id = (row as any).id || (row as any).id_toko || (row as any).id_sales || (row as any).id_produk
    if (id && window.confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      deleteHandler(id)
    }
  }, [])

  return { handleView, handleEdit, handleDelete }
}

// Table performance analytics
export function useTablePerformanceAnalytics(
  dataLength: number,
  renderTime: number,
  config: TablePerformanceConfig
) {
  return useMemo(() => {
    const shouldUseVirtualization = dataLength > config.maxRowsBeforeVirtualization
    const shouldUsePagination = dataLength > config.pageSize
    const isLargeDataset = dataLength > 1000
    const isVeryLargeDataset = dataLength > 10000

    const recommendations: string[] = []

    if (isVeryLargeDataset && !config.enableVirtualization) {
      recommendations.push('Enable virtualization for very large datasets')
    }

    if (isLargeDataset && config.debounceDelay < 300) {
      recommendations.push('Increase debounce delay for large datasets')
    }

    if (renderTime > 100) {
      recommendations.push('Consider reducing data complexity or enable server-side filtering')
    }

    return {
      shouldUseVirtualization,
      shouldUsePagination,
      isLargeDataset,
      isVeryLargeDataset,
      recommendations,
      performanceScore: calculatePerformanceScore(dataLength, renderTime, config),
    }
  }, [dataLength, renderTime, config])
}

function calculatePerformanceScore(
  dataLength: number,
  renderTime: number,
  config: TablePerformanceConfig
): number {
  let score = 100

  // Penalize for large datasets without optimization
  if (dataLength > 1000 && !config.enableVirtualization) {
    score -= 20
  }

  if (dataLength > 10000 && !config.enableIncrementalLoading) {
    score -= 30
  }

  // Penalize for slow render times
  if (renderTime > 100) {
    score -= Math.min(40, (renderTime - 100) / 10)
  }

  // Bonus for good configurations
  if (config.enableMemoization) {
    score += 5
  }

  if (config.debounceDelay >= 300) {
    score += 5
  }

  return Math.max(0, Math.min(100, score))
}

// Incremental loading hook for very large datasets
export function useIncrementalLoading<T>(
  data: T[],
  initialSize: number = 100,
  incrementSize: number = 50,
  enabled: boolean = true
) {
  const [loadedCount, setLoadedCount] = useState(initialSize)

  const visibleData = useMemo(() => {
    if (!enabled) return data
    return data.slice(0, loadedCount)
  }, [data, loadedCount, enabled])

  const loadMore = useCallback(() => {
    setLoadedCount(prev => Math.min(prev + incrementSize, data.length))
  }, [incrementSize, data.length])

  const hasMore = loadedCount < data.length

  return {
    visibleData,
    loadMore,
    hasMore,
    loadedCount,
    totalCount: data.length,
  }
}

// Export performance utilities
export const TablePerformanceUtils = {
  useMemoizedTableData,
  useMemoizedColumns,
  useOptimizedActionHandlers,
  useTablePerformanceAnalytics,
  useIncrementalLoading,
  DEFAULT_PERFORMANCE_CONFIG,
}