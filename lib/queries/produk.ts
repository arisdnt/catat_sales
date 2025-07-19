import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/components/ui/use-toast'

export interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface Produk {
  id_produk: number
  nama_produk: string
  harga_satuan: number
  status_produk: boolean
  is_priority: boolean | null
  priority_order: number | null
  dibuat_pada: string
  diperbarui_pada: string
}

export interface CreateProdukData {
  nama_produk: string
  harga_satuan: number
  is_priority?: boolean
}

export interface UpdateProdukData extends CreateProdukData {
  status_produk?: boolean
  is_priority?: boolean
}

// Query Keys
export const produkKeys = {
  all: ['produk'] as const,
  lists: () => [...produkKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...produkKeys.lists(), { filters }] as const,
  details: () => [...produkKeys.all, 'detail'] as const,
  detail: (id: number) => [...produkKeys.details(), id] as const,
}

// Queries
export function useProdukQuery(status?: 'active') {
  return useQuery({
    queryKey: produkKeys.list({ status }),
    queryFn: () => apiClient.getProducts(status) as Promise<ApiResponse<Produk[]>>,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useProdukDetailQuery(id: number) {
  return useQuery({
    queryKey: produkKeys.detail(id),
    queryFn: () => apiClient.getProductById(id) as Promise<ApiResponse<Produk>>,
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
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menambahkan produk',
        variant: 'destructive',
      })
    },
  })
}

export interface ProdukStats {
  id_produk: number
  total_terkirim: number
  total_terbayar: number
}

export function useProdukStatsQuery() {
  return useQuery({
    queryKey: ['produk', 'stats'],
    queryFn: () => apiClient.getProductStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
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
    onError: (error: Error) => {
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
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus produk',
        variant: 'destructive',
      })
    },
  })
}

// Product Movement Tracking
export interface ProductMovement {
  type: 'shipment' | 'billing'
  date: string
  store: string
  sales: string
  product: string
  quantity?: number
  quantity_sold?: number
  quantity_returned?: number
  value: number
  payment_method?: string
  has_discount?: boolean
  description: string
}

export interface ProductMovementSummary {
  total_shipped: number
  total_sold: number
  total_returned: number
  total_value: number
  conversion_rate: number
  return_rate: number
}

export interface ProductMovementData {
  movements: ProductMovement[]
  summary: ProductMovementSummary
  shipments: ProductShipment[]
  billings: ProductBilling[]
}

export interface ProductShipment {
  id_pengiriman: number
  tanggal_kirim: string
  jumlah_kirim: number
  toko: {
    nama_toko: string
  }
}

export interface ProductBilling {
  id_penagihan: number
  dibuat_pada: string
  jumlah_terjual: number
  total_uang_diterima: number
  toko: {
    nama_toko: string
  }
}

export function useProductMovementQuery(productId: number, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['product-movement', productId, startDate, endDate],
    queryFn: () => apiClient.getReport('product-movement', startDate, endDate, productId?.toString()) as Promise<ApiResponse<ProductMovementData>>,
    enabled: !!productId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// Priority Products Query
export function usePriorityProdukQuery() {
  return useQuery({
    queryKey: ['produk', 'priority'],
    queryFn: () => apiClient.getPriorityProducts() as Promise<ApiResponse<Produk[]>>,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}