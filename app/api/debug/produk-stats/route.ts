import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createSuccessResponse, createErrorResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  return handleApiRequest(request, async () => {
    console.log(`🔍 [DEBUG] Produk Stats Debug API called at ${new Date().toISOString()}`)
    
    try {
      // 1. Query all products from produk table
      console.log('📋 [DEBUG] Step 1: Querying all products...')
      const { data: allProducts, error: productsError } = await supabaseAdmin
        .from('produk')
        .select(`
          id_produk,
          nama_produk,
          harga_satuan,
          status_produk,
          is_priority,
          priority_order,
          dibuat_pada,
          diperbarui_pada
        `)
        .order('id_produk', { ascending: true })
      
      if (productsError) {
        console.error('❌ [DEBUG] Products query error:', productsError)
        return createErrorResponse(`Failed to query products: ${productsError.message}`)
      }
      
      console.log(`✅ [DEBUG] Found ${allProducts?.length || 0} products`)
      console.log('📊 [DEBUG] Products summary:', allProducts?.map(p => ({
        id: p.id_produk,
        name: p.nama_produk,
        price: p.harga_satuan,
        status: p.status_produk,
        priority: p.is_priority
      })))
      
      // 2. Query all detail_pengiriman records
      console.log('🚚 [DEBUG] Step 2: Querying all shipment details...')
      const { data: allShipments, error: shipmentsError } = await supabaseAdmin
        .from('detail_pengiriman')
        .select(`
          id_detail_pengiriman,
          id_produk,
          jumlah_kirim,
          harga_satuan,
          id_pengiriman
        `)
        .order('id_produk', { ascending: true })
      
      if (shipmentsError) {
        console.error('❌ [DEBUG] Shipments query error:', shipmentsError)
        return createErrorResponse(`Failed to query shipments: ${shipmentsError.message}`)
      }
      
      console.log(`✅ [DEBUG] Found ${allShipments?.length || 0} shipment records`)
      console.log('📦 [DEBUG] Shipments by product ID:', 
        allShipments?.reduce((acc, s) => {
          acc[s.id_produk] = acc[s.id_produk] || []
          acc[s.id_produk].push({
            detail_id: s.id_detail_pengiriman,
            quantity: s.jumlah_kirim,
            price: s.harga_satuan,
            shipment_id: s.id_pengiriman
          })
          return acc
        }, {} as Record<number, any[]>)
      )
      
      // 3. Query all detail_penagihan records
      console.log('💰 [DEBUG] Step 3: Querying all billing details...')
      const { data: allBillings, error: billingsError } = await supabaseAdmin
        .from('detail_penagihan')
        .select(`
          id_detail_penagihan,
          id_produk,
          jumlah_terjual,
          jumlah_kembali,
          harga_satuan,
          id_penagihan
        `)
        .order('id_produk', { ascending: true })
      
      if (billingsError) {
        console.error('❌ [DEBUG] Billings query error:', billingsError)
        return createErrorResponse(`Failed to query billings: ${billingsError.message}`)
      }
      
      console.log(`✅ [DEBUG] Found ${allBillings?.length || 0} billing records`)
      console.log('💵 [DEBUG] Billings by product ID:', 
        allBillings?.reduce((acc, b) => {
          acc[b.id_produk] = acc[b.id_produk] || []
          acc[b.id_produk].push({
            detail_id: b.id_detail_penagihan,
            sold: b.jumlah_terjual,
            returned: b.jumlah_kembali,
            price: b.harga_satuan,
            billing_id: b.id_penagihan
          })
          return acc
        }, {} as Record<number, any[]>)
      )
      
      // 4. Calculate aggregated statistics per product ID
      console.log('🧮 [DEBUG] Step 4: Calculating aggregated statistics...')
      const productStats: Record<number, {
        total_terkirim: number
        total_terjual: number
        total_kembali: number
        total_terbayar: number
        sisa_stok: number
        has_data_inconsistency: boolean
        shipment_records_count: number
        billing_records_count: number
      }> = {}
      
      // Initialize stats for all products
      allProducts?.forEach(product => {
        productStats[product.id_produk] = {
          total_terkirim: 0,
          total_terjual: 0,
          total_kembali: 0,
          total_terbayar: 0,
          sisa_stok: 0,
          has_data_inconsistency: false,
          shipment_records_count: 0,
          billing_records_count: 0
        }
      })
      
      // Aggregate shipment data
      allShipments?.forEach(shipment => {
        if (productStats[shipment.id_produk]) {
          productStats[shipment.id_produk].total_terkirim += shipment.jumlah_kirim || 0
          productStats[shipment.id_produk].shipment_records_count += 1
        }
      })
      
      // Aggregate billing data
      allBillings?.forEach(billing => {
        if (productStats[billing.id_produk]) {
          productStats[billing.id_produk].total_terjual += billing.jumlah_terjual || 0
          productStats[billing.id_produk].total_kembali += billing.jumlah_kembali || 0
          productStats[billing.id_produk].billing_records_count += 1
        }
      })
      
      // Calculate derived statistics
      Object.keys(productStats).forEach(productIdStr => {
        const productId = parseInt(productIdStr)
        const stats = productStats[productId]
        
        // Calculate derived values
        stats.total_terbayar = stats.total_terjual - stats.total_kembali
        stats.sisa_stok = stats.total_terkirim - stats.total_terjual - stats.total_kembali
        stats.has_data_inconsistency = (stats.total_terjual + stats.total_kembali) > stats.total_terkirim
      })
      
      console.log('📊 [DEBUG] Aggregated statistics:', productStats)
      
      // 5. Analyze missing relationships
      console.log('🔍 [DEBUG] Step 5: Analyzing missing relationships...')
      
      const productIds = allProducts?.map(p => p.id_produk) || []
      const shipmentProductIds = [...new Set(allShipments?.map(s => s.id_produk) || [])]
      const billingProductIds = [...new Set(allBillings?.map(b => b.id_produk) || [])]
      
      const productsWithoutShipments = productIds.filter(id => !shipmentProductIds.includes(id))
      const productsWithoutBillings = productIds.filter(id => !billingProductIds.includes(id))
      const productsWithBothData = productIds.filter(id => 
        shipmentProductIds.includes(id) && billingProductIds.includes(id)
      )
      const productsWithOnlyShipments = productIds.filter(id => 
        shipmentProductIds.includes(id) && !billingProductIds.includes(id)
      )
      const productsWithOnlyBillings = productIds.filter(id => 
        !shipmentProductIds.includes(id) && billingProductIds.includes(id)
      )
      
      // Orphaned records (records with product IDs that don't exist in products table)
      const orphanedShipmentProductIds = shipmentProductIds.filter(id => !productIds.includes(id))
      const orphanedBillingProductIds = billingProductIds.filter(id => !productIds.includes(id))
      
      const analysis = {
        total_products: productIds.length,
        products_with_shipment_data: shipmentProductIds.length,
        products_with_billing_data: billingProductIds.length,
        products_without_shipments: productsWithoutShipments.length,
        products_without_billings: productsWithoutBillings.length,
        products_with_both_data: productsWithBothData.length,
        products_with_only_shipments: productsWithOnlyShipments.length,
        products_with_only_billings: productsWithOnlyBillings.length,
        orphaned_shipment_product_ids: orphanedShipmentProductIds,
        orphaned_billing_product_ids: orphanedBillingProductIds,
        breakdown: {
          products_without_shipments: productsWithoutShipments,
          products_without_billings: productsWithoutBillings,
          products_with_both_data: productsWithBothData,
          products_with_only_shipments: productsWithOnlyShipments,
          products_with_only_billings: productsWithOnlyBillings
        }
      }
      
      console.log('🔬 [DEBUG] Relationship analysis:', analysis)
      
      // 6. Special focus on products showing stats vs not showing stats
      const productsWithStats = Object.keys(productStats).filter(id => {
        const stats = productStats[parseInt(id)]
        return stats.total_terkirim > 0 || stats.total_terjual > 0 || stats.total_kembali > 0
      }).map(id => parseInt(id))
      
      const productsWithoutStats = Object.keys(productStats).filter(id => {
        const stats = productStats[parseInt(id)]
        return stats.total_terkirim === 0 && stats.total_terjual === 0 && stats.total_kembali === 0
      }).map(id => parseInt(id))
      
      console.log('📈 [DEBUG] Products with stats:', productsWithStats)
      console.log('📉 [DEBUG] Products without stats:', productsWithoutStats)
      
      // 7. Detailed breakdown for each product
      const detailedBreakdown = allProducts?.map(product => {
        const stats = productStats[product.id_produk]
        const shipmentRecords = allShipments?.filter(s => s.id_produk === product.id_produk) || []
        const billingRecords = allBillings?.filter(b => b.id_produk === product.id_produk) || []
        
        return {
          product: {
            id: product.id_produk,
            name: product.nama_produk,
            price: product.harga_satuan,
            status: product.status_produk,
            priority: product.is_priority,
            created: product.dibuat_pada
          },
          statistics: stats,
          raw_data: {
            shipment_records: shipmentRecords.map(s => ({
              id: s.id_detail_pengiriman,
              quantity: s.jumlah_kirim,
              price: s.harga_satuan,
              shipment_id: s.id_pengiriman
            })),
            billing_records: billingRecords.map(b => ({
              id: b.id_detail_penagihan,
              sold: b.jumlah_terjual,
              returned: b.jumlah_kembali,
              price: b.harga_satuan,
              billing_id: b.id_penagihan
            }))
          },
          has_any_data: shipmentRecords.length > 0 || billingRecords.length > 0
        }
      }) || []
      
      const response = {
        debug_info: {
          timestamp: new Date().toISOString(),
          query_summary: {
            total_products: allProducts?.length || 0,
            total_shipment_records: allShipments?.length || 0,
            total_billing_records: allBillings?.length || 0
          }
        },
        raw_data: {
          all_products: allProducts,
          all_shipments: allShipments,
          all_billings: allBillings
        },
        aggregated_statistics: productStats,
        relationship_analysis: analysis,
        detailed_product_breakdown: detailedBreakdown,
        summary: {
          products_with_statistics: productsWithStats.length,
          products_without_statistics: productsWithoutStats.length,
          products_with_stats_list: productsWithStats,
          products_without_stats_list: productsWithoutStats,
          potential_issues: {
            orphaned_shipment_records: orphanedShipmentProductIds.length > 0,
            orphaned_billing_records: orphanedBillingProductIds.length > 0,
            products_missing_shipment_data: productsWithoutShipments.length,
            products_missing_billing_data: productsWithoutBillings.length,
            data_inconsistencies: Object.values(productStats).filter(s => s.has_data_inconsistency).length
          }
        }
      }
      
      console.log('✅ [DEBUG] Debug analysis complete. Summary:', response.summary)
      
      return createSuccessResponse(response)
      
    } catch (error) {
      console.error('❌ [DEBUG] Debug API error:', error)
      return createErrorResponse(`Debug API failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })
}