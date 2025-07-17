import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleApiRequest(request, async () => {
    const { id } = await params
    const { data, error } = await supabaseAdmin
      .from('penagihan')
      .select(`
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
      `)
      .eq('id_penagihan', id)
      .single()

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse(data)
  })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleApiRequest(request, async () => {
    const { id } = await params
    const body = await request.json()
    const { total_uang_diterima, metode_pembayaran, details, potongan } = body

    if (total_uang_diterima === undefined || !metode_pembayaran || !details || !Array.isArray(details) || details.length === 0) {
      return createErrorResponse('total_uang_diterima, metode_pembayaran, and details are required')
    }

    if (!['Cash', 'Transfer'].includes(metode_pembayaran)) {
      return createErrorResponse('metode_pembayaran must be Cash or Transfer')
    }

    if (total_uang_diterima < 0) {
      return createErrorResponse('total_uang_diterima must be non-negative')
    }

    // Verify billing exists
    const { data: existingData, error: existingError } = await supabaseAdmin
      .from('penagihan')
      .select('id_penagihan')
      .eq('id_penagihan', id)
      .single()

    if (existingError || !existingData) {
      return createErrorResponse('Billing not found')
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

    // Update billing
    const { error: updateError } = await supabaseAdmin
      .from('penagihan')
      .update({
        total_uang_diterima: parseFloat(total_uang_diterima),
        metode_pembayaran,
        ada_potongan
      })
      .eq('id_penagihan', id)

    if (updateError) {
      return createErrorResponse(updateError.message)
    }

    // Delete existing details and potongan
    await supabaseAdmin
      .from('detail_penagihan')
      .delete()
      .eq('id_penagihan', id)

    await supabaseAdmin
      .from('potongan_penagihan')
      .delete()
      .eq('id_penagihan', id)

    // Insert new details
    const detailInserts = details.map(detail => ({
      id_penagihan: parseInt(id),
      id_produk: parseInt(detail.id_produk),
      jumlah_terjual: parseInt(detail.jumlah_terjual),
      jumlah_kembali: parseInt(detail.jumlah_kembali)
    }))

    const { error: detailError } = await supabaseAdmin
      .from('detail_penagihan')
      .insert(detailInserts)

    if (detailError) {
      return createErrorResponse(detailError.message)
    }

    // Insert potongan if provided
    if (ada_potongan && potongan) {
      const { error: potonganError } = await supabaseAdmin
        .from('potongan_penagihan')
        .insert([{
          id_penagihan: parseInt(id),
          jumlah_potongan: parseFloat(potongan.jumlah_potongan),
          alasan: potongan.alasan || null
        }])

      if (potonganError) {
        return createErrorResponse(potonganError.message)
      }
    }

    // Fetch updated data
    const { data: updatedData, error: fetchError } = await supabaseAdmin
      .from('penagihan')
      .select(`
        id_penagihan,
        total_uang_diterima,
        metode_pembayaran,
        ada_potongan,
        dibuat_pada,
        diperbarui_pada,
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
      .eq('id_penagihan', id)
      .single()

    if (fetchError) {
      return createErrorResponse(fetchError.message)
    }

    return createSuccessResponse(updatedData)
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleApiRequest(request, async () => {
    const { id } = await params
    const { error } = await supabaseAdmin
      .from('penagihan')
      .delete()
      .eq('id_penagihan', id)

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse({ message: 'Billing deleted successfully' })
  })
}