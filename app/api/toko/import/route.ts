import { NextRequest } from 'next/server'
import { supabaseAdmin, handleApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-helpers'

interface ExcelRowData {
  NAMA_SALES: string
  NAMA_TOKO: string
  KECAMATAN: string
  KABUPATEN: string
  NO_TELP: string
  LINK_GOOGLE_MAPS: string
  PRODUK1?: number
  PRODUK2?: number
  PRODUK3?: number
  PRODUK4?: number
  PRODUK5?: number
}

interface ImportResult {
  success: boolean
  summary: {
    totalRows: number
    salesCreated: number
    salesExists: number
    tokosCreated: number
    shipmentsCreated: number
    productsLinked: number
  }
  errors: string[]
  details: {
    salesMapping: Record<string, number>
    tokosCreated: Array<{
      nama_toko: string
      id_toko: number
      sales: string
    }>
  }
}

export async function POST(request: NextRequest) {
  return handleApiRequest(request, async () => {
    try {
      const body = await request.json()
      const { data: excelData } = body

      if (!excelData || !Array.isArray(excelData)) {
        return createErrorResponse('Invalid data format. Expected array of rows.')
      }

      const result: ImportResult = {
        success: true,
        summary: {
          totalRows: excelData.length,
          salesCreated: 0,
          salesExists: 0,
          tokosCreated: 0,
          shipmentsCreated: 0,
          productsLinked: 0
        },
        errors: [],
        details: {
          salesMapping: {},
          tokosCreated: []
        }
      }

      // Step 1: Get all existing sales and create map
      const { data: existingSales, error: salesError } = await supabaseAdmin
        .from('sales')
        .select('id_sales, nama_sales')

      if (salesError) {
        return createErrorResponse(`Error fetching existing sales: ${salesError.message}`)
      }

      const existingSalesMap = new Map<string, number>()
      existingSales?.forEach(sales => {
        existingSalesMap.set(sales.nama_sales.toLowerCase().trim(), sales.id_sales)
      })

      // Step 2: Get all products and create priority product mapping
      const { data: allProducts, error: productsError } = await supabaseAdmin
        .from('produk')
        .select('*')
        .eq('status_produk', true)
        .order('priority_order', { ascending: true })

      if (productsError) {
        return createErrorResponse(`Error fetching products: ${productsError.message}`)
      }

      const priorityProducts = allProducts?.filter(p => p.is_priority === true) || []
      if (priorityProducts.length === 0) {
        result.errors.push('No priority products found. Please create priority products first.')
      }

      // Step 3: Process each row
      for (let i = 0; i < excelData.length; i++) {
        const row: ExcelRowData = excelData[i]
        const rowNum = i + 1

        try {
          // Validate required fields
          if (!row.NAMA_SALES?.trim()) {
            result.errors.push(`Row ${rowNum}: NAMA_SALES is required`)
            continue
          }
          if (!row.NAMA_TOKO?.trim()) {
            result.errors.push(`Row ${rowNum}: NAMA_TOKO is required`)
            continue
          }

          const salesName = row.NAMA_SALES.trim()
          const salesKey = salesName.toLowerCase()
          let salesId: number

          // Step 3.1: Handle Sales (create if not exists)
          if (existingSalesMap.has(salesKey)) {
            salesId = existingSalesMap.get(salesKey)!
            result.summary.salesExists++
          } else {
            // Create new sales
            const { data: newSales, error: newSalesError } = await supabaseAdmin
              .from('sales')
              .insert([{
                nama_sales: salesName,
                nomor_telepon: null,
                status_aktif: true
              }])
              .select('id_sales')
              .single()

            if (newSalesError) {
              result.errors.push(`Row ${rowNum}: Error creating sales "${salesName}": ${newSalesError.message}`)
              continue
            }

            salesId = newSales.id_sales
            existingSalesMap.set(salesKey, salesId)
            result.summary.salesCreated++
          }

          result.details.salesMapping[salesName] = salesId

          // Step 3.2: Create Toko
          const tokoData = {
            id_sales: salesId,
            nama_toko: row.NAMA_TOKO.trim(),
            kecamatan: row.KECAMATAN?.trim() || null,
            kabupaten: row.KABUPATEN?.trim() || null,
            no_telepon: row.NO_TELP?.trim() || null,
            link_gmaps: row.LINK_GOOGLE_MAPS?.trim() || null,
            status_toko: true
          }

          const { data: newToko, error: tokoError } = await supabaseAdmin
            .from('toko')
            .insert([tokoData])
            .select('id_toko, nama_toko')
            .single()

          if (tokoError) {
            result.errors.push(`Row ${rowNum}: Error creating toko "${row.NAMA_TOKO}": ${tokoError.message}`)
            continue
          }

          result.summary.tokosCreated++
          result.details.tokosCreated.push({
            nama_toko: newToko.nama_toko,
            id_toko: newToko.id_toko,
            sales: salesName
          })

          // Step 3.3: Handle Initial Stock (if any products specified)
          const productQuantities: Array<{ id_produk: number, jumlah: number }> = []
          
          // Map product columns to priority products
          const productColumns = ['PRODUK1', 'PRODUK2', 'PRODUK3', 'PRODUK4', 'PRODUK5']
          
          for (let j = 0; j < productColumns.length && j < priorityProducts.length; j++) {
            const productKey = productColumns[j] as keyof ExcelRowData
            const quantity = row[productKey]
            
            if (quantity && Number(quantity) > 0) {
              productQuantities.push({
                id_produk: priorityProducts[j].id_produk,
                jumlah: Number(quantity)
              })
            }
          }

          // Create initial stock shipment if there are products
          if (productQuantities.length > 0) {
            try {
              // Create pengiriman record
              const { data: pengiriman, error: pengirimanError } = await supabaseAdmin
                .from('pengiriman')
                .insert([{
                  id_toko: newToko.id_toko,
                  tanggal_kirim: new Date().toISOString().split('T')[0]
                }])
                .select('id_pengiriman')
                .single()

              if (pengirimanError) {
                result.errors.push(`Row ${rowNum}: Error creating shipment for initial stock: ${pengirimanError.message}`)
              } else {
                // Create detail_pengiriman records
                const detailPengirimanData = productQuantities.map(pq => ({
                  id_pengiriman: pengiriman.id_pengiriman,
                  id_produk: pq.id_produk,
                  jumlah_kirim: pq.jumlah
                }))

                const { error: detailError } = await supabaseAdmin
                  .from('detail_pengiriman')
                  .insert(detailPengirimanData)

                if (detailError) {
                  result.errors.push(`Row ${rowNum}: Error creating initial stock details: ${detailError.message}`)
                } else {
                  result.summary.shipmentsCreated++
                  result.summary.productsLinked += productQuantities.length
                }
              }
            } catch (stockError) {
              result.errors.push(`Row ${rowNum}: Unexpected error creating initial stock: ${stockError}`)
            }
          }

        } catch (rowError) {
          result.errors.push(`Row ${rowNum}: Unexpected error: ${rowError}`)
        }
      }

      // Final validation
      if (result.errors.length > 0) {
        result.success = false
      }

      return createSuccessResponse(result, 200)

    } catch (error) {
      console.error('Import error:', error)
      return createErrorResponse('Internal server error during import')
    }
  })
}