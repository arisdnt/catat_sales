import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10')
    const types = searchParams.get('types')?.split(',') || ['penagihan', 'toko', 'kabupaten', 'kecamatan', 'sales']
    
    console.log('Penagihan search suggestions API called with:', { query, limit, types })
    
    if (query.length < 1) {
      console.log('Query too short, returning empty suggestions')
      return createSuccessResponse({ suggestions: [] })
    }
    
    const suggestions = []
    
    // Search Penagihan by ID
    if (types.includes('penagihan') && /^\d+/.test(query)) {
      const { data: penagihanData, error: penagihanError } = await supabaseAdmin
        .from('penagihan')
        .select(`
          id_penagihan,
          total_uang_diterima,
          metode_pembayaran,
          ada_potongan,
          dibuat_pada,
          toko!inner(
            nama_toko,
            kecamatan,
            kabupaten,
            sales!inner(
              nama_sales
            )
          )
        `)
        .ilike('id_penagihan', `%${query}%`)
        .limit(Math.ceil(limit / types.length))
        .order('dibuat_pada', { ascending: false })
      
      if (penagihanError) {
        console.error('Penagihan search error:', penagihanError)
      } else {
        console.log('Penagihan query successful, found:', penagihanData?.length || 0, 'results')
      }
      
      if (penagihanData && penagihanData.length > 0) {
        suggestions.push(...penagihanData.map((penagihan: any) => ({
          id: `penagihan-${penagihan.id_penagihan}`,
          type: 'penagihan' as const,
          value: penagihan.id_penagihan.toString(),
          label: `#${penagihan.id_penagihan}`,
          description: `${penagihan.toko.nama_toko} • ${new Date(penagihan.dibuat_pada).toLocaleDateString('id-ID')} • ${penagihan.metode_pembayaran} • Rp ${penagihan.total_uang_diterima.toLocaleString('id-ID')}`,
          metadata: {
            id_penagihan: penagihan.id_penagihan,
            dibuat_pada: penagihan.dibuat_pada,
            nama_toko: penagihan.toko.nama_toko,
            nama_sales: penagihan.toko.sales.nama_sales,
            total_uang_diterima: penagihan.total_uang_diterima,
            metode_pembayaran: penagihan.metode_pembayaran,
            ada_potongan: penagihan.ada_potongan
          }
        })))
        
        console.log('Added penagihan suggestions:', suggestions.length)
      }
    }
    
    // Search Toko names in penagihan context
    if (types.includes('toko')) {
      const { data: tokoData, error: tokoError } = await supabaseAdmin
        .from('penagihan')
        .select(`
          toko!inner(
            id_toko,
            nama_toko,
            kecamatan,
            kabupaten,
            sales!inner(
              id_sales,
              nama_sales
            )
          )
        `)
        .ilike('toko.nama_toko', `%${query}%`)
        .eq('toko.status_toko', true)
        .limit(Math.ceil(limit / types.length))
        .order('toko.nama_toko')
      
      if (tokoError) {
        console.error('Toko search error:', tokoError)
      } else {
        console.log('Toko query successful, found:', tokoData?.length || 0, 'results')
      }
      
      if (tokoData && tokoData.length > 0) {
        // Remove duplicates based on toko name
        const uniqueToko = Array.from(
          new Map(tokoData.map((item: any) => [item.toko.nama_toko, item])).values()
        )
        
        suggestions.push(...uniqueToko.map((item: any) => ({
          id: `toko-${item.toko.id_toko}`,
          type: 'toko' as const,
          value: item.toko.nama_toko,
          label: item.toko.nama_toko,
          description: `${item.toko.kecamatan ? `${item.toko.kecamatan}, ` : ''}${item.toko.kabupaten || ''} • ${item.toko.sales.nama_sales}`.trim(),
          metadata: {
            id_toko: item.toko.id_toko,
            id_sales: item.toko.sales.id_sales,
            nama_sales: item.toko.sales.nama_sales,
            kecamatan: item.toko.kecamatan,
            kabupaten: item.toko.kabupaten
          }
        })))
        
        console.log('Added toko suggestions:', suggestions.length)
      }
    }
    
    // Search Kabupaten from penagihan data
    if (types.includes('kabupaten')) {
      const { data: kabupatenData } = await supabaseAdmin
        .from('penagihan')
        .select(`
          toko!inner(
            kabupaten
          )
        `)
        .ilike('toko.kabupaten', `%${query}%`)
        .not('toko.kabupaten', 'is', null)
        .eq('toko.status_toko', true)
        .limit(Math.ceil(limit / types.length))
        .order('toko.kabupaten')
      
      if (kabupatenData) {
        const uniqueKabupaten = [...new Set(kabupatenData.map((item: any) => item.toko.kabupaten))]
        
        suggestions.push(...uniqueKabupaten.map((kabupaten: any) => ({
          id: `kabupaten-${kabupaten}`,
          type: 'kabupaten' as const,
          value: kabupaten!,
          label: kabupaten!,
          description: 'Kabupaten dengan penagihan',
          metadata: { kabupaten }
        })))
      }
    }
    
    // Search Kecamatan from penagihan data
    if (types.includes('kecamatan')) {
      const { data: kecamatanData } = await supabaseAdmin
        .from('penagihan')
        .select(`
          toko!inner(
            kecamatan,
            kabupaten
          )
        `)
        .ilike('toko.kecamatan', `%${query}%`)
        .not('toko.kecamatan', 'is', null)
        .eq('toko.status_toko', true)
        .limit(Math.ceil(limit / types.length))
        .order('toko.kecamatan')
      
      if (kecamatanData) {
        const uniqueKecamatan = [...new Map(
          kecamatanData.map((item: any) => [`${item.toko.kecamatan}-${item.toko.kabupaten}`, item])
        ).values()]
        
        suggestions.push(...uniqueKecamatan.map((item: any) => ({
          id: `kecamatan-${item.toko.kecamatan}-${item.toko.kabupaten}`,
          type: 'kecamatan' as const,
          value: item.toko.kecamatan!,
          label: item.toko.kecamatan!,
          description: `Kecamatan di ${item.toko.kabupaten || 'Unknown'} dengan penagihan`,
          metadata: { 
            kecamatan: item.toko.kecamatan,
            kabupaten: item.toko.kabupaten
          }
        })))
      }
    }
    
    // Search Sales from penagihan data
    if (types.includes('sales')) {
      const { data: salesData, error: salesError } = await supabaseAdmin
        .from('penagihan')
        .select(`
          toko!inner(
            sales!inner(
              id_sales,
              nama_sales,
              nomor_telepon
            )
          )
        `)
        .ilike('toko.sales.nama_sales', `%${query}%`)
        .eq('toko.sales.status_aktif', true)
        .limit(Math.ceil(limit / types.length))
        .order('toko.sales.nama_sales')
      
      if (salesError) {
        console.error('Sales search error:', salesError)
      }
      
      if (salesData) {
        // Remove duplicates based on sales ID
        const uniqueSales = Array.from(
          new Map(salesData.map((item: any) => [item.toko.sales.id_sales, item])).values()
        )
        
        suggestions.push(...uniqueSales.map((item: any) => ({
          id: `sales-${item.toko.sales.id_sales}`,
          type: 'sales' as const,
          value: item.toko.sales.nama_sales,
          label: item.toko.sales.nama_sales,
          description: `Sales dengan penagihan ${item.toko.sales.nomor_telepon ? `• ${item.toko.sales.nomor_telepon}` : ''}`,
          metadata: {
            id_sales: item.toko.sales.id_sales,
            nama_sales: item.toko.sales.nama_sales,
            nomor_telepon: item.toko.sales.nomor_telepon
          }
        })))
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
        .from('penagihan')
        .select(`
          id_penagihan,
          dibuat_pada,
          total_uang_diterima,
          metode_pembayaran,
          toko!inner(
            nama_toko,
            sales!inner(
              nama_sales
            )
          )
        `)
        .gte('dibuat_pada', searchDate)
        .lt('dibuat_pada', searchDate + 'T23:59:59.999Z')
        .limit(5)
        .order('id_penagihan', { ascending: false })
      
      if (dateError) {
        console.error('Date search error:', dateError)
      } else {
        console.log('Date query successful, found:', dateData?.length || 0, 'results')
      }
      
      if (dateData && dateData.length > 0) {
        suggestions.push(...dateData.map(penagihan => ({
          id: `date-${penagihan.id_penagihan}`,
          type: 'tanggal' as const,
          value: penagihan.dibuat_pada.split('T')[0],
          label: new Date(penagihan.dibuat_pada).toLocaleDateString('id-ID'),
          description: `${dateData.length} penagihan pada tanggal ini`,
          metadata: {
            dibuat_pada: penagihan.dibuat_pada,
            count: dateData.length
          }
        })))
        
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
        
        // Priority by type (penagihan > toko > sales > location)
        const typePriority = { penagihan: 4, toko: 3, sales: 2, kabupaten: 1, kecamatan: 1, tanggal: 1 }
        const aPriority = typePriority[a.type as keyof typeof typePriority] || 0
        const bPriority = typePriority[b.type as keyof typeof typePriority] || 0
        if (aPriority !== bPriority) return bPriority - aPriority
        
        // Alphabetical order
        return a.value.localeCompare(b.value)
      })
      .slice(0, limit)
    
    console.log(`Penagihan search suggestions for "${query}":`, sortedSuggestions.length, 'results')
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