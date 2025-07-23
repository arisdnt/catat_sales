import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const kabupaten = searchParams.get('kabupaten')
    const kecamatan = searchParams.get('kecamatan')
    const status_toko = searchParams.get('status_toko')

    // Calculate offset for pagination
    const offset = (page - 1) * limit

    // Build the base query
    let query = supabase
      .from('v_master_toko')
      .select('*', { count: 'exact' })

    // Apply search filter
    if (search.trim()) {
      query = query.or(
        `nama_toko.ilike.%${search}%,nama_sales.ilike.%${search}%,kabupaten.ilike.%${search}%,kecamatan.ilike.%${search}%,no_telepon.ilike.%${search}%,telepon_sales.ilike.%${search}%`
      )
    }

    // Apply location filters
    if (kabupaten && kabupaten !== 'all') {
      query = query.eq('kabupaten', kabupaten)
    }

    if (kecamatan && kecamatan !== 'all') {
      query = query.eq('kecamatan', kecamatan)
    }

    // Apply status filter
    if (status_toko && status_toko !== 'all') {
      const isActive = status_toko === 'true'
      query = query.eq('status_toko', isActive)
    }

    // Apply ordering and pagination
    query = query
      .order('status_toko', { ascending: false })
      .order('nama_sales', { ascending: true })
      .order('nama_toko', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching master toko data:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch master toko data',
          details: error.message 
        }, 
        { status: 500 }
      )
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return NextResponse.json({
      success: true,
      data: {
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasNextPage,
          hasPrevPage,
          from: (count || 0) > 0 ? offset + 1 : 0,
          to: Math.min(offset + limit, count || 0)
        }
      }
    })
  } catch (error: any) {
    console.error('Unexpected error in master toko API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      }, 
      { status: 500 }
    )
  }
}