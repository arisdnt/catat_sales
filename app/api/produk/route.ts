import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    
    let query = supabaseAdmin
      .from('produk')
      .select('*')
      .order('nama_produk')

    if (status === 'active') {
      query = query.eq('status_produk', true)
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
    const { nama_produk, harga_satuan } = body

    if (!nama_produk || !harga_satuan) {
      return createErrorResponse('Nama produk and harga satuan are required')
    }

    if (isNaN(parseFloat(harga_satuan)) || parseFloat(harga_satuan) <= 0) {
      return createErrorResponse('Harga satuan must be a positive number')
    }

    const { data, error } = await supabaseAdmin
      .from('produk')
      .insert([{
        nama_produk,
        harga_satuan: parseFloat(harga_satuan),
        status_produk: true
      }])
      .select()
      .single()

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse(data, 201)
  })
}