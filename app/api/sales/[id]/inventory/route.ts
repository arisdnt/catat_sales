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
    
    // Get inventory summary across all stores managed by this sales person manually
    const { data: inventory, error } = await supabase
      .from('detail_pengiriman')
      .select(`
        jumlah_kirim,
        produk:id_produk (
          id_produk,
          nama_produk,
          harga_satuan
        ),
        pengiriman:id_pengiriman (
          toko:id_toko (
            id_sales,
            nama_toko
          )
        )
      `)
      .eq('pengiriman.toko.id_sales', salesId)

    if (error) {
      console.error('Error fetching inventory:', error)
      return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
    }

    // Group by product and sum quantities
    const inventoryMap = new Map()
    
    inventory?.forEach((item: any) => {
      if (!item.produk || !item.pengiriman?.toko) return
      
      const productId = item.produk.id_produk
      const existing = inventoryMap.get(productId)
      
      if (existing) {
        existing.total_quantity += item.jumlah_kirim || 0
      } else {
        inventoryMap.set(productId, {
          id_produk: productId,
          nama_produk: item.produk.nama_produk,
          harga_satuan: item.produk.harga_satuan,
          total_quantity: item.jumlah_kirim || 0
        })
      }
    })

    const inventoryArray = Array.from(inventoryMap.values())
    
    return NextResponse.json({ data: inventoryArray })
  } catch (error) {
    console.error('Error in sales inventory API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}