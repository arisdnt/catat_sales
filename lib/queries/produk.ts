import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/components/ui/use-toast'

export interface Produk {
  id_produk: number
  nama_produk: string
  harga_satuan: number
  status_produk: boolean
  dibuat_pada: string
  diperbarui_pada: string
}

export interface CreateProdukData {
  nama_produk: string
  harga_satuan: number
}

export interface UpdateProdukData extends CreateProdukData {
  status_produk?: boolean
}

// Query Keys
export const produkKeys = {
  all: ['produk'] as const,
  lists: () => [...produkKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...produkKeys.lists(), { filters }] as const,
  details: () => [...produkKeys.all, 'detail'] as const,
  detail: (id: number) => [...produkKeys.details(), id] as const,
}

// Queries
export function useProdukQuery(status?: 'active') {
  return useQuery({
    queryKey: produkKeys.list({ status }),
    queryFn: () => apiClient.getProducts(status),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useProdukDetailQuery(id: number) {
  return useQuery({
    queryKey: produkKeys.detail(id),
    queryFn: () => apiClient.getProductById(id),
    enabled: !!id,
  })
}

// Mutations
export function useCreateProdukMutation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: CreateProdukData) => apiClient.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produkKeys.lists() })
      toast({
        title: 'Berhasil',
        description: 'Produk berhasil ditambahkan',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menambahkan produk',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateProdukMutation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProdukData }) =>
      apiClient.updateProduct(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: produkKeys.lists() })
      queryClient.invalidateQueries({ queryKey: produkKeys.detail(id) })
      toast({
        title: 'Berhasil',
        description: 'Produk berhasil diperbarui',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memperbarui produk',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteProdukMutation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produkKeys.lists() })
      toast({
        title: 'Berhasil',
        description: 'Produk berhasil dihapus',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus produk',
        variant: 'destructive',
      })
    },
  })
}