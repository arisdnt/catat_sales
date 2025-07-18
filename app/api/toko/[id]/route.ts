import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleApiRequest(request, async () => {
    const { id } = await params
    const { data, error } = await supabaseAdmin
      .from('toko')
      .select(`
        *,
        sales!inner(
          id_sales,
          nama_sales,
          nomor_telepon,
          status_aktif
        )
      `)
      .eq('id_toko', id)
      .single()

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse(data)
  })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleApiRequest(request, async () => {
    const { id } = await params
    const body = await request.json()
    const { nama_toko, id_sales, kecamatan, kabupaten, link_gmaps, status_toko } = body

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
      .update({
        nama_toko,
        id_sales: parseInt(id_sales),
        kecamatan: kecamatan || null,
        kabupaten: kabupaten || null,
        link_gmaps: link_gmaps || null,
        status_toko: status_toko !== undefined ? status_toko : true
      })
      .eq('id_toko', id)
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

    return createSuccessResponse(data)
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleApiRequest(request, async () => {
    const { id } = await params
    const { error } = await supabaseAdmin
      .from('toko')
      .delete()
      .eq('id_toko', id)

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse({ message: 'Store deleted successfully' })
  })
}