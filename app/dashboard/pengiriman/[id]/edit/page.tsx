'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Package,
  Calendar,
  MapPin
} from 'lucide-react'
import { usePengirimanDetailQuery, useUpdatePengirimanMutation } from '@/lib/queries/pengiriman'
import { useProdukQuery } from '@/lib/queries/produk'
import { useNavigation } from '@/lib/hooks/use-navigation'
import { formatDate } from '@/components/shared/data-table'
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
  const router = useRouter()
  const id = parseInt(params.id as string)
  const { navigate } = useNavigation()
  
  const [tanggalKirim, setTanggalKirim] = useState('')
  const [details, setDetails] = useState<DetailItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: response, isLoading, error } = usePengirimanDetailQuery(id)
  const { data: productsResponse } = useProdukQuery('active')
  const updateMutation = useUpdatePengirimanMutation()
  
  const pengiriman = (response as any)?.data
  const products = (productsResponse as any)?.data || []

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
      <div className="container mx-auto p-6">
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
      <div className="container mx-auto p-6">
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/dashboard/pengiriman/${id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Pengiriman</h1>
            <p className="text-gray-600">#{pengiriman.id_pengiriman}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informasi Toko */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Informasi Toko
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">Nama Toko</p>
              <p className="font-medium text-lg">{pengiriman.toko?.nama_toko}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Alamat</p>
              <p className="font-medium">
                {pengiriman.toko?.kecamatan}, {pengiriman.toko?.kabupaten}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Form Pengiriman */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Informasi Pengiriman
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tanggal_kirim">Tanggal Kirim</Label>
                <Input
                  id="tanggal_kirim"
                  type="date"
                  value={tanggalKirim}
                  onChange={(e) => setTanggalKirim(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-end">
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Total Item</p>
                  <Badge className="bg-blue-100 text-blue-800">{totalQuantity} pcs</Badge>
                </div>
                <div className="ml-6 space-y-2">
                  <p className="text-sm text-gray-500">Total Nilai</p>
                  <p className="font-medium">Rp {totalValue.toLocaleString('id-ID')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detail Produk */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Detail Produk
              </div>
              <Button type="button" onClick={handleAddDetail} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Item
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {details.map((detail, index) => {
                const product = detail.produk || products.find((p: any) => p.id_produk === detail.id_produk)
                return (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border rounded-lg">
                    <div className="md:col-span-5">
                      <Label>Produk</Label>
                      <Select
                        value={detail.id_produk.toString()}
                        onValueChange={(value) => handleDetailChange(index, 'id_produk', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih produk" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product: any) => (
                            <SelectItem key={product.id_produk} value={product.id_produk.toString()}>
                              {product.nama_produk} - Rp {product.harga_satuan.toLocaleString('id-ID')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Jumlah</Label>
                      <Input
                        type="number"
                        min="1"
                        value={detail.jumlah_kirim}
                        onChange={(e) => handleDetailChange(index, 'jumlah_kirim', e.target.value)}
                        placeholder="Jumlah"
                      />
                    </div>
                    <div className="md:col-span-3 flex items-end">
                      <div>
                        <p className="text-sm text-gray-500">Subtotal</p>
                        <p className="font-medium">
                          Rp {((product?.harga_satuan || 0) * detail.jumlah_kirim).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                    <div className="md:col-span-2 flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveDetail(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
              
              {details.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Belum ada produk ditambahkan</p>
                  <p className="text-sm">Klik "Tambah Item" untuk menambah produk</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/dashboard/pengiriman/${id}`)}
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || details.length === 0}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </form>
    </div>
  )
}