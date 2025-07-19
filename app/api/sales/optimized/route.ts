import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    console.log('Sales optimized API called')
    
    try {
      const { searchParams } = new URL(request.url)
      
      // Extract query parameters
      const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
      const search = searchParams.get('search') || ''
      const sortBy = searchParams.get('sortBy') || 'nama_sales'
      const sortOrder = searchParams.get('sortOrder') || 'asc'
      
      // Filter parameters
      const statusAktif = searchParams.get('status_aktif')
      const teleponExists = searchParams.get('telepon_exists')
      const dateFrom = searchParams.get('date_from')
      const dateTo = searchParams.get('date_to')
      
      console.log('Sales query params:', {
        page, limit, search, sortBy, sortOrder,
        statusAktif, teleponExists, dateFrom, dateTo
      })
      
      const offset = (page - 1) * limit
      
      // Build the base query
      let query = supabaseAdmin
        .from('sales')
        .select(`
          id_sales,
          nama_sales,
          nomor_telepon,
          status_aktif,
          dibuat_pada,
          diperbarui_pada
        `)
      
      // Build count query for pagination
      let countQuery = supabaseAdmin
        .from('sales')
        .select('*', { count: 'exact', head: true })
      
      // Apply search filter
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`
        
        // Try using RPC function if available, otherwise use basic search
        try {
          const { data: rpcData, error: rpcError } = await supabaseAdmin
            .rpc('search_sales_optimized', {
              search_term: search.trim(),
              page_offset: offset,
              page_limit: limit,
              sort_column: sortBy,
              sort_direction: sortOrder,
              filter_status: statusAktif,
              filter_telepon_exists: teleponExists,
              filter_date_from: dateFrom,
              filter_date_to: dateTo
            })
          
          if (!rpcError && rpcData) {
            const totalResult = await supabaseAdmin
              .rpc('count_sales_optimized', {
                search_term: search.trim(),
                filter_status: statusAktif,
                filter_telepon_exists: teleponExists,
                filter_date_from: dateFrom,
                filter_date_to: dateTo
              })
            
            const total = totalResult.data || 0
            const totalPages = Math.ceil(total / limit)
            
            return createSuccessResponse({
              data: rpcData,
              pagination: {
                page,
                limit,
                total,
                total_pages: totalPages
              },
              filters: {
                search,
                status_aktif: statusAktif,
                telepon_exists: teleponExists,
                date_from: dateFrom,
                date_to: dateTo
              },
              sorting: {
                sortBy,
                sortOrder
              }
            })
          }
        } catch (rpcError) {
          console.warn('RPC function not available, using fallback search:', rpcError)
        }
        
        // Fallback to basic search
        query = query.or(`nama_sales.ilike.${searchTerm},nomor_telepon.ilike.${searchTerm}`)
        countQuery = countQuery.or(`nama_sales.ilike.${searchTerm},nomor_telepon.ilike.${searchTerm}`)
      }
      
      // Apply status filter
      if (statusAktif && statusAktif !== 'all') {
        const isActive = statusAktif === 'true'
        query = query.eq('status_aktif', isActive)
        countQuery = countQuery.eq('status_aktif', isActive)
      }
      
      // Apply phone number filter
      if (teleponExists && teleponExists !== 'all') {
        if (teleponExists === 'true') {
          query = query.not('nomor_telepon', 'is', null)
          countQuery = countQuery.not('nomor_telepon', 'is', null)
        } else {
          query = query.is('nomor_telepon', null)
          countQuery = countQuery.is('nomor_telepon', null)
        }
      }
      
      // Apply date filters
      if (dateFrom) {
        query = query.gte('dibuat_pada', dateFrom)
        countQuery = countQuery.gte('dibuat_pada', dateFrom)
      }
      
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        query = query.lte('dibuat_pada', endDate.toISOString())
        countQuery = countQuery.lte('dibuat_pada', endDate.toISOString())
      }
      
      // Apply sorting
      const ascending = sortOrder === 'asc'
      if (sortBy === 'nama_sales') {
        query = query.order('nama_sales', { ascending })
      } else if (sortBy === 'nomor_telepon') {
        query = query.order('nomor_telepon', { ascending, nullsFirst: false })
      } else if (sortBy === 'status_aktif') {
        query = query.order('status_aktif', { ascending })
      } else if (sortBy === 'dibuat_pada') {
        query = query.order('dibuat_pada', { ascending })
      } else {
        query = query.order('nama_sales', { ascending: true })
      }
      
      // Apply pagination
      query = query.range(offset, offset + limit - 1)
      
      // Execute queries
      const [dataResult, countResult] = await Promise.all([
        query,
        countQuery
      ])
      
      if (dataResult.error) {
        console.error('Sales data query error:', dataResult.error)
        throw dataResult.error
      }
      
      if (countResult.error) {
        console.error('Sales count query error:', countResult.error)
        throw countResult.error
      }
      
      const salesData = dataResult.data || []
      const total = countResult.count || 0
      const totalPages = Math.ceil(total / limit)
      
      // Get sales statistics for each sales person
      let salesWithStats = salesData
      if (salesData.length > 0) {
        try {
          const salesIds = salesData.map((s: any) => s.id_sales)
          
          // Get store counts for each sales
          const { data: storeStats } = await supabaseAdmin
            .from('toko')
            .select('id_sales')
            .in('id_sales', salesIds)
          
          // Get shipment statistics (join through toko)
          const { data: shipmentStats } = await supabaseAdmin
            .from('pengiriman')
            .select('toko(id_sales), detail_pengiriman(jumlah_kirim)')
            .in('toko.id_sales', salesIds)
          
          // Get billing statistics (join through toko)
          const { data: billingStats } = await supabaseAdmin
            .from('penagihan')
            .select('toko(id_sales), detail_penagihan(jumlah_terjual, jumlah_kembali), total_uang_diterima')
            .in('toko.id_sales', salesIds)
          
          // Aggregate statistics
          salesWithStats = salesData.map((sales: any) => {
            const storeCount = storeStats?.filter((s: any) => s.id_sales === sales.id_sales).length || 0
            
            const salesShipments = shipmentStats?.filter((s: any) => s.toko?.id_sales === sales.id_sales) || []
            const totalShippedItems = salesShipments.reduce((sum: number, shipment: any) => {
              const details = Array.isArray(shipment.detail_pengiriman) ? shipment.detail_pengiriman : []
              return sum + details.reduce((detailSum: number, detail: any) => detailSum + (detail.jumlah_kirim || 0), 0)
            }, 0)
            
            const salesBillings = billingStats?.filter((b: any) => b.toko?.id_sales === sales.id_sales) || []
            const totalRevenue = salesBillings.reduce((sum: number, billing: any) => sum + (billing.total_uang_diterima || 0), 0)
            
            return {
              ...sales,
              stats: {
                total_stores: storeCount,
                total_shipped_items: totalShippedItems,
                total_revenue: totalRevenue
              }
            }
          })
        } catch (statsError) {
          console.warn('Failed to fetch sales statistics:', statsError)
          salesWithStats = salesData
        }
      }
      
      console.log('Sales optimized response:', {
        dataCount: salesWithStats.length,
        total,
        totalPages,
        page,
        hasData: salesWithStats.length > 0
      })
      
      return createSuccessResponse({
        data: salesWithStats,
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages
        },
        filters: {
          search,
          status_aktif: statusAktif,
          telepon_exists: teleponExists,
          date_from: dateFrom,
          date_to: dateTo
        },
        sorting: {
          sortBy,
          sortOrder
        }
      })
      
    } catch (error) {
      console.error('Sales optimized API error:', error)
      return createErrorResponse('Gagal memuat data sales', 500)
    }
  })
}