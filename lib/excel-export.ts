import * as XLSX from 'xlsx'
import { format } from 'date-fns'

export interface ExcelExportOptions {
  filename?: string
  sheetName?: string
  includeTimestamp?: boolean
  customHeaders?: Record<string, string>
  formatters?: Record<string, (value: any) => string>
}

export interface ExcelColumn {
  key: string
  header: string
  width?: number
  formatter?: (value: any) => string
}

/**
 * Export data to Excel file
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExcelColumn[],
  options: ExcelExportOptions = {}
) {
  try {
    const {
      filename = 'export',
      sheetName = 'Sheet1',
      includeTimestamp = true,
      customHeaders = {},
      formatters = {}
    } = options

    // Create workbook
    const wb = XLSX.utils.book_new()

    // Prepare headers
    const headers = columns.map(col => customHeaders[col.key] || col.header)

    // Prepare data with formatting
    const formattedData = data.map(row => {
      const formattedRow: Record<string, any> = {}
      columns.forEach(col => {
        let value = row[col.key]
        
        // Apply column-specific formatter
        if (col.formatter) {
          value = col.formatter(value)
        }
        // Apply global formatter
        else if (formatters[col.key]) {
          value = formatters[col.key](value)
        }
        // Default formatting for common types
        else if (value instanceof Date) {
          value = format(value, 'dd/MM/yyyy HH:mm:ss')
        } else if (typeof value === 'boolean') {
          value = value ? 'Ya' : 'Tidak'
        } else if (value === null || value === undefined) {
          value = ''
        }
        
        formattedRow[col.header] = value
      })
      return formattedRow
    })

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(formattedData, { header: headers })

    // Set column widths
    const colWidths = columns.map(col => ({ wch: col.width || 15 }))
    ws['!cols'] = colWidths

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    // Generate filename with timestamp if requested
    const timestamp = includeTimestamp ? `_${format(new Date(), 'yyyyMMdd_HHmmss')}` : ''
    const finalFilename = `${filename}${timestamp}.xlsx`

    // Write and download file
    XLSX.writeFile(wb, finalFilename)

    return {
      success: true,
      filename: finalFilename,
      recordCount: data.length
    }
  } catch (error) {
    console.error('Excel export error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Export sales data to Excel
 */
export function exportSalesData(data: any[]) {
  const columns: ExcelColumn[] = [
    { key: 'id_sales', header: 'ID Sales', width: 10 },
    { key: 'nama_sales', header: 'Nama Sales', width: 25 },
    { key: 'nomor_telepon', header: 'Nomor Telepon', width: 15 },
    { key: 'status_aktif', header: 'Status', width: 10, formatter: (value) => value ? 'Aktif' : 'Non-aktif' },
    { key: 'dibuat_pada', header: 'Dibuat Pada', width: 20, formatter: (value) => format(new Date(value), 'dd/MM/yyyy HH:mm') },
    { key: 'diperbarui_pada', header: 'Diperbarui Pada', width: 20, formatter: (value) => format(new Date(value), 'dd/MM/yyyy HH:mm') }
  ]

  return exportToExcel(data, columns, {
    filename: 'data_sales',
    sheetName: 'Sales'
  })
}

/**
 * Export product data to Excel
 */
export function exportProductData(data: any[]) {
  const columns: ExcelColumn[] = [
    { key: 'id_produk', header: 'ID Produk', width: 10 },
    { key: 'nama_produk', header: 'Nama Produk', width: 30 },
    { key: 'harga_satuan', header: 'Harga Satuan', width: 15, formatter: (value) => formatCurrency(value) },
    { key: 'status_produk', header: 'Status', width: 10, formatter: (value) => value ? 'Aktif' : 'Non-aktif' },
    { key: 'dibuat_pada', header: 'Dibuat Pada', width: 20, formatter: (value) => format(new Date(value), 'dd/MM/yyyy HH:mm') },
    { key: 'diperbarui_pada', header: 'Diperbarui Pada', width: 20, formatter: (value) => format(new Date(value), 'dd/MM/yyyy HH:mm') }
  ]

  return exportToExcel(data, columns, {
    filename: 'data_produk',
    sheetName: 'Produk'
  })
}

/**
 * Export store data to Excel
 */
export function exportStoreData(data: any[]) {
  const columns: ExcelColumn[] = [
    { key: 'id_toko', header: 'ID Toko', width: 10 },
    { key: 'nama_toko', header: 'Nama Toko', width: 25 },
    { key: 'id_sales', header: 'ID Sales', width: 10 },
    { key: 'kecamatan', header: 'Kecamatan', width: 15 },
    { key: 'kabupaten', header: 'Kabupaten', width: 15 },
    { key: 'no_telepon', header: 'No. Telepon', width: 15 },
    { key: 'link_gmaps', header: 'Link Google Maps', width: 20 },
    { key: 'status_toko', header: 'Status', width: 10, formatter: (value) => value ? 'Aktif' : 'Non-aktif' },
    { key: 'dibuat_pada', header: 'Dibuat Pada', width: 20, formatter: (value) => format(new Date(value), 'dd/MM/yyyy HH:mm') }
  ]

  return exportToExcel(data, columns, {
    filename: 'data_toko',
    sheetName: 'Toko'
  })
}

/**
 * Export shipment data to Excel
 */
export function exportShipmentData(data: any[]) {
  const columns: ExcelColumn[] = [
    { key: 'id_pengiriman', header: 'ID Pengiriman', width: 15 },
    { key: 'id_toko', header: 'ID Toko', width: 10 },
    { key: 'tanggal_kirim', header: 'Tanggal Kirim', width: 15, formatter: (value) => format(new Date(value), 'dd/MM/yyyy') },
    { key: 'dibuat_pada', header: 'Dibuat Pada', width: 20, formatter: (value) => format(new Date(value), 'dd/MM/yyyy HH:mm') },
    { key: 'diperbarui_pada', header: 'Diperbarui Pada', width: 20, formatter: (value) => format(new Date(value), 'dd/MM/yyyy HH:mm') }
  ]

  return exportToExcel(data, columns, {
    filename: 'data_pengiriman',
    sheetName: 'Pengiriman'
  })
}

/**
 * Export billing data to Excel
 */
export function exportBillingData(data: any[]) {
  const columns: ExcelColumn[] = [
    { key: 'id_penagihan', header: 'ID Penagihan', width: 15 },
    { key: 'id_toko', header: 'ID Toko', width: 10 },
    { key: 'total_uang_diterima', header: 'Total Uang Diterima', width: 20, formatter: (value) => formatCurrency(value) },
    { key: 'metode_pembayaran', header: 'Metode Pembayaran', width: 15 },
    { key: 'ada_potongan', header: 'Ada Potongan', width: 15, formatter: (value) => value ? 'Ya' : 'Tidak' },
    { key: 'dibuat_pada', header: 'Dibuat Pada', width: 20, formatter: (value) => format(new Date(value), 'dd/MM/yyyy HH:mm') },
    { key: 'diperbarui_pada', header: 'Diperbarui Pada', width: 20, formatter: (value) => format(new Date(value), 'dd/MM/yyyy HH:mm') }
  ]

  return exportToExcel(data, columns, {
    filename: 'data_penagihan',
    sheetName: 'Penagihan'
  })
}

/**
 * Export deposit data to Excel
 */
export function exportDepositData(data: any[]) {
  const columns: ExcelColumn[] = [
    { key: 'id_setoran', header: 'ID Setoran', width: 15 },
    { key: 'total_setoran', header: 'Total Setoran', width: 20, formatter: (value) => formatCurrency(value) },
    { key: 'penerima_setoran', header: 'Penerima Setoran', width: 25 },
    { key: 'dibuat_pada', header: 'Dibuat Pada', width: 20, formatter: (value) => format(new Date(value), 'dd/MM/yyyy HH:mm') },
    { key: 'diperbarui_pada', header: 'Diperbarui Pada', width: 20, formatter: (value) => format(new Date(value), 'dd/MM/yyyy HH:mm') }
  ]

  return exportToExcel(data, columns, {
    filename: 'data_setoran',
    sheetName: 'Setoran'
  })
}


/**
 * Export dashboard statistics to Excel
 */
export function exportDashboardStats(data: any) {
  const statsData = [
    { kategori: 'Total Sales', nilai: data.totalSales || 0 },
    { kategori: 'Total Produk', nilai: data.totalProducts || 0 },
    { kategori: 'Total Toko', nilai: data.totalStores || 0 },
    { kategori: 'Total Penjualan', nilai: data.totalSalesAmount || 0 },
    { kategori: 'Pengiriman Selesai', nilai: data.completedShipments || 0 },
    { kategori: 'Pengiriman Pending', nilai: data.pendingShipments || 0 },
    { kategori: 'Penagihan Selesai', nilai: data.completedDeposits || 0 },
    { kategori: 'Penagihan Pending', nilai: data.pendingBills || 0 }
  ]

  const columns: ExcelColumn[] = [
    { key: 'kategori', header: 'Kategori', width: 25 },
    { key: 'nilai', header: 'Nilai', width: 20, formatter: (value) => typeof value === 'number' && value > 1000 ? formatCurrency(value) : value.toString() }
  ]

  return exportToExcel(statsData, columns, {
    filename: 'dashboard_statistics',
    sheetName: 'Statistik Dashboard'
  })
}

/**
 * Multi-sheet export for comprehensive reports
 */
export function exportMultiSheetReport(data: {
  sales?: any[]
  products?: any[]
  stores?: any[]
  shipments?: any[]
  billings?: any[]
  deposits?: any[]
  dashboard?: any
}) {
  try {
    const wb = XLSX.utils.book_new()
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss')

    // Add each sheet if data is provided
    if (data.sales && data.sales.length > 0) {
      const salesWs = createSalesSheet(data.sales)
      XLSX.utils.book_append_sheet(wb, salesWs, 'Sales')
    }

    if (data.products && data.products.length > 0) {
      const productsWs = createProductsSheet(data.products)
      XLSX.utils.book_append_sheet(wb, productsWs, 'Produk')
    }

    if (data.stores && data.stores.length > 0) {
      const storesWs = createStoresSheet(data.stores)
      XLSX.utils.book_append_sheet(wb, storesWs, 'Toko')
    }

    if (data.shipments && data.shipments.length > 0) {
      const shipmentsWs = createShipmentsSheet(data.shipments)
      XLSX.utils.book_append_sheet(wb, shipmentsWs, 'Pengiriman')
    }

    if (data.billings && data.billings.length > 0) {
      const billingsWs = createBillingsSheet(data.billings)
      XLSX.utils.book_append_sheet(wb, billingsWs, 'Penagihan')
    }

    if (data.deposits && data.deposits.length > 0) {
      const depositsWs = createDepositsSheet(data.deposits)
      XLSX.utils.book_append_sheet(wb, depositsWs, 'Setoran')
    }


    if (data.dashboard) {
      const dashboardWs = createDashboardSheet(data.dashboard)
      XLSX.utils.book_append_sheet(wb, dashboardWs, 'Dashboard')
    }

    const filename = `laporan_lengkap_${timestamp}.xlsx`
    XLSX.writeFile(wb, filename)

    return { success: true, filename }
  } catch (error) {
    console.error('Multi-sheet export error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Helper functions for creating individual sheets
function createSalesSheet(data: any[]) {
  const formatted = data.map(item => ({
    'ID Sales': item.id_sales,
    'Nama Sales': item.nama_sales,
    'Nomor Telepon': item.nomor_telepon || '',
    'Status': item.status_aktif ? 'Aktif' : 'Non-aktif',
    'Dibuat Pada': format(new Date(item.dibuat_pada), 'dd/MM/yyyy HH:mm'),
    'Diperbarui Pada': format(new Date(item.diperbarui_pada), 'dd/MM/yyyy HH:mm')
  }))
  
  return XLSX.utils.json_to_sheet(formatted)
}

function createProductsSheet(data: any[]) {
  const formatted = data.map(item => ({
    'ID Produk': item.id_produk,
    'Nama Produk': item.nama_produk,
    'Harga Satuan': formatCurrency(item.harga_satuan),
    'Status': item.status_produk ? 'Aktif' : 'Non-aktif',
    'Dibuat Pada': format(new Date(item.dibuat_pada), 'dd/MM/yyyy HH:mm'),
    'Diperbarui Pada': format(new Date(item.diperbarui_pada), 'dd/MM/yyyy HH:mm')
  }))
  
  return XLSX.utils.json_to_sheet(formatted)
}

function createStoresSheet(data: any[]) {
  const formatted = data.map(item => ({
    'ID Toko': item.id_toko,
    'Nama Toko': item.nama_toko,
    'ID Sales': item.id_sales,
    'Alamat': item.alamat || '',
    'Desa': item.desa || '',
    'Kecamatan': item.kecamatan || '',
    'Kabupaten': item.kabupaten || '',
    'Link Google Maps': item.link_gmaps || '',
    'Status': item.status_toko ? 'Aktif' : 'Non-aktif',
    'Dibuat Pada': format(new Date(item.dibuat_pada), 'dd/MM/yyyy HH:mm')
  }))
  
  return XLSX.utils.json_to_sheet(formatted)
}

function createShipmentsSheet(data: any[]) {
  const formatted = data.map(item => ({
    'ID Pengiriman': item.id_pengiriman,
    'ID Toko': item.id_toko,
    'Tanggal Kirim': format(new Date(item.tanggal_kirim), 'dd/MM/yyyy'),
    'Dibuat Pada': format(new Date(item.dibuat_pada), 'dd/MM/yyyy HH:mm'),
    'Diperbarui Pada': format(new Date(item.diperbarui_pada), 'dd/MM/yyyy HH:mm')
  }))
  
  return XLSX.utils.json_to_sheet(formatted)
}

function createBillingsSheet(data: any[]) {
  const formatted = data.map(item => ({
    'ID Penagihan': item.id_penagihan,
    'ID Toko': item.id_toko,
    'Total Uang Diterima': formatCurrency(item.total_uang_diterima),
    'Metode Pembayaran': item.metode_pembayaran,
    'Ada Potongan': item.ada_potongan ? 'Ya' : 'Tidak',
    'Dibuat Pada': format(new Date(item.dibuat_pada), 'dd/MM/yyyy HH:mm'),
    'Diperbarui Pada': format(new Date(item.diperbarui_pada), 'dd/MM/yyyy HH:mm')
  }))
  
  return XLSX.utils.json_to_sheet(formatted)
}

function createDepositsSheet(data: any[]) {
  const formatted = data.map(item => ({
    'ID Setoran': item.id_setoran,
    'Total Setoran': formatCurrency(item.total_setoran),
    'Penerima Setoran': item.penerima_setoran,
    'Dibuat Pada': format(new Date(item.dibuat_pada), 'dd/MM/yyyy HH:mm'),
    'Diperbarui Pada': format(new Date(item.diperbarui_pada), 'dd/MM/yyyy HH:mm')
  }))
  
  return XLSX.utils.json_to_sheet(formatted)
}


function createDashboardSheet(data: any) {
  const formatted = [
    { 'Kategori': 'Total Sales', 'Nilai': data.totalSales || 0 },
    { 'Kategori': 'Total Produk', 'Nilai': data.totalProducts || 0 },
    { 'Kategori': 'Total Toko', 'Nilai': data.totalStores || 0 },
    { 'Kategori': 'Total Penjualan', 'Nilai': formatCurrency(data.totalSalesAmount || 0) },
    { 'Kategori': 'Pengiriman Selesai', 'Nilai': data.completedShipments || 0 },
    { 'Kategori': 'Pengiriman Pending', 'Nilai': data.pendingShipments || 0 },
    { 'Kategori': 'Penagihan Selesai', 'Nilai': data.completedDeposits || 0 },
    { 'Kategori': 'Penagihan Pending', 'Nilai': data.pendingBills || 0 }
  ]
  
  return XLSX.utils.json_to_sheet(formatted)
}

// Currency formatter helper
function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount ?? 0)
}