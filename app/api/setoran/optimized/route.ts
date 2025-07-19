import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    console.log('Setoran optimized API called')
    
    try {
      const { searchParams } = new URL(request.url)
      
      // Extract query parameters
      const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
      const search = searchParams.get('search') || ''
      const sortBy = searchParams.get('sortBy') || 'dibuat_pada'
      const sortOrder = searchParams.get('sortOrder') || 'desc'
      
      // Filter parameters
      const amountFrom = searchParams.get('amount_from')
      const amountTo = searchParams.get('amount_to')
      const penerima = searchParams.get('penerima')
      const dateFrom = searchParams.get('date_from')
      const dateTo = searchParams.get('date_to')
      
      console.log('Setoran query params:', {
        page, limit, search, sortBy, sortOrder,
        amountFrom, amountTo, penerima, dateFrom, dateTo
      })
      
      const offset = (page - 1) * limit
      
      // Build the base query
      let query = supabaseAdmin
        .from('setoran')
        .select(`
          id_setoran,
          total_setoran,
          penerima_setoran,
          dibuat_pada,
          diperbarui_pada
        `, { count: 'exact' })
      
      // Apply search filter
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`
        query = query.or(`penerima_setoran.ilike.${searchTerm}`)
      }
      
      // Apply penerima filter
      if (penerima && penerima !== 'all') {
        query = query.eq('penerima_setoran', penerima)
      }
      
      // Apply amount filters
      if (amountFrom) {
        query = query.gte('total_setoran', parseFloat(amountFrom))
      }
      
      if (amountTo) {
        query = query.lte('total_setoran', parseFloat(amountTo))
      }
      
      // Apply date filters
      if (dateFrom) {
        query = query.gte('dibuat_pada', dateFrom)
      }
      
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        query = query.lte('dibuat_pada', endDate.toISOString())
      }
      
      // Apply sorting
      const ascending = sortOrder === 'asc'
      if (sortBy === 'total_setoran') {
        query = query.order('total_setoran', { ascending })
      } else if (sortBy === 'penerima_setoran') {
        query = query.order('penerima_setoran', { ascending })
      } else if (sortBy === 'dibuat_pada') {
        query = query.order('dibuat_pada', { ascending })
      } else {
        query = query.order('dibuat_pada', { ascending: false })
      }
      
      // Apply pagination
      query = query.range(offset, offset + limit - 1)
      
      // Execute query
      const { data: setoranData, error: setoranError, count } = await query
      
      if (setoranError) {
        console.error('Setoran data query error:', setoranError)
        throw setoranError
      }
      
      const total = count || 0
      const totalPages = Math.ceil(total / limit)
      
      console.log('Setoran optimized response:', {
        dataCount: setoranData?.length || 0,
        total,
        totalPages,
        page,
        hasData: setoranData && setoranData.length > 0
      })
      
      return createSuccessResponse({
        data: setoranData || [],
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages
        },
        filters: {
          search,
          amount_from: amountFrom,
          amount_to: amountTo,
          penerima,
          date_from: dateFrom,
          date_to: dateTo
        },
        sorting: {
          sortBy,
          sortOrder
        }
      })
      
    } catch (error) {
      console.error('Setoran optimized API error:', error)
      return createErrorResponse('Gagal memuat data setoran', 500)
    }
  })
}