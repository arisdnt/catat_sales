'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

import { formatCurrency } from '@/lib/form-utils'
import { useProdukDetailQuery, useDeleteProdukMutation, useProductMovementQuery, type Produk } from '@/lib/queries/produk'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Package, 
  DollarSign,
  Calendar,
  Star,
  BarChart3,
  Activity,
  Hash,
  Clock,
  TrendingDown,
  ShoppingCart,
  Truck,
  AlertCircle
} from 'lucide-react'

export default function ProdukDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [productId, setProductId] = useState<number | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Initialize product ID from params
  useState(() => {
    params.then(({ id }) => {
      setProductId(parseInt(id))
    })
  })

  // Queries
  const { data: productResponse, isLoading, error, refetch } = useProdukDetailQuery(productId!)
  const { data: movementResponse, isLoading: movementLoading, error: movementError } = useProductMovementQuery(productId!)
  const deleteProduct = useDeleteProdukMutation()

  const product: Produk | undefined = (productResponse as { data: Produk })?.data
  const movementData = (movementResponse as { data: any })?.data

  const handleDelete = () => {
    if (productId) {
      deleteProduct.mutate(productId, {
        onSuccess: () => {
          router.push('/dashboard/master-data/produk')
        }
      })
    }
    setShowDeleteDialog(false)
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto animate-pulse">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-10 w-10 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
              <div className="h-48 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="space-y-6">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
              <div className="h-48 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="text-red-600 mb-4">
            {error ? 'Error loading product data' : 'Data produk tidak ditemukan'}
          </div>
          <div className="space-x-4">
            <Button onClick={() => refetch()} variant="outline">
              Coba Lagi
            </Button>
            <Button onClick={() => router.back()}>
              Kembali
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{product.nama_produk}</h1>
              <p className="text-sm sm:text-base text-gray-600">Detail informasi produk</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/master-data/produk/${productId}/edit`)}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Button>
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Hapus
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus Produk</AlertDialogTitle>
                  <AlertDialogDescription>
                    Apakah Anda yakin ingin menghapus produk &quot;{product.nama_produk}&quot;? 
                    Tindakan ini tidak dapat dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={deleteProduct.isPending}
                  >
                    {deleteProduct.isPending ? 'Menghapus...' : 'Hapus'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Informasi Produk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        ID Produk
                      </label>
                      <p className="text-gray-900 font-mono text-lg">#{product.id_produk}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Nama Produk</label>
                      <p className="text-gray-900 font-medium text-lg">{product.nama_produk}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600">Status Produk</label>
                      <div className="mt-1">
                        <Badge 
                          className={product.status_produk ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                        >
                          {product.status_produk ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Harga Satuan
                      </label>
                      <p className="text-gray-900 font-bold text-2xl">{formatCurrency(product.harga_satuan)}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        Status Prioritas
                      </label>
                      <div className="mt-1">
                        <Badge 
                          className={product.is_priority ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}
                        >
                          {product.is_priority ? 'Prioritas' : 'Standar'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Terakhir Diperbarui
                      </label>
                      <p className="text-gray-900">
                        {new Date(product.diperbarui_pada).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>


            {/* Product Movement History */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Riwayat Pergerakan Produk
                </CardTitle>
              </CardHeader>
              <CardContent>
                {movementLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Memuat riwayat...</span>
                  </div>
                ) : movementError ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <div className="text-red-600 font-medium">Gagal memuat riwayat</div>
                    <div className="text-sm text-gray-500 mt-1">Silakan refresh halaman</div>
                  </div>
                ) : movementData?.movements?.length > 0 ? (
                  <div className="space-y-4">
                    {/* Movement Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold text-blue-600">{movementData.summary.total_shipped}</div>
                            <div className="text-sm text-blue-700">Total Terkirim</div>
                          </div>
                          <Truck className="w-8 h-8 text-blue-500" />
                        </div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold text-green-600">{movementData.summary.total_sold}</div>
                            <div className="text-sm text-green-700">Total Terjual</div>
                          </div>
                          <ShoppingCart className="w-8 h-8 text-green-500" />
                        </div>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold text-orange-600">{movementData.summary.total_returned}</div>
                            <div className="text-sm text-orange-700">Total Kembali</div>
                          </div>
                          <TrendingDown className="w-8 h-8 text-orange-500" />
                        </div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold text-purple-600">{movementData.summary.conversion_rate.toFixed(1)}%</div>
                            <div className="text-sm text-purple-700">Konversi</div>
                          </div>
                          <BarChart3 className="w-8 h-8 text-purple-500" />
                        </div>
                      </div>
                    </div>

                    {/* Movement Timeline */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Timeline Pergerakan</h4>
                      <div className="max-h-80 overflow-y-auto space-y-3">
                        {movementData.movements.map((movement: any, index: number) => (
                          <div 
                            key={index} 
                            className="group flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border hover:border-gray-300"
                            onClick={() => {
                              if (movement.type === 'shipment') {
                                router.push(`/dashboard/pengiriman/${movement.id}`)
                              } else {
                                router.push(`/dashboard/penagihan/${movement.id}`)
                              }
                            }}
                          >
                            <div className={`p-2 rounded-full ${
                              movement.type === 'shipment' 
                                ? 'bg-blue-100 text-blue-600' 
                                : 'bg-green-100 text-green-600'
                            }`}>
                              {movement.type === 'shipment' ? (
                                <Truck className="w-4 h-4" />
                              ) : (
                                <ShoppingCart className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                                  {movement.description}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {new Date(movement.date).toLocaleDateString('id-ID')}
                                </div>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {movement.store} • {movement.sales}
                              </div>
                              <div className="text-sm font-medium text-gray-900 mt-1">
                                {formatCurrency(movement.value)}
                              </div>
                              <div className="text-xs text-blue-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                Klik untuk lihat detail →
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <div className="text-gray-500 font-medium">Belum ada riwayat pergerakan</div>
                    <div className="text-sm text-gray-400 mt-1">Pergerakan akan muncul setelah produk dikirim atau ditagih</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Aksi Cepat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/dashboard/master-data/produk/${productId}/edit`)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Produk
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/dashboard/master-data/produk')}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Lihat Semua Produk
                </Button>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Informasi Sistem
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Dibuat Pada</label>
                  <p className="text-gray-900 text-sm">
                    {new Date(product.dibuat_pada).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Terakhir Diperbarui</label>
                  <p className="text-gray-900 text-sm">
                    {new Date(product.diperbarui_pada).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}