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
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (id) {
      // Get specific pengiriman with aggregated data using direct queries
      const { data: pengirimanData, error: pengirimanError } = await supabase
        .from('pengiriman')
        .select(`
          *,
          toko(
            id_toko,
            nama_toko,
            kecamatan,
            kabupaten,
            link_gmaps,
            sales(id_sales, nama_sales, nomor_telepon)
          )
        `)
        .eq('id_pengiriman', id)
        .single()

      if (pengirimanError) {
        console.error('Error fetching pengiriman data:', pengirimanError)
        return NextResponse.json({ error: 'Failed to fetch shipment data' }, { status: 500 })
      }

      // Get detailed pengiriman data
      const { data: detailData } = await supabase
        .from('detail_pengiriman')
        .select(`
          *,
          produk(nama_produk, harga_satuan)
        `)
        .eq('id_pengiriman', id)

      // Calculate aggregated data
      const totalQuantity = detailData?.reduce((sum, detail) => sum + detail.jumlah_kirim, 0) || 0
      const totalProducts = detailData?.length || 0
      const detailPengiriman = detailData?.map(detail => ({
        id_produk: detail.id_produk,
        nama_produk: detail.produk?.nama_produk,
        jumlah_kirim: detail.jumlah_kirim,
        harga_satuan: detail.produk?.harga_satuan
      })) || []

      const result = {
        id_pengiriman: pengirimanData.id_pengiriman,
        tanggal_kirim: pengirimanData.tanggal_kirim,
        dibuat_pada: pengirimanData.dibuat_pada,
        diperbarui_pada: pengirimanData.diperbarui_pada,
        id_toko: pengirimanData.toko?.id_toko,
        nama_toko: pengirimanData.toko?.nama_toko,
        kecamatan: pengirimanData.toko?.kecamatan,
        kabupaten: pengirimanData.toko?.kabupaten,
        link_gmaps: pengirimanData.toko?.link_gmaps,
        id_sales: pengirimanData.toko?.sales?.id_sales,
        nama_sales: pengirimanData.toko?.sales?.nama_sales,
        nomor_telepon: pengirimanData.toko?.sales?.nomor_telepon,
        total_quantity: totalQuantity,
        total_products: totalProducts,
        detail_pengiriman: detailPengiriman,
        tanggal_kirim_date: pengirimanData.tanggal_kirim,
        tahun: new Date(pengirimanData.tanggal_kirim).getFullYear(),
        bulan: new Date(pengirimanData.tanggal_kirim).getMonth() + 1,
        minggu: Math.ceil(new Date(pengirimanData.tanggal_kirim).getDate() / 7)
      }

      return NextResponse.json(result)
    } else {
      // Get multiple pengiriman with basic data and apply filters
      let query = supabase
        .from('pengiriman')
        .select(`
          id_pengiriman,
          tanggal_kirim,
          dibuat_pada,
          diperbarui_pada,
          toko(
            id_toko,
            nama_toko,
            kecamatan,
            kabupaten,
            link_gmaps,
            id_sales,
            sales(id_sales, nama_sales, nomor_telepon)
          )
        `)

      // Apply filters
      if (sales_id) {
        query = query.eq('toko.id_sales', sales_id)
      }
      if (kabupaten) {
        query = query.eq('toko.kabupaten', kabupaten)
      }
      if (kecamatan) {
        query = query.eq('toko.kecamatan', kecamatan)
      }
      if (startDate) {
        query = query.gte('tanggal_kirim', startDate)
      }
      if (endDate) {
        query = query.lte('tanggal_kirim', endDate)
      }
      if (search) {
        query = query.or(`toko.nama_toko.ilike.%${search}%,toko.sales.nama_sales.ilike.%${search}%`)
      }

      query = query.order('tanggal_kirim', { ascending: false })

      const { data, error } = await query

      if (error) {
        console.error('Error fetching pengiriman data:', error)
        return NextResponse.json({ error: 'Failed to fetch shipment data' }, { status: 500 })
      }

      // Transform data to match expected format
      const transformedData = data?.map((pengiriman: any) => ({
        id_pengiriman: pengiriman.id_pengiriman,
        tanggal_kirim: pengiriman.tanggal_kirim,
        dibuat_pada: pengiriman.dibuat_pada,
        diperbarui_pada: pengiriman.diperbarui_pada,
        id_toko: pengiriman.toko?.id_toko,
        nama_toko: pengiriman.toko?.nama_toko,
        kecamatan: pengiriman.toko?.kecamatan,
        kabupaten: pengiriman.toko?.kabupaten,
        link_gmaps: pengiriman.toko?.link_gmaps,
        id_sales: pengiriman.toko?.sales?.[0]?.id_sales,
        nama_sales: pengiriman.toko?.sales?.[0]?.nama_sales,
        nomor_telepon: pengiriman.toko?.sales?.[0]?.nomor_telepon,
        // Note: For list view, detailed aggregates are calculated on demand
        total_quantity: 0,
        total_products: 0,
        detail_pengiriman: [],
        tanggal_kirim_date: pengiriman.tanggal_kirim,
        tahun: new Date(pengiriman.tanggal_kirim).getFullYear(),
        bulan: new Date(pengiriman.tanggal_kirim).getMonth() + 1,
        minggu: Math.ceil(new Date(pengiriman.tanggal_kirim).getDate() / 7)
      })) || []

      return NextResponse.json(transformedData)
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}