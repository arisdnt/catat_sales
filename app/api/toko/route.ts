import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

interface ProductDetail {
  nama_produk: string
  jumlah: number
}

interface PengirimanDetail {
  jumlah_kirim: number
  produk: {
    nama_produk: string
  }
}

interface PenagihanDetail {
  jumlah_terjual: number
  produk: {
    nama_produk: string
  }
}

interface PengirimanData {
  detail_pengiriman: PengirimanDetail[]
}

interface PenagihanData {
  detail_penagihan: PenagihanDetail[]
}

interface TokoData {
  id_toko: number
  nama_toko: string
  status_toko: boolean
}

interface InitialStock {
  id_produk: number
  jumlah: number
}

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const include_sales = searchParams.get('include_sales')
    
    let query = supabaseAdmin
      .from('toko')
      .select(include_sales === 'true' ? `
        id_toko,
        nama_toko,
        kecamatan,
        kabupaten,
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

    if (status === 'active') {
      query = query.eq('status_toko', true)
    }

    const { data: tokoData, error } = await query

    if (error) {
      return createErrorResponse(error.message)
    }

    if (!tokoData || !Array.isArray(tokoData)) {
      return createErrorResponse('Invalid data received from database')
    }

    // Enrich data with barang statistics
    const enrichedData = await Promise.all(
      tokoData.map(async (toko: any) => {
        // Get barang terkirim (total dari pengiriman)
        const { data: pengirimanData } = await supabaseAdmin
          .from('pengiriman')
          .select(`
            detail_pengiriman(
              jumlah_kirim,
              produk(nama_produk)
            )
          `)
          .eq('id_toko', toko.id_toko)

        // Get barang terbayar (total dari penagihan)
        const { data: penagihanData } = await supabaseAdmin
          .from('penagihan')
          .select(`
            detail_penagihan(
              jumlah_terjual,
              produk(nama_produk)
            )
          `)
          .eq('id_toko', toko.id_toko)

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
              barangTerbayar += detail.jumlah_terjual
              produkTerbayar[namaProduk] = (produkTerbayar[namaProduk] || 0) + detail.jumlah_terjual
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
    )

    return createSuccessResponse(enrichedData)
  })
}

export async function POST(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const body = await request.json()
    const { nama_toko, id_sales, kecamatan, kabupaten, link_gmaps, hasInitialStock, initialStock } = body

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