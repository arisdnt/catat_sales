import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get sales statistics with store count, total shipped items, and total revenue
    const { data: salesStats, error } = await supabase
      .from('sales')
      .select(`
        id_sales,
        nama_sales,
        toko!inner(id_toko, pengiriman(id_pengiriman, detail_pengiriman(jumlah_kirim)), penagihan(total_uang_diterima))
      `)
    
    if (error) {
      console.error('Error fetching sales statistics:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch sales statistics' },
        { status: 500 }
      )
    }

    // Process the data to calculate statistics
    const processedStats = salesStats?.map(sales => {
      const stores = sales.toko || []
      const totalStores = stores.length
      
      let totalShippedItems = 0
      let totalRevenue = 0
      
      stores.forEach(store => {
        // Calculate total shipped items
        store.pengiriman?.forEach(pengiriman => {
          pengiriman.detail_pengiriman?.forEach(detail => {
            totalShippedItems += detail.jumlah_kirim || 0
          })
        })
        
        // Calculate total revenue
        store.penagihan?.forEach(penagihan => {
          totalRevenue += penagihan.total_uang_diterima || 0
        })
      })
      
      return {
        id_sales: sales.id_sales,
        nama_sales: sales.nama_sales,
        total_stores: totalStores,
        total_shipped_items: totalShippedItems,
        total_revenue: totalRevenue
      }
    }) || []

    return NextResponse.json(
      { 
        success: true, 
        data: processedStats 
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      }
    )
  } catch (error) {
    console.error('Sales statistics API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}