import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

// Get non-priority products
export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    try {
      // Query directly from produk table for non-priority products
      const { data, error } = await supabaseAdmin
        .from('produk')
        .select('id_produk, nama_produk, harga_satuan, status_produk')
        .eq('status_produk', true)
        .or('is_priority.is.null,is_priority.eq.false')
        .order('nama_produk', { ascending: true })

      if (error) {
        console.error('Error fetching non-priority products:', error)
        return createErrorResponse(`Database error: ${error.message}`)
      }

      return createSuccessResponse(data || [])
    } catch (error) {
      console.error('Unexpected error in non-priority products API:', error)
      return createErrorResponse('Internal server error')
    }
  })
}