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
import { ArrowLeft, Save, Package, Plus, X, AlertCircle, ShoppingCart } from 'lucide-react'

// Interface untuk row produk individual (sesuai database schema)
interface ProdukRow {
  id: string
  nama_produk: string
  harga_satuan: number
  status_produk: boolean
  isValid: boolean
  errors: Record<string, string>
}

// Interface untuk form data
interface FormData {
  // Tidak ada field khusus untuk produk bulk input
}

const initialProdukData: Omit<ProdukRow, 'id' | 'isValid' | 'errors'> = {
  nama_produk: '',
  harga_satuan: 0,
  status_produk: true
}

export default function AddProdukPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // State untuk bulk input
  const [formData, setFormData] = useState<FormData>({})
  const [produkRows, setProdukRows] = useState<ProdukRow[]>([])

  // Fungsi untuk menambah row produk baru
  const addProdukRow = () => {
    const newRow: ProdukRow = {
      id: Date.now().toString(),
      ...initialProdukData,
      isValid: false,
      errors: {}
    }
    setProdukRows(prev => [...prev, newRow])
  }

  // Fungsi untuk menghapus row produk
  const removeProdukRow = (id: string) => {
    setProdukRows(prev => prev.filter(row => row.id !== id))
  }

  // Fungsi untuk update row produk
  const updateProdukRow = (id: string, field: keyof Omit<ProdukRow, 'id' | 'isValid' | 'errors'>, value: any) => {
    setProdukRows(prev => prev.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value }
        
        // Validasi row sesuai database schema
        try {
          // Validasi minimal untuk database schema produk
          if (!updatedRow.nama_produk || updatedRow.nama_produk.length < 2) {
            throw new Error('Nama produk harus minimal 2 karakter')
          }
          if (updatedRow.nama_produk.length > 255) {
            throw new Error('Nama produk maksimal 255 karakter')
          }
          if (updatedRow.harga_satuan < 0) {
            throw new Error('Harga satuan harus lebih besar dari 0')
          }
          updatedRow.isValid = true
          updatedRow.errors = {}
        } catch (error: any) {
          updatedRow.isValid = false
          // Handle simple error message
          if (error.message.includes('Nama produk')) {
            updatedRow.errors = { nama_produk: error.message }
          } else if (error.message.includes('Harga satuan')) {
            updatedRow.errors = { harga_satuan: error.message }
          } else {
            updatedRow.errors = { general: error.message }
          }
        }
        
        return updatedRow
      }
      return row
    }))
  }

  // Fungsi untuk update form data
  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Fungsi submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Validasi semua rows
    const validRows = produkRows.filter(row => row.isValid)
    if (validRows.length === 0) {
      setError('Minimal harus ada satu produk yang valid')
      return
    }
    
    if (validRows.length !== produkRows.length) {
      setError('Semua data produk harus valid sebelum disimpan')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Submit semua produk sesuai database schema
      const promises = validRows.map(row => 
        fetch('/api/produk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nama_produk: row.nama_produk,
            harga_satuan: row.harga_satuan,
            status_produk: row.status_produk
          })
        })
      )
      
      const results = await Promise.all(promises)
      
      // Check if all requests were successful
      const failedRequests = results.filter(response => !response.ok)
      if (failedRequests.length > 0) {
        throw new Error(`Gagal menyimpan ${failedRequests.length} dari ${results.length} data produk`)
      }
      
      toast({
        title: 'Berhasil',
        description: `${validRows.length} data produk berhasil disimpan`
      })
      
      router.push('/dashboard/master-data/produk')
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
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Package className="w-6 h-6" />
              Form Tambah Produk
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
                form="produk-form"
                disabled={isSubmitting || produkRows.length === 0 || !produkRows.every(row => row.isValid)}
                className="bg-white text-blue-600 hover:bg-gray-100"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Menyimpan...' : `Simpan ${produkRows.length} Produk`}
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
          
          <form id="produk-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Produk Input Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Data Produk ({produkRows.length})
                </h3>
                <Button
                  type="button"
                  onClick={addProdukRow}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Produk
                </Button>
              </div>
              
              {produkRows.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">Belum ada data produk</p>
                  <p className="text-sm">Klik tombol "Tambah Produk" untuk menambah data produk baru</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {produkRows.map((row, index) => (
                    <Card key={row.id} className={`border-2 ${row.isValid ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4" />
                            Produk #{index + 1}
                            {row.isValid && <span className="text-green-600 text-sm">(✓ Valid)</span>}
                            {!row.isValid && Object.keys(row.errors).length > 0 && <span className="text-red-600 text-sm">(✗ Error)</span>}
                          </CardTitle>
                          {produkRows.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProdukRow(row.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Produk Information - Sesuai Database Schema */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`nama_produk_${row.id}`} className="text-sm font-medium">Nama Produk *</Label>
                            <Input
                              id={`nama_produk_${row.id}`}
                              value={row.nama_produk}
                              onChange={(e) => updateProdukRow(row.id, 'nama_produk', e.target.value)}
                              placeholder="Masukkan nama produk"
                              className={row.errors.nama_produk ? 'border-red-500' : ''}
                            />
                            {row.errors.nama_produk && (
                              <p className="text-sm text-red-600">{row.errors.nama_produk}</p>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`harga_satuan_${row.id}`} className="text-sm font-medium">Harga Satuan *</Label>
                            <Input
                              id={`harga_satuan_${row.id}`}
                              type="number"
                              value={row.harga_satuan}
                              onChange={(e) => updateProdukRow(row.id, 'harga_satuan', parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              min={0}
                              step="0.01"
                              className={row.errors.harga_satuan ? 'border-red-500' : ''}
                            />
                            {row.errors.harga_satuan && (
                              <p className="text-sm text-red-600">{row.errors.harga_satuan}</p>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Status Produk</Label>
                            <div className="flex items-center space-x-2 pt-2">
                              <Checkbox
                                checked={row.status_produk}
                                onCheckedChange={(checked) => updateProdukRow(row.id, 'status_produk', checked)}
                              />
                              <Label className="text-sm">Produk Aktif</Label>
                            </div>
                            {row.errors.status_produk && (
                              <p className="text-sm text-red-600">{row.errors.status_produk}</p>
                            )}
                          </div>
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