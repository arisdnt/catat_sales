import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleApiRequest(request, async () => {
    const { id } = await params
    const { data, error } = await supabaseAdmin
      .from('setoran')
      .select('*')
      .eq('id_setoran', id)
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
    const { total_setoran, penerima_setoran } = body

    if (total_setoran === undefined || !penerima_setoran) {
      return createErrorResponse('total_setoran and penerima_setoran are required')
    }

    if (total_setoran < 0) {
      return createErrorResponse('total_setoran must be non-negative')
    }

    const { data, error } = await supabaseAdmin
      .from('setoran')
      .update({
        total_setoran: parseFloat(total_setoran),
        penerima_setoran: penerima_setoran.trim()
      })
      .eq('id_setoran', id)
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
      .from('setoran')
      .delete()
      .eq('id_setoran', id)

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse({ message: 'Deposit deleted successfully' })
  })
}