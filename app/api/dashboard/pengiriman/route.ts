import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentDateIndonesia, INDONESIA_TIMEZONE } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '30')
    const search = searchParams.get('search') || ''
    const is_autorestock = searchParams.get('is_autorestock')
    const sales_id = searchParams.get('sales_id')
    const kabupaten = searchParams.get('kabupaten')
    const kecamatan = searchParams.get('kecamatan')
    const date_range = searchParams.get('date_range') || 'all'
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit
    
    // Build the base query on v_pengiriman_dashboard view
    let query = supabase
      .from('v_pengiriman_dashboard')
      .select('*', { count: 'exact' })

    // Apply search filter
    if (search.trim()) {
      query = query.or(
        `nama_toko.ilike.%${search}%,nama_sales.ilike.%${search}%,kabupaten.ilike.%${search}%,kecamatan.ilike.%${search}%,detail_pengiriman.ilike.%${search}%`
      )
    }

    // Apply autorestock filter
    if (is_autorestock && is_autorestock !== 'all') {
      const isAutoRestock = is_autorestock === 'true'
      query = query.eq('is_autorestock', isAutoRestock)
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
      // Get current date in Indonesia timezone
      const todayStr = getCurrentDateIndonesia()
      const today = new Date(todayStr)
      
      switch (date_range) {
        case 'today':
          query = query.eq('tanggal_kirim', todayStr)
          break
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          const weekAgoStr = new Intl.DateTimeFormat('sv-SE', {
            timeZone: INDONESIA_TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(weekAgo)
          query = query
            .gte('tanggal_kirim', weekAgoStr)
            .lte('tanggal_kirim', todayStr)
          break
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          const monthAgoStr = new Intl.DateTimeFormat('sv-SE', {
            timeZone: INDONESIA_TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(monthAgo)
          query = query
            .gte('tanggal_kirim', monthAgoStr)
            .lte('tanggal_kirim', todayStr)
          break
        case 'current_month':
          // From 1st of current month to end of current month (exclusive)
          const currentYear = today.getFullYear()
          const currentMonth = today.getMonth()
          const startDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
          const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
          const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear
          const endDateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-01`
          query = query
            .gte('tanggal_kirim', startDateStr)
            .lt('tanggal_kirim', endDateStr)
          break
        case 'last_month':
          // From 1st of last month to last day of last month (Indonesia timezone)
          const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
          const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0) // Last day of previous month
          const lastMonthStartStr = new Intl.DateTimeFormat('sv-SE', {
            timeZone: INDONESIA_TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(lastMonthStart)
          const lastMonthEndStr = new Intl.DateTimeFormat('sv-SE', {
            timeZone: INDONESIA_TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(lastMonthEnd)
          query = query
            .gte('tanggal_kirim', lastMonthStartStr)
            .lte('tanggal_kirim', lastMonthEndStr)
          break
      }
    }

    // Apply ordering and pagination
    query = query
      .order('tanggal_kirim', { ascending: false })
      .order('id_pengiriman', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching pengiriman data:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch pengiriman data',
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
          total_pages: totalPages,
          has_next: hasNextPage,
          has_prev: hasPrevPage
        }
      }
    })
  } catch (error: any) {
    console.error('Unexpected error in pengiriman dashboard API:', error)
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