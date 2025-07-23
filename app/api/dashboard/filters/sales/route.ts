import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('v_sales_options')
      .select('*')
      .order('status_aktif', { ascending: false })
      .order('nama_sales', { ascending: true })

    if (error) {
      console.error('Error fetching sales options:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch sales options',
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
    console.error('Unexpected error in sales options API:', error)
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