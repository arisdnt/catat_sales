import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'
import { getCurrentDateIndonesia, INDONESIA_TIMEZONE } from '@/lib/utils'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    console.log('Setoran search suggestions API called')
    
    try {
      const { searchParams } = new URL(request.url)
      const query = searchParams.get('q') || ''
      const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '10')))
      
      console.log('Search suggestions params:', { query, limit })
      
      if (!query || query.length < 1) {
        return createSuccessResponse({
          suggestions: []
        })
      }
      
      const suggestions = []
      
      // Search for penerima setoran suggestions
      if (query.length >= 1) {
        const { data: penerimaData, error: penerimaError } = await supabaseAdmin
          .from('setoran')
          .select('penerima_setoran')
          .ilike('penerima_setoran', `%${query}%`)
          .not('penerima_setoran', 'is', null)
          .limit(limit)
        
        if (!penerimaError && penerimaData) {
          const uniquePenerima = [...new Set(penerimaData.map(item => item.penerima_setoran).filter(Boolean))]
          uniquePenerima.slice(0, 5).forEach(penerima => {
            suggestions.push({
              id: `penerima-${penerima}`,
              type: 'penerima',
              value: penerima,
              label: penerima,
              description: `Penerima: ${penerima}`,
              metadata: { penerima }
            })
          })
        }
      }
      
      // Amount range suggestions based on existing data
      if (query.match(/^\d+/)) {
        const amount = parseFloat(query)
        if (!isNaN(amount)) {
          suggestions.push({
            id: `amount-from-${amount}`,
            type: 'amount_from',
            value: amount.toString(),
            label: `Dari ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)}`,
            description: `Filter setoran dari ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)}`,
            metadata: { amount }
          })
          
          suggestions.push({
            id: `amount-to-${amount}`,
            type: 'amount_to',
            value: amount.toString(),
            label: `Sampai ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)}`,
            description: `Filter setoran sampai ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)}`,
            metadata: { amount }
          })
        }
      }
      
      // Date suggestions for recent dates using Indonesia timezone
      const todayStr = getCurrentDateIndonesia()
      const today = new Date(todayStr)
      
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = new Intl.DateTimeFormat('sv-SE', {
        timeZone: INDONESIA_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(yesterday)
      
      const thisWeek = new Date(today)
      thisWeek.setDate(thisWeek.getDate() - 7)
      const thisWeekStr = new Intl.DateTimeFormat('sv-SE', {
        timeZone: INDONESIA_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(thisWeek)
      
      const thisMonth = new Date(today)
      thisMonth.setDate(1)
      const thisMonthStr = new Intl.DateTimeFormat('sv-SE', {
        timeZone: INDONESIA_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(thisMonth)
      
      if (query.toLowerCase().includes('hari') || query.toLowerCase().includes('today')) {
        suggestions.push({
          id: 'date-today',
          type: 'date_from',
          value: todayStr,
          label: 'Hari ini',
          description: 'Setoran hari ini',
          metadata: { date: todayStr }
        })
      }
      
      if (query.toLowerCase().includes('kemarin') || query.toLowerCase().includes('yesterday')) {
        suggestions.push({
          id: 'date-yesterday',
          type: 'date_from',
          value: yesterdayStr,
          label: 'Kemarin',
          description: 'Setoran kemarin',
          metadata: { date: yesterdayStr }
        })
      }
      
      if (query.toLowerCase().includes('minggu') || query.toLowerCase().includes('week')) {
        suggestions.push({
          id: 'date-this-week',
          type: 'date_from',
          value: thisWeekStr,
          label: 'Minggu ini',
          description: 'Setoran minggu ini',
          metadata: { date: thisWeekStr }
        })
      }
      
      if (query.toLowerCase().includes('bulan') || query.toLowerCase().includes('month')) {
        suggestions.push({
          id: 'date-this-month',
          type: 'date_from',
          value: thisMonthStr,
          label: 'Bulan ini',
          description: 'Setoran bulan ini',
          metadata: { date: thisMonthStr }
        })
      }
      
      console.log('Setoran search suggestions response:', {
        query,
        suggestionsCount: suggestions.length,
        suggestions: suggestions.slice(0, 3).map(s => ({ type: s.type, value: s.value }))
      })
      
      return createSuccessResponse({
        suggestions: suggestions.slice(0, limit)
      })
      
    } catch (error) {
      console.error('Setoran search suggestions API error:', error)
      return createErrorResponse('Gagal memuat suggestions setoran', 500)
    }
  })
}