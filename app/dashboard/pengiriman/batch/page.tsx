'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Save, Plus, X, Truck } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiClient } from '@/lib/api-client'
import { useSalesQuery } from '@/lib/queries/sales'

interface BatchShipmentDetail {
  id_produk: number
  jumlah_kirim: number
}

interface BatchShipmentStore {
  id_toko: number
  nama_toko: string
  details: BatchShipmentDetail[]
}

export default function BatchPengirimanPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form data
  const [formData, setFormData] = useState({
    id_sales: '',
    tanggal_kirim: new Date().toISOString().split('T')[0],
    keterangan: ''
  })
  
  const [stores, setStores] = useState<BatchShipmentStore[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [availableStores, setAvailableStores] = useState<any[]>([])

  const { data: salesResponse, isLoading: salesLoading } = useSalesQuery()
  const salesData = (salesResponse as any)?.data || []

  // Load products when component mounts
  React.useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await apiClient.getProducts('active')
        if ((response as any).success) {
          setProducts((response as any).data)
        }
      } catch (error) {
        console.error('Failed to load products:', error)
      }
    }
    loadProducts()
  }, [])

  // Load stores when sales changes
  React.useEffect(() => {
    if (!formData.id_sales) {
      setAvailableStores([])
      setStores([])
      return
    }

    const loadStores = async () => {
      try {
        const response = await apiClient.getStoresBySales(parseInt(formData.id_sales))
        if ((response as any).success) {
          setAvailableStores((response as any).data.stores)
        }
      } catch (error) {
        console.error('Failed to load stores:', error)
      }
    }
    loadStores()
  }, [formData.id_sales])

  const addStore = () => {
    const availableStore = availableStores.find(store => 
      !stores.some(s => s.id_toko === store.id_toko)
    )
    
    if (availableStore) {
      setStores([...stores, {
        id_toko: availableStore.id_toko,
        nama_toko: availableStore.nama_toko,
        details: []
      }])
    }
  }

  const removeStore = (storeIndex: number) => {
    setStores(stores.filter((_, index) => index !== storeIndex))
  }

  const updateStore = (storeIndex: number, id_toko: number) => {
    const selectedStore = availableStores.find(store => store.id_toko === id_toko)
    if (selectedStore) {
      const newStores = [...stores]
      newStores[storeIndex] = {
        ...newStores[storeIndex],
        id_toko: selectedStore.id_toko,
        nama_toko: selectedStore.nama_toko
      }
      setStores(newStores)
    }
  }

  const addDetail = (storeIndex: number) => {
    const newStores = [...stores]
    newStores[storeIndex].details.push({ id_produk: 0, jumlah_kirim: 0 })
    setStores(newStores)
  }

  const removeDetail = (storeIndex: number, detailIndex: number) => {
    const newStores = [...stores]
    newStores[storeIndex].details = newStores[storeIndex].details.filter((_, index) => index !== detailIndex)
    setStores(newStores)
  }

  const updateDetail = (storeIndex: number, detailIndex: number, field: 'id_produk' | 'jumlah_kirim', value: number) => {
    const newStores = [...stores]
    newStores[storeIndex].details[detailIndex][field] = value
    setStores(newStores)
  }

  const validateForm = (): string | null => {
    if (!formData.id_sales) return 'Silakan pilih sales'
    if (!formData.tanggal_kirim) return 'Silakan pilih tanggal kirim'
    if (stores.length === 0) return 'Silakan tambahkan minimal satu toko'
    
    for (const store of stores) {
      if (!store.id_toko) return 'Silakan pilih toko untuk semua baris'
      if (store.details.length === 0) return `Toko ${store.nama_toko} harus memiliki minimal satu produk`
      
      for (const detail of store.details) {
        if (!detail.id_produk) return `Silakan pilih produk untuk toko ${store.nama_toko}`
        if (!detail.jumlah_kirim || detail.jumlah_kirim <= 0) return `Jumlah kirim harus lebih dari 0 untuk toko ${store.nama_toko}`
      }
    }
    
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      toast({
        title: 'Error',
        description: validationError,
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const payload = {
        id_sales: parseInt(formData.id_sales),
        tanggal_kirim: formData.tanggal_kirim,
        stores: stores.map(store => ({
          id_toko: store.id_toko,
          details: store.details
        })),
        keterangan: formData.keterangan || undefined
      }

      const result = await apiClient.createBatchShipment(payload)
      
      if ((result as any).success) {
        const responseData = (result as any).data
        toast({
          title: 'Berhasil',
          description: responseData.message || `Batch pengiriman berhasil dibuat untuk ${stores.length} toko`,
        })
        router.push('/dashboard/pengiriman')
      } else {
        throw new Error((result as any).message || 'Gagal membuat batch pengiriman')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getAvailableProducts = (storeIndex: number, detailIndex: number) => {
    const usedProducts = stores[storeIndex].details
      .map((d, i) => i !== detailIndex ? d.id_produk : null)
      .filter(Boolean)
    
    return products.filter(product => !usedProducts.includes(product.id_produk))
  }

  const getAvailableStoresForSelection = (currentStoreIndex: number) => {
    const usedStoreIds = stores.map((s, i) => i !== currentStoreIndex ? s.id_toko : null).filter(Boolean)
    return availableStores.filter(store => !usedStoreIds.includes(store.id_toko))
  }

  if (salesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Memuat data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-4 mb-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batch Input Pengiriman</h1>
          <p className="text-gray-600">Buat pengiriman untuk multiple toko sekaligus</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Informasi Umum
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sales">Sales *</Label>
                <Select value={formData.id_sales} onValueChange={(value) => setFormData({...formData, id_sales: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Sales" />
                  </SelectTrigger>
                  <SelectContent>
                    {salesData.map((sales: any) => (
                      <SelectItem key={sales.id_sales} value={sales.id_sales.toString()}>
                        {sales.nama_sales}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="tanggal_kirim">Tanggal Kirim *</Label>
                <Input
                  id="tanggal_kirim"
                  type="date"
                  value={formData.tanggal_kirim}
                  onChange={(e) => setFormData({...formData, tanggal_kirim: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="keterangan">Keterangan</Label>
              <Textarea
                id="keterangan"
                value={formData.keterangan}
                onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                placeholder="Keterangan tambahan (opsional)"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {formData.id_sales && availableStores.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Detail Pengiriman per Toko</h2>
              <Button type="button" onClick={addStore} disabled={stores.length >= availableStores.length}>
                <Plus className="w-4 h-4 mr-2" />
                Tambah Toko
              </Button>
            </div>

            {stores.map((store, storeIndex) => (
              <Card key={storeIndex}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Toko #{storeIndex + 1}</CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStore(storeIndex)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Pilih Toko</Label>
                    <Select 
                      value={store.id_toko.toString()} 
                      onValueChange={(value) => updateStore(storeIndex, parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Toko" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableStoresForSelection(storeIndex).map((availableStore) => (
                          <SelectItem key={availableStore.id_toko} value={availableStore.id_toko.toString()}>
                            {availableStore.nama_toko} - {availableStore.kecamatan}, {availableStore.kabupaten}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {store.id_toko > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <Label>Detail Produk</Label>
                        <Button type="button" size="sm" onClick={() => addDetail(storeIndex)}>
                          <Plus className="w-4 h-4 mr-1" />
                          Tambah Produk
                        </Button>
                      </div>

                      {store.details.map((detail, detailIndex) => (
                        <div key={detailIndex} className="flex items-end gap-2 p-3 border rounded">
                          <div className="flex-1">
                            <Label className="text-xs">Produk</Label>
                            <Select 
                              value={detail.id_produk.toString()} 
                              onValueChange={(value) => updateDetail(storeIndex, detailIndex, 'id_produk', parseInt(value))}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Pilih Produk" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableProducts(storeIndex, detailIndex).map((product) => (
                                  <SelectItem key={product.id_produk} value={product.id_produk.toString()}>
                                    {product.nama_produk} - Rp {product.harga_satuan.toLocaleString()}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-24">
                            <Label className="text-xs">Jumlah</Label>
                            <Input
                              type="number"
                              min="1"
                              value={detail.jumlah_kirim || ''}
                              onChange={(e) => updateDetail(storeIndex, detailIndex, 'jumlah_kirim', parseInt(e.target.value) || 0)}
                              className="h-8"
                              placeholder="0"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDetail(storeIndex, detailIndex)}
                            className="text-red-600 hover:text-red-700 h-8 px-2"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </>
        )}

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <Button type="submit" disabled={isLoading || !formData.id_sales || stores.length === 0}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Menyimpan...' : 'Simpan Batch Pengiriman'}
          </Button>
        </div>
      </form>
    </div>
  )
}