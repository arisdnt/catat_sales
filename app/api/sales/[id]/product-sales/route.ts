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
    
    // Get product sales statistics across all stores managed by this sales person manually
    const { data: productSales, error } = await supabase
      .from('detail_penagihan')
      .select(`
        jumlah_terjual,
        produk:id_produk (
          id_produk,
          nama_produk,
          harga_satuan
        ),
        penagihan:id_penagihan (
          total_uang_diterima,
          toko:id_toko (
            id_sales,
            nama_toko
          )
        )
      `)
      .eq('penagihan.toko.id_sales', salesId)

    if (error) {
      console.error('Error fetching product sales:', error)
      return NextResponse.json({ error: 'Failed to fetch product sales data' }, { status: 500 })
    }

    // Group by product and calculate statistics
    const productMap = new Map()
    
    productSales?.forEach((item: any) => {
      if (!item.produk || !item.penagihan?.toko) return
      
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