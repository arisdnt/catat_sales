import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/components/ui/use-toast'

export interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface Sales {
  id_sales: number
  nama_sales: string
  nomor_telepon: string | null
  status_aktif: boolean
  dibuat_pada: string
  diperbarui_pada: string
}

export interface CreateSalesData {
  nama_sales: string
  nomor_telepon?: string
}

export interface UpdateSalesData extends CreateSalesData {
  status_aktif?: boolean
}

export interface SalesStats {
  id_sales: number
  nama_sales: string
  total_stores: number
  total_shipped_items: number
  total_revenue: number
}

// Query Keys
export const salesKeys = {
  all: ['sales'] as const,
  lists: () => [...salesKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...salesKeys.lists(), { filters }] as const,
  details: () => [...salesKeys.all, 'detail'] as const,
  detail: (id: number) => [...salesKeys.details(), id] as const,
  stats: () => [...salesKeys.all, 'stats'] as const,
  activities: (id: number) => [...salesKeys.detail(id), 'activities'] as const,
  recentShipments: (id: number, limit?: number) => [...salesKeys.detail(id), 'recent-shipments', { limit }] as const,
  recentPayments: (id: number, limit?: number) => [...salesKeys.detail(id), 'recent-payments', { limit }] as const,
  inventory: (id: number) => [...salesKeys.detail(id), 'inventory'] as const,
  productSales: (id: number) => [...salesKeys.detail(id), 'product-sales'] as const,
  detailStats: (id: number) => [...salesKeys.detail(id), 'stats'] as const,
}

// Queries
export function useSalesQuery(status?: 'active') {
  return useQuery({
    queryKey: salesKeys.list({ status }),
    queryFn: () => apiClient.getSales() as Promise<ApiResponse<Sales[]>>,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useSalesDetailQuery(id: number) {
  return useQuery({
    queryKey: salesKeys.detail(id),
    queryFn: () => apiClient.getSalesById(id) as Promise<ApiResponse<Sales>>,
    enabled: !!id,
  })
}

export function useSalesStatsQuery() {
  return useQuery({
    queryKey: salesKeys.stats(),
    queryFn: () => apiClient.getSalesStats() as Promise<ApiResponse<SalesStats[]>>,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useSalesDetailStatsQuery(id: number) {
  return useQuery({
    queryKey: salesKeys.detailStats(id),
    queryFn: async () => {
      const response = await fetch(`/api/sales/${id}/stats`)
      if (!response.ok) {
        throw new Error('Failed to fetch sales stats')
      }
      return response.json()
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useSalesActivitiesQuery(id: number) {
  return useQuery({
    queryKey: salesKeys.activities(id),
    queryFn: async () => {
      const response = await fetch(`/api/sales/${id}/activities`)
      if (!response.ok) {
        throw new Error('Failed to fetch sales activities')
      }
      return response.json()
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function useSalesRecentShipmentsQuery(id: number, limit?: number) {
  return useQuery({
    queryKey: salesKeys.recentShipments(id, limit),
    queryFn: async () => {
      const params = limit ? `?limit=${limit}` : ''
      const response = await fetch(`/api/sales/${id}/recent-shipments${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch recent shipments')
      }
      return response.json()
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function useSalesRecentPaymentsQuery(id: number, limit?: number) {
  return useQuery({
    queryKey: salesKeys.recentPayments(id, limit),
    queryFn: async () => {
      const params = limit ? `?limit=${limit}` : ''
      const response = await fetch(`/api/sales/${id}/recent-payments${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch recent payments')
      }
      return response.json()
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function useSalesInventoryQuery(id: number) {
  return useQuery({
    queryKey: salesKeys.inventory(id),
    queryFn: async () => {
      const response = await fetch(`/api/sales/${id}/inventory`)
      if (!response.ok) {
        throw new Error('Failed to fetch sales inventory')
      }
      return response.json()
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useSalesProductSalesQuery(id: number) {
  return useQuery({
    queryKey: salesKeys.productSales(id),
    queryFn: async () => {
      const response = await fetch(`/api/sales/${id}/product-sales`)
      if (!response.ok) {
        throw new Error('Failed to fetch product sales data')
      }
      return response.json()
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Mutations
export function useCreateSalesMutation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: CreateSalesData) => apiClient.createSales(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() })
      toast({
        title: 'Berhasil',
        description: 'Sales berhasil ditambahkan',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menambahkan sales',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateSalesMutation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSalesData }) =>
      apiClient.updateSales(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: salesKeys.detail(id) })
      toast({
        title: 'Berhasil',
        description: 'Sales berhasil diperbarui',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memperbarui sales',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteSalesMutation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteSales(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() })
      toast({
        title: 'Berhasil',
        description: 'Sales berhasil dihapus',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus sales',
        variant: 'destructive',
      })
    },
  })
}