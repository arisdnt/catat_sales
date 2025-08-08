import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentDateTimeIndonesia, INDONESIA_TIMEZONE } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '30')
    const search = searchParams.get('search') || ''
    const date_range = searchParams.get('date_range') || 'all'
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit
    
    // Build the base query on pengeluaran_operasional table
    let query = supabase
      .from('pengeluaran_operasional')
      .select('*', { count: 'exact' })

    // Apply search filter
    if (search.trim()) {
      const searchNum = parseInt(search)
      if (!isNaN(searchNum)) {
        // Search by ID
        query = query.eq('id_pengeluaran', searchNum)
      } else {
        // Search by description
        query = query.ilike('keterangan', `%${search}%`)
      }
    }

    // Apply date range filter
    if (date_range && date_range !== 'all') {
      const currentDate = getCurrentDateTimeIndonesia()
      const currentDateStr = currentDate.toISOString().split('T')[0]
      
      switch (date_range) {
        case 'today':
          query = query
            .gte('tanggal_pengeluaran', `${currentDateStr}T00:00:00+07:00`)
            .lte('tanggal_pengeluaran', `${currentDateStr}T23:59:59+07:00`)
          break
        case 'week':
          const weekStart = new Date(currentDate)
          weekStart.setDate(currentDate.getDate() - currentDate.getDay())
          const weekStartStr = weekStart.toISOString().split('T')[0]
          
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          const weekEndStr = weekEnd.toISOString().split('T')[0]
          
          query = query
            .gte('tanggal_pengeluaran', `${weekStartStr}T00:00:00+07:00`)
            .lte('tanggal_pengeluaran', `${weekEndStr}T23:59:59+07:00`)
          break
        case 'month':
          const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
          const monthStartStr = monthStart.toISOString().split('T')[0]
          
          const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
          const monthEndStr = monthEnd.toISOString().split('T')[0]
          
          query = query
            .gte('tanggal_pengeluaran', `${monthStartStr}T00:00:00+07:00`)
            .lte('tanggal_pengeluaran', `${monthEndStr}T23:59:59+07:00`)
          break
        case 'current_month':
          const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
          const currentMonthStartStr = currentMonthStart.toISOString().split('T')[0]
          
          const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
          const currentMonthEndStr = currentMonthEnd.toISOString().split('T')[0]
          
          query = query
            .gte('tanggal_pengeluaran', `${currentMonthStartStr}T00:00:00+07:00`)
            .lte('tanggal_pengeluaran', `${currentMonthEndStr}T23:59:59+07:00`)
          break
        case 'last_month':
          const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
          const lastMonthStartStr = lastMonthStart.toISOString().split('T')[0]
          
          const lastMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0)
          const lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0]
          
          query = query
            .gte('tanggal_pengeluaran', `${lastMonthStartStr}T00:00:00+07:00`)
            .lte('tanggal_pengeluaran', `${lastMonthEndStr}T23:59:59+07:00`)
          break
      }
    }

    // Apply ordering and pagination
    query = query
      .order('tanggal_pengeluaran', { ascending: false })
      .order('id_pengeluaran', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching pengeluaran data:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch pengeluaran data',
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
    console.error('Unexpected error in pengeluaran dashboard API:', error)
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