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
      // Get specific billing with totals
      const { data, error } = await supabase
        .from('mv_penagihan_with_totals')
        .select('*')
        .eq('id_penagihan', id)
        .single()

      if (error) {
        console.error('Error fetching billing with totals:', error)
        return NextResponse.json({ error: 'Failed to fetch billing data' }, { status: 500 })
      }

      return NextResponse.json(data)
    } else {
      const view = type === 'aggregates' ? 'mv_penagihan_aggregates' : 'mv_penagihan_with_totals'
      
      let query = supabase.from(view).select('*')
      
      if (type === 'with_totals') {
        query = query.order('dibuat_pada', { ascending: false })
      }

      const { data, error } = await query

      if (error) {
        console.error(`Error fetching billing ${type}:`, error)
        return NextResponse.json({ error: 'Failed to fetch billing data' }, { status: 500 })
      }

      return NextResponse.json(data)
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}