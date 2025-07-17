import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleApiRequest(request, async () => {
    const { id } = await params
    const { data, error } = await supabaseAdmin
      .from('sales')
      .select('*')
      .eq('id_sales', id)
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
    const { nama_sales, nomor_telepon, status_aktif } = body

    if (!nama_sales) {
      return createErrorResponse('Nama sales is required')
    }

    const { data, error } = await supabaseAdmin
      .from('sales')
      .update({
        nama_sales,
        nomor_telepon: nomor_telepon || null,
        status_aktif: status_aktif !== undefined ? status_aktif : true
      })
      .eq('id_sales', id)
      .select()
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
      .from('sales')
      .delete()
      .eq('id_sales', id)

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse({ message: 'Sales deleted successfully' })
  })
}