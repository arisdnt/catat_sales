import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleApiRequest(request, async () => {
    const { id } = await params
    const { data, error } = await supabaseAdmin
      .from('pengiriman')
      .select(`
        id_pengiriman,
        tanggal_kirim,
        dibuat_pada,
        diperbarui_pada,
        toko!inner(
          id_toko,
          nama_toko,
          alamat,
          desa,
          kecamatan,
          kabupaten,
          link_gmaps,
          sales!inner(
            id_sales,
            nama_sales,
            nomor_telepon
          )
        ),
        detail_pengiriman!inner(
          id_detail_kirim,
          jumlah_kirim,
          produk!inner(
            id_produk,
            nama_produk,
            harga_satuan
          )
        )
      `)
      .eq('id_pengiriman', id)
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
    const { tanggal_kirim, details } = body

    if (!tanggal_kirim || !details || !Array.isArray(details) || details.length === 0) {
      return createErrorResponse('tanggal_kirim and details are required')
    }

    // Verify shipment exists
    const { data: existingData, error: existingError } = await supabaseAdmin
      .from('pengiriman')
      .select('id_pengiriman')
      .eq('id_pengiriman', id)
      .single()

    if (existingError || !existingData) {
      return createErrorResponse('Shipment not found')
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
      if (!detail.id_produk || !detail.jumlah_kirim || detail.jumlah_kirim <= 0) {
        return createErrorResponse('Each detail must have valid id_produk and positive jumlah_kirim')
      }
    }

    // Update shipment
    const { error: updateError } = await supabaseAdmin
      .from('pengiriman')
      .update({ tanggal_kirim })
      .eq('id_pengiriman', id)

    if (updateError) {
      return createErrorResponse(updateError.message)
    }

    // Delete existing details
    const { error: deleteError } = await supabaseAdmin
      .from('detail_pengiriman')
      .delete()
      .eq('id_pengiriman', id)

    if (deleteError) {
      return createErrorResponse(deleteError.message)
    }

    // Insert new details
    const detailInserts = details.map(detail => ({
      id_pengiriman: parseInt(id),
      id_produk: parseInt(detail.id_produk),
      jumlah_kirim: parseInt(detail.jumlah_kirim)
    }))

    const { error: insertError } = await supabaseAdmin
      .from('detail_pengiriman')
      .insert(detailInserts)

    if (insertError) {
      return createErrorResponse(insertError.message)
    }

    // Fetch updated data
    const { data: updatedData, error: fetchError } = await supabaseAdmin
      .from('pengiriman')
      .select(`
        id_pengiriman,
        tanggal_kirim,
        dibuat_pada,
        diperbarui_pada,
        toko!inner(
          nama_toko,
          sales!inner(nama_sales)
        ),
        detail_pengiriman!inner(
          id_detail_kirim,
          jumlah_kirim,
          produk!inner(
            nama_produk,
            harga_satuan
          )
        )
      `)
      .eq('id_pengiriman', id)
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
      .from('pengiriman')
      .delete()
      .eq('id_pengiriman', id)

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse({ message: 'Shipment deleted successfully' })
  })
}