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
import { useSalesDetailQuery, useDeleteSalesMutation, useSalesStatsQuery, type Sales, type SalesStats } from '@/lib/queries/sales'
import { useTokoQuery } from '@/lib/queries/toko'
import { usePengirimanQuery } from '@/lib/queries/pengiriman'
import { usePenagihanQuery } from '@/lib/queries/penagihan'
import { useSetoranQuery } from '@/lib/queries/setoran'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Users, 
  Phone,
  Calendar,
  Store,
  BarChart3,
  TrendingUp,
  Activity,
  Hash,
  Clock,
  MapPin,
  ShoppingCart,
  Truck,
  DollarSign,
  AlertCircle,
  Target
} from 'lucide-react'

interface StoreData {
  id_toko: number
  nama_toko: string
  kecamatan: string
  kabupaten: string
  status_toko: boolean
  id_sales: number
}

interface ShipmentData {
  id_pengiriman: number
  id_toko: number
  tanggal_kirim: string
}

interface BillingData {
  id_penagihan: number
  id_toko: number
  tanggal_tagih: string
  total_uang_diterima: number
}

interface DepositData {
  id_setoran: number
  id_sales: number
  total_setoran: number
  tanggal_setoran: string
}

export default function SalesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [salesId, setSalesId] = useState<number | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Initialize sales ID from params
  useState(() => {
    params.then(({ id }) => {
      setSalesId(parseInt(id))
    })
  })

  // Queries
  const { data: salesResponse, isLoading, error, refetch } = useSalesDetailQuery(salesId!)
  const { data: statsResponse, isLoading: statsLoading, error: statsError } = useSalesStatsQuery()
  const { data: storeResponse, isLoading: storeLoading } = useTokoQuery()
  const { data: shipmentResponse, isLoading: shipmentLoading } = usePengirimanQuery()
  const { data: billingResponse, isLoading: billingLoading } = usePenagihanQuery()
  const { data: depositResponse, isLoading: depositLoading } = useSetoranQuery()
  const deleteSales = useDeleteSalesMutation()

  const sales: Sales | undefined = (salesResponse as { data: Sales })?.data
  const salesStats: SalesStats[] = (statsResponse as { data: SalesStats[] })?.data || []
  const currentStats = salesStats.find(s => s.id_sales === salesId)
  
  // Filter related data
  const stores = ((storeResponse as { data: StoreData[] })?.data || []).filter((store: StoreData) => store.id_sales === salesId)
  const shipments = ((shipmentResponse as { data: ShipmentData[] })?.data || []).filter((shipment: ShipmentData) => 
    stores.some((store: StoreData) => store.id_toko === shipment.id_toko)
  )
  const billings = ((billingResponse as { data: BillingData[] })?.data || []).filter((billing: BillingData) => 
    stores.some((store: StoreData) => store.id_toko === billing.id_toko)
  )
  const deposits = ((depositResponse as { data: DepositData[] })?.data || []).filter((deposit: DepositData) => 
    deposit.id_sales === salesId
  )

  const handleDelete = () => {
    if (salesId) {
      deleteSales.mutate(salesId, {
        onSuccess: () => {
          router.push('/dashboard/master-data/sales')
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

  if (error || !sales) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="text-red-600 mb-4">
            {error ? 'Error loading sales data' : 'Data sales tidak ditemukan'}
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
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{sales.nama_sales}</h1>
              <p className="text-sm sm:text-base text-gray-600">Detail informasi sales</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/master-data/sales/${salesId}/edit`)}
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
                  <AlertDialogTitle>Hapus Sales</AlertDialogTitle>
                  <AlertDialogDescription>
                    Apakah Anda yakin ingin menghapus sales &quot;{sales.nama_sales}&quot;? 
                    Tindakan ini tidak dapat dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={deleteSales.isPending}
                  >
                    {deleteSales.isPending ? 'Menghapus...' : 'Hapus'}
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
                  <Users className="w-5 h-5" />
                  Informasi Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        ID Sales
                      </label>
                      <p className="text-gray-900 font-mono text-lg">#{sales.id_sales}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Nama Sales</label>
                      <p className="text-gray-900 font-medium text-lg">{sales.nama_sales}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Nomor Telepon
                      </label>
                      <p className="text-gray-900">{sales.nomor_telepon || 'Tidak tersedia'}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <div className="mt-1">
                        <Badge 
                          className={sales.status_aktif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                        >
                          {sales.status_aktif ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        Total Toko
                      </label>
                      <p className="text-gray-900 font-bold text-2xl">{stores.length}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Terakhir Diperbarui
                      </label>
                      <p className="text-gray-900">
                        {new Date(sales.diperbarui_pada).toLocaleDateString('id-ID', {
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

            {/* Statistics */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Statistik Penjualan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Memuat statistik...</span>
                  </div>
                ) : statsError ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <div className="text-red-600 font-medium">Gagal memuat statistik</div>
                    <div className="text-sm text-gray-500 mt-1">Silakan refresh halaman</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-lg mx-auto mb-3">
                        <Store className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-3xl font-bold text-blue-600 mb-1">
                        {currentStats?.total_stores || 0}
                      </div>
                      <div className="text-sm font-medium text-blue-700">Total Toko</div>
                    </div>
                    
                    <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                      <div className="flex items-center justify-center w-12 h-12 bg-green-500 rounded-lg mx-auto mb-3">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-3xl font-bold text-green-600 mb-1">
                        {currentStats?.total_shipped_items || 0}
                      </div>
                      <div className="text-sm font-medium text-green-700">Total Terkirim</div>
                      <div className="text-xs text-green-600 mt-1">Unit produk</div>
                    </div>
                    
                    <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-center w-12 h-12 bg-purple-500 rounded-lg mx-auto mb-3">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-3xl font-bold text-purple-600 mb-1">
                        {formatCurrency(currentStats?.total_revenue || 0)}
                      </div>
                      <div className="text-sm font-medium text-purple-700">Total Pendapatan</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Store Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Daftar Toko ({stores.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {storeLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Memuat toko...</span>
                  </div>
                ) : stores.length > 0 ? (
                  <div className="space-y-3">
                    {stores.slice(0, 5).map((store: StoreData) => (
                      <div key={store.id_toko} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <Store className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{store.nama_toko}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {store.kecamatan}, {store.kabupaten}
                          </div>
                        </div>
                        <Badge className={store.status_toko ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {store.status_toko ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </div>
                    ))}
                    {stores.length > 5 && (
                      <div className="text-center py-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/dashboard/master-data/toko?sales=${salesId}`)}
                        >
                          Lihat Semua ({stores.length}) Toko
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Store className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <div className="text-gray-500 font-medium">Belum ada toko</div>
                    <div className="text-sm text-gray-400 mt-1">Toko yang dikelola sales ini akan muncul di sini</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Aktivitas Terbaru
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Recent Shipments */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Pengiriman Terbaru</h4>
                    {shipmentLoading ? (
                      <div className="text-sm text-gray-500">Memuat pengiriman...</div>
                    ) : shipments.length > 0 ? (
                      <div className="space-y-2">
                        {shipments.slice(0, 3).map((shipment: ShipmentData) => (
                          <div key={shipment.id_pengiriman} className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                            <Truck className="w-4 h-4 text-blue-600" />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                Pengiriman ke {stores.find((s: StoreData) => s.id_toko === shipment.id_toko)?.nama_toko}
                              </div>
                              <div className="text-xs text-gray-600">
                                {new Date(shipment.tanggal_kirim).toLocaleDateString('id-ID')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">Belum ada pengiriman</div>
                    )}
                  </div>

                  {/* Recent Billings */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Penagihan Terbaru</h4>
                    {billingLoading ? (
                      <div className="text-sm text-gray-500">Memuat penagihan...</div>
                    ) : billings.length > 0 ? (
                      <div className="space-y-2">
                        {billings.slice(0, 3).map((billing: BillingData) => (
                          <div key={billing.id_penagihan} className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                            <ShoppingCart className="w-4 h-4 text-green-600" />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                Penagihan {stores.find((s: StoreData) => s.id_toko === billing.id_toko)?.nama_toko}
                              </div>
                              <div className="text-xs text-gray-600">
                                {new Date(billing.tanggal_tagih).toLocaleDateString('id-ID')} - {formatCurrency(billing.total_uang_diterima)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">Belum ada penagihan</div>
                    )}
                  </div>

                  {/* Recent Deposits */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Setoran Terbaru</h4>
                    {depositLoading ? (
                      <div className="text-sm text-gray-500">Memuat setoran...</div>
                    ) : deposits.length > 0 ? (
                      <div className="space-y-2">
                        {deposits.slice(0, 3).map((deposit: DepositData) => (
                          <div key={deposit.id_setoran} className="flex items-center gap-3 p-2 bg-purple-50 rounded-lg">
                            <DollarSign className="w-4 h-4 text-purple-600" />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                Setoran {formatCurrency(deposit.total_setoran)}
                              </div>
                              <div className="text-xs text-gray-600">
                                {new Date(deposit.tanggal_setoran).toLocaleDateString('id-ID')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">Belum ada setoran</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Aksi Cepat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/dashboard/master-data/sales/${salesId}/edit`)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Sales
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/dashboard/master-data/toko?sales=${salesId}`)}
                >
                  <Store className="w-4 h-4 mr-2" />
                  Lihat Toko
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/dashboard/pengiriman?sales=${salesId}`)}
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Lihat Pengiriman
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/dashboard/penagihan?sales=${salesId}`)}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Lihat Penagihan
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/dashboard/master-data/sales')}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Lihat Semua Sales
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
                    {new Date(sales.dibuat_pada).toLocaleDateString('id-ID', {
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
                    {new Date(sales.diperbarui_pada).toLocaleDateString('id-ID', {
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