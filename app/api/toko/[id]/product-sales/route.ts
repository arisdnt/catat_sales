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

    // Get billing data using explicit joins
    const { data: billings, error: billingsError } = await supabase
      .from('penagihan')
      .select('id_penagihan, dibuat_pada')
      .eq('id_toko', tokoId)

    if (billingsError) {
      console.error('Error fetching billings:', billingsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch billing data' },
        { status: 500 }
      )
    }

    if (!billings || billings.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    const billingIds = billings.map(b => b.id_penagihan)
    
    // Get billing details with product info
    const { data: salesData, error } = await supabase
      .from('detail_penagihan')
      .select(`
        jumlah_terjual,
        jumlah_kembali,
        id_penagihan,
        produk!inner(
          id_produk,
          nama_produk,
          harga_satuan
        )
      `)
      .in('id_penagihan', billingIds)

    if (error) {
      console.error('Error fetching product sales:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch product sales data' },
        { status: 500 }
      )
    }

    console.log('Raw product sales data:', JSON.stringify(salesData, null, 2))
    console.log('Billings data:', JSON.stringify(billings, null, 2))

    // Process sales data to get statistics per product
    const salesMap = new Map()
    
    // Create a map of billing ID to date for lookup
    const billingDateMap = new Map()
    billings.forEach(b => {
      billingDateMap.set(b.id_penagihan, b.dibuat_pada)
    })

    salesData?.forEach((item: any) => {
      // Add null checks
      if (!item.produk) {
        console.log('Skipping item with null produk:', item)
        return
      }

      const productId = item.produk.id_produk
      const productName = item.produk.nama_produk
      const quantity = item.jumlah_terjual || 0
      const price = item.produk.harga_satuan || 0
      const revenue = quantity * price
      const billingDate = billingDateMap.get(item.id_penagihan)
      
      if (!salesMap.has(productId)) {
        salesMap.set(productId, {
          id_produk: productId,
          nama_produk: productName,
          total_quantity_sold: 0,
          total_revenue: 0,
          total_transactions: 0,
          average_price: 0,
          last_sale: null
        })
      }
      
      const current = salesMap.get(productId)
      current.total_quantity_sold += quantity
      current.total_revenue += revenue
      current.total_transactions += 1
      current.average_price = current.total_revenue / current.total_quantity_sold
      
      if (billingDate && (!current.last_sale || new Date(billingDate) > new Date(current.last_sale))) {
        current.last_sale = billingDate
      }
    })

    const productSales = Array.from(salesMap.values())
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 10) // Top 10 products by revenue

    return NextResponse.json({
      success: true,
      data: productSales
    })

  } catch (error) {
    console.error('Error in product sales API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}