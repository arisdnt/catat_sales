import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'nama_produk'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    
    // Filter parameters
    const statusFilter = searchParams.get('status_produk')
    const priorityFilter = searchParams.get('is_priority')
    const priceFromFilter = searchParams.get('price_from')
    const priceToFilter = searchParams.get('price_to')
    const dateFromFilter = searchParams.get('date_from')
    const dateToFilter = searchParams.get('date_to')
    
    console.log('Produk optimized API called with:', {
      page, limit, search, sortBy, sortOrder,
      filters: { statusFilter, priorityFilter, priceFromFilter, priceToFilter, dateFromFilter, dateToFilter }
    })
    
    try {
      // Calculate offset
      const offset = (page - 1) * limit
      
      // Try optimized search function first
      let result
      
      if (search) {
        console.log('Using search function for query:', search)
        
        try {
          const { data: searchData, error: searchError } = await supabaseAdmin
            .rpc('search_produk_optimized', {
              search_query: search,
              p_limit: limit,
              p_offset: offset,
              sort_column: sortBy,
              sort_direction: sortOrder,
              status_filter: statusFilter ? statusFilter === 'true' : null,
              priority_filter: priorityFilter ? priorityFilter === 'true' : null,
              price_from_filter: priceFromFilter ? parseFloat(priceFromFilter) : null,
              price_to_filter: priceToFilter ? parseFloat(priceToFilter) : null,
              date_from_filter: dateFromFilter,
              date_to_filter: dateToFilter
            })
            
          if (searchError) {
            console.warn('Search function failed, falling back to regular query:', searchError.message)
            throw searchError
          }
          
          result = searchData
          console.log('Search function successful, found:', result?.length || 0, 'results')
          
        } catch (_searchFunctionError) {
          console.warn('Search function not available, using fallback query')
          result = null
        }
      }
      
      // Fallback query if search function is not available or no search
      if (!result) {
        console.log('Using fallback query with materialized view')
        
        // Build base query using materialized view for better performance
        let query = supabaseAdmin
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
        
        // Apply search filters
        if (search) {
          const searchNum = parseInt(search)
          if (!isNaN(searchNum)) {
            // Search by ID
            query = query.eq('id_produk', searchNum)
          } else {
            // Search by product name
            query = query.ilike('nama_produk', `%${search}%`)
          }
        }
        
        // Apply filters
        if (statusFilter) {
          query = query.eq('status_produk', statusFilter === 'true')
        }
        
        if (priorityFilter) {
          query = query.eq('is_priority', priorityFilter === 'true')
        }
        
        if (priceFromFilter) {
          query = query.gte('harga_satuan', parseFloat(priceFromFilter))
        }
        
        if (priceToFilter) {
          query = query.lte('harga_satuan', parseFloat(priceToFilter))
        }
        
        if (dateFromFilter) {
          query = query.gte('dibuat_pada', dateFromFilter)
        }
        
        if (dateToFilter) {
          query = query.lte('dibuat_pada', dateToFilter + 'T23:59:59.999Z')
        }
        
        // Apply sorting
        query = query.order(sortBy, { ascending: sortOrder === 'asc' })
        
        // Apply pagination
        query = query.range(offset, offset + limit - 1)
        
        const { data: fallbackData, error: fallbackError, count } = await query
        
        if (fallbackError) {
          console.error('Fallback query error:', fallbackError)
          return createErrorResponse(`Database query failed: ${fallbackError.message}`)
        }
        
        // Transform materialized view data to include stats object
        const productsWithStats = (fallbackData || []).map((product: any) => ({
          ...product,
          stats: {
            total_terkirim: product.total_terkirim || 0,
            total_terjual: product.total_terjual || 0,
            total_kembali: product.total_kembali || 0,
            total_terbayar: product.total_terbayar || 0,
            sisa_stok: product.sisa_stok || 0
          }
        }))
        
        result = {
          data: productsWithStats,
          count: count || 0,
          page,
          limit,
          total_pages: Math.ceil((count || 0) / limit)
        }
        
        console.log('Fallback query successful, found:', productsWithStats?.length || 0, 'results, total:', count)
      }
      
      // Format the response
      const responseData = Array.isArray(result) ? result : (result?.data || [])
      const totalCount = result?.count || responseData.length || 0
      
      const response = {
        data: responseData,
        pagination: {
          page,
          limit,
          total: totalCount,
          total_pages: Math.ceil(totalCount / limit)
        },
        filters: {
          search,
          status_produk: statusFilter,
          is_priority: priorityFilter,
          price_from: priceFromFilter,
          price_to: priceToFilter,
          date_from: dateFromFilter,
          date_to: dateToFilter
        },
        sorting: {
          sortBy,
          sortOrder
        }
      }
      
      console.log('Produk optimized response:', {
        dataCount: response.data.length,
        pagination: response.pagination,
        firstItem: response.data[0],
        rawResult: result
      })
      
      return createSuccessResponse(response)
      
    } catch (error) {
      console.error('Produk optimized API error:', error)
      
      // Return fallback empty response
      return createSuccessResponse({
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          total_pages: 0
        },
        filters: {
          search,
          status_produk: statusFilter,
          is_priority: priorityFilter,
          price_from: priceFromFilter,
          price_to: priceToFilter,
          date_from: dateFromFilter,
          date_to: dateToFilter
        },
        sorting: {
          sortBy,
          sortOrder
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  })
}