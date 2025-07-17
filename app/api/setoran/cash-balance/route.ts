import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    try {
      // Optimized query: Get all setoran data
      const { data: setoranData, error: setoranError } = await supabaseAdmin
        .from('setoran')
        .select('*')
        .order('dibuat_pada', { ascending: false })

      if (setoranError) {
        return createErrorResponse(setoranError.message)
      }

      // Get all penagihan data in one query
      const { data: penagihanData, error: penagihanError } = await supabaseAdmin
        .from('penagihan')
        .select('total_uang_diterima, metode_pembayaran, dibuat_pada')

      if (penagihanError) {
        return createErrorResponse(penagihanError.message)
      }

      // Group penagihan by date and payment method
      const penagihanByDate = new Map()
      
      penagihanData?.forEach(penagihan => {
        const date = new Date(penagihan.dibuat_pada).toISOString().split('T')[0]
        if (!penagihanByDate.has(date)) {
          penagihanByDate.set(date, { cash: 0, transfer: 0 })
        }
        
        const dayData = penagihanByDate.get(date)
        if (penagihan.metode_pembayaran === 'Cash') {
          dayData.cash += parseFloat(penagihan.total_uang_diterima)
        } else if (penagihan.metode_pembayaran === 'Transfer') {
          dayData.transfer += parseFloat(penagihan.total_uang_diterima)
        }
      })

      // Build cash balance results
      const cashBalanceResults = setoranData.map(setoran => {
        const setoranDate = new Date(setoran.dibuat_pada).toISOString().split('T')[0]
        const dayData = penagihanByDate.get(setoranDate) || { cash: 0, transfer: 0 }

        return {
          id_setoran: setoran.id_setoran,
          tanggal_setoran: setoranDate,
          penerima_setoran: setoran.penerima_setoran,
          total_cash_diterima: dayData.cash,
          total_transfer_diterima: dayData.transfer,
          total_setoran: parseFloat(setoran.total_setoran),
          dibuat_pada: setoran.dibuat_pada,
          diperbarui_pada: setoran.diperbarui_pada
        }
      })

      return createSuccessResponse(cashBalanceResults)
    } catch (error) {
      console.error('Cash balance API error:', error)
      return createErrorResponse('Failed to fetch cash balance data')
    }
  })
}