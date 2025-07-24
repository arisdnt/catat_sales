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
      
      const _results = await Promise.all(promises)
      
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
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="border-b border-gray-200 pb-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Tambah Sales</h1>
                <p className="text-sm text-gray-600 mt-1">Tambahkan data sales baru secara bulk dengan mudah</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Batal
              </Button>
              <Button
                type="button"
                onClick={addSalesRow}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 px-4 py-2"
              >
                <Plus className="w-4 h-4" />
                Tambah Sales
              </Button>
              <Button
                type="submit"
                form="sales-form"
                disabled={isSubmitting || salesRows.length === 0 || !salesRows.every(row => row.isValid)}
                className="bg-blue-600 hover:bg-blue-700 px-6"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Menyimpan...' : `Simpan ${salesRows.length} Sales`}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form id="sales-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Sales Input Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Data Sales ({salesRows.length})
                </h3>
              </div>
              
              {salesRows.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">Belum ada data sales</p>
                  <p className="text-sm">Klik tombol &quot;Tambah Sales&quot; untuk menambah data sales baru</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {salesRows.map((row, index) => (
                    <div key={row.id} className="border border-gray-200 rounded-lg p-6 bg-white">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">Sales #{index + 1}</h4>
                            {row.isValid ? (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full mt-1 inline-block">Valid</span>
                            ) : (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full mt-1 inline-block">Belum lengkap</span>
                            )}
                          </div>
                        </div>
                        {salesRows.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSalesRow(row.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="space-y-6">
                        {/* Sales Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label htmlFor={`nama_sales_${row.id}`} className="block text-sm font-medium text-gray-700 mb-2">
                              Nama Sales *
                            </label>
                            <Input
                              id={`nama_sales_${row.id}`}
                              type="text"
                              value={row.nama_sales}
                              onChange={(e) => updateSalesRow(row.id, 'nama_sales', e.target.value)}
                              className={`${row.errors.nama_sales ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'} rounded-lg`}
                              placeholder="Masukkan nama sales"
                            />
                            {row.errors.nama_sales && (
                              <p className="text-red-500 text-sm mt-1">{row.errors.nama_sales}</p>
                            )}
                          </div>

                          <div>
                            <label htmlFor={`nomor_telepon_${row.id}`} className="block text-sm font-medium text-gray-700 mb-2">
                              Nomor Telepon
                            </label>
                            <Input
                              id={`nomor_telepon_${row.id}`}
                              type="tel"
                              value={row.nomor_telepon}
                              onChange={(e) => updateSalesRow(row.id, 'nomor_telepon', e.target.value)}
                              className={`${row.errors.nomor_telepon ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'} rounded-lg`}
                              placeholder="Contoh: 08123456789"
                            />
                            {row.errors.nomor_telepon && (
                              <p className="text-red-500 text-sm mt-1">{row.errors.nomor_telepon}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <Checkbox
                            id={`status_sales_${row.id}`}
                            checked={row.status_aktif}
                            onCheckedChange={(checked) => updateSalesRow(row.id, 'status_aktif', checked as boolean)}
                          />
                          <label htmlFor={`status_sales_${row.id}`} className="text-sm font-medium text-gray-700">
                            Status Sales Aktif
                          </label>
                        </div>
                       </div>
                     </div>
                  ))}
                </div>
              )}
            </div>

            </form>
          </div>
        </div>
      </div>
  )
}