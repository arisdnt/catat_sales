import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    
    if (!type || !['kabupaten', 'kecamatan', 'sales'].includes(type)) {
      return createErrorResponse('Invalid type parameter. Must be: kabupaten, kecamatan, or sales')
    }
    
    let data
    
    switch (type) {
      case 'kabupaten':
        const { data: kabupatenData } = await supabaseAdmin
          .from('toko')
          .select('kabupaten')
          .not('kabupaten', 'is', null)
          .order('kabupaten')
        
        data = [...new Set(kabupatenData?.map(item => item.kabupaten))]
        break
        
      case 'kecamatan':
        const { data: kecamatanData } = await supabaseAdmin
          .from('toko')
          .select('kecamatan')
          .not('kecamatan', 'is', null)
          .order('kecamatan')
        
        data = [...new Set(kecamatanData?.map(item => item.kecamatan))]
        break
        
      case 'sales':
        const { data: salesData } = await supabaseAdmin
          .from('sales')
          .select('id_sales, nama_sales')
          .eq('status_aktif', true)
          .order('nama_sales')
        
        data = salesData || []
        break
    }
    
    return createSuccessResponse({ data })
  })
}