import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date_range = searchParams.get('date_range') || 'all'
    const search = searchParams.get('search') || ''
    const status_produk = searchParams.get('status_produk') || 'all'
    const is_priority = searchParams.get('is_priority') || 'all'

    // Build base query for statistics
    let statsQuery = supabase.from('v_master_produk').select('*')

    // Apply search filter
    if (search) {
      statsQuery = statsQuery.ilike('nama_produk', `%${search}%`)
    }

    // Apply status filter
    if (status_produk !== 'all') {
      const statusValue = status_produk === 'active'
      statsQuery = statsQuery.eq('status_produk', statusValue)
    }

    // Apply priority filter
    if (is_priority !== 'all') {
      const priorityValue = is_priority === 'priority'
      statsQuery = statsQuery.eq('is_priority', priorityValue)
    }

    // Apply date range filter based on transaction dates
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
          statsQuery = statsQuery.in('id_produk', allTransactionProductIds)
        } else {
          // No products with transactions in this range, return empty stats
          return NextResponse.json({
            success: true,
            data: {
              total_produk: 0,
              produk_aktif: 0,
              produk_priority: 0,
              total_dikirim: 0,
              total_terjual: 0,
              total_dikembalikan: 0,
              sisa_stok_total: 0,
              nilai_total_dikirim: 0,
              nilai_total_terjual: 0,
              nilai_total_dikembalikan: 0,
              total_dibayar: 0
            }
          })
        }
      }
    }

    // Execute the query to get filtered products
    const { data: products, error } = await statsQuery

    if (error) {
      console.error('Error fetching produk stats:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch produk statistics',
          details: error.message 
        }, 
        { status: 500 }
      )
    }

    // Calculate statistics from the filtered products
    const stats = {
      total_produk: products?.length || 0,
      produk_aktif: products?.filter(p => p.status_produk).length || 0,
      produk_priority: products?.filter(p => p.is_priority).length || 0,
      total_dikirim: products?.reduce((sum, p) => sum + (p.total_dikirim || 0), 0) || 0,
      total_terjual: products?.reduce((sum, p) => sum + (p.total_terjual || 0), 0) || 0,
      total_dikembalikan: products?.reduce((sum, p) => sum + (p.total_dikembalikan || 0), 0) || 0,
      sisa_stok_total: products?.reduce((sum, p) => sum + (p.stok_di_toko || 0), 0) || 0,
      nilai_total_dikirim: products?.reduce((sum, p) => sum + ((p.total_dikirim || 0) * (p.harga_satuan || 0)), 0) || 0,
      nilai_total_terjual: products?.reduce((sum, p) => sum + ((p.total_terjual || 0) * (p.harga_satuan || 0)), 0) || 0,
      nilai_total_dikembalikan: products?.reduce((sum, p) => sum + ((p.total_dikembalikan || 0) * (p.harga_satuan || 0)), 0) || 0,
      total_dibayar: products?.reduce((sum, p) => sum + (p.total_dibayar || 0), 0) || 0
    }

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Error in produk stats API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}