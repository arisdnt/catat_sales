'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { formatDate, formatCurrency } from '@/lib/form-utils'
import { 
  useSalesDetailQuery, 
  useDeleteSalesMutation,
  useSalesDetailStatsQuery,
  useSalesRecentShipmentsQuery,
  useSalesRecentPaymentsQuery,
  useSalesInventoryQuery,
  useSalesProductSalesQuery,
  type Sales 
} from '@/lib/queries/sales'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Users, 
  Phone, 
  Calendar, 
  Activity,
  Package,
  DollarSign,
  BarChart3,
  ShoppingCart,
  CreditCard,
  Hash,
  Store
} from 'lucide-react'

export default function SalesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [salesId, setSalesId] = useState<number | null>(null)
  const { toast } = useToast()

  // Initialize params
  useEffect(() => {
    params.then(({ id }) => {
      setSalesId(parseInt(id))
    })
  }, [params])

  const { data: salesResponse, isLoading, error, refetch } = useSalesDetailQuery(salesId!)
  const { data: statsResponse, isLoading: statsLoading } = useSalesDetailStatsQuery(salesId!)
  const { data: shipmentsResponse, isLoading: shipmentsLoading } = useSalesRecentShipmentsQuery(salesId!, 10)
  const { data: paymentsResponse, isLoading: paymentsLoading } = useSalesRecentPaymentsQuery(salesId!, 10)
  const { data: inventoryResponse, isLoading: inventoryLoading } = useSalesInventoryQuery(salesId!)
  const { data: productSalesResponse, isLoading: productSalesLoading } = useSalesProductSalesQuery(salesId!)
  const deleteSales = useDeleteSalesMutation()

  const sales: Sales | undefined = (salesResponse as { data: Sales })?.data
  const stats = (statsResponse as { data: any })?.data
  const recentShipments = (shipmentsResponse as { data: any[] })?.data || []
  const recentPayments = (paymentsResponse as { data: any[] })?.data || []
  const inventory = (inventoryResponse as { data: any[] })?.data || []
  const productSales = (productSalesResponse as { data: any[] })?.data || []

  const handleDelete = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus sales ini?')) {
      return
    }

    if (salesId) {
      deleteSales.mutate(salesId, {
        onSuccess: () => {
          toast({
            title: 'Berhasil',
            description: 'Sales berhasil dihapus',
          })
          router.push('/dashboard/master-data/sales')
        },
        onError: () => {
          toast({
            title: 'Error',
            description: 'Gagal menghapus sales',
            variant: 'destructive',
          })
        }
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="w-full max-w-none px-4 sm:px-6">
          <div className="animate-pulse space-y-6">
            {/* Header */}
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            
            {/* Row 1 - 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
              <div className="h-32 bg-gray-200 rounded-lg"></div>
              <div className="h-64 bg-gray-200 rounded-lg md:col-span-2 xl:col-span-1"></div>
            </div>
            
            {/* Row 2 - 2 columns */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
            
            {/* Row 3 - 2 columns */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !sales) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sales tidak ditemukan</h1>
          <Button onClick={() => router.push('/dashboard/master-data/sales')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Daftar Sales
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-none px-4 sm:px-6 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{sales.nama_sales}</h1>
            <p className="text-gray-600">Detail Informasi Sales</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push('/dashboard/master-data/sales')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push(`/dashboard/master-data/sales/${salesId}/edit`)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleDelete}
              disabled={deleteSales.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Hapus
            </Button>
          </div>
        </div>

        {/* Row 1: 4 Columns - Ringkasan Statistik (3 cols) | Informasi Sales (1 col) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-6">
          {/* Summary Statistics - Column 1 */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Store className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Total Toko</h3>
            </div>
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ) : (
              <div>
                <p className="text-3xl font-bold text-blue-600">{stats?.total_stores || 0}</p>
                <p className="text-sm text-gray-500">Toko yang dikelola</p>
              </div>
            )}
          </div>

          {/* Summary Statistics - Column 2 */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Total Stok</h3>
            </div>
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ) : (
              <div>
                <p className="text-3xl font-bold text-purple-600">{stats?.total_stock || 0}</p>
                <p className="text-sm text-gray-500">Total stok produk</p>
              </div>
            )}
          </div>

          {/* Summary Statistics - Column 3 */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Total Pendapatan</h3>
            </div>
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ) : (
              <div>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(stats?.total_revenue || 0)}</p>
                <p className="text-sm text-gray-500">Pendapatan keseluruhan</p>
              </div>
            )}
          </div>

          {/* Sales Information - Column 4 */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-6 md:col-span-2 xl:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Informasi Sales</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Row 1 - Column 1: ID Sales */}
              <div className="flex items-start gap-3">
                <Hash className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">ID Sales</p>
                  <p className="text-sm text-gray-600">#{sales.id_sales}</p>
                </div>
              </div>
              
              {/* Row 1 - Column 2: Status */}
              <div className="flex items-start gap-3">
                <Activity className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Status</p>
                  <Badge 
                    className={sales.status_aktif ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"}
                  >
                    {sales.status_aktif ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
              </div>
              
              {/* Row 2 - Column 1: Telepon */}
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Telepon</p>
                  <p className="text-sm text-gray-600">{sales.nomor_telepon || 'Tidak tersedia'}</p>
                </div>
              </div>
              
              {/* Row 2 - Column 2: Bergabung */}
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Bergabung</p>
                  <p className="text-sm text-gray-600">{formatDate(sales.dibuat_pada)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: 2 Columns - Ringkasan Stok | Statistik Penjualan Produk */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* Inventory Summary */}
          <div className="bg-white border border-gray-100 rounded-xl">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <ShoppingCart className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Ringkasan Stok</h3>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              {inventoryLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    </div>
                  ))}
                </div>
              ) : inventory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Belum ada data stok</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[500px]">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left text-xs sm:text-sm font-medium text-gray-500 pb-2 sm:pb-3 px-1">Produk</th>
                          <th className="text-right text-xs sm:text-sm font-medium text-gray-500 pb-2 sm:pb-3 px-1">Harga</th>
                          <th className="text-right text-xs sm:text-sm font-medium text-gray-500 pb-2 sm:pb-3 px-1">Terkirim</th>
                          <th className="text-right text-xs sm:text-sm font-medium text-gray-500 pb-2 sm:pb-3 px-1">Sisa Stok</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventory.map((item: any, index: number) => (
                          <tr key={item.id_produk} className={index !== inventory.length - 1 ? 'border-b border-gray-50' : ''}>
                            <td className="py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900 px-1">{item.nama_produk}</td>
                            <td className="py-2 sm:py-3 text-xs sm:text-sm text-gray-600 text-right px-1">{formatCurrency(item.harga_satuan)}</td>
                            <td className="py-2 sm:py-3 text-xs sm:text-sm text-blue-600 text-right px-1">{item.shipped_quantity || item.total_quantity} unit</td>
                            <td className="py-2 sm:py-3 text-xs sm:text-sm text-right px-1">
                              <span className={`font-bold ${item.total_quantity > 0 ? 'text-green-600' : item.total_quantity === 0 ? 'text-gray-500' : 'text-red-500'}`}>
                                {item.total_quantity} unit
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Product Sales Statistics */}
          <div className="bg-white border border-gray-100 rounded-xl">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Performa Produk</h3>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              {productSalesLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    </div>
                  ))}
                </div>
              ) : productSales.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Belum ada data penjualan</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[500px]">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left text-xs sm:text-sm font-medium text-gray-500 pb-2 sm:pb-3 px-1">Produk</th>
                          <th className="text-center text-xs sm:text-sm font-medium text-gray-500 pb-2 sm:pb-3 px-1">Transaksi</th>
                          <th className="text-right text-xs sm:text-sm font-medium text-gray-500 pb-2 sm:pb-3 px-1">Unit Terjual</th>
                          <th className="text-right text-xs sm:text-sm font-medium text-gray-500 pb-2 sm:pb-3 px-1">Total Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productSales.map((item: any, index: number) => (
                          <tr key={item.id_produk} className={index !== productSales.length - 1 ? 'border-b border-gray-50' : ''}>
                            <td className="py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900 px-1">{item.nama_produk}</td>
                            <td className="py-2 sm:py-3 text-xs sm:text-sm text-gray-600 text-center px-1">{item.total_transactions}</td>
                            <td className="py-2 sm:py-3 text-xs sm:text-sm text-gray-900 text-right px-1">{item.total_quantity_sold}</td>
                            <td className="py-2 sm:py-3 text-xs sm:text-sm text-emerald-600 text-right font-bold px-1">{formatCurrency(item.total_revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: 2 Columns - Data Pengiriman Terakhir | Data Pembayaran Terakhir */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {/* Recent Shipments */}
          <div className="bg-white border border-gray-100 rounded-xl">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Data Pengiriman Terakhir</h2>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              {shipmentsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    </div>
                  ))}
                </div>
              ) : recentShipments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Belum ada data pengiriman</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[500px]">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left text-xs sm:text-sm font-medium text-gray-500 pb-2 sm:pb-3 px-1">ID</th>
                          <th className="text-left text-xs sm:text-sm font-medium text-gray-500 pb-2 sm:pb-3 px-1">Toko</th>
                          <th className="text-left text-xs sm:text-sm font-medium text-gray-500 pb-2 sm:pb-3 px-1">Tanggal</th>
                          <th className="text-right text-xs sm:text-sm font-medium text-gray-500 pb-2 sm:pb-3 px-1">Qty</th>
                          <th className="text-right text-xs sm:text-sm font-medium text-gray-500 pb-2 sm:pb-3 px-1">Nilai</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentShipments.map((shipment, index) => (
                          <tr key={shipment.id_pengiriman} className={index !== recentShipments.length - 1 ? 'border-b border-gray-50' : ''}>
                            <td className="py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900 px-1">#{shipment.id_pengiriman}</td>
                            <td className="py-2 sm:py-3 text-xs sm:text-sm text-gray-600 px-1">{shipment.toko?.nama_toko}</td>
                            <td className="py-2 sm:py-3 text-xs sm:text-sm text-gray-600 px-1">{formatDate(shipment.tanggal_kirim)}</td>
                            <td className="py-2 sm:py-3 text-xs sm:text-sm text-gray-900 text-right px-1">{shipment.total_quantity}</td>
                            <td className="py-2 sm:py-3 text-xs sm:text-sm text-gray-900 text-right font-medium px-1">{formatCurrency(shipment.total_value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Payments */}
          <div className="bg-white border border-gray-100 rounded-xl">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Data Pembayaran Terakhir</h2>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              {paymentsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    </div>
                  ))}
                </div>
              ) : recentPayments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Belum ada data pembayaran</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[500px]">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left text-xs sm:text-sm font-medium text-gray-500 pb-2 sm:pb-3 px-1">ID</th>
                          <th className="text-left text-xs sm:text-sm font-medium text-gray-500 pb-2 sm:pb-3 px-1">Toko</th>
                          <th className="text-left text-xs sm:text-sm font-medium text-gray-500 pb-2 sm:pb-3 px-1">Tanggal</th>
                          <th className="text-right text-xs sm:text-sm font-medium text-gray-500 pb-2 sm:pb-3 px-1">Qty</th>
                          <th className="text-right text-xs sm:text-sm font-medium text-gray-500 pb-2 sm:pb-3 px-1">Jumlah</th>
                          <th className="text-center text-xs sm:text-sm font-medium text-gray-500 pb-2 sm:pb-3 px-1">Metode</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentPayments.map((payment, index) => (
                          <tr key={payment.id_penagihan} className={index !== recentPayments.length - 1 ? 'border-b border-gray-50' : ''}>
                            <td className="py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900 px-1">#{payment.id_penagihan}</td>
                            <td className="py-2 sm:py-3 text-xs sm:text-sm text-gray-600 px-1">{payment.toko?.nama_toko}</td>
                            <td className="py-2 sm:py-3 text-xs sm:text-sm text-gray-600 px-1">{formatDate(payment.dibuat_pada)}</td>
                            <td className="py-2 sm:py-3 text-xs sm:text-sm text-gray-900 text-right px-1">{payment.total_quantity}</td>
                            <td className="py-2 sm:py-3 text-xs sm:text-sm text-gray-900 text-right font-medium px-1">{formatCurrency(payment.total_uang_diterima)}</td>
                            <td className="py-2 sm:py-3 text-center px-1">
                              <Badge 
                                variant={payment.metode_pembayaran === 'Cash' ? 'default' : 'secondary'}
                                className={`text-xs ${payment.metode_pembayaran === 'Cash' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                              >
                                {payment.metode_pembayaran}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}