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

    // Get recent payments for these stores
    const { data: payments, error } = await supabase
      .from('penagihan')
      .select(`
        id_penagihan,
        id_toko,
        total_uang_diterima,
        metode_pembayaran,
        ada_potongan,
        dibuat_pada,
        detail_penagihan (
          jumlah_terjual,
          jumlah_kembali,
          produk:id_produk (
            nama_produk,
            harga_satuan
          )
        )
      `)
      .in('id_toko', storeIds)
      .order('dibuat_pada', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching recent payments:', error)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    // Transform the data to include calculated totals and store info
    const transformedPayments = payments?.map(payment => {
      const totalQuantity = payment.detail_penagihan?.reduce((sum, detail) => 
        sum + (detail.jumlah_terjual || 0) + (detail.jumlah_kembali || 0), 0) || 0

      const store = storeMap.get(payment.id_toko)

      return {
        ...payment,
        total_quantity: totalQuantity,
        toko: store ? {
          id_toko: store.id_toko,
          nama_toko: store.nama_toko,
          kecamatan: store.kecamatan,
          kabupaten: store.kabupaten
        } : null
      }
    }) || []

    return NextResponse.json({ data: transformedPayments })
  } catch (error) {
    console.error('Error in sales recent payments API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}