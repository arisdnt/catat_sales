import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tokoId = parseInt(id)
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    
    if (isNaN(tokoId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid toko ID' },
        { status: 400 }
      )
    }

    // Get recent shipments with details
    const { data: shipments, error } = await supabase
      .from('pengiriman')
      .select(`
        id_pengiriman,
        tanggal_kirim,
        is_autorestock,
        detail_pengiriman(
          jumlah_kirim,
          produk(
            nama_produk,
            harga_satuan
          )
        )
      `)
      .eq('id_toko', tokoId)
      .order('tanggal_kirim', { ascending: false })
      .limit(limit)

    if (error) throw error

    // Transform data to include calculated values
    const transformedShipments = shipments?.map(shipment => {
      const totalQuantity = shipment.detail_pengiriman?.reduce((total: number, detail: any) => {
        return total + (detail.jumlah_kirim || 0)
      }, 0) || 0

      const totalValue = shipment.detail_pengiriman?.reduce((total: number, detail: any) => {
        return total + ((detail.jumlah_kirim || 0) * (detail.produk?.harga_satuan || 0))
      }, 0) || 0

      // Check if there's a corresponding penagihan (payment) for this shipment
      // This is a simplified status - in real implementation you might want to check actual payment status
      const status = shipment.is_autorestock ? 'Auto Restock' : 'Manual'

      return {
        id_pengiriman: shipment.id_pengiriman,
        tanggal_kirim: shipment.tanggal_kirim,
        total_quantity: totalQuantity,
        total_value: totalValue,
        is_autorestock: shipment.is_autorestock || false,
        status: status
      }
    }) || []

    return NextResponse.json({
      success: true,
      data: transformedShipments
    })

  } catch (error) {
    console.error('Error fetching recent shipments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent shipments' },
      { status: 500 }
    )
  }
}