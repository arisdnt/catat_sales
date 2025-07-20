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

    if (id) {
      // Handle single record request
      const query = supabase.from('mv_toko_aggregates').select('*').eq('id_toko', id).single()
      const { data, error } = await query
      
      if (error) {
        console.error('Error fetching toko by ID:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data })
    } else {
      // Handle multiple records request
      let query = supabase.from('mv_toko_aggregates').select('*')
      // Apply filters
      if (sales_id) query = query.eq('id_sales', sales_id)
      if (kabupaten) query = query.eq('kabupaten', kabupaten)
      if (kecamatan) query = query.eq('kecamatan', kecamatan)
      
      // Full-text search using GIN index
      if (search) {
        query = query.textSearch('search_vector', search)
      }

      query = query.order('nama_toko')
      
      const { data, error } = await query

      if (error) {
        console.error('Error fetching toko aggregate:', error)
        return NextResponse.json({ error: 'Failed to fetch toko data' }, { status: 500 })
      }

      return NextResponse.json(data)
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}