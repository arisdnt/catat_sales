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
    
    // First get stores for this sales person
    const { data: stores, error: storesError } = await supabase
      .from('toko')
      .select('id_toko, nama_toko')
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
    
    // Get recent activities for the sales person manually since the function doesn't exist
    // We'll combine recent shipments and payments as activities
    
    // Get recent shipments for these stores
    const { data: shipments } = await supabase
      .from('pengiriman')
      .select(`
        id_pengiriman,
        id_toko,
        tanggal_kirim,
        dibuat_pada
      `)
      .in('id_toko', storeIds)
      .order('dibuat_pada', { ascending: false })
      .limit(10)

    // Get recent payments for these stores
    const { data: payments } = await supabase
      .from('penagihan')
      .select(`
        id_penagihan,
        id_toko,
        total_uang_diterima,
        metode_pembayaran,
        dibuat_pada
      `)
      .in('id_toko', storeIds)
      .order('dibuat_pada', { ascending: false })
      .limit(10)

    // Combine and format activities with store info from map
    const activities = [
      ...(shipments || []).map((shipment: any) => {
        const store = storeMap.get(shipment.id_toko)
        return {
          id: `shipment-${shipment.id_pengiriman}`,
          type: 'shipment',
          title: `Pengiriman ke ${store?.nama_toko || 'Toko'}`,
          description: `ID #${shipment.id_pengiriman}`,
          date: shipment.dibuat_pada,
          toko: store ? {
            id_toko: store.id_toko,
            nama_toko: store.nama_toko
          } : null
        }
      }),
      ...(payments || []).map((payment: any) => {
        const store = storeMap.get(payment.id_toko)
        return {
          id: `payment-${payment.id_penagihan}`,
          type: 'payment',
          title: `Pembayaran dari ${store?.nama_toko || 'Toko'}`,
          description: `${payment.metode_pembayaran} - ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(payment.total_uang_diterima))}`,
          date: payment.dibuat_pada,
          toko: store ? {
            id_toko: store.id_toko,
            nama_toko: store.nama_toko
          } : null
        }
      })
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