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
    
    // Get recent activities for the sales person manually since the function doesn't exist
    // We'll combine recent shipments and payments as activities
    
    // Get recent shipments
    const { data: shipments } = await supabase
      .from('pengiriman')
      .select(`
        id_pengiriman,
        tanggal_kirim,
        dibuat_pada,
        toko:id_toko (
          id_toko,
          nama_toko,
          id_sales
        )
      `)
      .eq('toko.id_sales', salesId)
      .order('dibuat_pada', { ascending: false })
      .limit(10)

    // Get recent payments
    const { data: payments } = await supabase
      .from('penagihan')
      .select(`
        id_penagihan,
        total_uang_diterima,
        metode_pembayaran,
        dibuat_pada,
        toko:id_toko (
          id_toko,
          nama_toko,
          id_sales
        )
      `)
      .eq('toko.id_sales', salesId)
      .order('dibuat_pada', { ascending: false })
      .limit(10)

    // Combine and format activities
    const activities = [
      ...(shipments || []).map(shipment => ({
        id: `shipment-${shipment.id_pengiriman}`,
        type: 'shipment',
        title: `Pengiriman ke ${shipment.toko?.nama_toko}`,
        description: `ID #${shipment.id_pengiriman}`,
        date: shipment.dibuat_pada,
        toko: shipment.toko
      })),
      ...(payments || []).map(payment => ({
        id: `payment-${payment.id_penagihan}`,
        type: 'payment',
        title: `Pembayaran dari ${payment.toko?.nama_toko}`,
        description: `${payment.metode_pembayaran} - ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(payment.total_uang_diterima))}`,
        date: payment.dibuat_pada,
        toko: payment.toko
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20)

    const error = null

    if (error) {
      console.error('Error fetching sales activities:', error)
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
    }

    return NextResponse.json({ data: activities || [] })
  } catch (error) {
    console.error('Error in sales activities API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}