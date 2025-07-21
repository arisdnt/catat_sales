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

    // Get recent payments with details
    const { data: payments, error } = await supabase
      .from('penagihan')
      .select(`
        id_penagihan,
        dibuat_pada,
        total_uang_diterima,
        metode_pembayaran,
        detail_penagihan(
          jumlah_terjual,
          jumlah_kembali,
          produk(
            nama_produk,
            harga_satuan
          )
        )
      `)
      .eq('id_toko', tokoId)
      .order('dibuat_pada', { ascending: false })
      .limit(limit)

    if (error) throw error

    // Transform data to include calculated values
    const transformedPayments = payments?.map(payment => {
      const totalQuantity = payment.detail_penagihan?.reduce((total: number, detail: any) => {
        return total + (detail.jumlah_terjual || 0)
      }, 0) || 0

      // Determine status based on payment method and amount
      let status = 'Completed'
      if (payment.metode_pembayaran === 'Transfer') {
        status = 'Transfer'
      } else if (payment.metode_pembayaran === 'Cash') {
        status = 'Cash'
      }

      return {
        id_penagihan: payment.id_penagihan,
        tanggal_tagih: payment.dibuat_pada,
        total_uang_diterima: payment.total_uang_diterima || 0,
        metode_pembayaran: payment.metode_pembayaran || 'Unknown',
        total_quantity: totalQuantity,
        status: status
      }
    }) || []

    return NextResponse.json({
      success: true,
      data: transformedPayments
    })

  } catch (error) {
    console.error('Error fetching recent payments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent payments' },
      { status: 500 }
    )
  }
}