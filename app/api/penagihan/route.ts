import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'
import { getCurrentDateIndonesia, INDONESIA_TIMEZONE } from '@/lib/utils'

// Type definitions
interface ShipmentDetail {
  id_produk: string
  jumlah_kirim: number
}

interface AdditionalShipment {
  details: ShipmentDetail[]
}

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    const { searchParams } = new URL(request.url)
    const include_details = searchParams.get('include_details')
    
    const query = supabaseAdmin
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
    const { id_toko, total_uang_diterima, metode_pembayaran, details, potongan, auto_restock, additional_shipment, tanggal_pembayaran } = body

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
    const insertData: any = {
      id_toko: parseInt(id_toko),
      total_uang_diterima: parseFloat(total_uang_diterima),
      metode_pembayaran,
      ada_potongan
    }
    
    // Use tanggal_pembayaran as dibuat_pada if provided
    if (tanggal_pembayaran) {
      insertData.dibuat_pada = tanggal_pembayaran + 'T00:00:00'
    }
    
    const { data: penagihanData, error: penagihanError } = await supabaseAdmin
      .from('penagihan')
      .insert([insertData])
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

    // Auto-restock functionality - create shipment if auto_restock is true
    let shipmentData = null
    if (auto_restock) {
      try {
        // Use payment date for shipment, fallback to today if not provided (using Indonesia timezone)
        const shipmentDate = tanggal_pembayaran || new Intl.DateTimeFormat('sv-SE', {
          timeZone: INDONESIA_TIMEZONE,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(getCurrentDateIndonesia())
        
        // Filter details that have jumlah_terjual > 0 for auto-restock
        const restockDetails = details.filter(detail => detail.jumlah_terjual > 0)
        
        if (restockDetails.length > 0) {
          // Prepare shipment data with payment date
          const shipmentInsertData: any = {
            id_toko: parseInt(id_toko),
            tanggal_kirim: shipmentDate,
            is_autorestock: true
          }
          
          // Add dibuat_pada if payment date is provided
          if (tanggal_pembayaran) {
            shipmentInsertData.dibuat_pada = `${tanggal_pembayaran}T00:00:00`
          }
          
          // Create shipment for auto-restock
          const { data: newShipmentData, error: shipmentError } = await supabaseAdmin
            .from('pengiriman')
            .insert([shipmentInsertData])
            .select()
            .single()

          if (shipmentError) {
            throw new Error(`Failed to create auto-restock shipment: ${shipmentError.message}`)
          }

          // Create shipment details for auto-restock (same quantity as sold)
          const shipmentDetailInserts = restockDetails.map(detail => ({
            id_pengiriman: newShipmentData.id_pengiriman,
            id_produk: parseInt(detail.id_produk),
            jumlah_kirim: parseInt(detail.jumlah_terjual) // Auto-restock same quantity as sold
          }))

          const { error: shipmentDetailError } = await supabaseAdmin
            .from('detail_pengiriman')
            .insert(shipmentDetailInserts)

          if (shipmentDetailError) {
            // Rollback shipment if detail insertion fails
            await supabaseAdmin
              .from('pengiriman')
              .delete()
              .eq('id_pengiriman', newShipmentData.id_pengiriman)
            throw new Error(`Failed to create auto-restock shipment details: ${shipmentDetailError.message}`)
          }
          
          shipmentData = newShipmentData
        }
      } catch (error) {
        // If auto-restock fails, rollback the entire transaction
        await supabaseAdmin
          .from('penagihan')
          .delete()
          .eq('id_penagihan', penagihanData.id_penagihan)
        
        return createErrorResponse(`Auto-restock failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // Additional shipment functionality (optional extra stock)
    let additionalShipmentData = null
    if (additional_shipment && additional_shipment.enabled && additional_shipment.details && additional_shipment.details.length > 0) {
      try {
        // Use payment date for additional shipment, fallback to today if not provided (using Indonesia timezone)
        const additionalShipmentDate = tanggal_pembayaran || new Intl.DateTimeFormat('sv-SE', {
          timeZone: INDONESIA_TIMEZONE,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(getCurrentDateIndonesia())
        
        // Validate additional shipment details
        for (const detail of (additional_shipment as AdditionalShipment).details) {
          if (!detail.id_produk || !detail.jumlah_kirim || detail.jumlah_kirim <= 0) {
            throw new Error('Each additional shipment detail must have valid id_produk and positive jumlah_kirim')
          }
        }

        // Prepare additional shipment data with payment date
        const additionalShipmentInsertData: any = {
          id_toko: parseInt(id_toko),
          tanggal_kirim: additionalShipmentDate
        }
        
        // Add dibuat_pada if payment date is provided
        if (tanggal_pembayaran) {
          additionalShipmentInsertData.dibuat_pada = `${tanggal_pembayaran}T00:00:00`
        }

        // Create additional shipment
        const { data: additionalShipment, error: additionalShipmentError } = await supabaseAdmin
          .from('pengiriman')
          .insert([additionalShipmentInsertData])
          .select()
          .single()

        if (additionalShipmentError) {
          throw new Error(`Failed to create additional shipment: ${additionalShipmentError.message}`)
        }

        // Create additional shipment details
        const additionalDetailInserts = (additional_shipment as AdditionalShipment).details.map((detail: ShipmentDetail) => ({
          id_pengiriman: additionalShipment.id_pengiriman,
          id_produk: parseInt(detail.id_produk),
          jumlah_kirim: detail.jumlah_kirim
        }))

        const { error: additionalDetailError } = await supabaseAdmin
          .from('detail_pengiriman')
          .insert(additionalDetailInserts)

        if (additionalDetailError) {
          // Rollback additional shipment if detail insertion fails
          await supabaseAdmin
            .from('pengiriman')
            .delete()
            .eq('id_pengiriman', additionalShipment.id_pengiriman)
          throw new Error(`Failed to create additional shipment details: ${additionalDetailError.message}`)
        }
        
        additionalShipmentData = additionalShipment
      } catch (error) {
        // If additional shipment fails, rollback the entire transaction
        await supabaseAdmin
          .from('penagihan')
          .delete()
          .eq('id_penagihan', penagihanData.id_penagihan)
        
        // Also rollback auto-restock shipment if it was created
        if (shipmentData) {
          await supabaseAdmin
            .from('pengiriman')
            .delete()
            .eq('id_pengiriman', shipmentData.id_pengiriman)
        }
        
        return createErrorResponse(`Additional shipment failed: ${error instanceof Error ? error.message : String(error)}`)
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

    // Include shipment data in response if auto-restock was performed
    const response = {
      billing: completeData,
      auto_restock_shipment: shipmentData,
      additional_shipment: additionalShipmentData,
      message: `Penagihan berhasil dibuat${shipmentData ? ' dengan auto-restock' : ''}${additionalShipmentData ? ' dan pengiriman tambahan' : ''}`
    }

    return createSuccessResponse(response, 201)
  })
}