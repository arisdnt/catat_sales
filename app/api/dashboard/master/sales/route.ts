import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('v_master_sales')
      .select('*')
      .order('status_aktif', { ascending: false })
      .order('total_revenue', { ascending: false })
      .order('nama_sales', { ascending: true })

    if (error) {
      console.error('Error fetching master sales data:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch master sales data',
          details: error.message 
        }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || []
    })
  } catch (error: any) {
    console.error('Unexpected error in master sales API:', error)
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