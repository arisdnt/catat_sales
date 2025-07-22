import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

interface ProductDetail {
  nama_produk: string
  jumlah: number
}




interface InitialStock {
  id_produk: number
  jumlah: number
}

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const status_toko = searchParams.get('status_toko')
    const include_sales = searchParams.get('include_sales')
    const search = searchParams.get('search')
    const sales_id = searchParams.get('sales_id')
    const id_sales = searchParams.get('id_sales')
    const kabupaten = searchParams.get('kabupaten')
    const kecamatan = searchParams.get('kecamatan')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit
    
    // Get total count first
    let countQuery = supabaseAdmin
      .from('toko')
      .select('*', { count: 'exact', head: true })
    
    // Apply filters to count query
    if (status === 'active') {
      countQuery = countQuery.eq('status_toko', true)
    }
    if (status_toko) {
      countQuery = countQuery.eq('status_toko', status_toko === 'true')
    }
    if (search) {
      countQuery = countQuery.or(`nama_toko.ilike.%${search}%,kecamatan.ilike.%${search}%,kabupaten.ilike.%${search}%`)
    }
    if (sales_id) {
      countQuery = countQuery.eq('id_sales', sales_id)
    }
    if (id_sales) {
      countQuery = countQuery.eq('id_sales', id_sales)
    }
    if (kabupaten) {
      countQuery = countQuery.eq('kabupaten', kabupaten)
    }
    if (kecamatan) {
      countQuery = countQuery.eq('kecamatan', kecamatan)
    }
    
    const { count: totalCount, error: countError } = await countQuery
    
    if (countError) {
      return createErrorResponse(countError.message)
    }
    
    let query = supabaseAdmin
      .from('toko')
      .select(include_sales === 'true' ? `
        id_toko,
        nama_toko,
        kecamatan,
        kabupaten,
        no_telepon,
        link_gmaps,
        status_toko,
        dibuat_pada,
        diperbarui_pada,
        id_sales,
        sales!inner(
          id_sales,
          nama_sales,
          nomor_telepon,
          status_aktif
        )
      ` : '*')
      .order('nama_toko')
      .range(offset, offset + limit - 1)

    // Apply filters to main query
    if (status === 'active') {
      query = query.eq('status_toko', true)
    }
    if (status_toko) {
      query = query.eq('status_toko', status_toko === 'true')
    }
    if (search) {
      query = query.or(`nama_toko.ilike.%${search}%,kecamatan.ilike.%${search}%,kabupaten.ilike.%${search}%`)
    }
    if (sales_id) {
      query = query.eq('id_sales', sales_id)
    }
    if (id_sales) {
      query = query.eq('id_sales', id_sales)
    }
    if (kabupaten) {
      query = query.eq('kabupaten', kabupaten)
    }
    if (kecamatan) {
      query = query.eq('kecamatan', kecamatan)
    }

    const { data: tokoData, error } = await query

    if (error) {
      return createErrorResponse(error.message)
    }

    if (!tokoData || !Array.isArray(tokoData)) {
      return createErrorResponse('Invalid data received from database')
    }

    // Batch queries to avoid N+1 problem
    const tokoIds = tokoData.map((toko: any) => toko.id_toko)
    
    // Get all pengiriman data for these tokos in one query
    const { data: allPengirimanData } = await supabaseAdmin
      .from('pengiriman')
      .select(`
        id_toko,
        detail_pengiriman(
          jumlah_kirim,
          produk(nama_produk)
        )
      `)
      .in('id_toko', tokoIds)

    // Get all penagihan data for these tokos in one query
    const { data: allPenagihanData } = await supabaseAdmin
      .from('penagihan')
      .select(`
        id_toko,
        detail_penagihan(
          jumlah_terjual,
          jumlah_kembali,
          produk(nama_produk)
        )
      `)
      .in('id_toko', tokoIds)

    // Group data by toko_id for efficient lookup
    const pengirimanByToko = new Map()
    const penagihanByToko = new Map()
    
    allPengirimanData?.forEach((pengiriman: any) => {
      if (!pengirimanByToko.has(pengiriman.id_toko)) {
        pengirimanByToko.set(pengiriman.id_toko, [])
      }
      pengirimanByToko.get(pengiriman.id_toko).push(pengiriman)
    })
    
    allPenagihanData?.forEach((penagihan: any) => {
      if (!penagihanByToko.has(penagihan.id_toko)) {
        penagihanByToko.set(penagihan.id_toko, [])
      }
      penagihanByToko.get(penagihan.id_toko).push(penagihan)
    })

    // Enrich data with barang statistics
    const enrichedData = tokoData.map((toko: any) => {
        const pengirimanData = pengirimanByToko.get(toko.id_toko) || []
        const penagihanData = penagihanByToko.get(toko.id_toko) || []

        // Calculate aggregated data
        let barangTerkirim = 0
        let barangTerbayar = 0
        const detailBarangTerkirim: ProductDetail[] = []
        const detailBarangTerbayar: ProductDetail[] = []
        const detailSisaStok: ProductDetail[] = []

        // Process pengiriman data
        if (pengirimanData) {
          const produkTerkirim: { [key: string]: number } = {}
          pengirimanData.forEach((pengiriman: any) => {
            pengiriman.detail_pengiriman?.forEach((detail: any) => {
              const produk = Array.isArray(detail.produk) ? detail.produk[0] : detail.produk
              const namaProduk = produk?.nama_produk || 'Unknown'
              barangTerkirim += detail.jumlah_kirim
              produkTerkirim[namaProduk] = (produkTerkirim[namaProduk] || 0) + detail.jumlah_kirim
            })
          })
          
          Object.entries(produkTerkirim).forEach(([nama, jumlah]) => {
            detailBarangTerkirim.push({ nama_produk: nama, jumlah })
          })
        }

        // Process penagihan data
        if (penagihanData) {
          const produkTerbayar: { [key: string]: number } = {}
          penagihanData.forEach((penagihan: any) => {
            penagihan.detail_penagihan?.forEach((detail: any) => {
              const produk = Array.isArray(detail.produk) ? detail.produk[0] : detail.produk
              const namaProduk = produk?.nama_produk || 'Unknown'
              const netTerbayar = (detail.jumlah_terjual || 0) - (detail.jumlah_kembali || 0)
              barangTerbayar += netTerbayar
              produkTerbayar[namaProduk] = (produkTerbayar[namaProduk] || 0) + netTerbayar
            })
          })
          
          Object.entries(produkTerbayar).forEach(([nama, jumlah]) => {
            detailBarangTerbayar.push({ nama_produk: nama, jumlah })
          })
        }

        // Calculate sisa stok (terkirim - terbayar)
        const sisaStokMap: { [key: string]: number } = {}
        detailBarangTerkirim.forEach(item => {
          sisaStokMap[item.nama_produk] = item.jumlah
        })
        detailBarangTerbayar.forEach(item => {
          sisaStokMap[item.nama_produk] = (sisaStokMap[item.nama_produk] || 0) - item.jumlah
        })
        
        Object.entries(sisaStokMap).forEach(([nama, jumlah]) => {
          if (jumlah > 0) {
            detailSisaStok.push({ nama_produk: nama, jumlah })
          }
        })

        const sisaStok = detailSisaStok.reduce((total, item) => total + item.jumlah, 0)

        return {
          ...toko,
          barang_terkirim: barangTerkirim,
          barang_terbayar: barangTerbayar,
          sisa_stok: sisaStok,
          detail_barang_terkirim: detailBarangTerkirim,
          detail_barang_terbayar: detailBarangTerbayar,
          detail_sisa_stok: detailSisaStok
        }
      })

    const totalPages = Math.ceil((totalCount || 0) / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return createSuccessResponse({
      data: enrichedData,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    })
  })
}


export async function POST(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const body = await request.json()
    const { nama_toko, id_sales, kecamatan, kabupaten, no_telepon, link_gmaps, hasInitialStock, initialStock } = body

    if (!nama_toko || !id_sales) {
      return createErrorResponse('Nama toko and id_sales are required')
    }

    // Verify sales exists and is active
    const { data: salesData, error: salesError } = await supabaseAdmin
      .from('sales')
      .select('id_sales')
      .eq('id_sales', id_sales)
      .eq('status_aktif', true)
      .single()

    if (salesError || !salesData) {
      return createErrorResponse('Sales not found or inactive')
    }

    // Create toko first
    const { data: tokoData, error: tokoError } = await supabaseAdmin
      .from('toko')
      .insert([{
        nama_toko,
        id_sales: parseInt(id_sales),
        kecamatan: kecamatan || null,
        kabupaten: kabupaten || null,
        no_telepon: no_telepon || null,
        link_gmaps: link_gmaps || null,
        status_toko: true
      }])
      .select(`
        *,
        sales!inner(
          id_sales,
          nama_sales,
          nomor_telepon,
          status_aktif
        )
      `)
      .single()

    if (tokoError) {
      return createErrorResponse(tokoError.message)
    }

    // Handle initial stock if enabled
    if (hasInitialStock && initialStock && initialStock.length > 0) {
      try {
        // Create pengiriman record for initial stock
        const { data: pengirimanData, error: pengirimanError } = await supabaseAdmin
          .from('pengiriman')
          .insert([{
            id_toko: tokoData.id_toko,
            tanggal_kirim: new Date().toISOString().split('T')[0]
          }])
          .select()
          .single()

        if (pengirimanError) {
          throw new Error('Failed to create initial shipment: ' + pengirimanError.message)
        }

        // Create detail_pengiriman records for each product
        const detailPengirimanData = initialStock.map((stock: InitialStock) => ({
          id_pengiriman: pengirimanData.id_pengiriman,
          id_produk: stock.id_produk,
          jumlah_kirim: stock.jumlah
        }))

        const { error: detailError } = await supabaseAdmin
          .from('detail_pengiriman')
          .insert(detailPengirimanData)

        if (detailError) {
          throw new Error('Failed to create initial stock details: ' + detailError.message)
        }
      } catch (stockError) {
        // Log error but don't fail the toko creation
        console.error('Initial stock creation failed:', stockError)
      }
    }

    return createSuccessResponse(tokoData, 201)
  })
}