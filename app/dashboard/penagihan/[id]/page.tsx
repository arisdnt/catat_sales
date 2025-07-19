'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Edit,
  Receipt,
  Store,
  User,
  MapPin,
  Phone,
  CreditCard,
  Package,
  Minus,
  Calendar,
  DollarSign,
  AlertTriangle
} from 'lucide-react'
import { usePenagihanDetailQuery } from '@/lib/queries/penagihan'
import { useNavigation } from '@/lib/hooks/use-navigation'
import { formatCurrency, formatDate } from '@/components/shared/data-table'

const statusConfig = {
  'Cash': {
    label: 'Cash',
    color: 'bg-green-100 text-green-800',
    icon: DollarSign
  },
  'Transfer': {
    label: 'Transfer',
    color: 'bg-blue-100 text-blue-800',
    icon: CreditCard
  }
}

export default function PenagihanDetailPage() {
  const params = useParams()
  const id = parseInt(params.id as string)
  const { navigate } = useNavigation()
  const { data: response, isLoading, error } = usePenagihanDetailQuery(id)
  const penagihan = (response as { data: any })?.data

  const calculations = useMemo(() => {
    if (!penagihan?.detail_penagihan) return null

    const totalItems = penagihan.detail_penagihan.reduce((sum: number, detail: any) => sum + detail.jumlah_terjual, 0)
    const totalReturned = penagihan.detail_penagihan.reduce((sum: number, detail: any) => sum + detail.jumlah_kembali, 0)
    const subtotal = penagihan.detail_penagihan.reduce((sum: number, detail: any) =>
      sum + (detail.jumlah_terjual * detail.produk.harga_satuan), 0
    )
    const discount = penagihan.potongan_penagihan?.[0]?.jumlah_potongan || 0
    const finalTotal = subtotal - discount

    return {
      totalItems,
      totalReturned,
      subtotal,
      discount,
      finalTotal
    }
  }, [penagihan])

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
              <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-gray-200 rounded-lg"></div>
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !penagihan) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="text-red-600 mb-4">Error loading billing details</div>
          <Button onClick={() => navigate('/dashboard/penagihan')}>Back to Billings</Button>
        </div>
      </div>
    )
  }

  const StatusIcon = statusConfig[penagihan.metode_pembayaran as keyof typeof statusConfig]?.icon || CreditCard

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/penagihan')}
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
              Penagihan #{penagihan.id_penagihan}
            </h1>
            <p className="text-gray-500 mt-1">
              Dibuat pada {formatDate(penagihan.dibuat_pada)}
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate(`/dashboard/penagihan/${id}/edit`)}
          className="flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit Penagihan
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Store Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Informasi Toko
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nama Toko</label>
                  <p className="text-lg font-semibold text-gray-900">{penagihan.toko.nama_toko}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Sales</label>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{penagihan.toko.sales.nama_sales}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Lokasi</label>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">
                      {penagihan.toko.kecamatan}, {penagihan.toko.kabupaten}
                    </span>
                  </div>
                </div>
                {penagihan.toko.sales.nomor_telepon && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Telepon Sales</label>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{penagihan.toko.sales.nomor_telepon}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Product Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Detail Produk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {penagihan.detail_penagihan.map((detail: any, index: number) => (
                  <div key={detail.id_detail_tagih} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{detail.produk.nama_produk}</h4>
                      <Badge variant="outline">
                        {formatCurrency(detail.produk.harga_satuan)}/unit
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <label className="text-gray-500">Jumlah Terjual</label>
                        <p className="font-medium text-green-600">{detail.jumlah_terjual} unit</p>
                      </div>
                      <div>
                        <label className="text-gray-500">Jumlah Kembali</label>
                        <p className="font-medium text-orange-600">{detail.jumlah_kembali} unit</p>
                      </div>
                      <div>
                        <label className="text-gray-500">Net Terjual</label>
                        <p className="font-medium text-blue-600">
                          {detail.jumlah_terjual - detail.jumlah_kembali} unit
                        </p>
                      </div>
                      <div>
                        <label className="text-gray-500">Subtotal</label>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(detail.jumlah_terjual * detail.produk.harga_satuan)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StatusIcon className="w-5 h-5" />
                Informasi Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Metode Pembayaran</label>
                <Badge className={`mt-1 ${statusConfig[penagihan.metode_pembayaran as keyof typeof statusConfig]?.color}`}>
                  {statusConfig[penagihan.metode_pembayaran as keyof typeof statusConfig]?.label}
                </Badge>
              </div>
              
              <Separator />
              
              {calculations && (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(calculations.subtotal)}</span>
                  </div>
                  
                  {penagihan.ada_potongan && calculations.discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span className="flex items-center gap-1">
                        <Minus className="w-4 h-4" />
                        Potongan
                      </span>
                      <span className="font-medium">-{formatCurrency(calculations.discount)}</span>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Diterima</span>
                    <span className="text-green-600">{formatCurrency(penagihan.total_uang_diterima)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discount Information */}
          {penagihan.ada_potongan && penagihan.potongan_penagihan?.[0] && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="w-5 h-5" />
                  Detail Potongan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Jumlah Potongan</label>
                  <p className="text-lg font-semibold text-red-600">
                    {formatCurrency(penagihan.potongan_penagihan[0].jumlah_potongan)}
                  </p>
                </div>
                {penagihan.potongan_penagihan[0].alasan && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Alasan</label>
                    <p className="text-gray-900">{penagihan.potongan_penagihan[0].alasan}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Summary Statistics */}
          {calculations && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Ringkasan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Item Terjual</span>
                  <span className="font-medium">{calculations.totalItems} unit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Item Kembali</span>
                  <span className="font-medium">{calculations.totalReturned} unit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Net Item Terjual</span>
                  <span className="font-medium text-green-600">
                    {calculations.totalItems - calculations.totalReturned} unit
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Jenis Produk</span>
                  <span className="font-medium">{penagihan.detail_penagihan.length} jenis</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Informasi Waktu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Dibuat Pada</label>
                <p className="text-gray-900">{formatDate(penagihan.dibuat_pada)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Diperbarui Pada</label>
                <p className="text-gray-900">{formatDate(penagihan.diperbarui_pada)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}