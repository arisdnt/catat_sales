import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { searchParams } = new URL(request.url)
    const include_details = searchParams.get('include_details')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit
    
    // Get total count for pagination
    const { count, error: countError } = await supabaseAdmin
      .from('pengiriman')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      return createErrorResponse(countError.message)
    }
    
    const query = supabaseAdmin
      .from('pengiriman')
      .select(include_details === 'true' ? `
        id_pengiriman,
        tanggal_kirim,
        dibuat_pada,
        diperbarui_pada,
        toko!inner(
          id_toko,
          nama_toko,
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
      ` : `
        id_pengiriman,
        tanggal_kirim,
        dibuat_pada,
        diperbarui_pada,
        toko!inner(
          id_toko,
          nama_toko,
          kecamatan,
          kabupaten,
          sales!inner(
            id_sales,
            nama_sales,
            nomor_telepon
          )
        )
      `)
      .order('tanggal_kirim', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      return createErrorResponse(error.message)
    }

    const total = count || 0
    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return createSuccessResponse({
      data,
      pagination: {
        page,
        limit,
        total,
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
    const { id_toko, tanggal_kirim, details } = body

    if (!id_toko || !tanggal_kirim || !details || !Array.isArray(details) || details.length === 0) {
      return createErrorResponse('id_toko, tanggal_kirim, and details are required')
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
      if (!detail.id_produk || !detail.jumlah_kirim || detail.jumlah_kirim <= 0) {
        return createErrorResponse('Each detail must have valid id_produk and positive jumlah_kirim')
      }
    }

    // Create shipment
    const { data: pengirimanData, error: pengirimanError } = await supabaseAdmin
      .from('pengiriman')
      .insert([{
        id_toko: parseInt(id_toko),
        tanggal_kirim
      }])
      .select()
      .single()

    if (pengirimanError) {
      return createErrorResponse(pengirimanError.message)
    }

    // Create shipment details
    const detailInserts = details.map(detail => ({
      id_pengiriman: pengirimanData.id_pengiriman,
      id_produk: parseInt(detail.id_produk),
      jumlah_kirim: parseInt(detail.jumlah_kirim)
    }))

    const { error: detailError } = await supabaseAdmin
      .from('detail_pengiriman')
      .insert(detailInserts)

    if (detailError) {
      // Rollback: delete the created pengiriman
      await supabaseAdmin
        .from('pengiriman')
        .delete()
        .eq('id_pengiriman', pengirimanData.id_pengiriman)
      
      return createErrorResponse(detailError.message)
    }

    // Fetch complete data
    const { data: completeData, error: fetchError } = await supabaseAdmin
      .from('pengiriman')
      .select(`
        id_pengiriman,
        tanggal_kirim,
        dibuat_pada,
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
      .eq('id_pengiriman', pengirimanData.id_pengiriman)
      .single()

    if (fetchError) {
      return createErrorResponse(fetchError.message)
    }

    return createSuccessResponse(completeData, 201)
  })
}