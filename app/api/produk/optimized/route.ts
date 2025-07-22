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
      
      // Try search function regardless of search parameter for better performance
      try {
        console.log('Attempting to use search_produk_optimized function')
        
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
        
        // Transform RPC result to expected format
        if (searchData && Array.isArray(searchData)) {
          const transformedData = searchData.map((item: any) => ({
            id_produk: item.id_produk,
            nama_produk: item.nama_produk,
            harga_satuan: item.harga_satuan,
            status_produk: item.status_produk,
            is_priority: item.is_priority,
            priority_order: item.priority_order,
            dibuat_pada: item.dibuat_pada,
            diperbarui_pada: item.diperbarui_pada,
            stats: item.stats || {
              total_terkirim: 0,
              total_terjual: 0,
              total_kembali: 0,
              total_terbayar: 0,
              sisa_stok: 0
            }
          }))
          
          result = {
            data: transformedData,
            count: searchData[0]?.total_count || transformedData.length,
            page,
            limit,
            total_pages: Math.ceil((searchData[0]?.total_count || transformedData.length) / limit)
          }
          
          console.log('Search function successful, found:', transformedData.length, 'results')
        }
        
      } catch (_searchFunctionError) {
        console.warn('Search function not available, using fallback query')
        result = null
      }
      
      
      // Fallback query if search function is not available or no search
      if (!result) {
        console.log('Using fallback query with regular tables')
        
        // Build base query using regular produk table
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
        
        // Calculate real statistics for each product from transaction tables
        const productIds = (fallbackData || []).map((p: any) => p.id_produk)
        
        // Get shipment statistics
        const { data: shipmentStats, error: shipmentError } = await supabaseAdmin
          .from('detail_pengiriman')
          .select('id_produk, jumlah_kirim')
          .in('id_produk', productIds)
        
        if (shipmentError) console.error('Shipment query error:', shipmentError)
        
        // Get billing statistics  
        const { data: billingStats, error: billingError } = await supabaseAdmin
          .from('detail_penagihan')
          .select('id_produk, jumlah_terjual, jumlah_kembali')
          .in('id_produk', productIds)
          
        if (billingError) console.error('Billing query error:', billingError)
        
        // Aggregate statistics by product
        const statsMap = new Map()
        
        // Aggregate shipment data
        if (shipmentStats) {
          shipmentStats.forEach((item: any) => {
            const existing = statsMap.get(item.id_produk) || { 
              total_terkirim: 0, total_terjual: 0, total_kembali: 0, total_terbayar: 0, sisa_stok: 0 
            }
            existing.total_terkirim += item.jumlah_kirim || 0
            statsMap.set(item.id_produk, existing)
          })
        }
        
        // Aggregate billing data
        if (billingStats) {
          billingStats.forEach((item: any) => {
            const existing = statsMap.get(item.id_produk) || {
              total_terkirim: 0, total_terjual: 0, total_kembali: 0, total_terbayar: 0, sisa_stok: 0
            }
            existing.total_terjual += item.jumlah_terjual || 0
            existing.total_kembali += item.jumlah_kembali || 0
            statsMap.set(item.id_produk, existing)
          })
        }
        
        // Calculate derived statistics and transform data
        const productsWithStats = (fallbackData || []).map((product: any) => {
          const stats = statsMap.get(product.id_produk) || {
            total_terkirim: 0, total_terjual: 0, total_kembali: 0, total_terbayar: 0, sisa_stok: 0
          }
          
          // Calculate derived values
          stats.total_terbayar = stats.total_terjual - stats.total_kembali
          stats.sisa_stok = stats.total_terkirim - stats.total_terjual
          
          return {
            ...product,
            stats
          }
        })
        
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