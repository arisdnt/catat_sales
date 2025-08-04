import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentDateIndonesia, INDONESIA_TIMEZONE } from '@/lib/utils'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '30')
    const offset = (page - 1) * limit
    
    // Filter parameters
    const search = searchParams.get('search')
    const statusSetoran = searchParams.get('status_setoran')
    const dateRange = searchParams.get('date_range')
    const eventType = searchParams.get('event_type')

    // Calculate date range for summary function
    let startDate = '1900-01-01'
    const endDate = new Date().toISOString().split('T')[0]
    
    if (dateRange && dateRange !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      switch (dateRange) {
        case 'today':
          startDate = today.toISOString().split('T')[0]
          break
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          startDate = weekAgo.toISOString().split('T')[0]
          break
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          startDate = monthAgo.toISOString().split('T')[0]
          break
        case 'current_month':
          const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
          startDate = currentMonthStart.toISOString().split('T')[0]
          break
        case 'last_month':
          const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
          startDate = lastMonthStart.toISOString().split('T')[0]
          break
      }
    }

    // Get cash flow summary using database function
    const { data: summaryData, error: summaryError } = await supabase
      .rpc('get_cash_flow_summary', {
        start_date: startDate,
        end_date: endDate
      })

    if (summaryError) {
      console.error('Error fetching cash flow summary:', summaryError)
    }

    // Build the query - menggunakan view yang ada
    let query = supabase
      .from('v_setoran_dashboard')
      .select('*', { count: 'exact' })
      .order('waktu_setoran', { ascending: false })

    // Apply filters
    if (search && search.trim()) {
      // Build search conditions - use field names from view
      const searchConditions = [
        `penerima_setoran.ilike.%${search}%`,
        `description.ilike.%${search}%`
      ]
      
      // Only add id_setoran search if the search term is a valid number
      const searchNumber = parseInt(search)
      if (!isNaN(searchNumber) && searchNumber > 0) {
        searchConditions.push(`id_setoran.eq.${searchNumber}`)
      }
      
      query = query.or(searchConditions.join(','))
    }

    if (statusSetoran && statusSetoran !== 'all') {
      query = query.eq('status_setoran', statusSetoran)
    }

    if (eventType && eventType !== 'all') {
      // Handle the updated event types from the new view
      if (eventType === 'PEMBAYARAN_CASH') {
        query = query.eq('event_type', 'PEMBAYARAN_CASH')
      } else if (eventType === 'PEMBAYARAN_TRANSFER') {
        query = query.eq('event_type', 'PEMBAYARAN_TRANSFER')
      } else if (eventType === 'SETORAN') {
        query = query.eq('event_type', 'SETORAN')
      }
    }

    if (dateRange && dateRange !== 'all') {
      // Get current date in Indonesia timezone
      const todayStr = getCurrentDateIndonesia()
      const today = new Date(todayStr)
      
      switch (dateRange) {
        case 'today':
          query = query.gte('tanggal_setoran', todayStr)
          break
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          const weekAgoStr = new Intl.DateTimeFormat('sv-SE', {
            timeZone: INDONESIA_TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(weekAgo)
          query = query.gte('tanggal_setoran', weekAgoStr)
          break
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          const monthAgoStr = new Intl.DateTimeFormat('sv-SE', {
            timeZone: INDONESIA_TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(monthAgo)
          query = query.gte('tanggal_setoran', monthAgoStr)
          break
        case 'current_month':
          // From 1st of current month to end of current month (Indonesia timezone)
          const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
          const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0) // Last day of current month
          const currentMonthStartStr = new Intl.DateTimeFormat('sv-SE', {
            timeZone: INDONESIA_TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(currentMonthStart)
          const currentMonthEndStr = new Intl.DateTimeFormat('sv-SE', {
            timeZone: INDONESIA_TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(currentMonthEnd)
          query = query
            .gte('tanggal_setoran', currentMonthStartStr)
            .lte('tanggal_setoran', currentMonthEndStr)
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
            .gte('tanggal_setoran', lastMonthStartStr)
            .lte('tanggal_setoran', lastMonthEndStr)
          break
      }
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching setoran dashboard data:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch setoran dashboard data',
          details: error.message 
        }, 
        { status: 500 }
      )
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      success: true,
      data: {
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1
        },
        // Include accurate summary from database function
        summary: summaryData || {
          total_cash_in: 0,
          total_transfer_in: 0,
          total_setoran: 0,
          net_cash_flow: 0,
          total_cash_transactions: 0,
          total_transfer_transactions: 0,
          total_setoran_transactions: 0,
          total_events: 0
        }
      }
    })
  } catch (error: any) {
    console.error('Unexpected error in setoran dashboard API:', error)
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