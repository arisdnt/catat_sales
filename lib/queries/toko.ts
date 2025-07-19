import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/components/ui/use-toast'
import { Sales } from '@/lib/queries/sales'

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
  list: (filters: Record<string, unknown>) => [...tokoKeys.lists(), { filters }] as const,
  details: () => [...tokoKeys.all, 'detail'] as const,
  detail: (id: number) => [...tokoKeys.details(), id] as const,
}

// Queries
export function useTokoQuery(status?: 'active', includeSales?: boolean) {
  return useQuery({
    queryKey: tokoKeys.list({ status, includeSales }),
    queryFn: () => apiClient.getStores(status, includeSales) as Promise<ApiResponse<Toko[]>>,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Infinite Query for pagination
export function useTokoInfiniteQuery(status?: 'active', includeSales?: boolean, limit: number = 50) {
  return useInfiniteQuery({
    queryKey: [...tokoKeys.list({ status, includeSales }), 'infinite'],
    queryFn: ({ pageParam = 1 }) => 
      apiClient.getStores(status, includeSales, pageParam, limit) as Promise<PaginatedApiResponse<Toko>>,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.data.pagination
      return pagination.hasNextPage ? pagination.page + 1 : undefined
    },
    getPreviousPageParam: (firstPage) => {
      const pagination = firstPage.data.pagination
      return pagination.hasPrevPage ? pagination.page - 1 : undefined
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    initialPageParam: 1,
  })
}

export function useTokoDetailQuery(id: number) {
  return useQuery({
    queryKey: tokoKeys.detail(id),
    queryFn: () => apiClient.getStoreById(id) as Promise<ApiResponse<Toko>>,
    enabled: !!id,
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