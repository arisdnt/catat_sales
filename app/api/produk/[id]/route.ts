import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleApiRequest(request, async () => {
    const { id } = await params
    const { data, error } = await supabaseAdmin
      .from('produk')
      .select('*')
      .eq('id_produk', id)
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
    const { nama_produk, harga_satuan, status_produk } = body

    if (!nama_produk || !harga_satuan) {
      return createErrorResponse('Nama produk and harga satuan are required')
    }

    if (isNaN(parseFloat(harga_satuan)) || parseFloat(harga_satuan) <= 0) {
      return createErrorResponse('Harga satuan must be a positive number')
    }

    const { data, error } = await supabaseAdmin
      .from('produk')
      .update({
        nama_produk,
        harga_satuan: parseFloat(harga_satuan),
        status_produk: status_produk !== undefined ? status_produk : true
      })
      .eq('id_produk', id)
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
      .from('produk')
      .delete()
      .eq('id_produk', id)

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse({ message: 'Product deleted successfully' })
  })
}