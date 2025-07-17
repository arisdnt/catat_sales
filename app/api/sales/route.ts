import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { data, error } = await supabaseAdmin
      .from('sales')
      .select('*')
      .order('nama_sales')

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse(data)
  })
}

export async function POST(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const body = await request.json()
    const { nama_sales, nomor_telepon } = body

    if (!nama_sales) {
      return createErrorResponse('Nama sales is required')
    }

    const { data, error } = await supabaseAdmin
      .from('sales')
      .insert([{
        nama_sales,
        nomor_telepon: nomor_telepon || null,
        status_aktif: true
      }])
      .select()
      .single()

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse(data, 201)
  })
}