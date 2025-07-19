import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    console.log('Setoran filter options API called')
    
    try {
      // Get distinct penerima values
      const { data: penerimaData, error: penerimaError } = await supabaseAdmin
        .from('setoran')
        .select('penerima_setoran')
        .not('penerima_setoran', 'is', null)
      
      if (penerimaError) {
        console.error('Error fetching penerima data:', penerimaError)
        throw penerimaError
      }
      
      // Process penerima options
      const penerimaCount = {}
      penerimaData?.forEach(item => {
        if (item.penerima_setoran) {
          penerimaCount[item.penerima_setoran] = (penerimaCount[item.penerima_setoran] || 0) + 1
        }
      })
      
      const penerimaOptions = Object.entries(penerimaCount).map(([value, count]) => ({
        value,
        label: value,
        count: count as number
      })).sort((a, b) => b.count - a.count)
      
      // Get summary statistics
      const { data: summaryData, error: summaryError } = await supabaseAdmin
        .from('setoran')
        .select('*')
      
      if (summaryError) {
        console.error('Error fetching summary data:', summaryError)
        throw summaryError
      }
      
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const thisWeek = new Date(today)
      thisWeek.setDate(thisWeek.getDate() - 7)
      const thisMonth = new Date(today)
      thisMonth.setDate(1)
      
      // Calculate summary statistics
      const totalSetoran = summaryData?.length || 0
      const totalAmount = summaryData?.reduce((sum, item) => sum + (parseFloat(item.total_setoran) || 0), 0) || 0
      const avgAmount = totalSetoran > 0 ? totalAmount / totalSetoran : 0
      
      const todaySetoran = summaryData?.filter(item => 
        item.dibuat_pada?.startsWith(todayStr)
      ).length || 0
      
      const thisWeekSetoran = summaryData?.filter(item => 
        new Date(item.dibuat_pada) >= thisWeek
      ).length || 0
      
      const thisMonthSetoran = summaryData?.filter(item => 
        new Date(item.dibuat_pada) >= thisMonth
      ).length || 0
      
      const todayAmount = summaryData?.filter(item => 
        item.dibuat_pada?.startsWith(todayStr)
      ).reduce((sum, item) => sum + (parseFloat(item.total_setoran) || 0), 0) || 0
      
      const thisWeekAmount = summaryData?.filter(item => 
        new Date(item.dibuat_pada) >= thisWeek
      ).reduce((sum, item) => sum + (parseFloat(item.total_setoran) || 0), 0) || 0
      
      const thisMonthAmount = summaryData?.filter(item => 
        new Date(item.dibuat_pada) >= thisMonth
      ).reduce((sum, item) => sum + (parseFloat(item.total_setoran) || 0), 0) || 0
      
      // Get unique penerima count
      const uniquePenerima = new Set(summaryData?.map(item => item.penerima_setoran).filter(Boolean)).size
      
      // Amount ranges for filtering
      const amounts = summaryData?.map(item => parseFloat(item.total_setoran) || 0).sort((a, b) => a - b) || []
      const minAmount = amounts.length > 0 ? amounts[0] : 0
      const maxAmount = amounts.length > 0 ? amounts[amounts.length - 1] : 0
      const medianAmount = amounts.length > 0 ? amounts[Math.floor(amounts.length / 2)] : 0
      
      const summary = {
        total_setoran: totalSetoran,
        total_amount: totalAmount,
        avg_amount: avgAmount,
        min_amount: minAmount,
        max_amount: maxAmount,
        median_amount: medianAmount,
        unique_penerima: uniquePenerima,
        today_setoran: todaySetoran,
        today_amount: todayAmount,
        this_week_setoran: thisWeekSetoran,
        this_week_amount: thisWeekAmount,
        this_month_setoran: thisMonthSetoran,
        this_month_amount: thisMonthAmount
      }
      
      console.log('Setoran filter options response:', {
        penerimaOptionsCount: penerimaOptions.length,
        summary: {
          total_setoran: summary.total_setoran,
          total_amount: summary.total_amount,
          unique_penerima: summary.unique_penerima
        }
      })
      
      return createSuccessResponse({
        penerima: penerimaOptions,
        summary
      })
      
    } catch (error) {
      console.error('Setoran filter options API error:', error)
      return createErrorResponse('Gagal memuat filter options setoran', 500)
    }
  })
}