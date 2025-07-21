import { createClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const salesId = parseInt(id)
    
    if (isNaN(salesId)) {
      return NextResponse.json({ error: 'Invalid sales ID' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const supabase = createClient()
    
    // First get stores for this sales person
    const { data: stores, error: storesError } = await supabase
      .from('toko')
      .select('id_toko, nama_toko, kecamatan, kabupaten')
      .eq('id_sales', salesId)

    if (storesError) {
      console.error('Error fetching stores:', storesError)
      return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 })
    }

    const storeIds = stores?.map(store => store.id_toko) || []
    const storeMap = new Map(stores?.map(store => [store.id_toko, store]) || [])

    if (storeIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Get recent shipments for these stores
    const { data: shipments, error } = await supabase
      .from('pengiriman')
      .select(`
        id_pengiriman,
        id_toko,
        tanggal_kirim,
        dibuat_pada,
        detail_pengiriman (
          jumlah_kirim,
          produk:id_produk (
            nama_produk,
            harga_satuan
          )
        )
      `)
      .in('id_toko', storeIds)
      .order('tanggal_kirim', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching recent shipments:', error)
      return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 })
    }

    // Transform the data to include calculated totals
    const transformedShipments = shipments?.map((shipment: any) => {
      const totalQuantity = shipment.detail_pengiriman?.reduce((sum: number, detail: any) => 
        sum + (detail.jumlah_kirim || 0), 0) || 0
      const totalValue = shipment.detail_pengiriman?.reduce((sum: number, detail: any) => 
        sum + ((detail.jumlah_kirim || 0) * (detail.produk?.harga_satuan || 0)), 0) || 0

      return {
        ...shipment,
        total_quantity: totalQuantity,
        total_value: totalValue,
        status: 'Terkirim'
      }
    }) || []

    return NextResponse.json({ data: transformedShipments })
  } catch (error) {
    console.error('Error in sales recent shipments API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}