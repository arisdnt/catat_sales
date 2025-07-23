import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

    // Build the query
    let query = supabase
      .from('v_setoran_dashboard')
      .select('*', { count: 'exact' })
      .order('waktu_setoran', { ascending: false })

    // Apply filters
    if (search && search.trim()) {
      // Build search conditions
      const searchConditions = [
        `penerima_setoran.ilike.%${search}%`
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
      query = query.eq('event_type', eventType)
    }

    if (dateRange && dateRange !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      switch (dateRange) {
        case 'today':
          query = query.gte('tanggal_setoran', today.toISOString().split('T')[0])
          break
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          query = query.gte('tanggal_setoran', weekAgo.toISOString().split('T')[0])
          break
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          query = query.gte('tanggal_setoran', monthAgo.toISOString().split('T')[0])
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