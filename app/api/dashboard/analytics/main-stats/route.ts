import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0]

    // Call the new dashboard analytics function
    const { data, error } = await supabase.rpc('get_dashboard_main_stats', {
      start_date: startDate,
      end_date: endDate
    })

    if (error) {
      console.error('[Dashboard Analytics] Error calling get_dashboard_main_stats:', error)
      
      // If function doesn't exist, return fallback data
      if (error.message?.includes('function get_dashboard_main_stats') || error.code === '42883') {
        console.warn('[Dashboard Analytics] Function not found, using fallback data')
        return NextResponse.json({
          success: true,
          data: {
            total_barang_terkirim: 0,
            total_barang_terjual: 0,
            total_stok_di_toko: 0,
            total_pendapatan: 0,
            estimasi_aset_di_toko: 0,
            period: {
              start_date: startDate,
              end_date: endDate
            },
            _fallback: true,
            _message: 'Database functions belum di-deploy. Jalankan migration_dashboard_analytics.sql terlebih dahulu.'
          }
        })
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch dashboard main statistics',
          details: error.message 
        }, 
        { status: 500 }
      )
    }

    // The function returns a single row, so we take the first element
    const statsData = Array.isArray(data) ? data[0] : data

    return NextResponse.json({
      success: true,
      data: {
        total_barang_terkirim: statsData?.total_barang_terkirim || 0,
        total_barang_terjual: statsData?.total_barang_terjual || 0,
        total_stok_di_toko: statsData?.total_stok_di_toko || 0,
        total_pendapatan: statsData?.total_pendapatan || 0,
        estimasi_aset_di_toko: statsData?.estimasi_aset_di_toko || 0,
        period: {
          start_date: startDate,
          end_date: endDate
        }
      }
    })

  } catch (error: any) {
    console.error('[Dashboard Analytics] Unexpected error in main-stats API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      }, 
      { status: 500 }
    )
  }
}