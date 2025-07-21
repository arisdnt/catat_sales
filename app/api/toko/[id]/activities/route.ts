import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export interface TokoActivity {
  id: string
  type: 'pengiriman' | 'penagihan' | 'setoran'
  title: string
  description: string
  amount?: number
  date: string
  status?: string
  details?: any
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleApiRequest(request, async () => {
    const { id } = await params
    const tokoId = parseInt(id)

    if (isNaN(tokoId)) {
      return createErrorResponse('Invalid toko ID')
    }

    const activities: TokoActivity[] = []

    // Fetch pengiriman activities
    const { data: pengirimanData, error: pengirimanError } = await supabaseAdmin
      .from('pengiriman')
      .select(`
        id_pengiriman,
        tanggal_kirim,
        dibuat_pada,
        detail_pengiriman!inner(
          jumlah_kirim,
          produk(nama_produk, harga_satuan)
        )
      `)
      .eq('detail_pengiriman.id_toko', tokoId)
      .order('dibuat_pada', { ascending: false })
      .limit(15)

    if (!pengirimanError && pengirimanData) {
      pengirimanData.forEach((item: any) => {
        const totalItems = item.detail_pengiriman.reduce((sum: number, detail: any) => sum + detail.jumlah_kirim, 0)
        const totalValue = item.detail_pengiriman.reduce((sum: number, detail: any) => 
          sum + (detail.jumlah_kirim * detail.produk.harga_satuan), 0)
        
        activities.push({
          id: `pengiriman-${item.id_pengiriman}`,
          type: 'pengiriman',
          title: 'Pengiriman Barang',
          description: `${totalItems} item produk dikirim`,
          amount: totalValue,
          date: item.dibuat_pada,
          details: item.detail_pengiriman
        })
      })
    }

    // Fetch penagihan activities
    const { data: penagihanData, error: penagihanError } = await supabaseAdmin
      .from('penagihan')
      .select(`
        id_penagihan,
        total_uang_diterima,
        metode_pembayaran,
        ada_potongan,
        dibuat_pada,
        detail_penagihan(
          jumlah_terjual,
          jumlah_kembali,
          produk(nama_produk, harga_satuan)
        ),
        potongan_penagihan(
          jumlah_potongan,
          alasan
        )
      `)
      .eq('id_toko', tokoId)
      .order('dibuat_pada', { ascending: false })
      .limit(15)

    if (!penagihanError && penagihanData) {
      penagihanData.forEach((item: any) => {
        const totalSold = item.detail_penagihan?.reduce((sum: number, detail: any) => sum + detail.jumlah_terjual, 0) || 0
        const totalReturned = item.detail_penagihan?.reduce((sum: number, detail: any) => sum + detail.jumlah_kembali, 0) || 0
        
        activities.push({
          id: `penagihan-${item.id_penagihan}`,
          type: 'penagihan',
          title: 'Penagihan',
          description: `${totalSold} terjual, ${totalReturned} dikembalikan${item.ada_potongan ? ' (ada potongan)' : ''}`,
          amount: item.total_uang_diterima,
          date: item.dibuat_pada,
          status: item.metode_pembayaran,
          details: {
            detail_penagihan: item.detail_penagihan,
            potongan: item.potongan_penagihan
          }
        })
      })
    }

    // Fetch setoran activities (related to this toko through penagihan)
    const { data: setoranData, error: setoranError } = await supabaseAdmin
      .from('setoran')
      .select(`
        id_setoran,
        total_setoran,
        penerima_setoran,
        dibuat_pada
      `)
      .order('dibuat_pada', { ascending: false })
      .limit(10)

    if (!setoranError && setoranData) {
      setoranData.forEach((item: any) => {
        activities.push({
          id: `setoran-${item.id_setoran}`,
          type: 'setoran',
          title: 'Setoran Uang',
          description: `Setoran kepada ${item.penerima_setoran}`,
          amount: item.total_setoran,
          date: item.dibuat_pada,
          details: item
        })
      })
    }

    // Sort all activities by date and limit to 30
    const sortedActivities = activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30)

    return createSuccessResponse(sortedActivities)
  })
}