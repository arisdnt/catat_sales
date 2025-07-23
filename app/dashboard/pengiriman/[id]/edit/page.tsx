'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Package,
  Calendar,
  MapPin,
  DollarSign,
  User
} from 'lucide-react'
import { usePengirimanDetailQuery, useUpdatePengirimanMutation } from '@/lib/queries/pengiriman'
import { useProdukQuery } from '@/lib/queries/produk'
import { useNavigation } from '@/lib/hooks/use-navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface DetailItem {
  id_produk: number
  jumlah_kirim: number
  produk?: {
    id_produk: number
    nama_produk: string
    harga_satuan: number
  }
}

export default function EditPengirimanPage() {
  const params = useParams()

  const id = parseInt(params.id as string)
  const { navigate } = useNavigation()
  
  const [tanggalKirim, setTanggalKirim] = useState('')
  const [details, setDetails] = useState<DetailItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: response, isLoading, error } = usePengirimanDetailQuery(id)
  const { data: productsResponse } = useProdukQuery('active')
  const updateMutation = useUpdatePengirimanMutation()
  
  const pengiriman = (response as any)?.data
  const products = (productsResponse as any)?.data?.data || []

  useEffect(() => {
    if (pengiriman) {
      setTanggalKirim(pengiriman.tanggal_kirim.split('T')[0])
      setDetails(pengiriman.detail_pengiriman?.map((detail: any) => ({
        id_produk: detail.produk.id_produk,
        jumlah_kirim: detail.jumlah_kirim,
        produk: detail.produk
      })) || [])
    }
  }, [pengiriman])

  const handleAddDetail = () => {
    setDetails([...details, { id_produk: 0, jumlah_kirim: 1 }])
  }

  const handleRemoveDetail = (index: number) => {
    setDetails(details.filter((_, i) => i !== index))
  }

  const handleDetailChange = (index: number, field: keyof DetailItem, value: any) => {
    const newDetails = [...details]
    if (field === 'id_produk') {
      const selectedProduct = products.find((p: any) => p.id_produk === parseInt(value))
      newDetails[index] = {
        ...newDetails[index],
        id_produk: parseInt(value),
        produk: selectedProduct
      }
    } else {
      newDetails[index] = {
        ...newDetails[index],
        [field]: field === 'jumlah_kirim' ? parseInt(value) || 0 : value
      }
    }
    setDetails(newDetails)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!tanggalKirim || details.length === 0) {
      alert('Harap lengkapi semua field')
      return
    }

    const invalidDetails = details.filter(d => !d.id_produk || d.jumlah_kirim <= 0)
    if (invalidDetails.length > 0) {
      alert('Harap pilih produk dan masukkan jumlah yang valid untuk semua item')
      return
    }

    setIsSubmitting(true)
    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          tanggal_kirim: tanggalKirim,
          details: details.map(d => ({
            id_produk: d.id_produk,
            jumlah_kirim: d.jumlah_kirim
          }))
        }
      })
      navigate(`/dashboard/pengiriman/${id}`)
    } catch (error) {
      console.error('Error updating pengiriman:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 bg-white min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !pengiriman) {
    return (
      <div className="container mx-auto p-6 bg-white min-h-screen">
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Pengiriman Tidak Ditemukan</h2>
          <p className="text-gray-600 mb-6">Pengiriman dengan ID {id} tidak dapat ditemukan.</p>
          <Button onClick={() => navigate('/dashboard/pengiriman')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Daftar Pengiriman
          </Button>
        </div>
      </div>
    )
  }

  const totalQuantity = details.reduce((sum, detail) => sum + detail.jumlah_kirim, 0)
  const totalValue = details.reduce((sum, detail) => {
    const product = detail.produk || products.find((p: any) => p.id_produk === detail.id_produk)
    return sum + (detail.jumlah_kirim * (product?.harga_satuan || 0))
  }, 0)

  return (
    <div className="w-full bg-white min-h-screen">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Pengiriman #{pengiriman.id_pengiriman}</h1>
            <p className="text-gray-600 mt-1">
              Toko: {pengiriman.toko.nama_toko} • {pengiriman.toko.kecamatan}, {pengiriman.toko.kabupaten}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/dashboard/pengiriman/${id}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Store Information (Compact Read-only) */}
          <div className="bg-white border border-gray-200 rounded-md p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Informasi Toko</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <div>
                  <span className="text-gray-500">Toko:</span>
                  <span className="ml-1 font-medium text-gray-900">{pengiriman.toko.nama_toko}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-green-600" />
                <div>
                  <span className="text-gray-500">Sales:</span>
                  <span className="ml-1 font-medium text-gray-900">{pengiriman.toko.sales.nama_sales}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-600" />
                <div>
                  <span className="text-gray-500">Lokasi:</span>
                  <span className="ml-1 font-medium text-gray-900">{pengiriman.toko.kecamatan}, {pengiriman.toko.kabupaten}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">

              {/* Product Details */}
              <div className="bg-white border border-gray-200 rounded-md">
                <div className="border-b border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Detail Produk</h3>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddDetail}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Produk
                    </Button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="space-y-4">
                    {details.map((detail, index) => {
                      const product = detail.produk || products.find((p: any) => p.id_produk === detail.id_produk)
                      return (
                        <div key={index} className="bg-gray-50 border border-gray-100 rounded-md p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-gray-700">Produk {index + 1}</h4>
                            {details.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveDetail(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                              <Label htmlFor={`product-${index}`} className="text-xs font-medium text-gray-600 uppercase tracking-wide">Produk</Label>
                              <Select
                                value={detail.id_produk.toString()}
                                onValueChange={(value) => handleDetailChange(index, 'id_produk', value)}
                              >
                                <SelectTrigger className="mt-1 h-9">
                                  <SelectValue placeholder="Pilih produk" />
                                </SelectTrigger>
                                <SelectContent>
                                  {detail.id_produk === 0 && (
                                    <SelectItem value="0">Pilih produk</SelectItem>
                                  )}
                                  {/* Show currently selected product first */}
                                  {detail.id_produk !== 0 && (
                                    (() => {
                                      const selectedProduct = products.find((p: any) => p.id_produk === detail.id_produk)
                                      return selectedProduct ? (
                                        <SelectItem key={selectedProduct.id_produk} value={selectedProduct.id_produk.toString()}>
                                          {selectedProduct.nama_produk} - Rp {selectedProduct.harga_satuan.toLocaleString("id-ID")} (Terpilih)
                                        </SelectItem>
                                      ) : null
                                    })()
                                  )}
                                  {/* Show other products */}
                                  {products
                                    .filter((product: any) => product.id_produk !== detail.id_produk)
                                    .map((product: any) => (
                                      <SelectItem key={product.id_produk} value={product.id_produk.toString()}>
                                        {product.nama_produk} - Rp {product.harga_satuan.toLocaleString("id-ID")}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label htmlFor={`quantity-${index}`} className="text-xs font-medium text-gray-600 uppercase tracking-wide">Jumlah Kirim</Label>
                              <Input
                                id={`quantity-${index}`}
                                type="number"
                                min="1"
                                value={detail.jumlah_kirim}
                                onChange={(e) => handleDetailChange(index, 'jumlah_kirim', e.target.value)}
                                className="mt-1 h-9"
                              />
                            </div>
                          </div>
                          
                          {product && (
                            <div className="mt-4 pt-3 border-t border-gray-200">
                              <div className="grid grid-cols-3 gap-4 text-xs">
                                <div>
                                  <span className="text-gray-500 block mb-1">Harga Satuan</span>
                                  <p className="font-medium text-gray-900">Rp {product.harga_satuan.toLocaleString("id-ID")}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500 block mb-1">Jumlah Kirim</span>
                                  <p className="font-medium text-blue-600">
                                    {detail.jumlah_kirim} pcs
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-500 block mb-1">Subtotal</span>
                                  <p className="font-semibold text-gray-900">
                                    Rp {(detail.jumlah_kirim * product.harga_satuan).toLocaleString("id-ID")}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    
                    {details.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-600 mb-1">Belum ada produk ditambahkan</p>
                        <p className="text-xs text-gray-500 mb-4">Tambahkan produk untuk melanjutkan pengiriman</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddDetail}
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
              {/* Shipment Information */}
              <div className="bg-white border border-gray-200 rounded-md">
                <div className="border-b border-gray-200 p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Pengiriman</h3>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <Label htmlFor="tanggal_kirim" className="text-xs font-medium text-gray-600 uppercase tracking-wide">Tanggal Kirim</Label>
                    <Input
                      id="tanggal_kirim"
                      type="date"
                      value={tanggalKirim}
                      onChange={(e) => setTanggalKirim(e.target.value)}
                      required
                      className="mt-1 h-9"
                    />
                  </div>
                  
                  <Separator className="my-3" />
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Kuantitas</span>
                      <span className="font-medium text-gray-900">{totalQuantity} pcs</span>
                    </div>
                    
                    <Separator className="my-2" />
                    
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-md">
                      <span className="font-semibold text-gray-900">Total Nilai</span>
                      <span className="font-bold text-green-600">Rp {totalValue.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Information */}
              <div className="bg-white border border-gray-200 rounded-md">
                <div className="border-b border-gray-200 p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Ringkasan</h3>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  {/* Item List */}
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {details.filter(detail => detail.id_produk && detail.jumlah_kirim > 0).map((detail, index) => {
                      const product = detail.produk || products.find((p: any) => p.id_produk === detail.id_produk)
                      if (!product) return null
                      return (
                        <div key={index} className="border-b border-gray-100 pb-2 last:border-0">
                          <div className="text-xs">
                            <p className="font-medium text-gray-900 mb-1">{product.nama_produk}</p>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">{detail.jumlah_kirim} × Rp {product.harga_satuan.toLocaleString('id-ID')}</span>
                              <span className="font-semibold text-gray-900">
                                Rp {(detail.jumlah_kirim * product.harga_satuan).toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    
                    {details.filter(detail => detail.id_produk && detail.jumlah_kirim > 0).length === 0 && (
                      <p className="text-center text-gray-500 py-4 text-xs">Belum ada item</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-md transition-colors"
                disabled={isSubmitting || details.length === 0}
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
    </div>
  )
}