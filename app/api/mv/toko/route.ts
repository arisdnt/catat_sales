import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const sales_id = searchParams.get('sales_id')
    const search = searchParams.get('search')
    const kabupaten = searchParams.get('kabupaten')
    const kecamatan = searchParams.get('kecamatan')

    if (id) {
      // Get specific toko with aggregated data using direct queries
      const { data: tokoData, error: tokoError } = await supabase
        .from('toko')
        .select(`
          *,
          sales(id_sales, nama_sales)
        `)
        .eq('id_toko', id)
        .single()

      if (tokoError) {
        console.error('Error fetching toko data:', tokoError)
        return NextResponse.json({ error: 'Failed to fetch store data' }, { status: 500 })
      }

      // Get shipment aggregates for this toko
      const { data: shipmentAgg } = await supabase
        .from('pengiriman')
        .select(`
          detail_pengiriman(jumlah_kirim)
        `)
        .eq('id_toko', id)

      // Get billing aggregates for this toko
      const { data: billingAgg } = await supabase
        .from('penagihan')
        .select(`
          detail_penagihan(jumlah_terjual, jumlah_kembali)
        `)
        .eq('id_toko', id)

      // Calculate aggregated statistics
      const barangTerkirim = shipmentAgg?.reduce((sum, pengiriman) => 
        sum + (pengiriman.detail_pengiriman?.reduce((dSum, detail) => 
          dSum + detail.jumlah_kirim, 0) || 0), 0) || 0

      const barangTerbayar = billingAgg?.reduce((sum, penagihan) => 
        sum + (penagihan.detail_penagihan?.reduce((dSum, detail) => 
          dSum + (detail.jumlah_terjual - detail.jumlah_kembali), 0) || 0), 0) || 0

      const sisaStok = barangTerkirim - barangTerbayar

      const result = {
        id_toko: tokoData.id_toko,
        nama_toko: tokoData.nama_toko,
        id_sales: tokoData.id_sales,
        nama_sales: tokoData.sales?.nama_sales,
        kabupaten: tokoData.kabupaten,
        kecamatan: tokoData.kecamatan,
        no_telepon: tokoData.no_telepon,
        link_gmaps: tokoData.link_gmaps,
        status_toko: tokoData.status_toko,
        dibuat_pada: tokoData.dibuat_pada,
        diperbarui_pada: tokoData.diperbarui_pada,
        barang_terkirim: barangTerkirim,
        barang_terbayar: barangTerbayar,
        sisa_stok: sisaStok
      }

      return NextResponse.json(result)
    } else {
      // Get all toko with basic data and apply filters
      let query = supabase
        .from('toko')
        .select(`
          id_toko,
          nama_toko,
          id_sales,
          kabupaten,
          kecamatan,
          no_telepon,
          link_gmaps,
          status_toko,
          dibuat_pada,
          diperbarui_pada,
          sales(id_sales, nama_sales)
        `)

      // Apply filters
      if (sales_id) {
        query = query.eq('id_sales', sales_id)
      }
      if (search) {
        query = query.or(`nama_toko.ilike.%${search}%,sales.nama_sales.ilike.%${search}%`)
      }
      if (kabupaten) {
        query = query.eq('kabupaten', kabupaten)
      }
      if (kecamatan) {
        query = query.eq('kecamatan', kecamatan)
      }
      
      query = query.order('nama_toko')

      const { data, error } = await query

      if (error) {
        console.error('Error fetching toko data:', error)
        return NextResponse.json({ error: 'Failed to fetch store data' }, { status: 500 })
      }

      // Transform data to match expected format
      const transformedData = data?.map((toko: any) => ({
        id_toko: toko.id_toko,
        nama_toko: toko.nama_toko,
        id_sales: toko.id_sales,
        nama_sales: toko.sales?.nama_sales,
        kabupaten: toko.kabupaten,
        kecamatan: toko.kecamatan,
        no_telepon: toko.no_telepon,
        link_gmaps: toko.link_gmaps,
        status_toko: toko.status_toko,
        dibuat_pada: toko.dibuat_pada,
        diperbarui_pada: toko.diperbarui_pada,
        // Note: For list view, we don't calculate expensive aggregates
        // Frontend can request individual toko details for full stats
        barang_terkirim: 0,
        barang_terbayar: 0,
        sisa_stok: 0
      })) || []

      return NextResponse.json(transformedData)
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}