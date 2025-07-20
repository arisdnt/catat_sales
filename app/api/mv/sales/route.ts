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

    if (id) {
      // Get specific sales with aggregated data
      const { data, error } = await supabase
        .from('mv_sales_aggregates')
        .select('*')
        .eq('id_sales', id)
        .single()

      if (error) {
        console.error('Error fetching sales aggregate:', error)
        return NextResponse.json({ error: 'Failed to fetch sales data' }, { status: 500 })
      }

      return NextResponse.json(data)
    } else {
      // Get all sales with aggregated data
      const { data, error } = await supabase
        .from('mv_sales_aggregates')
        .select('*')
        .order('nama_sales')

      if (error) {
        console.error('Error fetching sales aggregates:', error)
        return NextResponse.json({ error: 'Failed to fetch sales data' }, { status: 500 })
      }

      return NextResponse.json(data)
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}