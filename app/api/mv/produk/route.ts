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
    const withStats = searchParams.get('withStats') === 'true'

    if (id) {
      const view = withStats ? 'mv_produk_with_stats' : 'mv_produk_aggregates'
      
      // Get specific product with aggregated data
      const { data, error } = await supabase
        .from(view)
        .select('*')
        .eq('id_produk', id)
        .single()

      if (error) {
        console.error('Error fetching product aggregate:', error)
        return NextResponse.json({ error: 'Failed to fetch product data' }, { status: 500 })
      }

      return NextResponse.json(data)
    } else {
      const view = withStats ? 'mv_produk_with_stats' : 'mv_produk_aggregates'
      
      // Get all products with aggregated data
      const { data, error } = await supabase
        .from(view)
        .select('*')
        .order(withStats ? 'priority_order' : 'nama_produk')

      if (error) {
        console.error('Error fetching product aggregates:', error)
        return NextResponse.json({ error: 'Failed to fetch product data' }, { status: 500 })
      }

      return NextResponse.json(data)
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}