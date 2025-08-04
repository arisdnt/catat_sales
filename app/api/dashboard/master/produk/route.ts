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
    const date_range = searchParams.get('date_range') || 'all'
    
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
    
    // Apply date range filter based on transaction dates (pengiriman or penagihan)
    if (date_range && date_range !== 'all') {
      const today = new Date()
      const indonesiaTime = new Date(today.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}))
      
      let startDate: Date
      let endDate: Date
      
      switch (date_range) {
        case 'today':
          startDate = new Date(indonesiaTime)
          startDate.setHours(0, 0, 0, 0)
          endDate = new Date(indonesiaTime)
          endDate.setHours(23, 59, 59, 999)
          break
        case 'last_7_days':
          endDate = new Date(indonesiaTime)
          endDate.setHours(23, 59, 59, 999)
          startDate = new Date(endDate)
          startDate.setDate(startDate.getDate() - 6)
          startDate.setHours(0, 0, 0, 0)
          break
        case 'last_30_days':
          endDate = new Date(indonesiaTime)
          endDate.setHours(23, 59, 59, 999)
          startDate = new Date(endDate)
          startDate.setDate(startDate.getDate() - 29)
          startDate.setHours(0, 0, 0, 0)
          break
        case 'current_month':
          startDate = new Date(indonesiaTime.getFullYear(), indonesiaTime.getMonth(), 1)
          endDate = new Date(indonesiaTime.getFullYear(), indonesiaTime.getMonth() + 1, 0, 23, 59, 59, 999)
          break
        case 'last_month':
          startDate = new Date(indonesiaTime.getFullYear(), indonesiaTime.getMonth() - 1, 1)
          endDate = new Date(indonesiaTime.getFullYear(), indonesiaTime.getMonth(), 0, 23, 59, 59, 999)
          break
        default:
          startDate = endDate = new Date()
      }
      
      if (startDate && endDate) {
        // Filter products that have transactions (pengiriman or penagihan) within the date range
        const startDateStr = startDate.toISOString().split('T')[0]
        const endDateStr = endDate.toISOString().split('T')[0]
        
        // Get product IDs from pengiriman (shipment) transactions
        const { data: pengirimanProducts } = await supabase
          .from('detail_pengiriman')
          .select('id_produk, pengiriman!inner(tanggal_kirim)')
          .gte('pengiriman.tanggal_kirim', startDateStr)
          .lte('pengiriman.tanggal_kirim', endDateStr)
        
        // Get product IDs from penagihan (billing) transactions
        const { data: penagihanProducts } = await supabase
          .from('detail_penagihan')
          .select('id_produk, penagihan!inner(tanggal_tagih)')
          .gte('penagihan.tanggal_tagih', startDateStr)
          .lte('penagihan.tanggal_tagih', endDateStr)
        
        // Combine product IDs from both transaction types
        const pengirimanIds = pengirimanProducts?.map(p => p.id_produk) || []
        const penagihanIds = penagihanProducts?.map(p => p.id_produk) || []
        const allTransactionProductIds = [...new Set([...pengirimanIds, ...penagihanIds])]
        
        if (allTransactionProductIds.length > 0) {
          query = query.in('id_produk', allTransactionProductIds)
        } else {
          // No products with transactions in this range, return empty result
          query = query.eq('id_produk', -1) // This will return no results
        }
      }
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
    
    // Apply same date range filter to count query based on transaction dates
    if (date_range && date_range !== 'all') {
      const today = new Date()
      const indonesiaTime = new Date(today.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}))
      
      let startDate: Date
      let endDate: Date
      
      switch (date_range) {
        case 'today':
          startDate = new Date(indonesiaTime)
          startDate.setHours(0, 0, 0, 0)
          endDate = new Date(indonesiaTime)
          endDate.setHours(23, 59, 59, 999)
          break
        case 'last_7_days':
          endDate = new Date(indonesiaTime)
          endDate.setHours(23, 59, 59, 999)
          startDate = new Date(endDate)
          startDate.setDate(startDate.getDate() - 6)
          startDate.setHours(0, 0, 0, 0)
          break
        case 'last_30_days':
          endDate = new Date(indonesiaTime)
          endDate.setHours(23, 59, 59, 999)
          startDate = new Date(endDate)
          startDate.setDate(startDate.getDate() - 29)
          startDate.setHours(0, 0, 0, 0)
          break
        case 'current_month':
          startDate = new Date(indonesiaTime.getFullYear(), indonesiaTime.getMonth(), 1)
          endDate = new Date(indonesiaTime.getFullYear(), indonesiaTime.getMonth() + 1, 0, 23, 59, 59, 999)
          break
        case 'last_month':
          startDate = new Date(indonesiaTime.getFullYear(), indonesiaTime.getMonth() - 1, 1)
          endDate = new Date(indonesiaTime.getFullYear(), indonesiaTime.getMonth(), 0, 23, 59, 59, 999)
          break
        default:
          startDate = endDate = new Date()
      }
      
      if (startDate && endDate) {
        // Filter products that have transactions (pengiriman or penagihan) within the date range for count
        const startDateStr = startDate.toISOString().split('T')[0]
        const endDateStr = endDate.toISOString().split('T')[0]
        
        // Get product IDs from pengiriman (shipment) transactions
        const { data: pengirimanProductsCount } = await supabase
          .from('detail_pengiriman')
          .select('id_produk, pengiriman!inner(tanggal_kirim)')
          .gte('pengiriman.tanggal_kirim', startDateStr)
          .lte('pengiriman.tanggal_kirim', endDateStr)
        
        // Get product IDs from penagihan (billing) transactions
        const { data: penagihanProductsCount } = await supabase
          .from('detail_penagihan')
          .select('id_produk, penagihan!inner(tanggal_tagih)')
          .gte('penagihan.tanggal_tagih', startDateStr)
          .lte('penagihan.tanggal_tagih', endDateStr)
        
        // Combine product IDs from both transaction types
        const pengirimanIdsCount = pengirimanProductsCount?.map(p => p.id_produk) || []
        const penagihanIdsCount = penagihanProductsCount?.map(p => p.id_produk) || []
        const allTransactionProductIdsCount = [...new Set([...pengirimanIdsCount, ...penagihanIdsCount])]
        
        if (allTransactionProductIdsCount.length > 0) {
          countQuery = countQuery.in('id_produk', allTransactionProductIdsCount)
        } else {
          // No products with transactions in this range, return empty result
          countQuery = countQuery.eq('id_produk', -1) // This will return no results
        }
      }
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