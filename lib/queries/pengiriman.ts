import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/components/ui/use-toast'

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

export interface Pengiriman {
  id_pengiriman: number
  tanggal_kirim: string
  dibuat_pada: string
  diperbarui_pada?: string
  toko: {
    id_toko: number
    nama_toko: string
    alamat?: string
    desa?: string
    kecamatan?: string
    kabupaten?: string
    link_gmaps?: string
    sales: {
      id_sales: number
      nama_sales: string
      nomor_telepon?: string
    }
  }
  detail_pengiriman?: Array<{
    id_detail_kirim: number
    jumlah_kirim: number
    produk: {
      id_produk: number
      nama_produk: string
      harga_satuan: number
    }
  }>
}

export interface CreatePengirimanData {
  id_toko: number
  tanggal_kirim: string
  details: Array<{
    id_produk: number
    jumlah_kirim: number
  }>
}

// For backward compatibility with forms that still use id_toko directly
export interface CreatePengirimanRequest {
  id_toko: number
  tanggal_kirim: string
  details: Array<{
    id_produk: number
    jumlah_kirim: number
  }>
}

export interface UpdatePengirimanData {
  tanggal_kirim: string
  details: Array<{
    id_produk: number
    jumlah_kirim: number
  }>
}

// Query Keys
export const pengirimanKeys = {
  all: ['pengiriman'] as const,
  lists: () => [...pengirimanKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...pengirimanKeys.lists(), { filters }] as const,
  details: () => [...pengirimanKeys.all, 'detail'] as const,
  detail: (id: number) => [...pengirimanKeys.details(), id] as const,
}

// Queries
export function usePengirimanQuery(includeDetails?: boolean) {
  return useQuery({
    queryKey: pengirimanKeys.list({ includeDetails }),
    queryFn: () => apiClient.getShipments(includeDetails),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function usePengirimanDetailQuery(id: number) {
  return useQuery({
    queryKey: pengirimanKeys.detail(id),
    queryFn: () => apiClient.getShipmentById(id),
    enabled: !!id,
  })
}

export function usePengirimanInfiniteQuery(includeDetails?: boolean, limit: number = 50) {
  return useInfiniteQuery({
    queryKey: [...pengirimanKeys.list({ includeDetails }), 'infinite'],
    queryFn: ({ pageParam = 1 }) => 
      apiClient.getShipments(includeDetails, pageParam, limit) as Promise<PaginatedApiResponse<Pengiriman>>,
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

// Mutations
export function useCreatePengirimanMutation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: CreatePengirimanData) => apiClient.createShipment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pengirimanKeys.lists() })
      toast({
        title: 'Berhasil',
        description: 'Pengiriman berhasil ditambahkan',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menambahkan pengiriman',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdatePengirimanMutation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePengirimanData }) =>
      apiClient.updateShipment(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: pengirimanKeys.lists() })
      queryClient.invalidateQueries({ queryKey: pengirimanKeys.detail(id) })
      toast({
        title: 'Berhasil',
        description: 'Pengiriman berhasil diperbarui',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memperbarui pengiriman',
        variant: 'destructive',
      })
    },
  })
}

export function useDeletePengirimanMutation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteShipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pengirimanKeys.lists() })
      toast({
        title: 'Berhasil',
        description: 'Pengiriman berhasil dihapus',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus pengiriman',
        variant: 'destructive',
      })
    },
  })
}