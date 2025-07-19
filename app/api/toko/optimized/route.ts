import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Types for the optimized API response
interface TokoWithStats {
  id_toko: number
  nama_toko: string
  kecamatan: string
  kabupaten: string
  no_telepon?: string
  link_gmaps?: string
  id_sales: number
  nama_sales?: string
  status_toko: boolean
  dibuat_pada: string
  diperbarui_pada: string
  barang_terkirim: number
  detail_barang_terkirim: any[]
  barang_terbayar: number
  detail_barang_terbayar: any[]
  sisa_stok: number
  detail_sisa_stok: any[]
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface OptimizedResponse {
  data: TokoWithStats[]
  pagination: PaginationMeta
  summary: {
    total_stores: number
    active_stores: number
    inactive_stores: number
    unique_kabupaten: number
    unique_kecamatan: number
  }
}

// Validate Supabase session
async function validateRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header')
  }

  const token = authHeader.split(' ')[1]
  if (!token) {
    throw new Error('Missing token')
  }

  // Create Supabase client and verify the token
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    throw new Error('Invalid or expired token')
  }
  
  return user
}

export async function GET(request: NextRequest) {
  try {
    // Log for debugging
    console.log('Optimized toko API called')
    console.log('Auth header:', request.headers.get('authorization') ? 'Present' : 'Missing')
    
    // Validate authentication
    try {
      const user = await validateRequest(request)
      console.log('Auth validation passed for user:', user.id)
    } catch (authError) {
      console.error('Auth validation failed:', authError)
      return NextResponse.json(
        { error: 'Unauthorized', details: authError instanceof Error ? authError.message : 'Authentication failed' },
        { status: 401 }
      )
    }

    const supabase = createClient()
    const { searchParams } = new URL(request.url)

    // Extract and validate query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const search = searchParams.get('search') || ''
    const statusFilter = searchParams.get('status')
    const salesFilter = searchParams.get('id_sales')
    const kabupatenFilter = searchParams.get('kabupaten') || ''
    const kecamatanFilter = searchParams.get('kecamatan') || ''
    const sortBy = searchParams.get('sortBy') || 'nama_toko'
    const sortOrder = (searchParams.get('sortOrder') || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc'

    // Use the optimized search function (with fallback to simple version)
    let searchResults, searchError
    
    // Try the optimized function first
    const optimizedResult = await supabase
      .rpc('search_toko_optimized', {
        search_term: search,
        filter_status: statusFilter === 'true' ? true : statusFilter === 'false' ? false : null,
        filter_sales: salesFilter ? parseInt(salesFilter) : null,
        filter_kabupaten: kabupatenFilter,
        filter_kecamatan: kecamatanFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
        page_size: limit,
        page_number: page
      })
    
    if (optimizedResult.error) {
      console.log('Optimized function not available, trying simple function...')
      // Fallback to simple function
      const simpleResult = await supabase
        .rpc('search_toko_simple', {
          search_term: search,
          filter_status: statusFilter === 'true' ? true : statusFilter === 'false' ? false : null,
          filter_sales: salesFilter ? parseInt(salesFilter) : null,
          filter_kabupaten: kabupatenFilter,
          filter_kecamatan: kecamatanFilter,
          sort_by: sortBy,
          sort_order: sortOrder,
          page_size: limit,
          page_number: page
        })
      
      searchResults = simpleResult.data
      searchError = simpleResult.error
    } else {
      searchResults = optimizedResult.data
      searchError = optimizedResult.error
    }

    if (searchError) {
      console.error('Search error:', searchError)
      console.log('Falling back to regular query. Error details:', searchError.message)
      // Fallback to regular query if optimized function fails
      return await getFallbackResults(supabase, searchParams, page, limit)
    }
    
    console.log('Search results:', searchResults ? `${searchResults.length} rows` : 'null')

    if (!searchResults || searchResults.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        },
        summary: {
          total_stores: 0,
          active_stores: 0,
          inactive_stores: 0,
          unique_kabupaten: 0,
          unique_kecamatan: 0
        }
      })
    }

    const totalCount = searchResults[0]?.total_count || 0
    const totalPages = Math.ceil(totalCount / limit)

    // Transform results to match expected format
    const transformedData: TokoWithStats[] = searchResults.map((row: any) => ({
      id_toko: row.id_toko,
      nama_toko: row.nama_toko,
      kecamatan: row.kecamatan,
      kabupaten: row.kabupaten,
      no_telepon: row.no_telepon,
      link_gmaps: row.link_gmaps,
      id_sales: row.id_sales,
      status_toko: row.status_toko,
      dibuat_pada: row.dibuat_pada,
      diperbarui_pada: row.diperbarui_pada,
      barang_terkirim: parseInt(row.barang_terkirim || '0'),
      detail_barang_terkirim: row.detail_barang_terkirim || [],
      barang_terbayar: parseInt(row.barang_terbayar || '0'),
      detail_barang_terbayar: row.detail_barang_terbayar || [],
      sisa_stok: parseInt(row.sisa_stok || '0'),
      detail_sisa_stok: row.detail_sisa_stok || []
    }))

    // Calculate summary statistics
    const summary = {
      total_stores: totalCount,
      active_stores: transformedData.filter(t => t.status_toko).length,
      inactive_stores: transformedData.filter(t => !t.status_toko).length,
      unique_kabupaten: new Set(transformedData.map(t => t.kabupaten).filter(Boolean)).size,
      unique_kecamatan: new Set(transformedData.map(t => t.kecamatan).filter(Boolean)).size
    }

    const response: OptimizedResponse = {
      data: transformedData,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      summary
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Optimized toko API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Fallback function using regular queries if optimized function fails
async function getFallbackResults(supabase: any, searchParams: URLSearchParams, page: number, limit: number) {
  try {
    console.log('Using fallback query to fetch real data...')
    
    const search = searchParams.get('search') || ''
    const statusFilter = searchParams.get('status')
    const salesFilter = searchParams.get('id_sales')
    const kabupatenFilter = searchParams.get('kabupaten') || ''
    const kecamatanFilter = searchParams.get('kecamatan') || ''
    const sortBy = searchParams.get('sortBy') || 'nama_toko'
    const sortOrder = (searchParams.get('sortOrder') || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc'

    let query = supabase
      .from('toko')
      .select(`
        id_toko,
        nama_toko,
        kecamatan,
        kabupaten,
        no_telepon,
        link_gmaps,
        id_sales,
        status_toko,
        dibuat_pada,
        diperbarui_pada,
        sales!inner(
          nama_sales
        )
      `)
    
    console.log('Query parameters:', { search, statusFilter, salesFilter, kabupatenFilter, kecamatanFilter })

    // Apply filters
    if (search) {
      query = query.or(`nama_toko.ilike.%${search}%,kecamatan.ilike.%${search}%,kabupaten.ilike.%${search}%,no_telepon.ilike.%${search}%`)
    }

    if (statusFilter === 'true' || statusFilter === 'false') {
      query = query.eq('status_toko', statusFilter === 'true')
    }

    if (salesFilter) {
      query = query.eq('id_sales', parseInt(salesFilter))
    }

    if (kabupatenFilter) {
      query = query.eq('kabupaten', kabupatenFilter)
    }

    if (kecamatanFilter) {
      query = query.eq('kecamatan', kecamatanFilter)
    }

    // Get total count - fix the count query
    const countQuery = supabase.from('toko').select('*', { count: 'exact', head: true })
    
    // Apply same filters to count query
    if (search) {
      countQuery.or(`nama_toko.ilike.%${search}%,kecamatan.ilike.%${search}%,kabupaten.ilike.%${search}%,no_telepon.ilike.%${search}%`)
    }
    if (statusFilter === 'true' || statusFilter === 'false') {
      countQuery.eq('status_toko', statusFilter === 'true')
    }
    if (salesFilter) {
      countQuery.eq('id_sales', parseInt(salesFilter))
    }
    if (kabupatenFilter) {
      countQuery.eq('kabupaten', kabupatenFilter)
    }
    if (kecamatanFilter) {
      countQuery.eq('kecamatan', kecamatanFilter)
    }
    
    const { count: totalCount, error: countError } = await countQuery
    
    console.log('Count query result:', { totalCount, countError: countError?.message })

    // Get paginated data
    const { data, error } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * limit, page * limit - 1)

    console.log('Fallback query result:', { 
      dataCount: data?.length || 0, 
      error: error?.message,
      totalCount,
      sampleData: data?.[0] // Log first item to see structure
    })

    if (error) throw error

    const totalPages = Math.ceil((totalCount || 0) / limit)

    // Get aggregation data for each toko
    const tokoIds = data?.map((t: any) => t.id_toko) || []
    let aggregationData: Record<number, any> = {}
    
    if (tokoIds.length > 0) {
      try {
        // Get shipment data (barang terkirim)
        const { data: shipmentData } = await supabase
          .from('detail_pengiriman')
          .select(`
            pengiriman!inner(
              id_toko
            ),
            produk(
              nama_produk
            ),
            jumlah_kirim
          `)
          .in('pengiriman.id_toko', tokoIds)
        
        // Get billing data (barang terbayar)
        const { data: billingData } = await supabase
          .from('detail_penagihan')
          .select(`
            penagihan!inner(
              id_toko
            ),
            produk(
              nama_produk
            ),
            jumlah_terjual
          `)
          .in('penagihan.id_toko', tokoIds)
        
        // Process aggregation data
        tokoIds.forEach((tokoId: number) => {
          const shipments = shipmentData?.filter((s: any) => s.pengiriman?.id_toko === tokoId) || []
          const billings = billingData?.filter((b: any) => b.penagihan?.id_toko === tokoId) || []
          
          const totalTerkirim = shipments.reduce((sum: number, s: any) => sum + (s.jumlah_kirim || 0), 0)
          const totalTerbayar = billings.reduce((sum: number, b: any) => sum + (b.jumlah_terjual || 0), 0)
          const sisaStok = totalTerkirim - totalTerbayar
          
          aggregationData[tokoId] = {
            barang_terkirim: totalTerkirim,
            detail_barang_terkirim: shipments.map((s: any) => ({
              nama_produk: s.produk?.nama_produk || 'Unknown',
              jumlah: s.jumlah_kirim || 0
            })),
            barang_terbayar: totalTerbayar,
            detail_barang_terbayar: billings.map((b: any) => ({
              nama_produk: b.produk?.nama_produk || 'Unknown',
              jumlah: b.jumlah_terjual || 0
            })),
            sisa_stok: Math.max(0, sisaStok),
            detail_sisa_stok: []
          }
        })
      } catch (aggError) {
        console.warn('Failed to get aggregation data:', aggError)
      }
    }

    // Transform data to include aggregation fields and sales names
    const transformedData: TokoWithStats[] = (data || []).map((row: any) => {
      const agg = aggregationData[row.id_toko] || {
        barang_terkirim: 0,
        detail_barang_terkirim: [],
        barang_terbayar: 0,
        detail_barang_terbayar: [],
        sisa_stok: 0,
        detail_sisa_stok: []
      }
      
      return {
        ...row,
        nama_sales: row.sales?.nama_sales || 'Sales Tidak Ditemukan',
        ...agg
      }
    })

    console.log('Transformed data sample:', transformedData?.[0])

    // Calculate basic summary for fallback
    const activeCount = transformedData.filter(t => t.status_toko).length
    const inactiveCount = transformedData.filter(t => !t.status_toko).length

    const summary = {
      total_stores: totalCount || 0,
      active_stores: activeCount,
      inactive_stores: inactiveCount,
      unique_kabupaten: new Set(transformedData.map(t => t.kabupaten).filter(Boolean)).size,
      unique_kecamatan: new Set(transformedData.map(t => t.kecamatan).filter(Boolean)).size
    }

    console.log('Final response summary:', summary)

    const finalResponse = {
      data: transformedData,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      summary
    }
    
    console.log('Returning fallback response structure:', {
      hasData: !!finalResponse.data,
      dataCount: finalResponse.data.length,
      hasPagination: !!finalResponse.pagination,
      hasSummary: !!finalResponse.summary
    })

    return NextResponse.json(finalResponse)

  } catch (error) {
    console.error('Fallback query error:', error)
    throw error
  }
}