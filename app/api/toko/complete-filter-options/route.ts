import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { searchParams } = new URL(request.url)
    const includeCount = searchParams.get('include_count') === 'true'
    const onlyActive = searchParams.get('only_active') !== 'false' // default true
    
    // Get all kabupaten with counts
    const kabupatenQuery = supabaseAdmin
      .from('toko')
      .select('kabupaten')
      .not('kabupaten', 'is', null)
    
    if (onlyActive) {
      kabupatenQuery.eq('status_toko', true)
    }
    
    const { data: kabupatenRaw } = await kabupatenQuery
    
    const kabupatenMap = new Map<string, number>()
    kabupatenRaw?.forEach(item => {
      const kabupaten = item.kabupaten!
      kabupatenMap.set(kabupaten, (kabupatenMap.get(kabupaten) || 0) + 1)
    })
    
    const kabupatenOptions = Array.from(kabupatenMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([kabupaten, count]) => ({
        value: kabupaten,
        label: kabupaten,
        ...(includeCount && { count })
      }))
    
    // Get all kecamatan with counts and kabupaten info
    const kecamatanQuery = supabaseAdmin
      .from('toko')
      .select('kecamatan, kabupaten')
      .not('kecamatan', 'is', null)
    
    if (onlyActive) {
      kecamatanQuery.eq('status_toko', true)
    }
    
    const { data: kecamatanRaw } = await kecamatanQuery
    
    const kecamatanMap = new Map<string, { count: number; kabupaten: Set<string> }>()
    kecamatanRaw?.forEach(item => {
      const kecamatan = item.kecamatan!
      const kabupaten = item.kabupaten || 'Unknown'
      
      if (!kecamatanMap.has(kecamatan)) {
        kecamatanMap.set(kecamatan, { count: 0, kabupaten: new Set() })
      }
      
      const entry = kecamatanMap.get(kecamatan)!
      entry.count += 1
      entry.kabupaten.add(kabupaten)
    })
    
    const kecamatanOptions = Array.from(kecamatanMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([kecamatan, { count, kabupaten }]) => ({
        value: kecamatan,
        label: kecamatan,
        description: `${Array.from(kabupaten).join(', ')}`,
        ...(includeCount && { count })
      }))
    
    // Get all active sales
    const { data: salesData } = await supabaseAdmin
      .from('sales')
      .select('id_sales, nama_sales, nomor_telepon')
      .eq('status_aktif', true)
      .order('nama_sales')
    
    const salesOptions = salesData?.map(sales => ({
      value: sales.id_sales.toString(),
      label: sales.nama_sales,
      description: sales.nomor_telepon || undefined
    })) || []
    
    // Get sales with store counts if include_count is true
    let salesWithCounts = salesOptions
    if (includeCount) {
      const salesCountQuery = supabaseAdmin
        .from('toko')
        .select('id_sales')
      
      if (onlyActive) {
        salesCountQuery.eq('status_toko', true)
      }
      
      const { data: salesCountData } = await salesCountQuery
      
      const salesCountMap = new Map<number, number>()
      salesCountData?.forEach(item => {
        salesCountMap.set(item.id_sales, (salesCountMap.get(item.id_sales) || 0) + 1)
      })
      
      salesWithCounts = salesOptions.map(sales => ({
        ...sales,
        count: salesCountMap.get(parseInt(sales.value)) || 0
      }))
    }
    
    // Status options
    const statusOptions: Array<{ value: string; label: string; count?: number }> = [
      { value: 'true', label: 'Aktif' },
      { value: 'false', label: 'Non-aktif' }
    ]
    
    if (includeCount) {
      const { data: statusCounts } = await supabaseAdmin
        .from('toko')
        .select('status_toko')
      
      const activeCount = statusCounts?.filter(item => item.status_toko).length || 0
      const inactiveCount = statusCounts?.filter(item => !item.status_toko).length || 0
      
      statusOptions[0] = { value: 'true', label: 'Aktif', count: activeCount }
      statusOptions[1] = { value: 'false', label: 'Non-aktif', count: inactiveCount }
    }
    
    // Get summary statistics
    const { data: summaryData } = await supabaseAdmin
      .from('toko')
      .select('id_toko, status_toko, kabupaten, kecamatan, id_sales')
    
    const summary = {
      total_stores: summaryData?.length || 0,
      active_stores: summaryData?.filter(item => item.status_toko).length || 0,
      inactive_stores: summaryData?.filter(item => !item.status_toko).length || 0,
      unique_kabupaten: kabupatenOptions.length,
      unique_kecamatan: kecamatanOptions.length,
      active_sales: salesOptions.length,
      last_updated: new Date().toISOString()
    }
    
    return createSuccessResponse({
      kabupaten: kabupatenOptions,
      kecamatan: kecamatanOptions,
      sales: salesWithCounts,
      status: statusOptions,
      summary
    })
  })
}