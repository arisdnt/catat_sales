import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Types for the optimized API response
interface PengirimanWithDetails {
  id_pengiriman: number
  tanggal_kirim: string
  dibuat_pada: string
  diperbarui_pada: string
  id_toko: number
  nama_toko: string
  kecamatan?: string
  kabupaten?: string
  link_gmaps?: string
  id_sales: number
  nama_sales: string
  nomor_telepon?: string
  total_quantity: number
  is_autorestock?: boolean
  detail_pengiriman: Array<{
    id_detail_kirim: number
    id_produk: number
    nama_produk: string
    jumlah_kirim: number
    harga_satuan: number
  }>
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
  data: PengirimanWithDetails[]
  pagination: PaginationMeta
  summary: {
    total_shipments: number
    today_shipments: number
    this_week_shipments: number
    unique_kabupaten: number
    unique_kecamatan: number
    unique_sales: number
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
    console.log('Optimized pengiriman API called')
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
    const salesFilter = searchParams.get('id_sales')
    const kabupatenFilter = searchParams.get('kabupaten') || ''
    const kecamatanFilter = searchParams.get('kecamatan') || ''
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const sortBy = searchParams.get('sortBy') || 'dibuat_pada'
    const sortOrder = (searchParams.get('sortOrder') || 'desc').toLowerCase() === 'desc' ? 'desc' : 'asc'

    // Use the simple search function directly (materialized views removed)
    let searchResults = null
    let searchError = null
    
    console.log('Using search_pengiriman_simple function')
    const simpleResult = await supabase
      .rpc('search_pengiriman_simple', {
        search_term: search,
        filter_sales: salesFilter ? parseInt(salesFilter) : null,
        filter_kabupaten: kabupatenFilter,
        filter_kecamatan: kecamatanFilter,
        filter_date_from: dateFrom,
        filter_date_to: dateTo,
        sort_by: sortBy,
        sort_order: sortOrder,
        page_size: limit,
        page_number: page
      })
    
    searchResults = simpleResult.data
    searchError = simpleResult.error

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
          total_shipments: 0,
          today_shipments: 0,
          this_week_shipments: 0,
          unique_kabupaten: 0,
          unique_kecamatan: 0,
          unique_sales: 0
        }
      })
    }

    const totalCount = searchResults[0]?.total_count || 0
    const totalPages = Math.ceil(totalCount / limit)

    // Transform results to match expected format
    const transformedData: PengirimanWithDetails[] = searchResults.map((row: any) => ({
      id_pengiriman: row.id_pengiriman,
      tanggal_kirim: row.tanggal_kirim,
      dibuat_pada: row.dibuat_pada,
      diperbarui_pada: row.diperbarui_pada,
      id_toko: row.id_toko,
      nama_toko: row.nama_toko,
      kecamatan: row.kecamatan,
      kabupaten: row.kabupaten,
      link_gmaps: row.link_gmaps,
      id_sales: row.id_sales,
      nama_sales: row.nama_sales,
      nomor_telepon: row.nomor_telepon,
      total_quantity: parseInt(row.total_quantity || '0'),
      is_autorestock: row.is_autorestock || false,
      detail_pengiriman: row.detail_pengiriman || []
    }))

    // Calculate summary statistics from database directly (not just current page)
    const today = new Date().toDateString()
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const todayISO = new Date().toISOString().split('T')[0]
    const weekAgoISO = weekAgo.toISOString().split('T')[0]

    // Get global counts from database
    const [totalQuery, todayQuery, weekQuery] = await Promise.all([
      // Total pengiriman count
      supabase.from('pengiriman').select('*', { count: 'exact', head: true }),
      // Today's pengiriman count  
      supabase.from('pengiriman').select('*', { count: 'exact', head: true }).eq('tanggal_kirim', todayISO),
      // This week's pengiriman count
      supabase.from('pengiriman').select('*', { count: 'exact', head: true }).gte('tanggal_kirim', weekAgoISO)
    ])

    const summary = {
      total_shipments: totalQuery.count || 0, // Global total from database
      today_shipments: todayQuery.count || 0, // Today's count from database
      this_week_shipments: weekQuery.count || 0, // This week's count from database
      unique_kabupaten: new Set(transformedData.map(p => p.kabupaten).filter(Boolean)).size,
      unique_kecamatan: new Set(transformedData.map(p => p.kecamatan).filter(Boolean)).size,
      unique_sales: new Set(transformedData.map(p => p.id_sales)).size
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
    console.error('Optimized pengiriman API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Fallback function using regular queries if optimized function fails
async function getFallbackResults(supabase: any, searchParams: URLSearchParams, page: number, limit: number) {
  try {
    console.log('Using fallback query to fetch real pengiriman data...')
    
    const search = searchParams.get('search') || ''
    const salesFilter = searchParams.get('id_sales')
    const kabupatenFilter = searchParams.get('kabupaten') || ''
    const kecamatanFilter = searchParams.get('kecamatan') || ''
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const sortBy = searchParams.get('sortBy') || 'dibuat_pada'
    const sortOrder = (searchParams.get('sortOrder') || 'desc').toLowerCase() === 'desc' ? 'desc' : 'asc'

    let query = supabase
      .from('pengiriman')
      .select(`
        id_pengiriman,
        tanggal_kirim,
        dibuat_pada,
        diperbarui_pada,
        is_autorestock,
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
        detail_pengiriman(
          id_detail_kirim,
          jumlah_kirim,
          produk(
            id_produk,
            nama_produk,
            harga_satuan
          )
        )
      `)
    
    console.log('Query parameters:', { search, salesFilter, kabupatenFilter, kecamatanFilter, dateFrom, dateTo })

    // Build search conditions
    const searchConditions = []
    if (search) {
      // Try to parse as number for ID search
      const searchAsNumber = parseInt(search)
      if (!isNaN(searchAsNumber)) {
        searchConditions.push(`id_pengiriman.eq.${searchAsNumber}`)
      }
      // Add text search for toko name
      searchConditions.push(`toko.nama_toko.ilike.%${search}%`)
    }

    // Apply filters
    if (searchConditions.length > 0) {
      query = query.or(searchConditions.join(','))
    }

    if (salesFilter) {
      query = query.eq('toko.sales.id_sales', parseInt(salesFilter))
    }

    if (kabupatenFilter) {
      query = query.eq('toko.kabupaten', kabupatenFilter)
    }

    if (kecamatanFilter) {
      query = query.eq('toko.kecamatan', kecamatanFilter)
    }

    if (dateFrom) {
      query = query.gte('tanggal_kirim', dateFrom)
    }

    if (dateTo) {
      query = query.lte('tanggal_kirim', dateTo)
    }

    // Get total count with same filters and joins
    let countQuery = supabase
      .from('pengiriman')
      .select(`
        id_pengiriman,
        toko!inner(
          id_toko,
          nama_toko,
          kabupaten,
          kecamatan,
          sales!inner(
            id_sales
          )
        )
      `, { count: 'exact', head: true })
    
    // Apply same filters to count query
    if (searchConditions.length > 0) {
      countQuery = countQuery.or(searchConditions.join(','))
    }
    if (salesFilter) {
      countQuery = countQuery.eq('toko.sales.id_sales', parseInt(salesFilter))
    }
    if (kabupatenFilter) {
      countQuery = countQuery.eq('toko.kabupaten', kabupatenFilter)
    }
    if (kecamatanFilter) {
      countQuery = countQuery.eq('toko.kecamatan', kecamatanFilter)
    }
    if (dateFrom) {
      countQuery = countQuery.gte('tanggal_kirim', dateFrom)
    }
    if (dateTo) {
      countQuery = countQuery.lte('tanggal_kirim', dateTo)
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

    // Transform data to match expected format
    const transformedData: PengirimanWithDetails[] = (data || []).map((row: any) => {
      const totalQuantity = row.detail_pengiriman?.reduce((sum: number, detail: any) => 
        sum + (detail.jumlah_kirim || 0), 0) || 0
      
      return {
        id_pengiriman: row.id_pengiriman,
        tanggal_kirim: row.tanggal_kirim,
        dibuat_pada: row.dibuat_pada,
        diperbarui_pada: row.diperbarui_pada,
        id_toko: row.toko.id_toko,
        nama_toko: row.toko.nama_toko,
        kecamatan: row.toko.kecamatan,
        kabupaten: row.toko.kabupaten,
        link_gmaps: row.toko.link_gmaps,
        id_sales: row.toko.sales.id_sales,
        nama_sales: row.toko.sales.nama_sales,
        nomor_telepon: row.toko.sales.nomor_telepon,
        total_quantity: totalQuantity,
        is_autorestock: row.is_autorestock || false,
        detail_pengiriman: row.detail_pengiriman?.map((detail: any) => ({
          id_detail_kirim: detail.id_detail_kirim,
          id_produk: detail.produk.id_produk,
          nama_produk: detail.produk.nama_produk,
          jumlah_kirim: detail.jumlah_kirim,
          harga_satuan: detail.produk.harga_satuan
        })) || []
      }
    })

    console.log('Transformed data sample:', transformedData?.[0])

    // Calculate summary statistics from database directly (not just current page)
    const today = new Date().toDateString()
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const todayISO = new Date().toISOString().split('T')[0]
    const weekAgoISO = weekAgo.toISOString().split('T')[0]

    // Get global counts from database
    const [totalQuery, todayQuery, weekQuery] = await Promise.all([
      // Total pengiriman count
      supabase.from('pengiriman').select('*', { count: 'exact', head: true }),
      // Today's pengiriman count  
      supabase.from('pengiriman').select('*', { count: 'exact', head: true }).eq('tanggal_kirim', todayISO),
      // This week's pengiriman count
      supabase.from('pengiriman').select('*', { count: 'exact', head: true }).gte('tanggal_kirim', weekAgoISO)
    ])

    const summary = {
      total_shipments: totalQuery.count || 0, // Global total from database
      today_shipments: todayQuery.count || 0, // Today's count from database
      this_week_shipments: weekQuery.count || 0, // This week's count from database
      unique_kabupaten: new Set(transformedData.map(p => p.kabupaten).filter(Boolean)).size,
      unique_kecamatan: new Set(transformedData.map(p => p.kecamatan).filter(Boolean)).size,
      unique_sales: new Set(transformedData.map(p => p.id_sales)).size
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