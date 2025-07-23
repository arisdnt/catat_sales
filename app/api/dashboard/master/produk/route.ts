import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const status_produk = searchParams.get('status_produk') || ''
    const is_priority = searchParams.get('is_priority') || ''
    
    // Build query for v_master_produk view
    let query = supabase.from('v_master_produk').select('*')
    
    // Apply filters
    if (search) {
      query = query.ilike('nama_produk', `%${search}%`)
    }
    
    if (status_produk && status_produk !== 'all') {
      query = query.eq('status_produk', status_produk === 'true')
    }
    
    if (is_priority && is_priority !== 'all') {
      query = query.eq('is_priority', is_priority === 'true')
    }
    
    // Get total count for pagination with same filters
    let countQuery = supabase.from('v_master_produk').select('*', { count: 'exact', head: true })
    
    if (search) {
      countQuery = countQuery.ilike('nama_produk', `%${search}%`)
    }
    
    if (status_produk && status_produk !== 'all') {
      countQuery = countQuery.eq('status_produk', status_produk === 'true')
    }
    
    if (is_priority && is_priority !== 'all') {
      countQuery = countQuery.eq('is_priority', is_priority === 'true')
    }
    
    const { count: totalCount, error: countError } = await countQuery
    
    if (countError) {
      console.error('Error getting count:', countError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch produk count',
          details: countError.message 
        }, 
        { status: 500 }
      )
    }
    
    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1).order('nama_produk')
    
    const { data, error } = await query

    if (error) {
      console.error('Error fetching v_master_produk:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch produk data',
          details: error.message 
        }, 
        { status: 500 }
      )
    }

    const result = data || []
    
    // Transform data to add calculated fields that frontend expects
    const transformedData = result.map((produk: any) => ({
      ...produk,
      // Add calculated value fields
      nilai_total_dikirim: (produk.total_dikirim || 0) * (produk.harga_satuan || 0),
      nilai_total_terjual: (produk.total_terjual || 0) * (produk.harga_satuan || 0),
      nilai_total_dikembalikan: (produk.total_dikembalikan || 0) * (produk.harga_satuan || 0),
      // Add separate cash/transfer fields for compatibility
      total_dibayar_cash: produk.total_dibayar || 0,
      total_dibayar_transfer: 0, // Default to 0 if not available
      // Ensure priority_order has a default value
      priority_order: produk.priority_order || 0
    }))
    
    return NextResponse.json({
      success: true,
      data: {
        data: transformedData,
        pagination: {
          page: page,
          limit: limit,
          total: totalCount || 0,
          total_pages: Math.ceil((totalCount || 0) / limit),
          has_next: page * limit < (totalCount || 0),
          has_prev: page > 1
        }
      }
    })
  } catch (error: any) {
    console.error('Unexpected error in master produk API:', error)
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