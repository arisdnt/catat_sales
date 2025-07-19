import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    try {
      // Get all penagihan data with related toko and sales information
      const { data: penagihanData, error: penagihanError } = await supabaseAdmin
        .from('penagihan')
        .select(`
          id_penagihan,
          total_uang_diterima,
          metode_pembayaran,
          ada_potongan,
          dibuat_pada,
          diperbarui_pada,
          toko:id_toko (
            id_toko,
            nama_toko,
            kecamatan,
            kabupaten,
            sales:id_sales (
              id_sales,
              nama_sales
            )
          )
        `)
        .order('dibuat_pada', { ascending: false })

      if (penagihanError) {
        return createErrorResponse(penagihanError.message)
      }

      // Get all setoran data for cumulative calculations
      const { data: setoranData, error: setoranError } = await supabaseAdmin
        .from('setoran')
        .select('*')
        .order('dibuat_pada', { ascending: true })

      if (setoranError) {
        return createErrorResponse(setoranError.message)
      }

      // Group transactions by date for daily calculations
      const dailyData = new Map()
      
      // First, collect all cash transactions by date
      penagihanData?.forEach(penagihan => {
        if (penagihan.metode_pembayaran === 'Cash') {
          const date = new Date(penagihan.dibuat_pada).toISOString().split('T')[0]
          if (!dailyData.has(date)) {
            dailyData.set(date, { cashAmount: 0, setoranAmount: 0, transactions: [] })
          }
          dailyData.get(date).cashAmount += parseFloat(penagihan.total_uang_diterima)
          dailyData.get(date).transactions.push(penagihan)
        }
      })
      
      // Then, add setoran data by date
      setoranData?.forEach(setoran => {
        const date = new Date(setoran.dibuat_pada).toISOString().split('T')[0]
        if (!dailyData.has(date)) {
          dailyData.set(date, { cashAmount: 0, setoranAmount: 0, transactions: [] })
        }
        dailyData.get(date).setoranAmount += parseFloat(setoran.total_setoran)
      })
      
      // Sort dates chronologically to calculate running balance
      const sortedDates = Array.from(dailyData.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      
      // Calculate running balance for each date
      let runningBalance = 0
      const dateBalances = new Map()
      
      sortedDates.forEach((date) => {
        const dayData = dailyData.get(date)
        const previousBalance = runningBalance // Store previous day's balance
        
        // Add cash transactions for the day
        runningBalance += dayData.cashAmount
        // Subtract setoran for the day
        runningBalance -= dayData.setoranAmount
        
        dateBalances.set(date, {
          previousBalance: previousBalance,
          dailyCash: dayData.cashAmount,
          dailySetoran: dayData.setoranAmount,
          runningBalance: runningBalance
        })
      })

      // Build individual transaction results with proper running balance
      const transactionResults = penagihanData?.map(penagihan => {
        const transactionDate = new Date(penagihan.dibuat_pada)
        const transactionDateString = transactionDate.toISOString().split('T')[0]
        
        // Get setoran amount for this specific date
        const setoranOnDate = setoranData
          ?.filter(s => new Date(s.dibuat_pada).toISOString().split('T')[0] === transactionDateString)
          ?.reduce((sum, s) => sum + parseFloat(s.total_setoran), 0) || 0
        
        // Get setoran details for this date
        const setoranDetails = setoranData
          ?.filter(s => new Date(s.dibuat_pada).toISOString().split('T')[0] === transactionDateString)
          ?.map(s => ({
            id_setoran: s.id_setoran,
            total_setoran: parseFloat(s.total_setoran),
            penerima_setoran: s.penerima_setoran,
            dibuat_pada: s.dibuat_pada
          })) || []
        
        // Get daily cash total for this date
        const dailyCashTotal = dailyData.get(transactionDateString)?.cashAmount || 0
        
        // Get running balance for this date
        const balanceInfo = dateBalances.get(transactionDateString)
        const runningBalance = penagihan.metode_pembayaran === 'Cash' ? (balanceInfo?.runningBalance || 0) : 0
        const previousBalance = penagihan.metode_pembayaran === 'Cash' ? (balanceInfo?.previousBalance || 0) : 0

        const toko = Array.isArray(penagihan.toko) ? penagihan.toko[0] : penagihan.toko
        const sales = Array.isArray(toko?.sales) ? toko?.sales[0] : toko?.sales
        
        return {
          id_penagihan: penagihan.id_penagihan,
          id_toko: toko?.id_toko,
          nama_toko: toko?.nama_toko,
          kecamatan: toko?.kecamatan,
          kabupaten: toko?.kabupaten,
          nama_sales: sales?.nama_sales,
          id_sales: sales?.id_sales,
          total_uang_diterima: parseFloat(penagihan.total_uang_diterima),
          metode_pembayaran: penagihan.metode_pembayaran,
          ada_potongan: penagihan.ada_potongan,
          setoran_on_date: setoranOnDate,
          setoran_details: setoranDetails,
          previous_balance: previousBalance,
          daily_cash_total: dailyCashTotal,
          daily_setoran_total: setoranOnDate,
          running_balance: runningBalance,
          selisih: runningBalance, // Use running balance as selisih for consistency
          dibuat_pada: penagihan.dibuat_pada,
          diperbarui_pada: penagihan.diperbarui_pada
        }
      }) || []

      // Sort by date descending for display (most recent first)
      transactionResults.sort((a, b) => new Date(b.dibuat_pada).getTime() - new Date(a.dibuat_pada).getTime())

      return createSuccessResponse(transactionResults)
    } catch (error) {
      return createErrorResponse('Failed to fetch cash balance data: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  })
}