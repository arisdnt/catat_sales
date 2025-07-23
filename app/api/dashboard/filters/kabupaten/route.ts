import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('v_kabupaten_options')
      .select('*')
      .order('kabupaten', { ascending: true })

    if (error) {
      console.error('Error fetching kabupaten options:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch kabupaten options',
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
    console.error('Unexpected error in kabupaten options API:', error)
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