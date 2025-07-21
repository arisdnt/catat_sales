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
    
    // Get recent shipments for stores managed by this sales person
    const { data: shipments, error } = await supabase
      .from('pengiriman')
      .select(`
        id_pengiriman,
        tanggal_kirim,
        dibuat_pada,
        toko:id_toko (
          id_toko,
          nama_toko,
          kecamatan,
          kabupaten
        ),
        detail_pengiriman (
          jumlah_kirim,
          produk:id_produk (
            nama_produk,
            harga_satuan
          )
        )
      `)
      .eq('toko.id_sales', salesId)
      .order('tanggal_kirim', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching recent shipments:', error)
      return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 })
    }

    // Transform the data to include calculated totals
    const transformedShipments = shipments?.map(shipment => {
      const totalQuantity = shipment.detail_pengiriman?.reduce((sum, detail) => 
        sum + (detail.jumlah_kirim || 0), 0) || 0
      const totalValue = shipment.detail_pengiriman?.reduce((sum, detail) => 
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