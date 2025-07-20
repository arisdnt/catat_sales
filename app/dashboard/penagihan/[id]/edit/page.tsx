'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowLeft,
  Save,
  Receipt,
  Store,
  User,
  MapPin,
  CreditCard,
  Package,
  Plus,
  Trash2,
  AlertTriangle
} from 'lucide-react'
import { usePenagihanDetailQuery, useUpdatePenagihanMutation, type UpdatePenagihanData } from '@/lib/queries/penagihan'
import { useProdukQuery } from '@/lib/queries/produk'
import { useNavigation } from '@/lib/hooks/use-navigation'
import { formatCurrency } from '@/components/shared/data-table'

interface ProductDetail {
  id_detail_tagih?: number
  id_produk: number
  jumlah_terjual: number
  jumlah_kembali: number
  produk?: {
    id_produk: number
    nama_produk: string
    harga_satuan: number
  }
}

interface FormData {
  total_uang_diterima: number
  metode_pembayaran: 'Cash' | 'Transfer'
  details: ProductDetail[]
  ada_potongan: boolean
  potongan?: {
    jumlah_potongan: number
    alasan?: string
  }
}

export default function EditPenagihanPage() {
  const params = useParams()
  const id = parseInt(params.id as string)
  const { navigate } = useNavigation()
  const { toast } = useToast()
  const { data: response, isLoading, error } = usePenagihanDetailQuery(id)
  const { data: productsResponse } = useProdukQuery()
  const updatePenagihan = useUpdatePenagihanMutation()
  
  const penagihan = (response as { data: any })?.data
  const products = useMemo(() => (productsResponse as { data: any[] })?.data || [], [productsResponse])

  const [formData, setFormData] = useState<FormData>({
    total_uang_diterima: 0,
    metode_pembayaran: 'Cash',
    details: [],
    ada_potongan: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form data when penagihan data is loaded
  useEffect(() => {
    if (penagihan) {
      setFormData({
        total_uang_diterima: penagihan.total_uang_diterima,
        metode_pembayaran: penagihan.metode_pembayaran,
        details: penagihan.detail_penagihan.map((detail: any) => ({
          id_detail_tagih: detail.id_detail_tagih,
          id_produk: detail.produk.id_produk,
          jumlah_terjual: detail.jumlah_terjual,
          jumlah_kembali: detail.jumlah_kembali,
          produk: detail.produk
        })),
        ada_potongan: penagihan.ada_potongan,
        potongan: penagihan.potongan_penagihan?.[0] ? {
          jumlah_potongan: penagihan.potongan_penagihan[0].jumlah_potongan,
          alasan: penagihan.potongan_penagihan[0].alasan
        } : undefined
      })
    }
  }, [penagihan])

  const calculations = useMemo(() => {
    const subtotal = formData.details.reduce((sum, detail) => {
      const product = products.find(p => p.id_produk === detail.id_produk)
      return sum + (detail.jumlah_terjual * (product?.harga_satuan || 0))
    }, 0)
    
    const discount = formData.ada_potongan ? (formData.potongan?.jumlah_potongan || 0) : 0
    const calculatedTotal = subtotal - discount
    
    return {
      subtotal,
      discount,
      calculatedTotal
    }
  }, [formData.details, formData.ada_potongan, formData.potongan, products])

  const addProductDetail = () => {
    setFormData(prev => ({
      ...prev,
      details: [...prev.details, {
        id_produk: 0,
        jumlah_terjual: 0,
        jumlah_kembali: 0
      }]
    }))
  }

  const removeProductDetail = (index: number) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.filter((_, i) => i !== index)
    }))
  }

  const updateProductDetail = (index: number, field: keyof ProductDetail, value: string | number) => {
    setFormData(prev => {
      const newDetails = [...prev.details]
      newDetails[index] = {
        ...newDetails[index],
        [field]: value
      }
      
      // Update product info when product is selected
      if (field === 'id_produk') {
        const product = products.find(p => p.id_produk === value)
        if (product) {
          newDetails[index].produk = product
        }
      }
      
      return {
        ...prev,
        details: newDetails
      }
    })
  }

  const validateForm = (): string | null => {
    if (formData.details.length === 0) {
      return 'Minimal harus ada satu detail produk'
    }

    for (let i = 0; i < formData.details.length; i++) {
      const detail = formData.details[i]
      if (detail.id_produk === 0) {
        return `Produk pada baris ${i + 1} harus dipilih`
      }
      if (detail.jumlah_terjual < 0) {
        return `Jumlah terjual pada baris ${i + 1} tidak boleh negatif`
      }
      if (detail.jumlah_kembali < 0) {
        return `Jumlah kembali pada baris ${i + 1} tidak boleh negatif`
      }
    }

    if (formData.total_uang_diterima < 0) {
      return 'Total uang diterima tidak boleh negatif'
    }

    if (formData.ada_potongan && (!formData.potongan || formData.potongan.jumlah_potongan < 0)) {
      return 'Jumlah potongan tidak boleh negatif'
    }

    return null
  }

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
    
    try {
      const updateData: UpdatePenagihanData = {
        total_uang_diterima: formData.total_uang_diterima,
        metode_pembayaran: formData.metode_pembayaran,
        details: formData.details.map(detail => ({
          id_produk: detail.id_produk,
          jumlah_terjual: detail.jumlah_terjual,
          jumlah_kembali: detail.jumlah_kembali
        })),
        potongan: formData.ada_potongan && formData.potongan ? {
          jumlah_potongan: formData.potongan.jumlah_potongan,
          alasan: formData.potongan.alasan
        } : undefined
      }

      await updatePenagihan.mutateAsync({ id, data: updateData })
      
      toast({
        title: 'Berhasil',
        description: 'Penagihan berhasil diperbarui'
      })
      
      navigate(`/dashboard/penagihan/${id}`)
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat memperbarui penagihan',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 bg-white min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
              <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !penagihan) {
    return (
      <div className="p-8 bg-white min-h-screen">
        <div className="text-center">
          <div className="text-red-600 mb-4">Error loading billing details</div>
          <Button onClick={() => navigate('/dashboard/penagihan')}>Back to Billings</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/dashboard/penagihan/${id}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Receipt className="w-6 h-6 text-orange-600" />
              </div>
              Edit Penagihan #{penagihan.id_penagihan}
            </h1>
            <p className="text-gray-500 mt-1">
              Toko: {penagihan.toko.nama_toko}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Store Information (Read-only) */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Store className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Informasi Toko</h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Nama Toko</label>
                  <p className="text-lg font-semibold text-gray-900">{penagihan.toko.nama_toko}</p>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <User className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Sales</label>
                    <p className="text-base font-semibold text-gray-900">{penagihan.toko.sales.nama_sales}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <MapPin className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Lokasi</label>
                    <p className="text-base font-semibold text-gray-900">
                      {penagihan.toko.kecamatan}, {penagihan.toko.kabupaten}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Package className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Detail Produk</h2>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div></div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addProductDetail}
                  className="flex items-center gap-2 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Produk
                </Button>
              </div>
              <div className="space-y-6">
                  {formData.details.map((detail, index) => {
                    const product = products.find(p => p.id_produk === detail.id_produk)
                    return (
                      <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-lg font-semibold text-gray-900">Produk {index + 1}</h4>
                          {formData.details.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProductDetail(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                          <div className="lg:col-span-2">
                            <Label htmlFor={`product-${index}`} className="text-sm font-medium text-gray-700">Produk</Label>
                            <Select
                              value={detail.id_produk.toString()}
                              onValueChange={(value) => updateProductDetail(index, 'id_produk', parseInt(value))}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Pilih produk" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">Pilih produk</SelectItem>
                                {products.map((product) => (
                                  <SelectItem key={product.id_produk} value={product.id_produk.toString()}>
                                    {product.nama_produk} - {formatCurrency(product.harga_satuan)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor={`sold-${index}`} className="text-sm font-medium text-gray-700">Jumlah Terjual</Label>
                            <Input
                              id={`sold-${index}`}
                              type="number"
                              min="0"
                              value={detail.jumlah_terjual}
                              onChange={(e) => updateProductDetail(index, 'jumlah_terjual', parseInt(e.target.value) || 0)}
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`returned-${index}`} className="text-sm font-medium text-gray-700">Jumlah Kembali</Label>
                            <Input
                              id={`returned-${index}`}
                              type="number"
                              min="0"
                              value={detail.jumlah_kembali}
                              onChange={(e) => updateProductDetail(index, 'jumlah_kembali', parseInt(e.target.value) || 0)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        
                        {product && (
                          <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500 block mb-1">Harga Satuan:</span>
                                <p className="font-medium text-gray-900">{formatCurrency(product.harga_satuan)}</p>
                              </div>
                              <div>
                                <span className="text-gray-500 block mb-1">Net Terjual:</span>
                                <p className="font-medium text-blue-600">
                                  {detail.jumlah_terjual - detail.jumlah_kembali} unit
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500 block mb-1">Subtotal:</span>
                                <p className="font-semibold text-gray-900">
                                  {formatCurrency(detail.jumlah_terjual * product.harga_satuan)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  
                  {formData.details.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-lg font-medium text-gray-600 mb-2">Belum ada produk ditambahkan</p>
                      <p className="text-sm text-gray-500 mb-6">Tambahkan produk untuk melanjutkan penagihan</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addProductDetail}
                        className="mt-2"
                      >
                        Tambah Produk Pertama
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Information */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Informasi Pembayaran</h3>
              </div>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="payment-method" className="text-sm font-medium text-gray-700">Metode Pembayaran</Label>
                  <Select
                    value={formData.metode_pembayaran}
                    onValueChange={(value: 'Cash' | 'Transfer') => setFormData(prev => ({ ...prev, metode_pembayaran: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="total-received" className="text-sm font-medium text-gray-700">Total Uang Diterima</Label>
                  <Input
                    id="total-received"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.total_uang_diterima}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_uang_diterima: parseFloat(e.target.value) || 0 }))}
                    className="mt-1"
                  />
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">{formatCurrency(calculations.subtotal)}</span>
                  </div>
                  
                  {formData.ada_potongan && calculations.discount > 0 && (
                    <div className="flex justify-between items-center text-red-600">
                      <span>Potongan</span>
                      <span className="font-medium">-{formatCurrency(calculations.discount)}</span>
                    </div>
                  )}
                  
                  <Separator className="my-4" />
                  
                  <div className="flex justify-between items-center text-lg font-bold bg-green-50 p-3 rounded-lg">
                    <span className="text-gray-900">Total Kalkulasi</span>
                    <span className="text-green-600">{formatCurrency(calculations.calculatedTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Discount Information */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Potongan</h3>
              </div>
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="has-discount"
                    checked={formData.ada_potongan}
                    onCheckedChange={(checked) => {
                      setFormData(prev => ({
                        ...prev,
                        ada_potongan: !!checked,
                        potongan: checked ? (prev.potongan || { jumlah_potongan: 0 }) : undefined
                      }))
                    }}
                  />
                  <Label htmlFor="has-discount" className="text-sm font-medium text-gray-700">Ada potongan</Label>
                </div>
                
                {formData.ada_potongan && (
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="discount-amount" className="text-sm font-medium text-gray-700">Jumlah Potongan</Label>
                      <Input
                        id="discount-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.potongan?.jumlah_potongan || 0}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          potongan: {
                            ...prev.potongan,
                            jumlah_potongan: parseFloat(e.target.value) || 0,
                            alasan: prev.potongan?.alasan
                          }
                        }))}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="discount-reason" className="text-sm font-medium text-gray-700">Alasan Potongan</Label>
                      <Textarea
                        id="discount-reason"
                        placeholder="Masukkan alasan potongan (opsional)"
                        value={formData.potongan?.alasan || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          potongan: {
                            ...prev.potongan,
                            jumlah_potongan: prev.potongan?.jumlah_potongan || 0,
                            alasan: e.target.value
                          }
                        }))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Menyimpan...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Simpan Perubahan
                </div>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}