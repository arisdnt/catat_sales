import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      // Get specific sales with aggregated data using direct queries
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          id_sales,
          nama_sales,
          nomor_telepon,
          status_aktif,
          dibuat_pada,
          diperbarui_pada
        `)
        .eq('id_sales', id)
        .single()

      if (salesError) {
        console.error('Error fetching sales data:', salesError)
        return NextResponse.json({ error: 'Failed to fetch sales data' }, { status: 500 })
      }

      // Get aggregated store stats
      const { data: storeStats } = await supabase
        .from('toko')
        .select('status_toko', { count: 'exact' })
        .eq('id_sales', id)

      // Get aggregated shipment stats
      const { data: shipmentStats } = await supabase
        .from('pengiriman')
        .select(`
          id_pengiriman,
          tanggal_kirim,
          detail_pengiriman!inner(jumlah_kirim),
          toko!inner(id_sales)
        `)
        .eq('toko.id_sales', id)

      // Get aggregated billing stats
      const { data: billingStats } = await supabase
        .from('penagihan')
        .select(`
          id_penagihan,
          total_uang_diterima,
          dibuat_pada,
          detail_penagihan(jumlah_terjual, jumlah_kembali),
          toko!inner(id_sales)
        `)
        .eq('toko.id_sales', id)

      // Calculate aggregated data
      const totalStores = storeStats?.length || 0
      const activeStores = storeStats?.filter(s => s.status_toko)?.length || 0
      const inactiveStores = totalStores - activeStores

      const totalShipments = shipmentStats?.length || 0
      const totalShippedItems = shipmentStats?.reduce((sum, s) => 
        sum + (s.detail_pengiriman?.reduce((dSum, d) => dSum + d.jumlah_kirim, 0) || 0), 0) || 0
      const lastShipmentDate = shipmentStats?.reduce((latest, s) => 
        !latest || s.tanggal_kirim > latest ? s.tanggal_kirim : latest, null) || null

      const totalBillings = billingStats?.length || 0
      const totalRevenue = billingStats?.reduce((sum, b) => sum + b.total_uang_diterima, 0) || 0
      const totalItemsSold = billingStats?.reduce((sum, b) => 
        sum + (b.detail_penagihan?.reduce((dSum, d) => dSum + d.jumlah_terjual, 0) || 0), 0) || 0
      const totalItemsReturned = billingStats?.reduce((sum, b) => 
        sum + (b.detail_penagihan?.reduce((dSum, d) => dSum + d.jumlah_kembali, 0) || 0), 0) || 0
      const lastBillingDate = billingStats?.reduce((latest, b) => 
        !latest || b.dibuat_pada > latest ? b.dibuat_pada : latest, null) || null

      const conversionRate = totalShippedItems > 0 ? 
        Math.round((totalItemsSold / totalShippedItems) * 100 * 100) / 100 : 0

      const result = {
        ...salesData,
        total_stores: totalStores,
        active_stores: activeStores,
        inactive_stores: inactiveStores,
        total_shipments: totalShipments,
        total_shipped_items: totalShippedItems,
        last_shipment_date: lastShipmentDate,
        total_billings: totalBillings,
        total_revenue: totalRevenue,
        total_items_sold: totalItemsSold,
        total_items_returned: totalItemsReturned,
        last_billing_date: lastBillingDate,
        conversion_rate: conversionRate
      }

      return NextResponse.json(result)
    } else {
      // Get all sales with basic data - aggregated stats will be calculated per request
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id_sales,
          nama_sales,
          nomor_telepon,
          status_aktif,
          dibuat_pada,
          diperbarui_pada
        `)
        .order('nama_sales')

      if (error) {
        console.error('Error fetching sales data:', error)
        return NextResponse.json({ error: 'Failed to fetch sales data' }, { status: 500 })
      }

      // For list view, we'll return basic data and let the frontend request detailed stats as needed
      return NextResponse.json(data || [])
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}