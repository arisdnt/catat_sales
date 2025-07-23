import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

interface UseDebounceSearchOptions {
  delay?: number
  minLength?: number
  enabled?: boolean
}

export function useDebounceSearch(
  searchTerm: string,
  options: UseDebounceSearchOptions = {}
) {
  const { delay = 300, minLength = 2, enabled = true } = options
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, delay)

    return () => clearTimeout(timer)
  }, [searchTerm, delay])

  const shouldSearch = enabled && debouncedSearchTerm.length >= minLength

  return {
    debouncedSearchTerm,
    shouldSearch,
  }
}

// Specialized hooks for different entity searches
export function useDebounceStoreSearch(searchTerm: string, filters?: {
  sales_id?: number
  kabupaten?: string
  kecamatan?: string
}) {
  const { debouncedSearchTerm, shouldSearch } = useDebounceSearch(searchTerm)

  return useQuery({
    queryKey: ['store-search', debouncedSearchTerm, filters],
    queryFn: async (): Promise<any[]> => {
      const params = new URLSearchParams()
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm)
      if (filters?.sales_id) params.append('sales_id', filters.sales_id.toString())
      if (filters?.kabupaten) params.append('kabupaten', filters.kabupaten)
      if (filters?.kecamatan) params.append('kecamatan', filters.kecamatan)
      
      const response = await apiClient.get(`/mv/toko?${params.toString()}`)
      return Array.isArray(response) ? response : []
    },
    enabled: shouldSearch,
    staleTime: 1000 * 60 * 5, // Cache search results for 5 minutes
    select: (data: any[]) => data.slice(0, 10), // Limit to 10 results for dropdown
  })
}

export function useDebounceProductSearch(searchTerm: string, priorityOnly: boolean = false) {
  const { debouncedSearchTerm, shouldSearch } = useDebounceSearch(searchTerm)

  return useQuery({
    queryKey: ['product-search', debouncedSearchTerm, priorityOnly],
    queryFn: async (): Promise<any[]> => {
      const params = new URLSearchParams()
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm)
      if (priorityOnly) params.append('priority_only', 'true')
      
      const response = await apiClient.get(`/mv/produk?withStats=true&${params.toString()}`)
      return Array.isArray(response) ? response : []
    },
    enabled: shouldSearch,
    staleTime: 1000 * 60 * 5,
    select: (data: any[]) => data
      .filter((product: any) => 
        product.status_produk && 
        product.nama_produk.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
      .slice(0, 15), // Limit to 15 results
  })
}

export function useDebouncesSalesSearch(searchTerm: string, activeOnly: boolean = true) {
  const { debouncedSearchTerm, shouldSearch } = useDebounceSearch(searchTerm)

  return useQuery({
    queryKey: ['sales-search', debouncedSearchTerm, activeOnly],
    queryFn: async (): Promise<any[]> => {
      const response = await apiClient.get('/mv/sales')
      return Array.isArray(response) ? response : []
    },
    enabled: shouldSearch,
    staleTime: 1000 * 60 * 5,
    select: (data: any[]) => data
      .filter((sales: any) => {
        const matchesSearch = sales.nama_sales.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        const matchesStatus = !activeOnly || sales.status_aktif
        return matchesSearch && matchesStatus
      })
      .slice(0, 10),
  })
}

// Multi-entity search for global search functionality
export function useDebounceMultiSearch(searchTerm: string) {
  const { debouncedSearchTerm, shouldSearch } = useDebounceSearch(searchTerm, { minLength: 3 })

  const storeResults = useQuery({
    queryKey: ['multi-search-stores', debouncedSearchTerm],
    queryFn: async (): Promise<any[]> => {
      const response = await apiClient.get(`/mv/toko?search=${debouncedSearchTerm}`)
      return Array.isArray(response) ? response : []
    },
    enabled: shouldSearch,
    staleTime: 1000 * 60 * 3,
    select: (data: any[]) => data.slice(0, 5).map((item: any) => ({
      ...item,
      type: 'store',
      label: item.nama_toko,
      subtitle: `${item.kecamatan}, ${item.kabupaten}`,
    })),
  })

  const productResults = useQuery({
    queryKey: ['multi-search-products', debouncedSearchTerm],
    queryFn: async (): Promise<any[]> => {
      const response = await apiClient.get(`/mv/produk?withStats=true`)
      return Array.isArray(response) ? response : []
    },
    enabled: shouldSearch,
    staleTime: 1000 * 60 * 3,
    select: (data: any[]) => data
      .filter((item: any) => 
        item.nama_produk.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
      .slice(0, 5)
      .map((item: any) => ({
        ...item,
        type: 'product',
        label: item.nama_produk,
        subtitle: `Rp ${item.harga_satuan?.toLocaleString('id-ID')} - Stok: ${item.sisa_stok || 0}`,
      })),
  })

  const salesResults = useQuery({
    queryKey: ['multi-search-sales', debouncedSearchTerm],
    queryFn: async (): Promise<any[]> => {
      const response = await apiClient.get('/mv/sales')
      return Array.isArray(response) ? response : []
    },
    enabled: shouldSearch,
    staleTime: 1000 * 60 * 3,
    select: (data: any[]) => data
      .filter((item: any) => 
        item.nama_sales.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
      .slice(0, 5)
      .map((item: any) => ({
        ...item,
        type: 'sales',
        label: item.nama_sales,
        subtitle: `${item.total_stores || 0} toko - ${item.nomor_telepon || 'No phone'}`,
      })),
  })

  const isLoading = storeResults.isLoading || productResults.isLoading || salesResults.isLoading
  const hasError = storeResults.error || productResults.error || salesResults.error

  const allResults = useMemo(() => {
    const stores = storeResults.data || []
    const products = productResults.data || []
    const sales = salesResults.data || []
    
    return [...stores, ...products, ...sales]
  }, [storeResults.data, productResults.data, salesResults.data])

  return {
    results: allResults,
    isLoading,
    hasError,
    debouncedSearchTerm,
    shouldSearch,
  }
}