import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

interface BatchShipmentDetail {
  id_produk: number
  jumlah_kirim: number
}

interface BatchShipmentStore {
  id_toko: number
  details: BatchShipmentDetail[]
}

interface BatchShipmentRequest {
  id_sales: number
  tanggal_kirim: string
  stores: BatchShipmentStore[]
  keterangan?: string
}

export async function POST(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const body: BatchShipmentRequest = await request.json()
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

    const createdShipments = []
    
    try {
      // Process each store individually (no bulk_pengiriman needed)
      for (const store of stores) {
        // Create pengiriman record directly
        const { data: pengirimanData, error: pengirimanError } = await supabaseAdmin
          .from('pengiriman')
          .insert([{
            id_toko: store.id_toko,
            tanggal_kirim,
            is_autorestock: false // This is manual batch input
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
          detail_count: store.details.length,
          total_items: store.details.reduce((sum, detail) => sum + detail.jumlah_kirim, 0)
        })
      }

      // Calculate totals
      const totalStores = stores.length
      const totalItems = createdShipments.reduce((sum, shipment) => sum + shipment.total_items, 0)

      const response = {
        message: `Batch shipment created successfully for ${totalStores} stores`,
        created_shipments: createdShipments,
        summary: {
          total_stores: totalStores,
          total_items: totalItems,
          tanggal_kirim,
          keterangan: keterangan || null,
          sales_id: id_sales
        }
      }

      return createSuccessResponse(response, 201)

    } catch (error) {
      // If any error occurs, the individual pengiriman records that were created will remain
      // This is acceptable as each pengiriman is independent
      return createErrorResponse(error instanceof Error ? error.message : 'Failed to create batch shipment')
    }
  })
}

// Get batch shipments (now just regular pengiriman records)
export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { searchParams } = new URL(request.url)
    const id_sales = searchParams.get('id_sales')
    const tanggal_kirim = searchParams.get('tanggal_kirim')
    const limit = parseInt(searchParams.get('limit') || '20')
    
    let query = supabaseAdmin
      .from('pengiriman')
      .select(`
        id_pengiriman,
        tanggal_kirim,
        dibuat_pada,
        is_autorestock,
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
        ),
        detail_pengiriman(
          id_detail_kirim,
          jumlah_kirim,
          produk(
            id_produk,
            nama_produk,
            harga_satuan
          )
        )
      `)
      .order('tanggal_kirim', { ascending: false })
      .order('dibuat_pada', { ascending: false })
      .limit(limit)

    if (id_sales) {
      query = query.eq('toko.sales.id_sales', parseInt(id_sales))
    }

    if (tanggal_kirim) {
      query = query.eq('tanggal_kirim', tanggal_kirim)
    }

    const { data, error } = await query

    if (error) {
      return createErrorResponse(error.message)
    }

    // Group by date and sales for better organization
    const grouped = data?.reduce((acc, shipment: any) => {
      const salesInfo = shipment.toko?.sales
      if (!salesInfo) return acc
      
      const key = `${shipment.tanggal_kirim}_${salesInfo.id_sales}`
      if (!acc[key]) {
        acc[key] = {
          tanggal_kirim: shipment.tanggal_kirim,
          sales: salesInfo,
          shipments: [],
          total_stores: 0,
          total_items: 0
        }
      }
      acc[key].shipments.push(shipment)
      acc[key].total_stores += 1
      acc[key].total_items += shipment.detail_pengiriman?.reduce((sum: number, detail: any) => 
        sum + (detail.jumlah_kirim || 0), 0) || 0
      
      return acc
    }, {} as any)

    return createSuccessResponse(Object.values(grouped || {}))
  })
}