import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/components/ui/use-toast'
import { Sales } from '@/lib/queries/sales'

export interface TokoActivity {
  id: string
  type: 'pengiriman' | 'penagihan' | 'setoran'
  title: string
  description: string
  amount?: number
  date: string
  status?: string
  details?: any
}

export interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface PaginatedApiResponse<T> {
  success: boolean
  data: {
    data: T[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNextPage: boolean
      hasPrevPage: boolean
    }
  }
}

export interface Toko {
  id_toko: number
  id_sales: number
  nama_toko: string
  kecamatan: string | null
  kabupaten: string | null
  no_telepon: string | null
  link_gmaps: string | null
  status_toko: boolean
  dibuat_pada: string
  diperbarui_pada: string
  barang_terkirim?: number
  barang_terbayar?: number
  sisa_stok?: number
  detail_barang_terkirim?: Array<{ nama_produk: string; jumlah: number }>
  detail_barang_terbayar?: Array<{ nama_produk: string; jumlah: number }>
  detail_sisa_stok?: Array<{ nama_produk: string; jumlah: number }>
  sales?: {
    id_sales: number
    nama_sales: string
  }
}

export interface CreateTokoData {
  nama_toko: string
  id_sales: number
  kecamatan?: string
  kabupaten?: string
  no_telepon?: string
  link_gmaps?: string
}

export interface UpdateTokoData {
  nama_toko: string
  id_sales: number
  kecamatan?: string
  kabupaten?: string
  no_telepon?: string
  link_gmaps?: string
  status_toko?: boolean
}

// Query Keys
export const tokoKeys = {
  all: ['toko'] as const,
  lists: () => [...tokoKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...tokoKeys.lists(), params] as const,
  details: () => [...tokoKeys.all, 'detail'] as const,
  detail: (id: number) => [...tokoKeys.details(), id] as const,
}

// Queries
export function useTokoQuery(status?: 'active', includeSales?: boolean) {
  return useQuery({
    queryKey: [...tokoKeys.list({ status, includeSales }), 'simple'],
    queryFn: () => apiClient.getStores(status, includeSales) as Promise<ApiResponse<Toko[]>>,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Paged Query for manual pagination with 20 data per page
export function useTokoPagedQuery(
  page: number = 1,
  status?: boolean,
  includeSales?: boolean,
  search?: string,
  filters?: Record<string, string>
) {
  return useQuery({
    queryKey: [...tokoKeys.list({ status, includeSales, search, filters, page }), 'paged'],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', '20')
      
      if (status !== undefined) {
        params.append('status', status.toString())
      }
      if (includeSales) {
        params.append('include_sales', 'true')
      }
      if (search) {
        params.append('search', search)
      }
      
      // Add filters to params
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (value && value !== 'all') {
              params.append(key, value)
            }
          })
        }
         
         return apiClient.get(`/toko?${params}`) as Promise<PaginatedApiResponse<Toko>>
    },
    staleTime: 0, // No background fetching, always fresh data
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Disable background refetch
    refetchOnMount: true, // Only fetch when component mounts
  })
}

// Keep infinite query for backward compatibility if needed
export function useTokoInfiniteQuery(
  status?: 'active', 
  includeSales?: boolean, 
  limit: number = 50,
  search?: string,
  filters?: Record<string, string>
) {
  return useInfiniteQuery({
    queryKey: [...tokoKeys.list({ status, includeSales, search, filters }), 'infinite'],
    queryFn: ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: limit.toString(),
        ...(status && { status }),
        ...(includeSales && { include_sales: 'true' }),
        ...(search && { search }),
        ...filters
      })
      
      return apiClient.get(`/toko?${params}`) as Promise<PaginatedApiResponse<Toko>>
    },
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.data.pagination
      return pagination.hasNextPage ? pagination.page + 1 : undefined
    },
    getPreviousPageParam: (firstPage) => {
      const pagination = firstPage.data.pagination
      return pagination.hasPrevPage ? pagination.page - 1 : undefined
    },
    staleTime: 1000 * 60 * 2, // Reduce to 2 minutes for fresher search results
    initialPageParam: 1,
  })
}

// Query for filter options
export function useTokoFilterOptionsQuery(type: 'kabupaten' | 'kecamatan' | 'sales') {
  return useQuery({
    queryKey: ['toko', 'filter-options', type],
    queryFn: () => {
      return apiClient.get(`/toko/filter-options?type=${type}`) as Promise<ApiResponse<string[] | Sales[]>>
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - filter options don't change often
  })
}

export function useTokoDetailQuery(id: number) {
  return useQuery({
    queryKey: tokoKeys.detail(id),
    queryFn: () => apiClient.getStoreById(id) as Promise<ApiResponse<Toko>>,
    enabled: !!id,
  })
}

export function useTokoActivitiesQuery(id: number) {
  return useQuery({
    queryKey: [...tokoKeys.detail(id), 'activities'],
    queryFn: () => apiClient.get(`/toko/${id}/activities`) as Promise<ApiResponse<TokoActivity[]>>,
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// New query for toko statistics
export function useTokoStatsQuery(id: number) {
  return useQuery({
    queryKey: [...tokoKeys.detail(id), 'stats'],
    queryFn: () => apiClient.get(`/toko/${id}/stats`) as Promise<ApiResponse<{
      total_pengiriman: number
      total_penagihan: number
      total_nilai_pengiriman: number
      total_nilai_penagihan: number
      pengiriman_bulan_ini: number
      penagihan_bulan_ini: number
      rata_rata_pengiriman: number
      last_activity: string
    }>>,
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// New query for recent shipments
export function useTokoRecentShipmentsQuery(id: number, limit: number = 10) {
  return useQuery({
    queryKey: [...tokoKeys.detail(id), 'recent-shipments', limit],
    queryFn: () => apiClient.get(`/toko/${id}/recent-shipments?limit=${limit}`) as Promise<ApiResponse<Array<{
      id_pengiriman: number
      tanggal_kirim: string
      total_quantity: number
      total_value: number
      is_autorestock: boolean
      status: string
    }>>>,
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// New query for recent payments
export function useTokoRecentPaymentsQuery(id: number, limit: number = 10) {
  return useQuery({
    queryKey: [...tokoKeys.detail(id), 'recent-payments', limit],
    queryFn: () => apiClient.get(`/toko/${id}/recent-payments?limit=${limit}`) as Promise<ApiResponse<Array<{
      id_penagihan: number
      tanggal_tagih: string
      total_uang_diterima: number
      metode_pembayaran: string
      total_quantity: number
      status: string
    }>>>,
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function useTokoInventoryQuery(id: number) {
  return useQuery({
    queryKey: ['toko', id, 'inventory'],
    queryFn: async () => {
      const response = await apiClient.get(`/toko/${id}/inventory`) as ApiResponse<any[]>
      return response.data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useTokoProductSalesQuery(id: number) {
  return useQuery({
    queryKey: ['toko', id, 'product-sales'],
    queryFn: async () => {
      const response = await apiClient.get(`/toko/${id}/product-sales`) as ApiResponse<any[]>
      return response.data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useSalesQuery() {
  return useQuery({
    queryKey: ['sales'],
    queryFn: () => apiClient.getSales() as Promise<ApiResponse<Sales[]>>,
    staleTime: 1000 * 60 * 5,
  })
}

// Mutations
export function useCreateTokoMutation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: CreateTokoData) => apiClient.createStore(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tokoKeys.lists() })
      toast({
        title: 'Berhasil',
        description: 'Toko berhasil ditambahkan',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menambahkan toko',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateTokoMutation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTokoData }) =>
      apiClient.updateStore(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: tokoKeys.lists() })
      queryClient.invalidateQueries({ queryKey: tokoKeys.detail(id) })
      toast({
        title: 'Berhasil',
        description: 'Toko berhasil diperbarui',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memperbarui toko',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteTokoMutation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteStore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tokoKeys.lists() })
      toast({
        title: 'Berhasil',
        description: 'Toko berhasil dihapus',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus toko',
        variant: 'destructive',
      })
    },
  })
}