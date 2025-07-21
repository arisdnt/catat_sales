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
    
    if (isNaN(tokoId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid toko ID' },
        { status: 400 }
      )
    }

    // Get toko statistics
    const [pengirimanStats, penagihanStats, monthlyStats] = await Promise.all([
      // Total pengiriman dan nilai
      supabase
        .from('pengiriman')
        .select(`
          id_pengiriman,
          detail_pengiriman(
            jumlah_kirim,
            produk(harga_satuan)
          )
        `)
        .eq('id_toko', tokoId),
      
      // Total penagihan dan nilai
      supabase
        .from('penagihan')
        .select('total_uang_diterima, dibuat_pada')
        .eq('id_toko', tokoId),
      
      // Stats bulan ini
      supabase
        .from('pengiriman')
        .select('id_pengiriman, tanggal_kirim')
        .eq('id_toko', tokoId)
        .gte('tanggal_kirim', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
    ])

    if (pengirimanStats.error) throw pengirimanStats.error
    if (penagihanStats.error) throw penagihanStats.error
    if (monthlyStats.error) throw monthlyStats.error

    // Calculate total pengiriman value
    const totalNilaiPengiriman = pengirimanStats.data?.reduce((total, pengiriman) => {
      const nilaiPengiriman = pengiriman.detail_pengiriman?.reduce((subtotal: number, detail: any) => {
        return subtotal + (detail.jumlah_kirim * (detail.produk?.harga_satuan || 0))
      }, 0) || 0
      return total + nilaiPengiriman
    }, 0) || 0

    // Calculate total penagihan value
    const totalNilaiPenagihan = penagihanStats.data?.reduce((total, penagihan) => {
      return total + (penagihan.total_uang_diterima || 0)
    }, 0) || 0

    // Get penagihan bulan ini
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const penagihanBulanIni = penagihanStats.data?.filter(penagihan => {
      const date = new Date(penagihan.dibuat_pada)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    }).length || 0

    // Calculate average pengiriman per month - use a more generic approach since we may not have tanggal_kirim
    const rataRataPengiriman = pengirimanStats.data?.length ? 
      Math.max(1, Math.round(pengirimanStats.data.length / Math.max(1, 3))) : 0 // Simple average over estimated 3 months

    // Get last activity
    const { data: lastActivity } = await supabase
      .from('pengiriman')
      .select('tanggal_kirim')
      .eq('id_toko', tokoId)
      .order('tanggal_kirim', { ascending: false })
      .limit(1)
      .single()

    const stats = {
      total_pengiriman: pengirimanStats.data?.length || 0,
      total_penagihan: penagihanStats.data?.length || 0,
      total_transactions: penagihanStats.data?.length || 0, // Total transactions for frontend
      total_revenue: totalNilaiPenagihan, // Total revenue for frontend
      total_nilai_pengiriman: totalNilaiPengiriman,
      total_nilai_penagihan: totalNilaiPenagihan,
      pengiriman_bulan_ini: monthlyStats.data?.length || 0,
      penagihan_bulan_ini: penagihanBulanIni,
      rata_rata_pengiriman: rataRataPengiriman,
      last_activity: lastActivity?.tanggal_kirim || null
    }

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Error fetching toko stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch toko statistics' },
      { status: 500 }
    )
  }
}