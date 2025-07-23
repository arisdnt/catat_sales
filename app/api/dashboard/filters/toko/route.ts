import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sales_id = searchParams.get('sales_id')
    const kabupaten = searchParams.get('kabupaten')
    const kecamatan = searchParams.get('kecamatan')

    let query = supabase
      .from('v_toko_options')
      .select('*')

    if (sales_id) {
      // Need to join with actual toko table to filter by sales_id
      query = supabase
        .from('toko')
        .select(`
          id_toko,
          nama_toko,
          kecamatan,
          kabupaten,
          status_toko,
          sales(nama_sales)
        `)
        .eq('id_sales', parseInt(sales_id))
    } else {
      query = supabase.from('v_toko_options').select('*')
    }

    if (kabupaten && !sales_id) {
      query = query.eq('kabupaten', kabupaten)
    } else if (kabupaten && sales_id) {
      query = query.eq('kabupaten', kabupaten)
    }

    if (kecamatan && !sales_id) {
      query = query.eq('kecamatan', kecamatan)
    } else if (kecamatan && sales_id) {
      query = query.eq('kecamatan', kecamatan)
    }

    const { data, error } = await query
      .order('status_toko', { ascending: false })
      .order('nama_toko', { ascending: true })

    if (error) {
      console.error('Error fetching toko options:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch toko options',
          details: error.message 
        }, 
        { status: 500 }
      )
    }

    // Transform data if it's from the sales_id query
    let transformedData = data
    if (sales_id && data) {
      transformedData = data.map((item: any) => ({
        id_toko: item.id_toko,
        nama_toko: item.nama_toko,
        kecamatan: item.kecamatan,
        kabupaten: item.kabupaten,
        nama_sales: item.sales?.nama_sales,
        status_toko: item.status_toko
      }))
    }

    return NextResponse.json({
      success: true,
      data: transformedData || []
    })
  } catch (error: any) {
    console.error('Unexpected error in toko options API:', error)
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