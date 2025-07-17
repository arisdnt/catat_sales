import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')

    switch (type) {
      case 'pengiriman':
        return await getLaporanPengiriman(start_date, end_date)
      case 'penagihan':
        return await getLaporanPenagihan(start_date, end_date)
      case 'rekonsiliasi':
        return await getLaporanRekonsiliasi(start_date, end_date)
      case 'dashboard-stats':
        return await getDashboardStats()
      default:
        return createErrorResponse('Invalid report type. Use: pengiriman, penagihan, rekonsiliasi, or dashboard-stats')
    }
  })
}

async function getLaporanPengiriman(start_date?: string | null, end_date?: string | null) {
  try {
    let query = supabaseAdmin
      .from('v_laporan_pengiriman')
      .select('*')
      .order('tanggal_kirim', { ascending: false })

    if (start_date) {
      query = query.gte('tanggal_kirim', start_date)
    }
    if (end_date) {
      query = query.lte('tanggal_kirim', end_date)
    }

    const { data, error } = await query

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse(data)
  } catch (error) {
    return createErrorResponse('Failed to fetch shipment report')
  }
}

async function getLaporanPenagihan(start_date?: string | null, end_date?: string | null) {
  try {
    let query = supabaseAdmin
      .from('v_laporan_penagihan')
      .select('*')
      .order('tanggal_tagih', { ascending: false })

    if (start_date) {
      query = query.gte('tanggal_tagih', start_date)
    }
    if (end_date) {
      query = query.lte('tanggal_tagih', end_date)
    }

    const { data, error } = await query

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse(data)
  } catch (error) {
    return createErrorResponse('Failed to fetch billing report')
  }
}

async function getLaporanRekonsiliasi(start_date?: string | null, end_date?: string | null) {
  try {
    let query = supabaseAdmin
      .from('v_rekonsiliasi_setoran')
      .select('*')
      .order('tanggal_setoran', { ascending: false })

    if (start_date) {
      query = query.gte('tanggal_setoran', start_date)
    }
    if (end_date) {
      query = query.lte('tanggal_setoran', end_date)
    }

    const { data, error } = await query

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse(data)
  } catch (error) {
    return createErrorResponse('Failed to fetch reconciliation report')
  }
}

async function getDashboardStats() {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    const [
      { count: pengirimanCount },
      { count: penagihanCount },
      { count: setoranCount },
      { count: tokoCount },
      { data: pendapatanData }
    ] = await Promise.all([
      supabaseAdmin.from('pengiriman').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('penagihan').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('setoran').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('toko').select('*', { count: 'exact', head: true }).eq('status_toko', true),
      supabaseAdmin
        .from('penagihan')
        .select('total_uang_diterima')
        .gte('dibuat_pada', today + 'T00:00:00')
        .lt('dibuat_pada', today + 'T23:59:59')
    ])

    const pendapatanHarian = pendapatanData?.reduce((sum, item) => sum + item.total_uang_diterima, 0) || 0

    const stats = {
      totalPengiriman: pengirimanCount || 0,
      totalPenagihan: penagihanCount || 0,
      totalSetoran: setoranCount || 0,
      totalToko: tokoCount || 0,
      pendapatanHarian,
    }

    return createSuccessResponse(stats)
  } catch (error) {
    return createErrorResponse('Failed to fetch dashboard stats')
  }
}