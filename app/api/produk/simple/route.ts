import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, handleApiRequest, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    try {
      const { searchParams } = new URL(request.url)
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '20')
      const offset = (page - 1) * limit
      
      console.log('Simple produk API called with:', { page, limit, offset })
      
      // Use materialized view for optimized performance
      const { data, error, count } = await supabaseAdmin
        .from('mv_produk_with_stats')
        .select(`
          id_produk,
          nama_produk,
          harga_satuan,
          status_produk,
          is_priority,
          priority_order,
          dibuat_pada,
          diperbarui_pada,
          total_terkirim,
          total_terjual,
          total_kembali,
          total_terbayar,
          sisa_stok
        `, { count: 'exact' })
        .order('nama_produk')
        .range(offset, offset + limit - 1)
      
      if (error) {
        console.error('Simple produk query error:', error)
        return createSuccessResponse({
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            total_pages: 0
          },
          error: error.message
        })
      }
      
      // Transform data to include stats object expected by frontend
      const transformedData = (data || []).map((product: any) => ({
        ...product,
        stats: {
          total_terkirim: product.total_terkirim || 0,
          total_terjual: product.total_terjual || 0,
          total_kembali: product.total_kembali || 0,
          total_terbayar: product.total_terbayar || 0,
          sisa_stok: product.sisa_stok || 0
        }
      }))
      
      const totalPages = Math.ceil((count || 0) / limit)
      
      console.log('Simple produk response:', {
        dataCount: transformedData.length,
        total: count,
        totalPages
      })
      
      return createSuccessResponse({
        data: transformedData,
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: totalPages
        },
        filters: {},
        sorting: {
          sortBy: 'nama_produk',
          sortOrder: 'asc'
        }
      })
      
    } catch (error) {
      console.error('Simple produk API error:', error)
      return createSuccessResponse({
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          total_pages: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
}