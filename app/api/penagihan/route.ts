import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { searchParams } = new URL(request.url)
    const include_details = searchParams.get('include_details')
    
    let query = supabaseAdmin
      .from('penagihan')
      .select(include_details === 'true' ? `
        id_penagihan,
        total_uang_diterima,
        metode_pembayaran,
        ada_potongan,
        dibuat_pada,
        diperbarui_pada,
        toko!inner(
          id_toko,
          nama_toko,
          alamat,
          desa,
          kecamatan,
          kabupaten,
          sales!inner(
            id_sales,
            nama_sales,
            nomor_telepon
          )
        ),
        detail_penagihan!inner(
          id_detail_tagih,
          jumlah_terjual,
          jumlah_kembali,
          produk!inner(
            id_produk,
            nama_produk,
            harga_satuan
          )
        ),
        potongan_penagihan(
          id_potongan,
          jumlah_potongan,
          alasan
        )
      ` : `
        id_penagihan,
        total_uang_diterima,
        metode_pembayaran,
        ada_potongan,
        dibuat_pada,
        toko!inner(
          nama_toko,
          sales!inner(nama_sales)
        )
      `)
      .order('dibuat_pada', { ascending: false })

    const { data, error } = await query

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse(data)
  })
}

export async function POST(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const body = await request.json()
    const { id_toko, total_uang_diterima, metode_pembayaran, details, potongan } = body

    if (!id_toko || total_uang_diterima === undefined || !metode_pembayaran || !details || !Array.isArray(details) || details.length === 0) {
      return createErrorResponse('id_toko, total_uang_diterima, metode_pembayaran, and details are required')
    }

    if (!['Cash', 'Transfer'].includes(metode_pembayaran)) {
      return createErrorResponse('metode_pembayaran must be Cash or Transfer')
    }

    if (total_uang_diterima < 0) {
      return createErrorResponse('total_uang_diterima must be non-negative')
    }

    // Verify store exists and is active
    const { data: tokoData, error: tokoError } = await supabaseAdmin
      .from('toko')
      .select('id_toko')
      .eq('id_toko', id_toko)
      .eq('status_toko', true)
      .single()

    if (tokoError || !tokoData) {
      return createErrorResponse('Store not found or inactive')
    }

    // Verify all products exist and are active
    const productIds = details.map(detail => detail.id_produk)
    const { data: productsData, error: productsError } = await supabaseAdmin
      .from('produk')
      .select('id_produk')
      .in('id_produk', productIds)
      .eq('status_produk', true)

    if (productsError || !productsData || productsData.length !== productIds.length) {
      return createErrorResponse('One or more products not found or inactive')
    }

    // Validate details
    for (const detail of details) {
      if (!detail.id_produk || detail.jumlah_terjual === undefined || detail.jumlah_kembali === undefined) {
        return createErrorResponse('Each detail must have id_produk, jumlah_terjual, and jumlah_kembali')
      }
      if (detail.jumlah_terjual < 0 || detail.jumlah_kembali < 0) {
        return createErrorResponse('jumlah_terjual and jumlah_kembali must be non-negative')
      }
    }

    // Validate potongan if provided
    if (potongan && potongan.jumlah_potongan < 0) {
      return createErrorResponse('jumlah_potongan must be non-negative')
    }

    const ada_potongan = !!(potongan && potongan.jumlah_potongan > 0)

    // Create billing
    const { data: penagihanData, error: penagihanError } = await supabaseAdmin
      .from('penagihan')
      .insert([{
        id_toko: parseInt(id_toko),
        total_uang_diterima: parseFloat(total_uang_diterima),
        metode_pembayaran,
        ada_potongan
      }])
      .select()
      .single()

    if (penagihanError) {
      return createErrorResponse(penagihanError.message)
    }

    // Create billing details
    const detailInserts = details.map(detail => ({
      id_penagihan: penagihanData.id_penagihan,
      id_produk: parseInt(detail.id_produk),
      jumlah_terjual: parseInt(detail.jumlah_terjual),
      jumlah_kembali: parseInt(detail.jumlah_kembali)
    }))

    const { error: detailError } = await supabaseAdmin
      .from('detail_penagihan')
      .insert(detailInserts)

    if (detailError) {
      // Rollback: delete the created penagihan
      await supabaseAdmin
        .from('penagihan')
        .delete()
        .eq('id_penagihan', penagihanData.id_penagihan)
      
      return createErrorResponse(detailError.message)
    }

    // Create potongan if provided
    if (ada_potongan && potongan) {
      const { error: potonganError } = await supabaseAdmin
        .from('potongan_penagihan')
        .insert([{
          id_penagihan: penagihanData.id_penagihan,
          jumlah_potongan: parseFloat(potongan.jumlah_potongan),
          alasan: potongan.alasan || null
        }])

      if (potonganError) {
        // Rollback: delete the created penagihan (cascades to details)
        await supabaseAdmin
          .from('penagihan')
          .delete()
          .eq('id_penagihan', penagihanData.id_penagihan)
        
        return createErrorResponse(potonganError.message)
      }
    }

    // Fetch complete data
    const { data: completeData, error: fetchError } = await supabaseAdmin
      .from('penagihan')
      .select(`
        id_penagihan,
        total_uang_diterima,
        metode_pembayaran,
        ada_potongan,
        dibuat_pada,
        toko!inner(
          nama_toko,
          sales!inner(nama_sales)
        ),
        detail_penagihan!inner(
          id_detail_tagih,
          jumlah_terjual,
          jumlah_kembali,
          produk!inner(
            nama_produk,
            harga_satuan
          )
        ),
        potongan_penagihan(
          id_potongan,
          jumlah_potongan,
          alasan
        )
      `)
      .eq('id_penagihan', penagihanData.id_penagihan)
      .single()

    if (fetchError) {
      return createErrorResponse(fetchError.message)
    }

    return createSuccessResponse(completeData, 201)
  })
}