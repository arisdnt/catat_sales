import { supabaseAdmin } from '@/lib/api-helpers';
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
}

export async function searchProduk({
  search = '',
  status = 'semua',
  priority = 'semua',
  limit = 50,
  offset = 0
}: ProdukFilters & { limit?: number; offset?: number }) {
  try {
    // First get the products with basic filtering
    let query = supabaseAdmin
      .from('produk')
      .select(`
        id_produk,
        nama_produk,
        harga_satuan,
        status_produk,
        is_priority,
        priority_order,
        dibuat_pada,
        diperbarui_pada
      `)
      .order('is_priority', { ascending: false })
      .order('priority_order', { ascending: true })
      .order('nama_produk', { ascending: true })
      .range(offset, offset + limit - 1);

    if (search.trim()) {
      query = query.ilike('nama_produk', `%${search.trim()}%`);
    }

    if (status !== 'semua') {
      query = query.eq('status_produk', status === 'aktif');
    }

    if (priority !== 'semua') {
      query = query.eq('is_priority', priority === 'priority');
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    if (!products || products.length === 0) {
      return [];
    }

    // Get all stats using aggregated queries
    const [shipmentAggregates, billingAggregates] = await Promise.all([
      supabaseAdmin
        .from('detail_pengiriman')
        .select('id_produk, jumlah_kirim.sum()')
        .in('id_produk', products.map(p => p.id_produk)),
      supabaseAdmin
        .from('detail_penagihan')  
        .select('id_produk, jumlah_terjual.sum()')
        .in('id_produk', products.map(p => p.id_produk))
    ]);

    // Create lookup maps for better performance
    const shipmentMap = new Map<number, number>();
    const billingMap = new Map<number, number>();

    // Process aggregated shipment data
    if (shipmentAggregates.data) {
      shipmentAggregates.data.forEach((item: any) => {
        if (item.id_produk && item.sum !== null) {
          shipmentMap.set(item.id_produk, item.sum);
        }
      });
    }

    // Process aggregated billing data
    if (billingAggregates.data) {
      billingAggregates.data.forEach((item: any) => {
        if (item.id_produk && item.sum !== null) {
          billingMap.set(item.id_produk, item.sum);
        }
      });
    }

    // Combine data with proper stats
    const productsWithStats: ProdukWithStats[] = products.map(product => {
      const totalKirim = shipmentMap.get(product.id_produk) || 0;
      const totalTerjual = billingMap.get(product.id_produk) || 0;
      const totalRevenue = totalTerjual * product.harga_satuan;
      const sisaStok = totalKirim - totalTerjual;

      return {
        ...product,
        total_terjual: totalTerjual,
        total_kirim: totalKirim,
        total_revenue: totalRevenue,
        sisa_stok_estimated: sisaStok
      };
    });

    return productsWithStats;
  } catch (error) {
    console.error('Error searching produk:', error);
    throw error;
  }
}

export async function countProduk({ search = '', status = 'semua', priority = 'semua' }: ProdukFilters) {
  try {
    let query = supabaseAdmin
      .from('produk')
      .select('*', { count: 'exact', head: true });

    if (search.trim()) {
      query = query.ilike('nama_produk', `%${search.trim()}%`);
    }

    if (status !== 'semua') {
      query = query.eq('status_produk', status === 'aktif');
    }

    if (priority !== 'semua') {
      query = query.eq('is_priority', priority === 'priority');
    }

    const { count, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return count || 0;
  } catch (error) {
    console.error('Error counting produk:', error);
    throw error;
  }
}

export async function getProdukById(id: number) {
  try {
    const { data, error } = await supabaseAdmin
      .from('produk')
      .select(`
        id_produk,
        nama_produk,
        harga_satuan,
        status_produk,
        is_priority,
        priority_order,
        dibuat_pada,
        diperbarui_pada
      `)
      .eq('id_produk', id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    // Get stats for this product
    const [shipmentResult, billingResult] = await Promise.all([
      supabaseAdmin
        .from('detail_pengiriman')
        .select('jumlah_kirim')
        .eq('id_produk', id),
      supabaseAdmin
        .from('detail_penagihan')
        .select('jumlah_terjual')
        .eq('id_produk', id)
    ]);

    const totalKirim = shipmentResult.data?.reduce((sum, item) => sum + (item.jumlah_kirim || 0), 0) || 0;
    const totalTerjual = billingResult.data?.reduce((sum, item) => sum + (item.jumlah_terjual || 0), 0) || 0;
    const totalRevenue = totalTerjual * data.harga_satuan;
    const sisaStok = totalKirim - totalTerjual;

    const productWithStats: ProdukWithStats = {
      ...data,
      total_terjual: totalTerjual,
      total_kirim: totalKirim,
      total_revenue: totalRevenue,
      sisa_stok_estimated: sisaStok
    };

    return productWithStats;
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
    const { data: newProduct, error } = await supabaseAdmin
      .from('produk')
      .insert([{
        nama_produk: data.nama_produk,
        harga_satuan: data.harga_satuan,
        is_priority: data.is_priority || false,
        priority_order: data.priority_order || 0
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return newProduct as Produk;
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
    const updateData: any = {};
    
    if (data.nama_produk !== undefined) updateData.nama_produk = data.nama_produk;
    if (data.harga_satuan !== undefined) updateData.harga_satuan = data.harga_satuan;
    if (data.status_produk !== undefined) updateData.status_produk = data.status_produk;
    if (data.is_priority !== undefined) updateData.is_priority = data.is_priority;
    if (data.priority_order !== undefined) updateData.priority_order = data.priority_order;

    updateData.diperbarui_pada = new Date().toISOString();

    const { data: updatedProduct, error } = await supabaseAdmin
      .from('produk')
      .update(updateData)
      .eq('id_produk', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return updatedProduct as Produk;
  } catch (error) {
    console.error('Error updating produk:', error);
    throw error;
  }
}

export async function deleteProduk(id: number) {
  try {
    const { data: deletedProduct, error } = await supabaseAdmin
      .from('produk')
      .delete()
      .eq('id_produk', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return deletedProduct as Produk;
  } catch (error) {
    console.error('Error deleting produk:', error);
    throw error;
  }
}

export async function getProdukStats() {
  try {
    const [productsResult, shipmentAggregates, billingAggregates] = await Promise.all([
      supabaseAdmin
        .from('produk')
        .select('id_produk, harga_satuan, status_produk, is_priority'),
      supabaseAdmin
        .from('detail_pengiriman')
        .select('jumlah_kirim.sum()'),
      supabaseAdmin
        .from('detail_penagihan')
        .select('jumlah_terjual.sum()')
    ]);

    if (productsResult.error) {
      console.error('Products query error:', productsResult.error);
      throw productsResult.error;
    }

    const products = productsResult.data || [];
    
    // Get aggregated totals using Supabase aggregate functions
    const totalTerkirim = shipmentAggregates.data?.[0]?.sum || 0;
    const totalTerjual = billingAggregates.data?.[0]?.sum || 0;
    const sisaStokTotal = totalTerkirim - totalTerjual;

    const stats = {
      total_produk: products.length,
      produk_aktif: products.filter(p => p.status_produk).length,
      produk_non_aktif: products.filter(p => !p.status_produk).length,
      produk_priority: products.filter(p => p.is_priority).length,
      total_nilai_produk: products.reduce((sum, p) => sum + (p.harga_satuan || 0), 0),
      total_terkirim: totalTerkirim,
      total_terjual: totalTerjual,
      sisa_stok_total: sisaStokTotal
    };

    return stats;
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
export function useProdukQuery() {
  return useQuery({
    queryKey: produkKeys.all,
    queryFn: () => apiClient.get('/api/produk')
  });
}

export function useProdukDetailQuery(id: number) {
  return useQuery({
    queryKey: produkKeys.detail(id),
    queryFn: () => apiClient.get(`/api/produk/${id}`)
  });
}

export function usePriorityProdukQuery() {
  return useQuery({
    queryKey: produkKeys.priority(),
    queryFn: () => apiClient.get('/api/produk?priority=priority')
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