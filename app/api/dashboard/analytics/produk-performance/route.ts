import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0]

    // Call the new dashboard analytics function
    const { data, error } = await supabase.rpc('get_dashboard_produk_performance', {
      start_date: startDate,
      end_date: endDate
    })

    if (error) {
      console.error('[Dashboard Analytics] Error calling get_dashboard_produk_performance:', error)
      
      if (error.message?.includes('function get_dashboard_produk_performance') || error.code === '42883') {
        return NextResponse.json({
          success: true,
          data: [],
          period: { start_date: startDate, end_date: endDate }
        })
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch product performance data',
          details: error.message 
        }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      period: {
        start_date: startDate,
        end_date: endDate
      }
    })

  } catch (error: any) {
    console.error('[Dashboard Analytics] Unexpected error in produk-performance API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      }, 
      { status: 500 }
    )
  }
}