import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '30')
    const search = searchParams.get('search') || ''
    const metode_pembayaran = searchParams.get('metode_pembayaran')
    const ada_potongan = searchParams.get('ada_potongan')
    const sales_id = searchParams.get('sales_id')
    const kabupaten = searchParams.get('kabupaten')
    const kecamatan = searchParams.get('kecamatan')
    const date_range = searchParams.get('date_range') || 'all'
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit
    
    // Use the v_penagihan_dashboard view for optimized queries
    let query = supabase
      .from('v_penagihan_dashboard')
      .select('*', { count: 'exact' })

    // Apply search filter
    if (search.trim()) {
      const searchNum = parseInt(search)
      if (!isNaN(searchNum)) {
        // Search by ID
        query = query.eq('id_penagihan', searchNum)
      } else {
        // Search by store name, location, or sales name
        query = query.or(
          `nama_toko.ilike.*${search}*,kecamatan.ilike.*${search}*,kabupaten.ilike.*${search}*,nama_sales.ilike.*${search}*`
        )
      }
    }

    // Apply payment method filter
    if (metode_pembayaran && metode_pembayaran !== 'all') {
      query = query.eq('metode_pembayaran', metode_pembayaran)
    }

    // Apply discount filter
    if (ada_potongan && ada_potongan !== 'all') {
      const hasDiscount = ada_potongan === 'true'
      query = query.eq('ada_potongan', hasDiscount)
    }

    // Apply sales filter
    if (sales_id && sales_id !== 'all') {
      query = query.eq('id_sales', parseInt(sales_id))
    }

    // Apply location filters
    if (kabupaten && kabupaten !== 'all') {
      query = query.eq('kabupaten', kabupaten)
    }

    if (kecamatan && kecamatan !== 'all') {
      query = query.eq('kecamatan', kecamatan)
    }

    // Apply date range filter
    if (date_range !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      switch (date_range) {
        case 'today':
          const todayStr = today.toISOString().split('T')[0]
          const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          query = query.gte('dibuat_pada', todayStr).lt('dibuat_pada', tomorrowStr)
          break
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          query = query
            .gte('dibuat_pada', weekAgo.toISOString().split('T')[0])
            .lte('dibuat_pada', today.toISOString().split('T')[0])
          break
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          query = query
            .gte('dibuat_pada', monthAgo.toISOString().split('T')[0])
            .lte('dibuat_pada', today.toISOString().split('T')[0])
          break
      }
    }

    // Apply ordering and pagination
    query = query
      .order('dibuat_pada', { ascending: false })
      .order('id_penagihan', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching penagihan data:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch penagihan data',
          details: error.message 
        }, 
        { status: 500 }
      )
    }

    // Calculate total revenue from all records matching the filters (not just current page)
    let totalRevenueQuery = supabase
      .from('v_penagihan_dashboard')
      .select('total_uang_diterima')

    // Apply the same filters as the main query to get accurate total revenue
    if (search.trim()) {
      const searchNum = parseInt(search)
      if (!isNaN(searchNum)) {
        totalRevenueQuery = totalRevenueQuery.eq('id_penagihan', searchNum)
      } else {
        totalRevenueQuery = totalRevenueQuery.or(
          `nama_toko.ilike.*${search}*,kecamatan.ilike.*${search}*,kabupaten.ilike.*${search}*,nama_sales.ilike.*${search}*`
        )
      }
    }

    if (metode_pembayaran && metode_pembayaran !== 'all') {
      totalRevenueQuery = totalRevenueQuery.eq('metode_pembayaran', metode_pembayaran)
    }

    if (ada_potongan && ada_potongan !== 'all') {
      const hasDiscount = ada_potongan === 'true'
      totalRevenueQuery = totalRevenueQuery.eq('ada_potongan', hasDiscount)
    }

    if (sales_id && sales_id !== 'all') {
      totalRevenueQuery = totalRevenueQuery.eq('id_sales', parseInt(sales_id))
    }

    if (kabupaten && kabupaten !== 'all') {
      totalRevenueQuery = totalRevenueQuery.eq('kabupaten', kabupaten)
    }

    if (kecamatan && kecamatan !== 'all') {
      totalRevenueQuery = totalRevenueQuery.eq('kecamatan', kecamatan)
    }

    // Apply date range filter to total revenue query
    if (date_range !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      switch (date_range) {
        case 'today':
          const todayStr = today.toISOString().split('T')[0]
          const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          totalRevenueQuery = totalRevenueQuery.gte('dibuat_pada', todayStr).lt('dibuat_pada', tomorrowStr)
          break
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          totalRevenueQuery = totalRevenueQuery
            .gte('dibuat_pada', weekAgo.toISOString().split('T')[0])
            .lte('dibuat_pada', today.toISOString().split('T')[0])
          break
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          totalRevenueQuery = totalRevenueQuery
            .gte('dibuat_pada', monthAgo.toISOString().split('T')[0])
            .lte('dibuat_pada', today.toISOString().split('T')[0])
          break
      }
    }

    const { data: revenueData, error: revenueError } = await totalRevenueQuery

    if (revenueError) {
      console.error('Error calculating total revenue:', revenueError)
      // Continue without total revenue if this fails
    }

    // Calculate total revenue from all matching records
    const totalRevenue = revenueData?.reduce((sum, item) => sum + (item.total_uang_diterima || 0), 0) || 0

    // Transform data from v_penagihan_dashboard view
    const transformedData = data?.map((item: any) => ({
      id_penagihan: item.id_penagihan,
      tanggal_penagihan: item.dibuat_pada,
      nama_toko: item.nama_toko,
      kecamatan: item.kecamatan,
      kabupaten: item.kabupaten,
      link_gmaps: item.link_gmaps,
      no_telepon: item.nomor_telepon_toko,
      nama_sales: item.nama_sales,
      total_uang_diterima: item.total_uang_diterima,
      metode_pembayaran: item.metode_pembayaran,
      ada_potongan: item.ada_potongan,
      detail_produk: item.detail_terjual,
      total_quantity_terjual: item.kuantitas_terjual,
      // Additional fields from view
      id_toko: item.id_toko,
      id_sales: item.id_sales,
      detail_kembali: item.detail_kembali,
      kuantitas_kembali: item.kuantitas_kembali
    })) || []

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return NextResponse.json({
      success: true,
      data: {
        data: transformedData,
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: totalPages,
          has_next: hasNextPage,
          has_prev: hasPrevPage
        },
        metadata: {
          totalItems: count || 0,
          totalRevenue: totalRevenue,
          totalPages: totalPages,
          currentPage: page
        }
      }
    })
  } catch (error: any) {
    console.error('Unexpected error in penagihan dashboard API:', error)
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