import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { createErrorResponse, createSuccessResponse, handleAdminApiRequest } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleAdminApiRequest(request, async () => {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return createErrorResponse('Date parameter is required', 400)
    }

    const supabase = createClient()

    // Calculate total expenditure for the given date
    const { data, error } = await supabase
      .from('pengeluaran_operasional')
      .select('jumlah')
      .gte('tanggal_pengeluaran', `${date}T00:00:00.000Z`)
      .lt('tanggal_pengeluaran', `${date}T23:59:59.999Z`)

    if (error) {
      console.error('Database error:', error)
      return createErrorResponse('Database error', 500)
    }

    const totalPengeluaran = data.reduce((sum, item) => sum + Number(item.jumlah), 0)

    return createSuccessResponse({
      total_pengeluaran: totalPengeluaran,
      date: date
    })
  })
}