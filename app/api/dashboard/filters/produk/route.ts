import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('v_produk_options')
      .select('*')
      .order('is_priority', { ascending: false })
      .order('status_produk', { ascending: false })
      .order('nama_produk', { ascending: true })

    if (error) {
      console.error('Error fetching produk options:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch produk options',
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
    console.error('Unexpected error in produk options API:', error)
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