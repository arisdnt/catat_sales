import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

interface BulkShipmentDetail {
  id_produk: number
  jumlah_kirim: number
}

interface BulkShipmentStore {
  id_toko: number
  details: BulkShipmentDetail[]
}

interface BulkShipmentRequest {
  id_sales: number
  tanggal_kirim: string
  stores: BulkShipmentStore[]
  keterangan?: string
}

export async function POST(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const body: BulkShipmentRequest = await request.json()
    const { id_sales, tanggal_kirim, stores, keterangan } = body

    // Validation
    if (!id_sales || !tanggal_kirim || !stores || !Array.isArray(stores) || stores.length === 0) {
      return createErrorResponse('id_sales, tanggal_kirim, and stores are required')
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

    // Verify all stores belong to the sales and are active
    const storeIds = stores.map(store => store.id_toko)
    const { data: storesData, error: storesError } = await supabaseAdmin
      .from('toko')
      .select('id_toko')
      .in('id_toko', storeIds)
      .eq('id_sales', id_sales)
      .eq('status_toko', true)

    if (storesError || !storesData || storesData.length !== storeIds.length) {
      return createErrorResponse('One or more stores not found, inactive, or not owned by this sales')
    }

    // Get all unique product IDs and verify they exist
    const allProductIds = Array.from(new Set(
      stores.flatMap(store => store.details.map(detail => detail.id_produk))
    ))

    const { data: productsData, error: productsError } = await supabaseAdmin
      .from('produk')
      .select('id_produk')
      .in('id_produk', allProductIds)
      .eq('status_produk', true)

    if (productsError || !productsData || productsData.length !== allProductIds.length) {
      return createErrorResponse('One or more products not found or inactive')
    }

    // Validate store details
    for (const store of stores) {
      if (!store.id_toko || !store.details || !Array.isArray(store.details) || store.details.length === 0) {
        return createErrorResponse('Each store must have valid id_toko and details')
      }

      for (const detail of store.details) {
        if (!detail.id_produk || !detail.jumlah_kirim || detail.jumlah_kirim <= 0) {
          return createErrorResponse('Each detail must have valid id_produk and positive jumlah_kirim')
        }
      }
    }

    // Calculate totals
    const totalStores = stores.length
    const totalItems = stores.reduce((sum, store) => 
      sum + store.details.reduce((storeSum, detail) => storeSum + detail.jumlah_kirim, 0), 0
    )

    // Start transaction by creating bulk_pengiriman record
    const { data: bulkData, error: bulkError } = await supabaseAdmin
      .from('bulk_pengiriman')
      .insert([{
        id_sales,
        tanggal_kirim,
        total_toko: totalStores,
        total_item: totalItems,
        keterangan: keterangan || null
      }])
      .select()
      .single()

    if (bulkError) {
      return createErrorResponse(bulkError.message)
    }

    const createdShipments = []
    
    try {
      // Process each store
      for (const store of stores) {
        // Create pengiriman record
        const { data: pengirimanData, error: pengirimanError } = await supabaseAdmin
          .from('pengiriman')
          .insert([{
            id_toko: store.id_toko,
            tanggal_kirim,
            id_bulk_pengiriman: bulkData.id_bulk_pengiriman
          }])
          .select()
          .single()

        if (pengirimanError) {
          throw new Error(`Failed to create shipment for store ${store.id_toko}: ${pengirimanError.message}`)
        }

        // Create detail_pengiriman records
        const detailInserts = store.details.map(detail => ({
          id_pengiriman: pengirimanData.id_pengiriman,
          id_produk: detail.id_produk,
          jumlah_kirim: detail.jumlah_kirim
        }))

        const { error: detailError } = await supabaseAdmin
          .from('detail_pengiriman')
          .insert(detailInserts)

        if (detailError) {
          throw new Error(`Failed to create shipment details for store ${store.id_toko}: ${detailError.message}`)
        }

        createdShipments.push({
          id_pengiriman: pengirimanData.id_pengiriman,
          id_toko: store.id_toko,
          detail_count: store.details.length
        })
      }

      // Fetch complete data with relationships
      const { data: completeData, error: fetchError } = await supabaseAdmin
        .from('bulk_pengiriman')
        .select(`
          id_bulk_pengiriman,
          tanggal_kirim,
          total_toko,
          total_item,
          keterangan,
          dibuat_pada,
          sales!inner(
            id_sales,
            nama_sales,
            nomor_telepon
          ),
          pengiriman!inner(
            id_pengiriman,
            toko!inner(
              id_toko,
              nama_toko,
              kecamatan,
              kabupaten
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
          )
        `)
        .eq('id_bulk_pengiriman', bulkData.id_bulk_pengiriman)
        .single()

      if (fetchError) {
        // Don't fail the operation, just return basic data
        return createSuccessResponse({
          id_bulk_pengiriman: bulkData.id_bulk_pengiriman,
          message: 'Bulk shipment created successfully',
          created_shipments: createdShipments,
          total_stores: totalStores,
          total_items: totalItems
        }, 201)
      }

      return createSuccessResponse(completeData, 201)

    } catch (error) {
      // Rollback: delete the bulk_pengiriman record (cascade will handle the rest)
      await supabaseAdmin
        .from('bulk_pengiriman')
        .delete()
        .eq('id_bulk_pengiriman', bulkData.id_bulk_pengiriman)

      return createErrorResponse(error instanceof Error ? error.message : 'Failed to create bulk shipment')
    }
  })
}

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { searchParams } = new URL(request.url)
    const id_sales = searchParams.get('id_sales')
    const limit = searchParams.get('limit') || '10'
    
    let query = supabaseAdmin
      .from('bulk_pengiriman')
      .select(`
        id_bulk_pengiriman,
        tanggal_kirim,
        total_toko,
        total_item,
        keterangan,
        dibuat_pada,
        sales!inner(
          id_sales,
          nama_sales,
          nomor_telepon
        )
      `)
      .order('tanggal_kirim', { ascending: false })
      .limit(parseInt(limit))

    if (id_sales) {
      query = query.eq('id_sales', parseInt(id_sales))
    }

    const { data, error } = await query

    if (error) {
      return createErrorResponse(error.message)
    }

    return createSuccessResponse(data)
  })
}