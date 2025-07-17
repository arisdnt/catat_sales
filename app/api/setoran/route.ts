import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { data, error } = await supabaseAdmin
      .from('setoran')
      .select('*')
      .order('dibuat_pada', { ascending: false })

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse(data)
  })
}

export async function POST(request: NextRequest) {
  return handleApiRequest(request, async () => {
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
      .insert([{
        total_setoran: parseFloat(total_setoran),
        penerima_setoran: penerima_setoran.trim()
      }])
      .select()
      .single()

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse(data, 201)
  })
}