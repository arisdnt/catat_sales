import { createClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const salesId = parseInt(id)
    
    if (isNaN(salesId)) {
      return NextResponse.json({ error: 'Invalid sales ID' }, { status: 400 })
    }

    const supabase = createClient()
    
    // Get stores for this sales person (all stores, not just active ones to match materialized view logic)
    const { data: stores, error: storesError } = await supabase
      .from('toko')
      .select('id_toko, nama_toko, status_toko')
      .eq('id_sales', salesId)

    if (storesError) {
      console.error('Error fetching stores:', storesError)
      return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 })
    }

    const allStoreIds = stores?.map(store => store.id_toko) || []
    console.log(`Sales ${salesId} - Found ${allStoreIds.length} total stores (including inactive)`)

    // Get total revenue from penagihan (all stores)
    let totalRevenue = 0
    let revenueData = []
    
    if (allStoreIds.length > 0) {
      const { data: revenueResult, error: revenueError } = await supabase
        .from('penagihan')
        .select('total_uang_diterima, id_toko')
        .in('id_toko', allStoreIds)

      if (revenueError) {
        console.error('Error fetching revenue:', revenueError)
        return NextResponse.json({ error: 'Failed to fetch revenue' }, { status: 500 })
      }

      revenueData = revenueResult || []
      totalRevenue = revenueData.reduce((sum, payment) => sum + Number(payment.total_uang_diterima), 0)
    }

    // Get shipped items, sold items, and returned items (all stores to match materialized view)
    let totalStock = 0
    let totalShippedItems = 0
    let totalSoldItems = 0
    let totalReturnedItems = 0
    
    if (allStoreIds.length > 0) {
      // Get shipped items through pengiriman -> detail_pengiriman
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('pengiriman')
        .select(`
          id_pengiriman,
          detail_pengiriman (
            jumlah_kirim
          )
        `)
        .in('id_toko', allStoreIds)

      if (!shipmentError && shipmentData) {
        totalShippedItems = shipmentData.reduce((sum, shipment) => {
          const details = shipment.detail_pengiriman || []
          return sum + details.reduce((detailSum, detail) => detailSum + (detail.jumlah_kirim || 0), 0)
        }, 0)
      }

      // Get sold items and returned items through penagihan -> detail_penagihan
      const { data: billingData, error: billingError } = await supabase
        .from('penagihan')
        .select(`
          id_penagihan,
          detail_penagihan (
            jumlah_terjual,
            jumlah_kembali
          )
        `)
        .in('id_toko', allStoreIds)

      if (!billingError && billingData) {
        billingData.forEach(billing => {
          const details = billing.detail_penagihan || []
          details.forEach(detail => {
            totalSoldItems += detail.jumlah_terjual || 0
            totalReturnedItems += detail.jumlah_kembali || 0
          })
        })
      }

      // Correct formula: stok toko = terkirim - retur - terjual
      totalStock = Math.max(0, totalShippedItems - totalReturnedItems - totalSoldItems)
    }

    const stats = {
      total_stores: stores?.length || 0,
      total_revenue: totalRevenue,
      total_transactions: revenueData?.length || 0,
      total_stock: totalStock,
      total_shipped_items: totalShippedItems,
      total_sold_items: totalSoldItems,
      total_returned_items: totalReturnedItems,
      // Additional breakdown for debugging/verification
      calculation_breakdown: {
        shipped: totalShippedItems,
        sold: totalSoldItems, 
        returned: totalReturnedItems,
        formula: "shipped - returned - sold",
        result: totalStock
      }
    }

    const error = null

    if (error) {
      console.error('Error fetching sales stats:', error)
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    return NextResponse.json({ data: stats })
  } catch (error) {
    console.error('Error in sales stats API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}