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
    const type = searchParams.get('type') || 'with_totals' // 'aggregates' or 'with_totals'

    if (id) {
      // Get specific penagihan with totals using direct queries
      const { data: penagihanData, error: penagihanError } = await supabase
        .from('penagihan')
        .select('*')
        .eq('id_penagihan', id)
        .single()

      if (penagihanError) {
        console.error('Error fetching penagihan data:', penagihanError)
        return NextResponse.json({ error: 'Failed to fetch billing data' }, { status: 500 })
      }

      // Get detailed penagihan data
      const { data: detailData } = await supabase
        .from('detail_penagihan')
        .select('*')
        .eq('id_penagihan', id)

      // Get potongan data
      const { data: potonganData } = await supabase
        .from('potongan_penagihan')
        .select('*')
        .eq('id_penagihan', id)

      // Calculate aggregated data
      const totalQuantitySold = detailData?.reduce((sum, detail) => sum + detail.jumlah_terjual, 0) || 0
      const totalQuantityReturned = detailData?.reduce((sum, detail) => sum + detail.jumlah_kembali, 0) || 0
      const detailCount = detailData?.length || 0
      const totalDeductions = potonganData?.reduce((sum, potongan) => sum + potongan.jumlah_potongan, 0) || 0

      const result = {
        ...penagihanData,
        total_quantity_sold: totalQuantitySold,
        total_quantity_returned: totalQuantityReturned,
        detail_count: detailCount,
        total_deductions: totalDeductions
      }

      return NextResponse.json(result)
    } else {
      if (type === 'aggregates') {
        // Get basic penagihan aggregates using direct queries
        const { data: penagihanData } = await supabase
          .from('penagihan')
          .select('*')

        if (!penagihanData) {
          return NextResponse.json({ error: 'Failed to fetch billing data' }, { status: 500 })
        }

        // Calculate aggregates
        const today = new Date().toISOString().split('T')[0]
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        const totalBillings = penagihanData.length
        const todayBillings = penagihanData.filter(p => p.dibuat_pada.startsWith(today)).length
        const thisWeekBillings = penagihanData.filter(p => p.dibuat_pada >= oneWeekAgo).length
        const uniqueToko = new Set(penagihanData.map(p => p.id_toko)).size
        const cashPayments = penagihanData.filter(p => p.metode_pembayaran === 'Cash').length
        const transferPayments = penagihanData.filter(p => p.metode_pembayaran === 'Transfer').length
        const billingsWithDiscounts = penagihanData.filter(p => p.ada_potongan).length
        const totalRevenue = penagihanData.reduce((sum, p) => sum + p.total_uang_diterima, 0)
        const avgBillingAmount = totalBillings > 0 ? totalRevenue / totalBillings : 0
        const maxBillingAmount = totalBillings > 0 ? Math.max(...penagihanData.map(p => p.total_uang_diterima)) : 0
        const minBillingAmount = totalBillings > 0 ? Math.min(...penagihanData.map(p => p.total_uang_diterima)) : 0

        const aggregates = {
          id: 1,
          total_billings: totalBillings,
          today_billings: todayBillings,
          this_week_billings: thisWeekBillings,
          unique_toko: uniqueToko,
          cash_payments: cashPayments,
          transfer_payments: transferPayments,
          billings_with_discounts: billingsWithDiscounts,
          total_revenue: totalRevenue,
          avg_billing_amount: avgBillingAmount,
          max_billing_amount: maxBillingAmount,
          min_billing_amount: minBillingAmount
        }

        return NextResponse.json(aggregates)
      } else {
        // Get all penagihan with totals - for performance, we'll return basic data
        // and calculate totals on demand for specific records
        const { data, error } = await supabase
          .from('penagihan')
          .select('*')
          .order('dibuat_pada', { ascending: false })

        if (error) {
          console.error('Error fetching penagihan data:', error)
          return NextResponse.json({ error: 'Failed to fetch billing data' }, { status: 500 })
        }

        // For list view, return basic data with placeholder totals
        const transformedData = data?.map(penagihan => ({
          ...penagihan,
          total_quantity_sold: 0,
          total_quantity_returned: 0,
          detail_count: 0,
          total_deductions: 0
        })) || []

        return NextResponse.json(transformedData)
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}