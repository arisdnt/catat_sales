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
      
      // Build the base query - fallback to sales table if materialized view doesn't exist
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
      
      // Apply search filter - direct query approach only
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`
        console.log('Using direct search query for:', search.trim())
        
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
      
      // Fetch stats for each sales person to show accurate data
      const salesWithStats = await Promise.all(
        salesData.map(async (sale) => {
          try {
            // Get all stores for this sales person (match DETAIL API logic)
            const { data: stores } = await supabaseAdmin
              .from('toko')
              .select('id_toko')
              .eq('id_sales', sale.id_sales)

            const storeIds = stores?.map(store => store.id_toko) || []
            
            // Use same method as DETAIL API for consistency
            // Get shipped items through pengiriman -> detail_pengiriman
            const { data: shipmentData } = storeIds.length > 0 ? await supabaseAdmin
              .from('pengiriman')
              .select(`
                id_pengiriman,
                detail_pengiriman (
                  jumlah_kirim
                )
              `)
              .in('id_toko', storeIds) : { data: null }

            // Get sold items and returned items through penagihan -> detail_penagihan
            const { data: billingData } = storeIds.length > 0 ? await supabaseAdmin
              .from('penagihan')
              .select(`
                id_penagihan,
                detail_penagihan (
                  jumlah_terjual,
                  jumlah_kembali
                )
              `)
              .in('id_toko', storeIds) : { data: null }

            const storeCount = stores?.length || 0

            // Calculate totals using same logic as DETAIL API
            let totalShipped = 0
            let totalSold = 0
            let totalReturned = 0

            if (shipmentData) {
              totalShipped = shipmentData.reduce((sum, shipment) => {
                const details = shipment.detail_pengiriman || []
                return sum + details.reduce((detailSum, detail) => detailSum + (detail.jumlah_kirim || 0), 0)
              }, 0)
            }

            if (billingData) {
              billingData.forEach(billing => {
                const details = billing.detail_penagihan || []
                details.forEach(detail => {
                  totalSold += detail.jumlah_terjual || 0
                  totalReturned += detail.jumlah_kembali || 0
                })
              })
            }

            return {
              ...sale,
              total_stores: storeCount,
              total_shipped_items: totalShipped,
              total_revenue: 0, // Can be calculated later if needed
              total_items_sold: totalSold,
              total_items_returned: totalReturned,
              total_billings: billingData?.length || 0,
              total_shipments: shipmentData?.length || 0
            }
          } catch (error) {
            console.error(`Error fetching stats for sales ${sale.id_sales}:`, error)
            return {
              ...sale,
              total_stores: 0,
              total_shipped_items: 0,
              total_revenue: 0,
              total_items_sold: 0,
              total_items_returned: 0,
              total_billings: 0,
              total_shipments: 0
            }
          }
        })
      )
      
      console.log('Sales optimized response:', {
        dataCount: salesWithStats.length,
        total,
        totalPages,
        page,
        hasData: salesWithStats.length > 0,
        sampleData: salesWithStats.slice(0, 2).map(s => ({
          nama_sales: s.nama_sales,
          total_stores: s.total_stores,
          total_shipped_items: s.total_shipped_items,
          total_items_sold: s.total_items_sold,
          total_items_returned: s.total_items_returned
        }))
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