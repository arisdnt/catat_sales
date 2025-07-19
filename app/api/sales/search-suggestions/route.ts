import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    console.log('Sales search suggestions API called')
    
    try {
      const { searchParams } = new URL(request.url)
      const query = searchParams.get('q') || ''
      const limit = Math.min(10, Math.max(1, parseInt(searchParams.get('limit') || '10')))
      
      if (!query || query.length < 1) {
        return createSuccessResponse({ suggestions: [] })
      }
      
      console.log('Sales search query:', { query, limit })
      
      const suggestions: any[] = []
      const searchTerm = query.toLowerCase().trim()
      
      // Search for sales by name
      const { data: salesData } = await supabaseAdmin
        .from('sales')
        .select('id_sales, nama_sales, nomor_telepon, status_aktif')
        .or(`nama_sales.ilike.%${searchTerm}%,nomor_telepon.ilike.%${searchTerm}%`)
        .eq('status_aktif', true)
        .order('nama_sales')
        .limit(limit)
      
      if (salesData) {
        salesData.forEach((sales: any) => {
          // Sales name suggestions
          if (sales.nama_sales.toLowerCase().includes(searchTerm)) {
            suggestions.push({
              id: `sales-name-${sales.id_sales}`,
              type: 'sales',
              value: sales.nama_sales,
              label: sales.nama_sales,
              description: `Sales ${sales.nama_sales}${sales.nomor_telepon ? ` - ${sales.nomor_telepon}` : ''}`,
              metadata: {
                id_sales: sales.id_sales,
                nomor_telepon: sales.nomor_telepon,
                status_aktif: sales.status_aktif
              }
            })
          }
          
          // Phone number suggestions
          if (sales.nomor_telepon && sales.nomor_telepon.includes(searchTerm)) {
            suggestions.push({
              id: `sales-phone-${sales.id_sales}`,
              type: 'telepon',
              value: sales.nomor_telepon,
              label: sales.nomor_telepon,
              description: `Telepon ${sales.nama_sales}`,
              metadata: {
                id_sales: sales.id_sales,
                nama_sales: sales.nama_sales,
                status_aktif: sales.status_aktif
              }
            })
          }
        })
      }
      
      // Status suggestions
      if ('aktif'.includes(searchTerm) || 'active'.includes(searchTerm)) {
        suggestions.push({
          id: 'status-active',
          type: 'status',
          value: 'true',
          label: 'Sales Aktif',
          description: 'Filter sales yang aktif',
          metadata: { status_value: true }
        })
      }
      
      if ('nonaktif'.includes(searchTerm) || 'inactive'.includes(searchTerm) || 'non-aktif'.includes(searchTerm)) {
        suggestions.push({
          id: 'status-inactive',
          type: 'status',
          value: 'false',
          label: 'Sales Non-aktif',
          description: 'Filter sales yang non-aktif',
          metadata: { status_value: false }
        })
      }
      
      // Phone existence suggestions
      if ('telepon'.includes(searchTerm) || 'phone'.includes(searchTerm) || 'nomor'.includes(searchTerm)) {
        suggestions.push({
          id: 'phone-exists',
          type: 'telepon_exists',
          value: 'true',
          label: 'Ada Nomor Telepon',
          description: 'Filter sales yang memiliki nomor telepon',
          metadata: { has_phone: true }
        })
        
        suggestions.push({
          id: 'phone-not-exists',
          type: 'telepon_exists',
          value: 'false',
          label: 'Tanpa Nomor Telepon',
          description: 'Filter sales yang belum ada nomor telepon',
          metadata: { has_phone: false }
        })
      }
      
      // Date-based suggestions
      const today = new Date()
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      if ('hari ini'.includes(searchTerm) || 'today'.includes(searchTerm) || 'hariini'.includes(searchTerm)) {
        suggestions.push({
          id: 'date-today',
          type: 'tanggal',
          value: today.toISOString().split('T')[0],
          label: 'Dibuat Hari Ini',
          description: 'Sales yang dibuat hari ini',
          metadata: { date_type: 'today' }
        })
      }
      
      if ('minggu ini'.includes(searchTerm) || 'week'.includes(searchTerm) || 'mingguini'.includes(searchTerm)) {
        suggestions.push({
          id: 'date-week',
          type: 'tanggal',
          value: weekAgo.toISOString().split('T')[0],
          label: 'Dibuat Minggu Ini',
          description: 'Sales yang dibuat dalam 7 hari terakhir',
          metadata: { date_type: 'week' }
        })
      }
      
      if ('bulan ini'.includes(searchTerm) || 'month'.includes(searchTerm) || 'bulanini'.includes(searchTerm)) {
        suggestions.push({
          id: 'date-month',
          type: 'tanggal',
          value: monthAgo.toISOString().split('T')[0],
          label: 'Dibuat Bulan Ini',
          description: 'Sales yang dibuat dalam 30 hari terakhir',
          metadata: { date_type: 'month' }
        })
      }
      
      // Remove duplicates and limit results
      const uniqueSuggestions = suggestions
        .filter((suggestion, index, self) => 
          index === self.findIndex((s) => s.id === suggestion.id)
        )
        .slice(0, limit)
      
      console.log('Sales search suggestions response:', {
        query,
        suggestionsCount: uniqueSuggestions.length,
        suggestions: uniqueSuggestions.map(s => ({ type: s.type, label: s.label }))
      })
      
      return createSuccessResponse({
        suggestions: uniqueSuggestions
      })
      
    } catch (error) {
      console.error('Sales search suggestions error:', error)
      return createSuccessResponse({ suggestions: [] })
    }
  })
}