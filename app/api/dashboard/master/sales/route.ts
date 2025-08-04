import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let salesData: any[] = []
    let salesError: any = null

    if (startDate && endDate) {
      // When date filter is applied, get sales who have transactions in the date range
      const endDateWithTime = endDate + 'T23:59:59.999Z'
      
      // Get sales IDs from pengiriman transactions
      const { data: pengirimanSales } = await supabase
        .from('pengiriman')
        .select(`
          toko!inner(
            id_sales
          )
        `)
        .gte('tanggal_kirim', startDate)
        .lte('tanggal_kirim', endDateWithTime)
      
      // Get sales IDs from penagihan transactions
      const { data: penagihanSales } = await supabase
        .from('penagihan')
        .select(`
          toko!inner(
            id_sales
          )
        `)
        .gte('dibuat_pada', startDate)
        .lte('dibuat_pada', endDateWithTime)
      
      // Combine and deduplicate sales IDs
      const salesIds = new Set<string>()
      pengirimanSales?.forEach((p: any) => salesIds.add(p.toko.id_sales))
      penagihanSales?.forEach((p: any) => salesIds.add(p.toko.id_sales))
      
      if (salesIds.size > 0) {
        // Get sales data for those who have transactions
        const { data, error } = await supabase
          .from('sales')
          .select(`
            id_sales,
            nama_sales,
            nomor_telepon,
            status_aktif,
            dibuat_pada,
            diperbarui_pada
          `)
          .in('id_sales', Array.from(salesIds))
          .order('status_aktif', { ascending: false })
          .order('nama_sales', { ascending: true })
        
        salesData = data || []
        salesError = error
      }
    } else {
      // When no date filter, get all sales
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id_sales,
          nama_sales,
          nomor_telepon,
          status_aktif,
          dibuat_pada,
          diperbarui_pada
        `)
        .order('status_aktif', { ascending: false })
        .order('nama_sales', { ascending: true })
      
      salesData = data || []
      salesError = error
    }

    if (salesError) {
      console.error('Error fetching sales data:', salesError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch sales data',
          details: salesError.message 
        }, 
        { status: 500 }
      )
    }

    // For each sales, get statistics from related tables
    const enrichedData = await Promise.all(
      (salesData || []).map(async (sales) => {
        try {
          // Get total stores for this sales
          const { count: totalStores } = await supabase
            .from('toko')
            .select('*', { count: 'exact', head: true })
            .eq('id_sales', sales.id_sales)

          // Get toko IDs for this sales
          const { data: tokoData } = await supabase
            .from('toko')
            .select('id_toko')
            .eq('id_sales', sales.id_sales)

          const tokoIds = tokoData?.map(t => t.id_toko) || []

          let totalRevenue = 0
          let quantityShipped = 0
          let quantitySold = 0
          const detailShipped: any[] = []
          const detailSold: any[] = []

          if (tokoIds.length > 0) {
            // Build penagihan query with date filter if provided
            let penagihanQuery = supabase
              .from('penagihan')
              .select('total_uang_diterima')
              .in('id_toko', tokoIds)
            
            if (startDate && endDate) {
              penagihanQuery = penagihanQuery
                .gte('dibuat_pada', startDate)
                .lte('dibuat_pada', endDate + 'T23:59:59.999Z')
            }
            
            const { data: penagihanData } = await penagihanQuery
            totalRevenue = penagihanData?.reduce((sum, p) => sum + (p.total_uang_diterima || 0), 0) || 0

            // Build pengiriman query with date filter if provided
            let pengirimanQuery = supabase
              .from('pengiriman')
              .select(`
                id_pengiriman,
                detail_pengiriman!inner(
                  jumlah_kirim,
                  produk!inner(
                    nama_produk
                  )
                )
              `)
              .in('id_toko', tokoIds)
            
            if (startDate && endDate) {
              pengirimanQuery = pengirimanQuery
                .gte('tanggal_kirim', startDate)
                .lte('tanggal_kirim', endDate + 'T23:59:59.999Z')
            }
            
            const { data: pengirimanData } = await pengirimanQuery

            // Process shipping data
            pengirimanData?.forEach(pengiriman => {
              pengiriman.detail_pengiriman?.forEach((detail: any) => {
                quantityShipped += detail.jumlah_kirim || 0
                if (detail.produk?.nama_produk) {
                  const existing = detailShipped.find(d => d.nama_produk === detail.produk.nama_produk)
                  if (existing) {
                    existing.jumlah += detail.jumlah_kirim || 0
                  } else {
                    detailShipped.push({
                      nama_produk: detail.produk.nama_produk,
                      jumlah: detail.jumlah_kirim || 0
                    })
                  }
                }
              })
            })

            // Build penagihan detail query with date filter if provided
            let penagihanDetailQuery = supabase
              .from('penagihan')
              .select(`
                id_penagihan,
                detail_penagihan!inner(
                  jumlah_terjual,
                  produk!inner(
                    nama_produk
                  )
                )
              `)
              .in('id_toko', tokoIds)
            
            if (startDate && endDate) {
              penagihanDetailQuery = penagihanDetailQuery
                .gte('dibuat_pada', startDate)
                .lte('dibuat_pada', endDate + 'T23:59:59.999Z')
            }
            
            const { data: penagihanDetailData } = await penagihanDetailQuery

            // Process billing data
            penagihanDetailData?.forEach(penagihan => {
              penagihan.detail_penagihan?.forEach((detail: any) => {
                quantitySold += detail.jumlah_terjual || 0
                if (detail.produk?.nama_produk) {
                  const existing = detailSold.find(d => d.nama_produk === detail.produk.nama_produk)
                  if (existing) {
                    existing.jumlah += detail.jumlah_terjual || 0
                  } else {
                    detailSold.push({
                      nama_produk: detail.produk.nama_produk,
                      jumlah: detail.jumlah_terjual || 0
                    })
                  }
                }
              })
            })
          }

          return {
            ...sales,
            total_stores: totalStores || 0,
            total_revenue: totalRevenue,
            quantity_shipped: quantityShipped,
            quantity_sold: quantitySold,
            detail_shipped: JSON.stringify(detailShipped),
            detail_sold: JSON.stringify(detailSold)
          }
        } catch (error) {
          console.error(`Error enriching data for sales ${sales.id_sales}:`, error)
          return {
            ...sales,
            total_stores: 0,
            total_revenue: 0,
            quantity_shipped: 0,
            quantity_sold: 0,
            detail_shipped: JSON.stringify([]),
            detail_sold: JSON.stringify([])
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: enrichedData
    })
  } catch (error: any) {
    console.error('Unexpected error in master sales API:', error)
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