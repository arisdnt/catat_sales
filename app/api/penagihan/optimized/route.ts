import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'dibuat_pada'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    // Filter parameters
    const salesFilter = searchParams.get('sales')
    const kabupatenFilter = searchParams.get('kabupaten')
    const kecamatanFilter = searchParams.get('kecamatan')
    const metodePembayaranFilter = searchParams.get('metode_pembayaran')
    const adaPotonganFilter = searchParams.get('ada_potongan')
    const dateFromFilter = searchParams.get('date_from')
    const dateToFilter = searchParams.get('date_to')
    
    console.log('Penagihan optimized API called with:', {
      page, limit, search, sortBy, sortOrder,
      filters: { salesFilter, kabupatenFilter, kecamatanFilter, metodePembayaranFilter, adaPotonganFilter, dateFromFilter, dateToFilter }
    })
    
    try {
      // Calculate offset
      const offset = (page - 1) * limit
      
      // Note: search_penagihan_optimized function may contain complex queries that were dependent on materialized views
      // Using fallback query as primary method to ensure stability
      let result = null
      
      if (search) {
        console.log('Using direct fallback query for search:', search)
        // Skip the optimized function for now to avoid potential materialized view dependencies
      }
      
      // Fallback query if search function is not available or no search
      if (!result) {
        console.log('Using fallback query')
        
        // Build base query
        let query = supabaseAdmin
          .from('penagihan')
          .select(`
            id_penagihan,
            total_uang_diterima,
            metode_pembayaran,
            ada_potongan,
            dibuat_pada,
            diperbarui_pada,
            toko!inner(
              id_toko,
              nama_toko,
              kecamatan,
              kabupaten,
              link_gmaps,
              sales!inner(
                id_sales,
                nama_sales,
                nomor_telepon
              )
            ),
            detail_penagihan(
              id_detail_tagih,
              jumlah_terjual,
              jumlah_kembali,
              produk!inner(
                id_produk,
                nama_produk,
                harga_satuan
              )
            ),
            potongan_penagihan(
              id_potongan,
              jumlah_potongan,
              alasan
            )
          `, { count: 'exact' })
        
        // Apply search filters
        if (search) {
          const searchNum = parseInt(search)
          if (!isNaN(searchNum)) {
            // Search by ID
            query = query.eq('id_penagihan', searchNum)
          } else {
            // Search by store name (nested relationship search is complex, so we'll use a simpler approach)
            // For now, just search by store name as nested sales search requires different approach
            query = query.filter('toko.nama_toko', 'ilike', `%${search}%`)
          }
        }
        
        // Apply filters
        if (salesFilter) {
          query = query.eq('toko.sales.id_sales', parseInt(salesFilter))
        }
        
        if (kabupatenFilter) {
          query = query.eq('toko.kabupaten', kabupatenFilter)
        }
        
        if (kecamatanFilter) {
          query = query.eq('toko.kecamatan', kecamatanFilter)
        }
        
        if (metodePembayaranFilter) {
          query = query.eq('metode_pembayaran', metodePembayaranFilter)
        }
        
        if (adaPotonganFilter) {
          query = query.eq('ada_potongan', adaPotonganFilter === 'true')
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
        
        result = {
          data: fallbackData || [],
          count: count || 0,
          page,
          limit,
          total_pages: Math.ceil((count || 0) / limit)
        }
        
        console.log('Fallback query successful, found:', fallbackData?.length || 0, 'results, total:', count)
      }
      
      // Format the response
      const response = {
        data: result?.data || result || [],
        pagination: {
          page,
          limit,
          total: result?.count || (Array.isArray(result) ? result.length : 0) || 0,
          total_pages: result?.total_pages || Math.ceil((result?.count || (Array.isArray(result) ? result.length : 0) || 0) / limit)
        },
        filters: {
          search,
          sales: salesFilter,
          kabupaten: kabupatenFilter,
          kecamatan: kecamatanFilter,
          metode_pembayaran: metodePembayaranFilter,
          ada_potongan: adaPotonganFilter,
          date_from: dateFromFilter,
          date_to: dateToFilter
        },
        sorting: {
          sortBy,
          sortOrder
        }
      }
      
      console.log('Penagihan optimized response:', {
        dataCount: response.data.length,
        pagination: response.pagination
      })
      
      return createSuccessResponse(response)
      
    } catch (error) {
      console.error('Penagihan optimized API error:', error)
      
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
          sales: salesFilter,
          kabupaten: kabupatenFilter,
          kecamatan: kecamatanFilter,
          metode_pembayaran: metodePembayaranFilter,
          ada_potongan: adaPotonganFilter,
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