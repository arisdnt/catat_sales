import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const include_sales = searchParams.get('include_sales')
    
    let query = supabaseAdmin
      .from('toko')
      .select(include_sales === 'true' ? `
        *,
        sales!inner(
          id_sales,
          nama_sales,
          nomor_telepon,
          status_aktif
        )
      ` : '*')
      .order('nama_toko')

    if (status === 'active') {
      query = query.eq('status_toko', true)
    }

    const { data, error } = await query

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse(data)
  })
}

export async function POST(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const body = await request.json()
    const { nama_toko, id_sales, kecamatan, kabupaten, link_gmaps } = body

    if (!nama_toko || !id_sales) {
      return createErrorResponse('Nama toko and id_sales are required')
    }

    // Verify sales exists and is active
    const { data: salesData, error: salesError } = await supabaseAdmin
      .from('sales')
      .select('id_sales')
      .eq('id_sales', id_sales)
      .eq('status_aktif', true)
      .single()

    if (salesError || !salesData) {
      return createErrorResponse('Sales not found or inactive')
    }

    const { data, error } = await supabaseAdmin
      .from('toko')
      .insert([{
        nama_toko,
        id_sales: parseInt(id_sales),
        kecamatan: kecamatan || null,
        kabupaten: kabupaten || null,
        link_gmaps: link_gmaps || null,
        status_toko: true
      }])
      .select(`
        *,
        sales!inner(
          id_sales,
          nama_sales,
          nomor_telepon,
          status_aktif
        )
      `)
      .single()

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse(data, 201)
  })
}