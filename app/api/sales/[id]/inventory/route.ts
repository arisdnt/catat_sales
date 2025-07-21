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
      .select('id_toko, nama_toko, kecamatan, kabupaten')
      .eq('id_sales', salesId)

    if (storesError) {
      console.error('Error fetching stores:', storesError)
      return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 })
    }

    const storeIds = stores?.map(store => store.id_toko) || []
    console.log(`Sales ${salesId} - Found ${storeIds.length} stores:`, storeIds)

    if (storeIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Get comprehensive inventory calculation: shipments - sales - returns
    // Get all shipments for these stores
    const { data: shipments, error: shipmentsError } = await supabase
      .from('detail_pengiriman')
      .select(`
        jumlah_kirim,
        produk:id_produk (
          id_produk,
          nama_produk,
          harga_satuan
        ),
        pengiriman:id_pengiriman (
          id_toko
        )
      `)
      .in('pengiriman.id_toko', storeIds)

    if (shipmentsError) {
      console.error('Error fetching shipments:', shipmentsError)
      return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 })
    }

    console.log(`Sales ${salesId} - Found ${shipments?.length || 0} shipment records`)
    console.log('Sample shipment data:', shipments?.slice(0, 2))

    // Get all sales and returns for these stores
    const { data: sales, error: salesError } = await supabase
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
          id_toko
        )
      `)
      .in('penagihan.id_toko', storeIds)

    if (salesError) {
      console.error('Error fetching sales:', salesError)
      // Don't fail if sales data is missing - still show shipped inventory
      console.log(`Sales ${salesId} - No sales data found, showing shipments only`)
    } else {
      console.log(`Sales ${salesId} - Found ${sales?.length || 0} sales records`)
      console.log('Sample sales data:', sales?.slice(0, 2))
    }

    // Calculate actual inventory: shipped - sold - returned
    const inventoryMap = new Map()
    
    // Add shipped quantities
    console.log('Processing shipments...')
    let validShipmentCount = 0
    let invalidShipmentCount = 0
    
    shipments?.forEach((item: any) => {
      if (!item.produk || !item.pengiriman) {
        invalidShipmentCount++
        if (invalidShipmentCount <= 3) { // Only log first 3 invalid items to avoid spam
          console.log('Invalid shipment item:', { 
            has_produk: !!item.produk, 
            has_pengiriman: !!item.pengiriman,
            sample_item: JSON.stringify(item).substring(0, 200)
          })
        }
        return
      }
      validShipmentCount++
      
      const productId = item.produk.id_produk
      const existing = inventoryMap.get(productId)
      
      if (existing) {
        existing.shipped_quantity += item.jumlah_kirim || 0
      } else {
        inventoryMap.set(productId, {
          id_produk: productId,
          nama_produk: item.produk.nama_produk,
          harga_satuan: item.produk.harga_satuan,
          shipped_quantity: item.jumlah_kirim || 0,
          sold_quantity: 0,
          returned_quantity: 0,
          total_quantity: 0
        })
      }
    })
    
    console.log(`Processed shipments: ${validShipmentCount} valid, ${invalidShipmentCount} invalid`)
    console.log('Inventory map size after shipments:', inventoryMap.size)

    // Subtract sold and returned quantities (only if sales data exists)
    if (sales && !salesError) {
      sales.forEach((item: any) => {
        if (!item.produk || !item.penagihan) return
        
        const productId = item.produk.id_produk
        const existing = inventoryMap.get(productId)
        
        if (existing) {
          existing.sold_quantity += item.jumlah_terjual || 0
          existing.returned_quantity += item.jumlah_kembali || 0
        } else {
          // Product was sold but never shipped (data inconsistency)
          inventoryMap.set(productId, {
            id_produk: productId,
            nama_produk: item.produk.nama_produk,
            harga_satuan: item.produk.harga_satuan,
            shipped_quantity: 0,
            sold_quantity: item.jumlah_terjual || 0,
            returned_quantity: item.jumlah_kembali || 0,
            total_quantity: 0
          })
        }
      })
    }

    // Calculate final inventory and add debug info
    inventoryMap.forEach((item) => {
      item.total_quantity = item.shipped_quantity - item.sold_quantity - item.returned_quantity
    })

    // For sales inventory summary, show all products that were shipped (not just remaining stock)
    // This gives a complete picture of what the sales person manages
    const inventoryArray = Array.from(inventoryMap.values())
      .filter(item => item.shipped_quantity > 0) // Show all products that were ever shipped
      .sort((a, b) => {
        // Sort by remaining inventory (desc), then by total shipped (desc)
        if (b.total_quantity !== a.total_quantity) {
          return b.total_quantity - a.total_quantity
        }
        return b.shipped_quantity - a.shipped_quantity
      })

    // Add debug logging for troubleshooting
    console.log(`Sales ${salesId} inventory summary:`, {
      total_products: inventoryArray.length,
      products_with_remaining_stock: inventoryArray.filter(item => item.total_quantity > 0).length,
      sample_data: inventoryArray.slice(0, 3)
    })
    
    return NextResponse.json({ data: inventoryArray })
  } catch (error) {
    console.error('Error in sales inventory API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}