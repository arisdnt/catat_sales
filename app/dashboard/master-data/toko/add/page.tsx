'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Save, Store, AlertCircle, Plus, X, Building2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { tokoSchema, type TokoFormData } from '@/lib/form-utils'
import { useSalesQuery } from '@/lib/queries/sales'

// Types
interface TokoRow extends TokoFormData {
  id: string
  isValid: boolean
}

interface FormData {
  selectedSales: number | null
}

const initialTokoData: TokoFormData = {
  nama_toko: '',
  kecamatan: '',
  kabupaten: '',
  no_telepon: '',
  link_gmaps: '',
  sales_id: '',
  status: 'aktif'
}

const statusOptions = [
  { value: 'aktif', label: 'Aktif' },
  { value: 'nonaktif', label: 'Nonaktif' }
]

export default function AddTokoPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  // Loading and error states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form data
  const [formData, setFormData] = useState<FormData>({
    selectedSales: null
  })
  
  // Toko rows for bulk input
  const [tokoRows, setTokoRows] = useState<TokoRow[]>([])
  
  const { data: salesResponse, isLoading: salesLoading, error: salesError } = useSalesQuery()
  const salesData: any[] = (salesResponse as any)?.data || []
  
  // Add new toko row
  const addTokoRow = () => {
    const newRow: TokoRow = {
      ...initialTokoData,
      sales_id: formData.selectedSales?.toString() || '',
      id: Date.now().toString(),
      isValid: false
    }
    setTokoRows(prev => [...prev, newRow])
  }
  
  // Remove toko row
  const removeTokoRow = (id: string) => {
    setTokoRows(prev => prev.filter(row => row.id !== id))
  }
  
  // Update toko row
  const updateTokoRow = (id: string, field: keyof TokoFormData, value: string) => {
    setTokoRows(prev => prev.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value }
        // Validate the row
        const validation = tokoSchema.safeParse(updatedRow)
        return { ...updatedRow, isValid: validation.success }
      }
      return row
    }))
  }
  
  // Update form data
  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }
  
  // Add initial row when sales is selected
  useEffect(() => {
    if (formData.selectedSales && tokoRows.length === 0) {
      addTokoRow()
    }
  }, [formData.selectedSales])
  
  // Validate form
  const validateForm = (): string | null => {
    if (!formData.selectedSales) return 'Silakan pilih sales'
    if (tokoRows.length === 0) return 'Silakan tambahkan minimal satu toko'
    
    const invalidRows = tokoRows.filter(row => !row.isValid)
    if (invalidRows.length > 0) {
      return 'Silakan lengkapi semua data toko yang diperlukan'
    }
    
    return null
  }
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      toast({
        title: 'Error',
        description: validationError,
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)
    setError(null)
    
    try {
      // Submit all toko data
      const promises = tokoRows.map(row => 
        fetch('/api/toko', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nama_toko: row.nama_toko,
            kecamatan: row.kecamatan,
            kabupaten: row.kabupaten,
            no_telepon: row.no_telepon,
            link_gmaps: row.link_gmaps,
            sales_id: row.sales_id,
            status: row.status
          })
        })
      )
      
      const responses = await Promise.all(promises)
      
      // Check if all requests were successful
      const failedResponses = responses.filter(response => !response.ok)
      if (failedResponses.length > 0) {
        throw new Error(`Gagal menyimpan ${failedResponses.length} dari ${responses.length} toko`)
      }

      toast({
        title: 'Berhasil',
        description: `${tokoRows.length} toko berhasil disimpan`
      })

      router.push('/dashboard/master-data/toko')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (salesLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Memuat data...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (salesError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Gagal memuat data sales: {salesError.message}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
            <CardTitle className="flex items-center justify-between text-purple-900">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Form Tambah Toko (Bulk)
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Batal
                </Button>
                <Button
                  type="submit"
                  form="toko-form"
                  disabled={isSubmitting || !formData.selectedSales || tokoRows.length === 0 || tokoRows.some(row => !row.isValid)}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-6 shadow-lg"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Menyimpan...' : `Simpan ${tokoRows.length} Toko`}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 lg:p-8">
            <form id="toko-form" onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
              {/* Sales Selection */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <div>
                  <Label htmlFor="sales" className="text-sm font-medium text-blue-900">Pilih Sales</Label>
                  <Select 
                    value={formData.selectedSales?.toString() || ''} 
                    onValueChange={(value) => updateFormData({ selectedSales: parseInt(value) })}
                  >
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue placeholder="-- Pilih Sales --" />
                    </SelectTrigger>
                    <SelectContent>
                      {salesData.map(sales => (
                        <SelectItem key={sales.id_sales} value={sales.id_sales.toString()}>
                          {sales.nama_sales}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Toko Input Section */}
              {formData.selectedSales && (
                <div className="space-y-6">
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Data Toko ({tokoRows.length})
                    </h3>
                  </div>

                  {tokoRows.map((row, index) => (
                    <Card key={row.id} className={`border-2 ${row.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">Toko #{index + 1}</h4>
                          <div className="flex items-center gap-2">
                            {row.isValid ? (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Valid</span>
                            ) : (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">Belum Lengkap</span>
                            )}
                            {tokoRows.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeTokoRow(row.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Basic Information - 2 Columns */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`nama_toko_${row.id}`} className="text-sm font-medium">Nama Toko</Label>
                            <Input
                              id={`nama_toko_${row.id}`}
                              type="text"
                              value={row.nama_toko}
                              onChange={(e) => updateTokoRow(row.id, 'nama_toko', e.target.value)}
                              placeholder="Masukkan nama toko"
                              className="mt-1"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor={`status_${row.id}`} className="text-sm font-medium">Status</Label>
                            <Select
                              value={row.status}
                              onValueChange={(value) => updateTokoRow(row.id, 'status', value)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Pilih status" />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Location Section - 2 Columns */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`kecamatan_${row.id}`} className="text-sm font-medium">Kecamatan</Label>
                            <Input
                              id={`kecamatan_${row.id}`}
                              type="text"
                              value={row.kecamatan}
                              onChange={(e) => updateTokoRow(row.id, 'kecamatan', e.target.value)}
                              placeholder="Masukkan nama kecamatan"
                              className="mt-1"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor={`kabupaten_${row.id}`} className="text-sm font-medium">Kabupaten</Label>
                            <Input
                              id={`kabupaten_${row.id}`}
                              type="text"
                              value={row.kabupaten}
                              onChange={(e) => updateTokoRow(row.id, 'kabupaten', e.target.value)}
                              placeholder="Masukkan nama kabupaten"
                              className="mt-1"
                              required
                            />
                          </div>
                        </div>

                        {/* Contact & Additional Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`no_telepon_${row.id}`} className="text-sm font-medium">No. Telepon</Label>
                            <Input
                              id={`no_telepon_${row.id}`}
                              type="tel"
                              value={row.no_telepon}
                              onChange={(e) => updateTokoRow(row.id, 'no_telepon', e.target.value)}
                              placeholder="Contoh: 081234567890"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`link_gmaps_${row.id}`} className="text-sm font-medium">Link Google Maps</Label>
                            <Input
                              id={`link_gmaps_${row.id}`}
                              type="url"
                              value={row.link_gmaps}
                              onChange={(e) => updateTokoRow(row.id, 'link_gmaps', e.target.value)}
                              placeholder="https://maps.google.com/"
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Tombol Tambah Toko di bagian bawah sebelah kanan */}
                  <div className="flex justify-end pt-4">
                    <Button
                      type="button"
                      onClick={addTokoRow}
                      className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 px-6 py-2"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Toko
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}