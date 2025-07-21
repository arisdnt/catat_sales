import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

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

    const supabase = createClient()

    // Get inventory data using explicit joins with RPC or raw query approach
    // First, let's try a different approach - get data step by step
    const { data: shipments, error: shipmentsError } = await supabase
      .from('pengiriman')
      .select('id_pengiriman, tanggal_kirim')
      .eq('id_toko', tokoId)

    if (shipmentsError) {
      console.error('Error fetching shipments:', shipmentsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch shipment data' },
        { status: 500 }
      )
    }

    if (!shipments || shipments.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    const shipmentIds = shipments.map(s => s.id_pengiriman)
    
    // Get shipment details with product info
    const { data: inventoryData, error } = await supabase
      .from('detail_pengiriman')
      .select(`
        jumlah_kirim,
        id_pengiriman,
        produk!inner(
          id_produk,
          nama_produk,
          harga_satuan
        )
      `)
      .in('id_pengiriman', shipmentIds)

    if (error) {
      console.error('Error fetching inventory:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch inventory data' },
        { status: 500 }
      )
    }

    console.log('Raw inventory data:', JSON.stringify(inventoryData, null, 2))
    console.log('Shipments data:', JSON.stringify(shipments, null, 2))

    // Process inventory data to get current stock levels
    const inventoryMap = new Map()
    
    // Create a map of shipment ID to date for lookup
    const shipmentDateMap = new Map()
    shipments.forEach(s => {
      shipmentDateMap.set(s.id_pengiriman, s.tanggal_kirim)
    })

    inventoryData?.forEach((item: any) => {
      // Add null checks
      if (!item.produk) {
        console.log('Skipping item with null produk:', item)
        return
      }

      const productId = item.produk.id_produk
      const productName = item.produk.nama_produk
      const productPrice = item.produk.harga_satuan
      const shipmentDate = shipmentDateMap.get(item.id_pengiriman)
      
      if (!inventoryMap.has(productId)) {
        inventoryMap.set(productId, {
          id_produk: productId,
          nama_produk: productName,
          harga_satuan: productPrice,
          total_quantity: 0,
          last_shipment: null
        })
      }
      
      const current = inventoryMap.get(productId)
      current.total_quantity += item.jumlah_kirim || 0
      
      if (shipmentDate && (!current.last_shipment || new Date(shipmentDate) > new Date(current.last_shipment))) {
        current.last_shipment = shipmentDate
      }
    })

    const inventory = Array.from(inventoryMap.values())
      .sort((a, b) => b.total_quantity - a.total_quantity)

    return NextResponse.json({
      success: true,
      data: inventory
    })

  } catch (error) {
    console.error('Error in inventory API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}