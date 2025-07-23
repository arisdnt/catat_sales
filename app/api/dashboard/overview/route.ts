import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('v_dashboard_overview')
      .select('*')
      .single()

    if (error) {
      console.error('Error fetching dashboard overview data:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch dashboard overview data',
          details: error.message 
        }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data
    })
  } catch (error: any) {
    console.error('Unexpected error in dashboard overview API:', error)
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