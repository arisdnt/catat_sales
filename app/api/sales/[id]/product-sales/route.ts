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

    if (storeIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Get product sales statistics across all stores managed by this sales person
    const { data: productSales, error } = await supabase
      .from('detail_penagihan')
      .select(`
        jumlah_terjual,
        jumlah_kembali,
        produk:id_produk (
          id_produk,
          nama_produk,
          harga_satuan
        ),
        penagihan:id_penagihan (
          id_toko,
          total_uang_diterima
        )
      `)
      .in('penagihan.id_toko', storeIds)

    if (error) {
      console.error('Error fetching product sales:', error)
      return NextResponse.json({ error: 'Failed to fetch product sales data' }, { status: 500 })
    }

    // Group by product and calculate statistics
    const productMap = new Map()
    
    productSales?.forEach((item: any) => {
      if (!item.produk || !item.penagihan) return
      
      const productId = item.produk.id_produk
      const existing = productMap.get(productId)
      const revenue = (item.jumlah_terjual || 0) * (item.produk.harga_satuan || 0)
      
      if (existing) {
        existing.total_quantity_sold += item.jumlah_terjual || 0
        existing.total_transactions += 1
        existing.total_revenue += revenue
      } else {
        productMap.set(productId, {
          id_produk: productId,
          nama_produk: item.produk.nama_produk,
          harga_satuan: item.produk.harga_satuan,
          total_quantity_sold: item.jumlah_terjual || 0,
          total_transactions: 1,
          total_revenue: revenue
        })
      }
    })

    const productSalesArray = Array.from(productMap.values())
      .sort((a, b) => b.total_revenue - a.total_revenue) // Sort by revenue desc

    return NextResponse.json({ data: productSalesArray })
  } catch (error) {
    console.error('Error in sales product sales API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}