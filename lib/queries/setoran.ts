import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/components/ui/use-toast'

export interface Setoran {
  id_setoran: number
  total_setoran: number
  penerima_setoran: string
  dibuat_pada: string
  diperbarui_pada: string
}

export interface CashBalance {
  id_penagihan: number
  id_toko: number
  nama_toko: string
  kecamatan: string
  kabupaten: string
  nama_sales: string
  id_sales: number
  total_uang_diterima: number
  metode_pembayaran: string
  ada_potongan: boolean
  setoran_on_date: number
  setoran_details: SetoranInfo[]
  previous_balance: number
  daily_cash_total: number
  daily_setoran_total: number
  running_balance: number
  selisih?: number
  dibuat_pada: string
  diperbarui_pada: string
}

export interface SetoranInfo {
  id_setoran: number
  total_setoran: number
  penerima_setoran: string
  dibuat_pada: string
}

export interface SetoranDetail extends Setoran {
  tanggal_setoran: string
  related_payments: PaymentDetail[]
  cash_payments: PaymentDetail[]
  transfer_payments: PaymentDetail[]
  total_cash_diterima: number
  total_transfer_diterima: number
  total_payments: number
  selisih: number
}

export interface PaymentDetail {
  id_penagihan: number
  total_uang_diterima: number
  metode_pembayaran: string
  ada_potongan: boolean
  dibuat_pada: string
  toko: {
    id_toko: number
    nama_toko: string
    kecamatan: string
    kabupaten: string
    sales: {
      id_sales: number
      nama_sales: string
    }
  }
}


export interface CreateSetoranData {
  total_setoran: number
  penerima_setoran: string
}

export interface UpdateSetoranData {
  total_setoran: number
  penerima_setoran: string
}

// Query Keys
export const setoranKeys = {
  all: ['setoran'] as const,
  lists: () => [...setoranKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...setoranKeys.lists(), { filters }] as const,
  details: () => [...setoranKeys.all, 'detail'] as const,
  detail: (id: number) => [...setoranKeys.details(), id] as const,
}

// Queries
export function useSetoranQuery() {
  return useQuery({
    queryKey: setoranKeys.list({}),
    queryFn: () => apiClient.getDeposits(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useSetoranDetailQuery(id: number) {
  return useQuery({
    queryKey: setoranKeys.detail(id),
    queryFn: () => apiClient.getDepositById(id),
    enabled: !!id,
  })
}

export function useCashBalanceQuery() {
  return useQuery({
    queryKey: [...setoranKeys.all, 'cash-balance'],
    queryFn: () => apiClient.getCashBalance(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Mutations
export function useCreateSetoranMutation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: CreateSetoranData) => apiClient.createDeposit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: setoranKeys.lists() })
      toast({
        title: 'Berhasil',
        description: 'Setoran berhasil ditambahkan',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menambahkan setoran',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateSetoranMutation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSetoranData }) =>
      apiClient.updateDeposit(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: setoranKeys.lists() })
      queryClient.invalidateQueries({ queryKey: setoranKeys.detail(id) })
      toast({
        title: 'Berhasil',
        description: 'Setoran berhasil diperbarui',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memperbarui setoran',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteSetoranMutation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteDeposit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: setoranKeys.lists() })
      toast({
        title: 'Berhasil',
        description: 'Setoran berhasil dihapus',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus setoran',
        variant: 'destructive',
      })
    },
  })
}