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
    
    // Get sales info
    const { data: salesInfo } = await supabase
      .from('sales')
      .select('id_sales, nama_sales, nomor_telepon, status_aktif')
      .eq('id_sales', salesId)
      .single()

    // Get stores managed by this sales
    const { data: stores } = await supabase
      .from('toko')
      .select('id_toko, nama_toko, kecamatan, kabupaten, status_toko')
      .eq('id_sales', salesId)

    // Get shipments count
    const { data: shipmentsCount } = await supabase
      .from('pengiriman')
      .select('id_pengiriman, toko:id_toko!inner(id_sales)', { count: 'exact', head: true })
      .eq('toko.id_sales', salesId)

    // Get payments count
    const { data: paymentsCount } = await supabase
      .from('penagihan')
      .select('id_penagihan, toko:id_toko!inner(id_sales)', { count: 'exact', head: true })
      .eq('toko.id_sales', salesId)

    // Get product shipments summary
    const { data: productShipments } = await supabase
      .from('detail_pengiriman')
      .select(`
        jumlah_kirim,
        produk:id_produk(nama_produk),
        pengiriman:id_pengiriman(toko:id_toko!inner(id_sales, nama_toko))
      `)
      .eq('pengiriman.toko.id_sales', salesId)

    // Get product sales summary
    const { data: productSales } = await supabase
      .from('detail_penagihan')
      .select(`
        jumlah_terjual,
        jumlah_kembali,
        produk:id_produk(nama_produk),
        penagihan:id_penagihan(toko:id_toko!inner(id_sales, nama_toko))
      `)
      .eq('penagihan.toko.id_sales', salesId)

    // Calculate summaries
    const productShippedMap = new Map()
    const productSoldMap = new Map()

    productShipments?.forEach((item: any) => {
      const productName = item.produk?.nama_produk
      if (productName) {
        productShippedMap.set(productName, (productShippedMap.get(productName) || 0) + (item.jumlah_kirim || 0))
      }
    })

    productSales?.forEach((item: any) => {
      const productName = item.produk?.nama_produk
      if (productName) {
        const existing = productSoldMap.get(productName) || { sold: 0, returned: 0 }
        existing.sold += item.jumlah_terjual || 0
        existing.returned += item.jumlah_kembali || 0
        productSoldMap.set(productName, existing)
      }
    })

    const debugInfo = {
      sales_info: salesInfo,
      stores: {
        count: stores?.length || 0,
        active_stores: stores?.filter(s => s.status_toko).length || 0,
        store_list: stores?.map(s => ({ id: s.id_toko, nama: s.nama_toko, status: s.status_toko })) || []
      },
      transactions: {
        total_shipments: shipmentsCount || 0,
        total_payments: paymentsCount || 0
      },
      inventory_analysis: {
        products_shipped: Object.fromEntries(productShippedMap),
        products_sold_returned: Object.fromEntries(productSoldMap),
        inventory_calculation: Array.from(productShippedMap.entries()).map(([product, shipped]) => {
          const salesData = productSoldMap.get(product) || { sold: 0, returned: 0 }
          return {
            product,
            shipped,
            sold: salesData.sold,
            returned: salesData.returned,
            remaining_inventory: shipped - salesData.sold - salesData.returned
          }
        })
      },
      raw_data_samples: {
        sample_shipments: productShipments?.slice(0, 3),
        sample_sales: productSales?.slice(0, 3)
      }
    }

    return NextResponse.json({ debug: debugInfo })
  } catch (error) {
    console.error('Error in sales debug API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}