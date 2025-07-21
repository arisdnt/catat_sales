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
    
    // Get comprehensive sales statistics manually since the function doesn't exist
    const { data: stores, error: storesError } = await supabase
      .from('toko')
      .select('id_toko, nama_toko')
      .eq('id_sales', salesId)
      .eq('status_toko', true)

    if (storesError) {
      console.error('Error fetching stores:', storesError)
      return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 })
    }

    const storeIds = stores?.map(store => store.id_toko) || []

    // Get total revenue from penagihan
    const { data: revenueData, error: revenueError } = await supabase
      .from('penagihan')
      .select('total_uang_diterima, toko:id_toko!inner(id_sales)')
      .eq('toko.id_sales', salesId)

    if (revenueError) {
      console.error('Error fetching revenue:', revenueError)
      return NextResponse.json({ error: 'Failed to fetch revenue' }, { status: 500 })
    }

    const totalRevenue = revenueData?.reduce((sum, payment) => sum + Number(payment.total_uang_diterima), 0) || 0

    const stats = {
      total_stores: stores?.length || 0,
      total_revenue: totalRevenue,
      total_transactions: revenueData?.length || 0
    }

    const error = null

    if (error) {
      console.error('Error fetching sales stats:', error)
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    return NextResponse.json({ data: stats })
  } catch (error) {
    console.error('Error in sales stats API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}