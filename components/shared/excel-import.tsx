'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, X, Eye } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import * as XLSX from 'xlsx'

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

interface ExcelImportProps {
  onImportComplete?: () => void
}

export default function ExcelImport({ onImportComplete }: ExcelImportProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showResult, setShowResult] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const expectedColumns = [
    'NAMA_SALES',
    'NAMA_TOKO', 
    'KECAMATAN',
    'KABUPATEN',
    'NO_TELP',
    'LINK_GOOGLE_MAPS',
    'PRODUK1',
    'PRODUK2',
    'PRODUK3',
    'PRODUK4',
    'PRODUK5'
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: 'Format File Salah',
        description: 'Silakan pilih file Excel (.xlsx atau .xls)',
        variant: 'destructive'
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        if (jsonData.length === 0) {
          toast({
            title: 'File Kosong',
            description: 'File Excel tidak mengandung data',
            variant: 'destructive'
          })
          return
        }

        // Validate columns
        const firstRow = jsonData[0] as any
        const actualColumns = Object.keys(firstRow)
        const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col))
        
        if (missingColumns.length > 0) {
          toast({
            title: 'Kolom Tidak Lengkap',
            description: `Kolom yang hilang: ${missingColumns.join(', ')}`,
            variant: 'destructive'
          })
          return
        }

        setPreviewData(jsonData.slice(0, 5)) // Show first 5 rows for preview
        setShowPreview(true)
        setImportResult(null)
        setShowResult(false)
        
        toast({
          title: 'File Berhasil Dimuat',
          description: `${jsonData.length} baris data siap untuk diimport`
        })
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Gagal membaca file Excel',
          variant: 'destructive'
        })
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImport = async () => {
    if (previewData.length === 0) {
      toast({
        title: 'Error',
        description: 'Tidak ada data untuk diimport',
        variant: 'destructive'
      })
      return
    }

    setIsUploading(true)
    try {
      // Read full data from file again
      const file = fileInputRef.current?.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const fullData = XLSX.utils.sheet_to_json(worksheet)

          const response = await fetch('/api/toko/import', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data: fullData })
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Import failed')
          }

          const result: ImportResult = await response.json()
          setImportResult(result.data)
          setShowResult(true)
          setShowPreview(false)

          if (result.data.success) {
            toast({
              title: 'Import Berhasil',
              description: `${result.data.summary.tokosCreated} toko berhasil diimport`
            })
            onImportComplete?.()
          } else {
            toast({
              title: 'Import Selesai dengan Error',
              description: `${result.data.errors.length} error ditemukan`,
              variant: 'destructive'
            })
          }
        } catch (error) {
          toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Import gagal',
            variant: 'destructive'
          })
        } finally {
          setIsUploading(false)
        }
      }
      reader.readAsArrayBuffer(file)
    } catch (error) {
      setIsUploading(false)
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan saat import',
        variant: 'destructive'
      })
    }
  }

  const downloadTemplate = () => {
    const template = [
      {
        NAMA_SALES: 'Ahmad Fauzi',
        NAMA_TOKO: 'Toko Sejahtera',
        KECAMATAN: 'Bandung Wetan',
        KABUPATEN: 'Bandung',
        NO_TELP: '022-1234567',
        LINK_GOOGLE_MAPS: 'https://maps.google.com/example',
        PRODUK1: 10,
        PRODUK2: 5,
        PRODUK3: 8,
        PRODUK4: 0,
        PRODUK5: 3
      },
      {
        NAMA_SALES: 'Budi Santoso',
        NAMA_TOKO: 'Toko Makmur',
        KECAMATAN: 'Coblong',
        KABUPATEN: 'Bandung',
        NO_TELP: '022-2345678',
        LINK_GOOGLE_MAPS: '',
        PRODUK1: 15,
        PRODUK2: 0,
        PRODUK3: 12,
        PRODUK4: 7,
        PRODUK5: 0
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(template)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template')
    XLSX.writeFile(workbook, 'template_import_toko.xlsx')

    toast({
      title: 'Template Downloaded',
      description: 'Template Excel berhasil didownload'
    })
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
        <CardTitle className="flex items-center gap-2 text-green-900">
          <FileSpreadsheet className="w-5 h-5" />
          Import Data dari Excel
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Format Excel yang diperlukan:</strong><br />
              NAMA_SALES | NAMA_TOKO | KECAMATAN | KABUPATEN | NO_TELP | LINK_GOOGLE_MAPS | PRODUK1 | PRODUK2 | PRODUK3 | PRODUK4 | PRODUK5
              <br /><br />
              <strong>Catatan:</strong><br />
              • Kolom NAMA_SALES dan NAMA_TOKO wajib diisi<br />
              • PRODUK1-5 adalah kuantitas stok awal untuk produk prioritas (opsional)<br />
              • Sales baru akan dibuat otomatis jika belum ada<br />
              • Semua toko akan dibuat dengan stok awal sesuai input
            </AlertDescription>
          </Alert>

          {/* Template Download */}
          <div className="flex items-center gap-4">
            <Button 
              onClick={downloadTemplate}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Template
            </Button>
            <span className="text-sm text-gray-600">Download template Excel untuk referensi format</span>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">Pilih File Excel</p>
              <p className="text-sm text-gray-500 mb-4">Drag & drop file atau klik untuk memilih</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-green-600 hover:bg-green-700"
              >
                Pilih File Excel
              </Button>
            </div>
          </div>

          {/* Preview Data */}
          {showPreview && previewData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Preview Data (5 baris pertama)
                </h3>
                <Button
                  onClick={() => setShowPreview(false)}
                  variant="ghost"
                  size="sm"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="overflow-x-auto bg-gray-50 rounded-lg p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {expectedColumns.map(col => (
                        <th key={col} className="text-left p-2 font-medium text-gray-700">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row: any, index) => (
                      <tr key={index} className="border-b">
                        {expectedColumns.map(col => (
                          <td key={col} className="p-2 text-gray-600">
                            {row[col] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleImport}
                  disabled={isUploading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isUploading ? 'Mengimport...' : 'Mulai Import'}
                </Button>
                <Button
                  onClick={() => setShowPreview(false)}
                  variant="outline"
                >
                  Batal
                </Button>
              </div>
            </div>
          )}

          {/* Import Result */}
          {showResult && importResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  {importResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  Hasil Import
                </h3>
                <Button
                  onClick={() => setShowResult(false)}
                  variant="ghost"
                  size="sm"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600">Total Baris</p>
                  <p className="text-2xl font-bold text-blue-800">{importResult.summary.totalRows}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600">Toko Dibuat</p>
                  <p className="text-2xl font-bold text-green-800">{importResult.summary.tokosCreated}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600">Sales Baru</p>
                  <p className="text-2xl font-bold text-purple-800">{importResult.summary.salesCreated}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-orange-600">Pengiriman Dibuat</p>
                  <p className="text-2xl font-bold text-orange-800">{importResult.summary.shipmentsCreated}</p>
                </div>
                <div className="bg-cyan-50 p-4 rounded-lg">
                  <p className="text-sm text-cyan-600">Produk Terhubung</p>
                  <p className="text-2xl font-bold text-cyan-800">{importResult.summary.productsLinked}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Sales Existing</p>
                  <p className="text-2xl font-bold text-gray-800">{importResult.summary.salesExists}</p>
                </div>
              </div>

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">Error yang Ditemukan:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                    {importResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Success Details */}
              {importResult.details.tokosCreated.length > 0 && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Toko yang Berhasil Dibuat:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {importResult.details.tokosCreated.map((toko, index) => (
                      <div key={index} className="text-green-700">
                        <strong>{toko.nama_toko}</strong> (Sales: {toko.sales})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}