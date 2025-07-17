import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    // Get sales data with proper deduplication
    const { data, error } = await supabaseAdmin
      .from('sales')
      .select('id_sales, nama_sales, nomor_telepon, status_aktif, dibuat_pada, diperbarui_pada')
      .eq('status_aktif', true)
      .order('nama_sales')
    
    // Remove duplicates based on nama_sales
    const uniqueData = data ? data.filter((sales, index, self) => 
      index === self.findIndex(s => s.nama_sales === sales.nama_sales)
    ) : []

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse(uniqueData)
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