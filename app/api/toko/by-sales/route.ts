import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

// Get stores by sales ID
export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { searchParams } = new URL(request.url)
    const id_sales = searchParams.get('id_sales')

    if (!id_sales) {
      return createErrorResponse('id_sales parameter is required')
    }

    // Verify sales exists
    const { data: salesData, error: salesError } = await supabaseAdmin
      .from('sales')
      .select('id_sales, nama_sales')
      .eq('id_sales', parseInt(id_sales))
      .eq('status_aktif', true)
      .single()

    if (salesError || !salesData) {
      return createErrorResponse('Sales not found or inactive')
    }

    // Get stores for this sales
    const { data: storesData, error: storesError } = await supabaseAdmin
      .from('toko')
      .select(`
        id_toko,
        nama_toko,
        alamat,
        desa,
        kecamatan,
        kabupaten,
        link_gmaps,
        status_toko,
        dibuat_pada
      `)
      .eq('id_sales', parseInt(id_sales))
      .eq('status_toko', true)
      .order('nama_toko', { ascending: true })

    if (storesError) {
      return createErrorResponse(storesError.message)
    }

    return createSuccessResponse({
      sales: salesData,
      stores: storesData || []
    })
  })
}