import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleApiRequest(request, async () => {
    const { id } = await params
    
    try {
      // Get the setoran data
      const { data: setoran, error: setoranError } = await supabaseAdmin
        .from('setoran')
        .select('*')
        .eq('id_setoran', id)
        .single()

      if (setoranError) {
        return createErrorResponse(setoranError.message)
      }

      // Get related penagihan data for the same date
      const setoranDate = new Date(setoran.dibuat_pada).toISOString().split('T')[0]
      
      const { data: relatedPayments, error: paymentsError } = await supabaseAdmin
        .from('penagihan')
        .select(`
          id_penagihan,
          total_uang_diterima,
          metode_pembayaran,
          ada_potongan,
          dibuat_pada,
          toko (
            id_toko,
            nama_toko,
            kecamatan,
            kabupaten,
            sales (
              id_sales,
              nama_sales
            )
          )
        `)
        .gte('dibuat_pada', setoranDate + 'T00:00:00Z')
        .lt('dibuat_pada', setoranDate + 'T23:59:59Z')
        .order('dibuat_pada', { ascending: false })

      if (paymentsError) {
        // Don't fail the request, just return empty array
      }

      // Calculate payment summaries for the specific date
      const cashPayments = relatedPayments?.filter(p => p.metode_pembayaran === 'Cash') || []
      const transferPayments = relatedPayments?.filter(p => p.metode_pembayaran === 'Transfer') || []
      
      const totalCash = cashPayments.reduce((sum, p) => sum + parseFloat(p.total_uang_diterima), 0)
      const totalTransfer = transferPayments.reduce((sum, p) => sum + parseFloat(p.total_uang_diterima), 0)

      // Calculate cumulative selisih using the same logic as cash-balance API
      // Get all cash payments up to this setoran date
      const { data: allCashPayments, error: allCashError } = await supabaseAdmin
        .from('penagihan')
        .select('total_uang_diterima, dibuat_pada')
        .eq('metode_pembayaran', 'Cash')
        .lte('dibuat_pada', setoran.dibuat_pada)
        .order('dibuat_pada', { ascending: true })

      // Get all setoran up to this date
      const { data: allSetoran, error: allSetoranError } = await supabaseAdmin
        .from('setoran')
        .select('total_setoran, dibuat_pada')
        .lte('dibuat_pada', setoran.dibuat_pada)
        .order('dibuat_pada', { ascending: true })

      const cashUpToDate = allCashPayments?.reduce((sum, p) => sum + parseFloat(p.total_uang_diterima), 0) || 0
      const setoranUpToDate = allSetoran?.reduce((sum, s) => sum + parseFloat(s.total_setoran), 0) || 0
      const selisih = cashUpToDate - setoranUpToDate

      const result = {
        ...setoran,
        tanggal_setoran: setoranDate,
        related_payments: relatedPayments || [],
        cash_payments: cashPayments,
        transfer_payments: transferPayments,
        total_cash_diterima: totalCash,
        total_transfer_diterima: totalTransfer,
        total_payments: totalCash + totalTransfer,
        reconciliation: null, // No longer using the view
        selisih: selisih
      }

      return createSuccessResponse(result)
    } catch (error) {
      return createErrorResponse('Failed to fetch setoran detail: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
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