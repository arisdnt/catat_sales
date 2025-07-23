import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const kabupaten = searchParams.get('kabupaten')

    let query = supabase
      .from('v_kecamatan_options')
      .select('*')

    if (kabupaten) {
      query = query.eq('kabupaten', kabupaten)
    }

    const { data, error } = await query
      .order('kabupaten', { ascending: true })
      .order('kecamatan', { ascending: true })

    if (error) {
      console.error('Error fetching kecamatan options:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch kecamatan options',
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
    console.error('Unexpected error in kecamatan options API:', error)
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