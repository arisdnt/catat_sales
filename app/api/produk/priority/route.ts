import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

// Get priority products
export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    try {
      // First, get all products to see what we have
      const { data: allProducts, error: allError } = await supabaseAdmin
        .from('produk')
        .select('*')
        .eq('status_produk', true)

      if (allError) {
        console.error('Error fetching all products:', allError)
        return createErrorResponse(`Database error: ${allError.message}`)
      }

      // Filter for priority products
      const priorityProducts = allProducts?.filter(product => product.is_priority === true) || []

      // Sort by priority_order
      priorityProducts.sort((a, b) => {
        const orderA = a.priority_order || 999
        const orderB = b.priority_order || 999
        return orderA - orderB
      })

      console.log('Priority products found:', priorityProducts.length)
      
      return createSuccessResponse(priorityProducts)
    } catch (error) {
      console.error('Unexpected error in priority products API:', error)
      return createErrorResponse('Internal server error')
    }
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