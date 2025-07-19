'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Save, Users, Plus, X, AlertCircle, Building2 } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

// Interface untuk row sales individual (sesuai database schema)
interface SalesRow {
  id: string
  nama_sales: string
  nomor_telepon: string
  status_aktif: boolean
  isValid: boolean
  errors: Record<string, string>
}

// Interface para form data
interface FormData {
  [key: string]: unknown
}

const initialSalesData: Omit<SalesRow, 'id' | 'isValid' | 'errors'> = {
  nama_sales: '',
  nomor_telepon: '',
  status_aktif: true
}

export default function AddSalesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // State para bulk input
  const [salesRows, setSalesRows] = useState<SalesRow[]>([])

  // Fungsi untuk menambah row sales baru
  const addSalesRow = () => {
    const newRow: SalesRow = {
      id: Date.now().toString(),
      ...initialSalesData,
      isValid: false,
      errors: {}
    }
    setSalesRows(prev => [...prev, newRow])
  }

  // Fungsi untuk menghapus row sales
  const removeSalesRow = (id: string) => {
    setSalesRows(prev => prev.filter(row => row.id !== id))
  }

  // Fungsi para update row sales
  const updateSalesRow = (id: string, field: keyof Omit<SalesRow, 'id' | 'isValid' | 'errors'>, value: string | boolean) => {
    setSalesRows(prev => prev.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value }
        
        // Validasi row sesuai database schema
        try {
          // Validasi minimal untuk database schema sales
          if (!updatedRow.nama_sales || updatedRow.nama_sales.length < 2) {
            throw new Error('Nama sales harus minimal 2 karakter')
          }
          if (updatedRow.nomor_telepon && !/^(\+62|62|0)8[1-9][0-9]{6,9}$/.test(updatedRow.nomor_telepon)) {
            throw new Error('Format nomor telepon tidak valid')
          }
           updatedRow.isValid = true
            updatedRow.errors = {}
          } catch (error: unknown) {
            updatedRow.isValid = false
            // Handle simple error message
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            if (errorMessage.includes('Nama sales')) {
              updatedRow.errors = { nama_sales: errorMessage }
            } else if (errorMessage.includes('nomor telepon')) {
              updatedRow.errors = { nomor_telepon: errorMessage }
            } else {
              updatedRow.errors = { general: errorMessage }
            }
          }
        
        return updatedRow
      }
      return row
    }))
  }

  // Tidak auto-add row, biarkan user menambah sendiri

  // Fungsi submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Validasi semua rows
    const validRows = salesRows.filter(row => row.isValid)
    if (validRows.length === 0) {
      setError('Minimal harus ada satu sales yang valid')
      return
    }
    
    if (validRows.length !== salesRows.length) {
      setError('Semua data sales harus valid sebelum disimpan')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Submit semua sales sesuai database schema menggunakan ApiClient
      const promises = validRows.map(row => 
        apiClient.createSales({
          nama_sales: row.nama_sales,
          nomor_telepon: row.nomor_telepon || undefined
        })
      )
      
      const results = await Promise.all(promises)
      
      // All promises resolved successfully if we reach here
      
      toast({
        title: 'Berhasil',
        description: `${validRows.length} data sales berhasil disimpan`
      })
      
      router.push('/dashboard/master-data/sales')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Terjadi kesalahan')
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <Card className="w-full border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="w-6 h-6" />
              Form Tambah Sales
            </CardTitle>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Batal
              </Button>
              <Button
                type="submit"
                form="sales-form"
                disabled={isSubmitting || salesRows.length === 0 || !salesRows.every(row => row.isValid)}
                className="bg-white text-cyan-600 hover:bg-gray-100"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Menyimpan...' : `Simpan ${salesRows.length} Sales`}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form id="sales-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Sales Input Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Data Sales ({salesRows.length})
                </h3>
                <Button
                  type="button"
                  onClick={addSalesRow}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Sales
                </Button>
              </div>
              
              {salesRows.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">Belum ada data sales</p>
                  <p className="text-sm">Klik tombol &quot;Tambah Sales&quot; untuk menambah data sales baru</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {salesRows.map((row, index) => (
                    <Card key={row.id} className={`border-2 ${row.isValid ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Sales #{index + 1}
                            {row.isValid && <span className="text-green-600 text-sm">(✓ Valid)</span>}
                            {!row.isValid && Object.keys(row.errors).length > 0 && <span className="text-red-600 text-sm">(✗ Error)</span>}
                          </CardTitle>
                          {salesRows.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSalesRow(row.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Sales Information - Sesuai Database Schema */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`nama_sales_${row.id}`} className="text-sm font-medium">Nama Sales *</Label>
                            <Input
                              id={`nama_sales_${row.id}`}
                              value={row.nama_sales}
                              onChange={(e) => updateSalesRow(row.id, 'nama_sales', e.target.value)}
                              placeholder="Masukkan nama sales"
                              className={row.errors.nama_sales ? 'border-red-500' : ''}
                            />
                            {row.errors.nama_sales && (
                              <p className="text-sm text-red-600">{row.errors.nama_sales}</p>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`nomor_telepon_${row.id}`} className="text-sm font-medium">Nomor Telepon</Label>
                            <Input
                              id={`nomor_telepon_${row.id}`}
                              type="tel"
                              value={row.nomor_telepon}
                              onChange={(e) => updateSalesRow(row.id, 'nomor_telepon', e.target.value)}
                              placeholder="08123456789 (opsional)"
                              className={row.errors.nomor_telepon ? 'border-red-500' : ''}
                            />
                            {row.errors.nomor_telepon && (
                              <p className="text-sm text-red-600">{row.errors.nomor_telepon}</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Status Sales */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Status Sales</Label>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={row.status_aktif}
                              onCheckedChange={(checked) => updateSalesRow(row.id, 'status_aktif', checked)}
                            />
                            <Label className="text-sm">Sales Aktif</Label>
                          </div>
                          {row.errors.status_aktif && (
                            <p className="text-sm text-red-600">{row.errors.status_aktif}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </form>
        </CardContent>
        </Card>
      </div>
    </div>
  )
}