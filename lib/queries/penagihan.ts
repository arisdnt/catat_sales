import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/components/ui/use-toast'

export interface Penagihan {
  id_penagihan: number
  id_toko: number
  total_uang_diterima: number
  metode_pembayaran: 'Cash' | 'Transfer'
  ada_potongan: boolean
  dibuat_pada: string
  diperbarui_pada: string
  toko?: {
    id_toko: number
    nama_toko: string
    kecamatan: string
    kabupaten: string
    link_gmaps?: string
    sales: {
      id_sales: number
      nama_sales: string
      nomor_telepon?: string
    }
  }
  detail_penagihan?: Array<{
    id_detail_tagih: number
    jumlah_terjual: number
    jumlah_kembali: number
    produk: {
      id_produk: number
      nama_produk: string
      harga_satuan: number
    }
  }>
  potongan_penagihan?: Array<{
    id_potongan: number
    jumlah_potongan: number
    alasan?: string
  }>
}

export interface CreatePenagihanData {
  id_toko: number
  total_uang_diterima: number
  metode_pembayaran: 'Cash' | 'Transfer'
  details: Array<{
    id_produk: number
    jumlah_terjual: number
    jumlah_kembali: number
  }>
  potongan?: {
    jumlah_potongan: number
    alasan?: string
  }
}

export interface UpdatePenagihanData {
  total_uang_diterima: number
  metode_pembayaran: 'Cash' | 'Transfer'
  details: Array<{
    id_produk: number
    jumlah_terjual: number
    jumlah_kembali: number
  }>
  potongan?: {
    jumlah_potongan: number
    alasan?: string
  }
}

// Query Keys
export const penagihanKeys = {
  all: ['penagihan'] as const,
  lists: () => [...penagihanKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...penagihanKeys.lists(), { filters }] as const,
  details: () => [...penagihanKeys.all, 'detail'] as const,
  detail: (id: number) => [...penagihanKeys.details(), id] as const,
}

// Queries
export function usePenagihanQuery(includeDetails?: boolean) {
  return useQuery({
    queryKey: penagihanKeys.list({ includeDetails }),
    queryFn: () => apiClient.getBillings(includeDetails),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function usePenagihanDetailQuery(id: number) {
  return useQuery({
    queryKey: penagihanKeys.detail(id),
    queryFn: () => apiClient.getBillingById(id),
    enabled: !!id,
  })
}

// Mutations
export function useCreatePenagihanMutation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: CreatePenagihanData) => apiClient.createBilling(data),
    onSuccess: () => {
      // Invalidate both regular penagihan queries and dashboard queries
      queryClient.invalidateQueries({ queryKey: penagihanKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'penagihan'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview'] })
      toast({
        title: 'Berhasil',
        description: 'Penagihan berhasil ditambahkan',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menambahkan penagihan',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdatePenagihanMutation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePenagihanData }) =>
      apiClient.updateBilling(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate both regular penagihan queries and dashboard queries
      queryClient.invalidateQueries({ queryKey: penagihanKeys.lists() })
      queryClient.invalidateQueries({ queryKey: penagihanKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'penagihan'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview'] })
      toast({
        title: 'Berhasil',
        description: 'Penagihan berhasil diperbarui',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memperbarui penagihan',
        variant: 'destructive',
      })
    },
  })
}

export function useDeletePenagihanMutation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteBilling(id),
    onSuccess: () => {
      // Invalidate both regular penagihan queries and dashboard queries
      queryClient.invalidateQueries({ queryKey: penagihanKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'penagihan'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview'] })
      toast({
        title: 'Berhasil',
        description: 'Penagihan berhasil dihapus',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus penagihan',
        variant: 'destructive',
      })
    },
  })
}