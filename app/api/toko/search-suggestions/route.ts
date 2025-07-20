import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10')
    const types = searchParams.get('types')?.split(',') || ['toko', 'kabupaten', 'kecamatan', 'sales']
    
    console.log('Search suggestions API called with:', { query, limit, types })
    
    if (query.length < 1) {
      console.log('Query too short, returning empty suggestions')
      return createSuccessResponse({ suggestions: [] })
    }
    
    const suggestions = []
    
    // Search Toko
    if (types.includes('toko')) {
      // First, try simple query without JOIN to debug
      const { data: tokoData, error: tokoError } = await supabaseAdmin
        .from('toko')
        .select(`
          id_toko,
          nama_toko,
          kecamatan,
          kabupaten,
          no_telepon,
          id_sales
        `)
        .or(`nama_toko.ilike.%${query}%,no_telepon.ilike.%${query}%`)
        .eq('status_toko', true)
        .limit(Math.ceil(limit / types.length))
        .order('nama_toko')
      
      if (tokoError) {
        console.error('Toko search error:', tokoError)
        console.error('Query details:', { query, limit, types })
      } else {
        console.log('Toko query successful, found:', tokoData?.length || 0, 'results')
      }
      
      if (tokoData && tokoData.length > 0) {
        // For now, create simple suggestions without sales JOIN for debugging
        suggestions.push(...tokoData.map(toko => ({
          id: `toko-${toko.id_toko}`,
          type: 'toko' as const,
          value: toko.nama_toko,
          label: toko.nama_toko,
          description: `${toko.kecamatan ? `${toko.kecamatan}, ` : ''}${toko.kabupaten || ''} • Sales ID: ${toko.id_sales}`.trim(),
          metadata: {
            id_toko: toko.id_toko,
            id_sales: toko.id_sales,
            kecamatan: toko.kecamatan,
            kabupaten: toko.kabupaten,
            no_telepon: toko.no_telepon
          }
        })))
        
        console.log('Added toko suggestions:', suggestions.length)
      }
    }
    
    // Search Kabupaten
    if (types.includes('kabupaten')) {
      const { data: kabupatenData } = await supabaseAdmin
        .from('toko')
        .select('kabupaten')
        .ilike('kabupaten', `%${query}%`)
        .not('kabupaten', 'is', null)
        .eq('status_toko', true)
        .limit(Math.ceil(limit / types.length))
        .order('kabupaten')
      
      if (kabupatenData) {
        const uniqueKabupaten = [...new Set(kabupatenData.map(item => item.kabupaten))]
        
        suggestions.push(...uniqueKabupaten.map(kabupaten => ({
          id: `kabupaten-${kabupaten}`,
          type: 'kabupaten' as const,
          value: kabupaten!,
          label: kabupaten!,
          description: 'Kabupaten',
          metadata: { kabupaten }
        })))
      }
    }
    
    // Search Kecamatan
    if (types.includes('kecamatan')) {
      const { data: kecamatanData } = await supabaseAdmin
        .from('toko')
        .select('kecamatan, kabupaten')
        .ilike('kecamatan', `%${query}%`)
        .not('kecamatan', 'is', null)
        .eq('status_toko', true)
        .limit(Math.ceil(limit / types.length))
        .order('kecamatan')
      
      if (kecamatanData) {
        const uniqueKecamatan = [...new Map(
          kecamatanData.map(item => [`${item.kecamatan}-${item.kabupaten}`, item])
        ).values()]
        
        suggestions.push(...uniqueKecamatan.map(item => ({
          id: `kecamatan-${item.kecamatan}-${item.kabupaten}`,
          type: 'kecamatan' as const,
          value: item.kecamatan!,
          label: item.kecamatan!,
          description: `Kecamatan di ${item.kabupaten || 'Unknown'}`,
          metadata: { 
            kecamatan: item.kecamatan,
            kabupaten: item.kabupaten
          }
        })))
      }
    }
    
    // Search Sales
    if (types.includes('sales')) {
      const { data: salesData, error: salesError } = await supabaseAdmin
        .from('sales')
        .select('id_sales, nama_sales, nomor_telepon')
        .ilike('nama_sales', `%${query}%`)
        .eq('status_aktif', true)
        .limit(Math.ceil(limit / types.length))
        .order('nama_sales')
      
      if (salesError) {
        console.error('Sales search error:', salesError)
      }
      
      if (salesData) {
        suggestions.push(...salesData.map(sales => ({
          id: `sales-${sales.id_sales}`,
          type: 'sales' as const,
          value: sales.nama_sales,
          label: sales.nama_sales,
          description: `Sales ${sales.nomor_telepon ? `• ${sales.nomor_telepon}` : ''}`,
          metadata: {
            id_sales: sales.id_sales,
            nama_sales: sales.nama_sales,
            nomor_telepon: sales.nomor_telepon
          }
        })))
      }
    }
    
    // Search by phone number (if query looks like a phone number)
    if (/^\d+/.test(query) && types.includes('toko')) {
      const { data: phoneData, error: phoneError } = await supabaseAdmin
        .from('toko')
        .select(`
          id_toko,
          nama_toko,
          kecamatan,
          kabupaten,
          no_telepon,
          id_sales
        `)
        .ilike('no_telepon', `%${query}%`)
        .not('no_telepon', 'is', null)
        .eq('status_toko', true)
        .limit(5)
        .order('nama_toko')
      
      if (phoneError) {
        console.error('Phone search error:', phoneError)
      } else {
        console.log('Phone query successful, found:', phoneData?.length || 0, 'results')
      }
      
      if (phoneData && phoneData.length > 0) {
        suggestions.push(...phoneData.map(toko => ({
          id: `phone-${toko.id_toko}`,
          type: 'telepon' as const,
          value: toko.no_telepon!,
          label: toko.no_telepon!,
          description: `${toko.nama_toko} • Sales ID: ${toko.id_sales}`,
          metadata: {
            id_toko: toko.id_toko,
            nama_toko: toko.nama_toko,
            id_sales: toko.id_sales
          }
        })))
        
        console.log('Added phone suggestions:', suggestions.length)
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
        
        // Alphabetical order
        return a.value.localeCompare(b.value)
      })
      .slice(0, limit)
    
    console.log(`Search suggestions for "${query}":`, sortedSuggestions.length, 'results')
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