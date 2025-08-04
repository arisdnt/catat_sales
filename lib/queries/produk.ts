import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface Produk {
  id_produk: number;
  nama_produk: string;
  harga_satuan: number;
  status_produk: boolean;
  is_priority: boolean;
  priority_order: number;
  dibuat_pada: string;
  diperbarui_pada: string;
}

export interface ProdukWithStats extends Produk {
  total_terjual: number;
  total_kirim: number;
  total_revenue: number;
  sisa_stok_estimated: number;
}

export interface ProdukFilters {
  search?: string;
  status?: 'aktif' | 'non-aktif' | 'semua';
  priority?: 'priority' | 'non-priority' | 'semua';
  dateRange?: string;
}

export async function searchProduk({
  search = '',
  status = 'semua',
  priority = 'semua',
  dateRange = 'all',
  limit = 50,
  offset = 0
}: ProdukFilters & { limit?: number; offset?: number }) {
  try {
    const page = Math.floor(offset / limit) + 1;
    
    const response = await apiClient.getMasterProduk({
      page,
      limit,
      search: search.trim() || undefined,
      status_produk: status !== 'semua' ? status : undefined,
      is_priority: priority !== 'semua' ? priority : undefined,
      date_range: dateRange !== 'all' ? dateRange : undefined
    });

    if (!(response as any).success || !(response as any).data) {
      return [];
    }

    return (response as any).data.data || [];
  } catch (error) {
    console.error('Error searching produk:', error);
    throw error;
  }
}

export async function countProduk({ search = '', status = 'semua', priority = 'semua', dateRange = 'all' }: ProdukFilters) {
  try {
    const response = await apiClient.getMasterProduk({
      page: 1,
      limit: 1,
      search: search.trim() || undefined,
      status_produk: status !== 'semua' ? status : undefined,
      is_priority: priority !== 'semua' ? priority : undefined,
      date_range: dateRange !== 'all' ? dateRange : undefined
    });

    if (!(response as any).success || !(response as any).data) {
      return 0;
    }

    return (response as any).data.pagination?.total || 0;
  } catch (error) {
    console.error('Error counting produk:', error);
    throw error;
  }
}

export async function getProdukById(id: number) {
  try {
    const response = await apiClient.getProductById(id);

    // API client returns the data directly, not wrapped in success/data
    if (!response) {
      return null;
    }

    return response;
  } catch (error) {
    console.error('Error getting produk by ID:', error);
    throw error;
  }
}

export async function createProduk(data: {
  nama_produk: string;
  harga_satuan: number;
  is_priority?: boolean;
  priority_order?: number;
}) {
  try {
    const response = await apiClient.createProduct({
      nama_produk: data.nama_produk,
      harga_satuan: data.harga_satuan,
      is_priority: data.is_priority,
      priority_order: data.priority_order
    });

    if (!(response as any).success || !(response as any).data) {
      throw new Error('Failed to create product');
    }

    return (response as any).data;
  } catch (error) {
    console.error('Error creating produk:', error);
    throw error;
  }
}

export async function updateProduk(id: number, data: {
  nama_produk?: string;
  harga_satuan?: number;
  status_produk?: boolean;
  is_priority?: boolean;
  priority_order?: number;
}) {
  try {
    const response = await apiClient.updateProduct(id, {
      nama_produk: data.nama_produk || '',
      harga_satuan: data.harga_satuan || 0,
      status_produk: data.status_produk
    });

    if (!(response as any).success || !(response as any).data) {
      throw new Error('Failed to update product');
    }

    return (response as any).data;
  } catch (error) {
    console.error('Error updating produk:', error);
    throw error;
  }
}

export async function deleteProduk(id: number) {
  try {
    const response = await apiClient.deleteProduct(id);

    if (!(response as any).success) {
      throw new Error('Failed to delete product');
    }

    return (response as any).data;
  } catch (error) {
    console.error('Error deleting produk:', error);
    throw error;
  }
}

export async function getProdukStats() {
  try {
    const response = await apiClient.getProductStats();

    if (!(response as any).success || !(response as any).data) {
      throw new Error('Failed to get product stats');
    }

    return (response as any).data;
  } catch (error) {
    console.error('Error getting produk stats:', error);
    throw error;
  }
}

export async function getFilterOptions() {
  try {
    return {
      status: ['semua', 'aktif', 'non-aktif'],
      priority: ['semua', 'priority', 'non-priority']
    };
  } catch (error) {
    console.error('Error getting filter options:', error);
    throw error;
  }
}

// Types for compatibility
export type CreateProdukData = {
  nama_produk: string;
  harga_satuan: number;
  is_priority?: boolean;
  priority_order?: number;
};

export type UpdateProdukData = {
  nama_produk?: string;
  harga_satuan?: number;
  status_produk?: boolean;
  is_priority?: boolean;
  priority_order?: number;
};

// Query keys for React Query
export const produkKeys = {
  all: ['produk'] as const,
  lists: () => [...produkKeys.all, 'list'] as const,
  list: (filters: string) => [...produkKeys.lists(), filters] as const,
  details: () => [...produkKeys.all, 'detail'] as const,
  detail: (id: number) => [...produkKeys.details(), id] as const,
  priority: () => [...produkKeys.all, 'priority'] as const,
};

// React Query hooks untuk kompatibilitas dengan file lama
export interface PaginatedProdukResponse {
  success: boolean;
  data: {
    data: Produk[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
  };
}

export function useProdukQuery(status: 'active' | 'inactive' | 'all' = 'active') {
  return useQuery({
    queryKey: produkKeys.list(status),
    queryFn: () => apiClient.getMasterProduk({
      page: 1,
      limit: 1000,
      status_produk: status === 'active' ? 'true' : status === 'inactive' ? 'false' : undefined
    }) as Promise<PaginatedProdukResponse>
  });
}

export function useProdukDetailQuery(id: number) {
  return useQuery({
    queryKey: produkKeys.detail(id),
    queryFn: () => apiClient.getProductById(id)
  });
}

export function usePriorityProdukQuery() {
  return useQuery({
    queryKey: produkKeys.priority(),
    queryFn: () => apiClient.get('/produk/priority')
  });
}

export function useCreateProdukMutation() {
  return {
    mutate: createProduk,
    mutateAsync: createProduk
  };
}

export function useUpdateProdukMutation() {
  return {
    mutate: updateProduk,
    mutateAsync: updateProduk
  };
}

export function useDeleteProdukMutation() {
  return {
    mutate: deleteProduk,
    mutateAsync: deleteProduk
  };
}