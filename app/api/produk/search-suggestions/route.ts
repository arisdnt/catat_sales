import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10')
    const types = searchParams.get('types')?.split(',') || ['produk', 'kategori', 'harga', 'priority']
    
    console.log('Produk search suggestions API called with:', { query, limit, types })
    
    if (query.length < 1) {
      console.log('Query too short, returning empty suggestions')
      return createSuccessResponse({ suggestions: [] })
    }
    
    const suggestions = []
    
    // Search Products by ID
    if (types.includes('produk') && /^\d+/.test(query)) {
      const { data: produkData, error: produkError } = await supabaseAdmin
        .from('produk')
        .select(`
          id_produk,
          nama_produk,
          harga_satuan,
          status_produk,
          is_priority,
          dibuat_pada
        `)
        .ilike('id_produk', `%${query}%`)
        .eq('status_produk', true)
        .limit(Math.ceil(limit / types.length))
        .order('nama_produk')
      
      if (produkError) {
        console.error('Produk search error:', produkError)
      } else {
        console.log('Produk query successful, found:', produkData?.length || 0, 'results')
      }
      
      if (produkData && produkData.length > 0) {
        suggestions.push(...produkData.map((produk: any) => ({
          id: `produk-${produk.id_produk}`,
          type: 'produk' as const,
          value: produk.id_produk.toString(),
          label: `#${produk.id_produk}`,
          description: `${produk.nama_produk} • Rp ${produk.harga_satuan.toLocaleString('id-ID')} • ${produk.is_priority ? 'Prioritas' : 'Standar'}`,
          metadata: {
            id_produk: produk.id_produk,
            nama_produk: produk.nama_produk,
            harga_satuan: produk.harga_satuan,
            status_produk: produk.status_produk,
            is_priority: produk.is_priority
          }
        })))
        
        console.log('Added produk suggestions:', suggestions.length)
      }
    }
    
    // Search Products by name
    if (types.includes('produk')) {
      const { data: produkNameData, error: produkNameError } = await supabaseAdmin
        .from('produk')
        .select(`
          id_produk,
          nama_produk,
          harga_satuan,
          status_produk,
          is_priority,
          dibuat_pada
        `)
        .ilike('nama_produk', `%${query}%`)
        .eq('status_produk', true)
        .limit(Math.ceil(limit / types.length))
        .order('nama_produk')
      
      if (produkNameError) {
        console.error('Produk name search error:', produkNameError)
      } else {
        console.log('Produk name query successful, found:', produkNameData?.length || 0, 'results')
      }
      
      if (produkNameData && produkNameData.length > 0) {
        // Remove duplicates from ID search
        const existingIds = new Set(suggestions.map(s => s.metadata?.id_produk))
        const newSuggestions = produkNameData
          .filter(produk => !existingIds.has(produk.id_produk))
          .map((produk: any) => ({
            id: `produk-name-${produk.id_produk}`,
            type: 'produk' as const,
            value: produk.nama_produk,
            label: produk.nama_produk,
            description: `#${produk.id_produk} • Rp ${produk.harga_satuan.toLocaleString('id-ID')} • ${produk.is_priority ? 'Prioritas' : 'Standar'}`,
            metadata: {
              id_produk: produk.id_produk,
              nama_produk: produk.nama_produk,
              harga_satuan: produk.harga_satuan,
              status_produk: produk.status_produk,
              is_priority: produk.is_priority
            }
          }))
        
        suggestions.push(...newSuggestions)
        console.log('Added produk name suggestions:', suggestions.length)
      }
    }
    
    // Search by price range
    if (types.includes('harga') && /\d+/.test(query)) {
      const priceQuery = parseInt(query.replace(/\D/g, ''))
      if (priceQuery > 0) {
        const { data: priceData, error: priceError } = await supabaseAdmin
          .from('produk')
          .select(`
            id_produk,
            nama_produk,
            harga_satuan,
            status_produk,
            is_priority
          `)
          .gte('harga_satuan', priceQuery * 0.8) // 80% of query price
          .lte('harga_satuan', priceQuery * 1.2) // 120% of query price
          .eq('status_produk', true)
          .limit(5)
          .order('harga_satuan')
        
        if (priceError) {
          console.error('Price search error:', priceError)
        }
        
        if (priceData && priceData.length > 0) {
          const existingIds = new Set(suggestions.map(s => s.metadata?.id_produk))
          const newSuggestions = priceData
            .filter(produk => !existingIds.has(produk.id_produk))
            .map((produk: any) => ({
              id: `price-${produk.id_produk}`,
              type: 'harga' as const,
              value: produk.harga_satuan.toString(),
              label: `Rp ${produk.harga_satuan.toLocaleString('id-ID')}`,
              description: `${produk.nama_produk} • ${produk.is_priority ? 'Prioritas' : 'Standar'}`,
              metadata: {
                id_produk: produk.id_produk,
                nama_produk: produk.nama_produk,
                harga_satuan: produk.harga_satuan,
                is_priority: produk.is_priority
              }
            }))
          
          suggestions.push(...newSuggestions)
          console.log('Added price suggestions:', suggestions.length)
        }
      }
    }
    
    // Search by priority status
    if (types.includes('priority') && /prioritas|priority|standar|standard/i.test(query)) {
      const isPriorityQuery = /prioritas|priority/i.test(query)
      
      const { data: priorityData, error: priorityError } = await supabaseAdmin
        .from('produk')
        .select(`
          id_produk,
          nama_produk,
          harga_satuan,
          is_priority,
          priority_order
        `)
        .eq('is_priority', isPriorityQuery)
        .eq('status_produk', true)
        .limit(5)
        .order(isPriorityQuery ? 'priority_order' : 'nama_produk')
      
      if (priorityError) {
        console.error('Priority search error:', priorityError)
      }
      
      if (priorityData && priorityData.length > 0) {
        suggestions.push({
          id: `priority-${isPriorityQuery}`,
          type: 'priority' as const,
          value: isPriorityQuery.toString(),
          label: isPriorityQuery ? 'Produk Prioritas' : 'Produk Standar',
          description: `${priorityData.length} produk ${isPriorityQuery ? 'prioritas' : 'standar'} tersedia`,
          metadata: {
            is_priority: isPriorityQuery,
            count: priorityData.length,
            products: priorityData.slice(0, 3).map(p => p.nama_produk)
          }
        })
        
        console.log('Added priority suggestions:', suggestions.length)
      }
    }
    
    // Search by date pattern (YYYY-MM-DD or DD/MM/YYYY)
    if (/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/.test(query)) {
      let searchDate = query
      
      // Convert DD/MM/YYYY to YYYY-MM-DD
      if (query.includes('/')) {
        const parts = query.split('/')
        if (parts.length === 3) {
          searchDate = `${parts[2]}-${parts[1]}-${parts[0]}`
        }
      }
      
      const { data: dateData, error: dateError } = await supabaseAdmin
        .from('produk')
        .select(`
          id_produk,
          nama_produk,
          harga_satuan,
          dibuat_pada,
          is_priority
        `)
        .gte('dibuat_pada', searchDate)
        .lt('dibuat_pada', searchDate + 'T23:59:59.999Z')
        .eq('status_produk', true)
        .limit(5)
        .order('dibuat_pada', { ascending: false })
      
      if (dateError) {
        console.error('Date search error:', dateError)
      } else {
        console.log('Date query successful, found:', dateData?.length || 0, 'results')
      }
      
      if (dateData && dateData.length > 0) {
        suggestions.push({
          id: `date-${searchDate}`,
          type: 'tanggal' as const,
          value: searchDate,
          label: new Date(searchDate).toLocaleDateString('id-ID'),
          description: `${dateData.length} produk dibuat pada tanggal ini`,
          metadata: {
            dibuat_pada: searchDate,
            count: dateData.length,
            products: dateData.slice(0, 3).map(p => p.nama_produk)
          }
        })
        
        console.log('Added date suggestions:', suggestions.length)
      }
    }
    
    // Sort by relevance and limit
    const sortedSuggestions = suggestions
      .sort((a, b) => {
        // Exact matches first
        const aExact = a.value.toLowerCase() === query.toLowerCase() ? 1 : 0
        const bExact = b.value.toLowerCase() === query.toLowerCase() ? 1 : 0
        if (aExact !== bExact) return bExact - aExact
        
        // Starts with query next
        const aStarts = a.value.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 0
        const bStarts = b.value.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 0
        if (aStarts !== bStarts) return bStarts - aStarts
        
        // Priority by type (produk > harga > priority > date)
        const typePriority = { produk: 4, harga: 3, priority: 2, tanggal: 1 }
        const aPriority = typePriority[a.type as keyof typeof typePriority] || 0
        const bPriority = typePriority[b.type as keyof typeof typePriority] || 0
        if (aPriority !== bPriority) return bPriority - aPriority
        
        // Alphabetical order
        return a.value.localeCompare(b.value)
      })
      .slice(0, limit)
    
    console.log(`Produk search suggestions for "${query}":`, sortedSuggestions.length, 'results')
    if (sortedSuggestions.length === 0) {
      console.log('No suggestions found. Debug info:', {
        query,
        limit,
        types,
        totalSuggestions: suggestions.length
      })
    }
    
    return createSuccessResponse({ suggestions: sortedSuggestions })
  })
}