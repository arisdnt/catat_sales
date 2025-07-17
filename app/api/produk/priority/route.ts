import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

// Get priority products
export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { data, error } = await supabaseAdmin
      .from('v_produk_prioritas')
      .select('*')
      .order('priority_order', { ascending: true })

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse(data)
  })
}

// Update product priority status
export async function PUT(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const body = await request.json()
    const { id_produk, is_priority, priority_order } = body

    if (!id_produk) {
      return createErrorResponse('id_produk is required')
    }

    // Verify product exists
    const { data: productData, error: productError } = await supabaseAdmin
      .from('produk')
      .select('id_produk, nama_produk')
      .eq('id_produk', id_produk)
      .single()

    if (productError || !productData) {
      return createErrorResponse('Product not found')
    }

    // Update priority status
    const updateData: any = {
      is_priority: is_priority || false
    }

    if (is_priority && priority_order) {
      updateData.priority_order = priority_order
    }

    const { data, error } = await supabaseAdmin
      .from('produk')
      .update(updateData)
      .eq('id_produk', id_produk)
      .select()
      .single()

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse(data)
  })
}