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
    
    // Get recent payments from stores managed by this sales person
    const { data: payments, error } = await supabase
      .from('penagihan')
      .select(`
        id_penagihan,
        total_uang_diterima,
        metode_pembayaran,
        ada_potongan,
        dibuat_pada,
        toko:id_toko (
          id_toko,
          nama_toko,
          kecamatan,
          kabupaten,
          id_sales
        ),
        detail_penagihan (
          jumlah_terjual,
          jumlah_kembali,
          produk:id_produk (
            nama_produk,
            harga_satuan
          )
        )
      `)
      .eq('toko.id_sales', salesId)
      .order('dibuat_pada', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching recent payments:', error)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    // Transform the data to include calculated totals
    const transformedPayments = payments?.map(payment => {
      const totalQuantity = payment.detail_penagihan?.reduce((sum, detail) => 
        sum + (detail.jumlah_terjual || 0) + (detail.jumlah_kembali || 0), 0) || 0

      return {
        ...payment,
        total_quantity: totalQuantity
      }
    }) || []

    return NextResponse.json({ data: transformedPayments })
  } catch (error) {
    console.error('Error in sales recent payments API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}