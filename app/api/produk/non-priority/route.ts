import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

// Get non-priority products
export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { data, error } = await supabaseAdmin
      .from('v_produk_non_prioritas')
      .select('*')
      .order('nama_produk', { ascending: true })

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse(data)
  })
}