import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Database } from '@/types/database'
import { apiClient } from '@/lib/api-client'

type PengeluaranOperasional = Database['public']['Tables']['pengeluaran_operasional']['Row']
type PengeluaranInsert = Database['public']['Tables']['pengeluaran_operasional']['Insert']

interface PengeluaranResponse {
  data: PengeluaranOperasional[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface PengeluaranParams {
  page?: number
  limit?: number
  search?: string
}

// Query key factory
export const pengeluaranKeys = {
  all: ['pengeluaran'] as const,
  lists: () => [...pengeluaranKeys.all, 'list'] as const,
  list: (params: PengeluaranParams) => [...pengeluaranKeys.lists(), params] as const,
}

// Fetch pengeluaran list
export const usePengeluaranList = (params: PengeluaranParams = {}) => {
  return useQuery({
    queryKey: pengeluaranKeys.list(params),
    queryFn: async (): Promise<PengeluaranResponse> => {
      const searchParams = new URLSearchParams()
      
      if (params.page) searchParams.set('page', params.page.toString())
      if (params.limit) searchParams.set('limit', params.limit.toString())
      if (params.search) searchParams.set('search', params.search)

      const response = await apiClient.get(`/admin/pengeluaran?${searchParams.toString()}`)
      // Handle the wrapped response from createSuccessResponse
      return response.data || response
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Create pengeluaran mutation
export const useCreatePengeluaran = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: FormData) => {
      const headers = await apiClient.getAuthHeadersPublic()
      
      const response = await fetch('/api/admin/pengeluaran', {
        method: 'POST',
        headers: {
          'Authorization': headers.Authorization,
          // Don't set Content-Type for FormData - browser will set it automatically with boundary
        },
        body: data,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create pengeluaran')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch pengeluaran queries
      queryClient.invalidateQueries({ queryKey: pengeluaranKeys.lists() })
    },
  })
}

// Delete pengeluaran mutation
export const useDeletePengeluaran = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const headers = await apiClient.getAuthHeadersPublic()
      
      const response = await fetch(`/api/admin/pengeluaran?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': headers.Authorization,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete pengeluaran')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch pengeluaran queries
      queryClient.invalidateQueries({ queryKey: pengeluaranKeys.lists() })
    },
  })
}

// Helper function to format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Helper function to format date
export const formatDate = (dateString: string): string => {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

// Helper function to format date for input
export const formatDateForInput = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm
}