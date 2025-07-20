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
    const sales_id = searchParams.get('sales_id')
    const search = searchParams.get('search')
    const kabupaten = searchParams.get('kabupaten')
    const kecamatan = searchParams.get('kecamatan')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase.from('mv_pengiriman_aggregates').select('*')

    if (id) {
      query = query.eq('id_pengiriman', id).single()
    } else {
      // Apply filters using optimized indexes
      if (sales_id) query = query.eq('id_sales', sales_id)
      if (kabupaten) query = query.eq('kabupaten', kabupaten)
      if (kecamatan) query = query.eq('kecamatan', kecamatan)
      
      // Date range filter
      if (startDate) query = query.gte('tanggal_kirim_date', startDate)
      if (endDate) query = query.lte('tanggal_kirim_date', endDate)
      
      // Full-text search using GIN index
      if (search) {
        query = query.textSearch('search_vector', search)
      }

      query = query.order('tanggal_kirim', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching shipment aggregate:', error)
      return NextResponse.json({ error: 'Failed to fetch shipment data' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}