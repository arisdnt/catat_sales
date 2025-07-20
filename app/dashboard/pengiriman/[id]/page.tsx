'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowLeft,
  Edit,
  Package,
  MapPin,
  Calendar,
  User,
  Phone,
  Truck
} from 'lucide-react'
import { usePengirimanDetailQuery } from '@/lib/queries/pengiriman'
import { useNavigation } from '@/lib/hooks/use-navigation'
import { formatDate } from '@/components/shared/data-table'

export default function PengirimanDetailPage() {
  const params = useParams()
  const id = parseInt(params.id as string)
  const { navigate } = useNavigation()
  
  const { data: response, isLoading, error } = usePengirimanDetailQuery(id)
  const pengiriman = (response as any)?.data

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

  const totalQuantity = pengiriman.detail_pengiriman?.reduce((sum: number, detail: any) => sum + detail.jumlah_kirim, 0) || 0
  const totalValue = pengiriman.detail_pengiriman?.reduce((sum: number, detail: any) => sum + (detail.jumlah_kirim * detail.produk.harga_satuan), 0) || 0

  return (
    <div className="container mx-auto p-6 space-y-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/dashboard/pengiriman')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Detail Pengiriman</h1>
            <p className="text-gray-600">#{pengiriman.id_pengiriman}</p>
          </div>
        </div>
        <Button 
          onClick={() => navigate(`/dashboard/pengiriman/${id}/edit`)}
          className="flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit Pengiriman
        </Button>
      </div>

        {/* Informasi Pengiriman */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Informasi Pengiriman</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Tanggal Kirim</p>
                <p className="text-lg font-semibold text-gray-900">{formatDate(pengiriman.tanggal_kirim)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Total Item</p>
                <p className="text-lg font-semibold text-gray-900">{totalQuantity} pcs</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-orange-600 font-bold text-lg">Rp</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Total Nilai</p>
                <p className="text-lg font-semibold text-gray-900">Rp {totalValue.toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Informasi Toko */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-100 rounded-lg">
              <MapPin className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Informasi Toko</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Nama Toko</p>
                <p className="text-lg font-semibold text-gray-900">{pengiriman.toko?.nama_toko}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Alamat</p>
                <p className="text-base font-medium text-gray-900">
                  {pengiriman.toko?.kecamatan}, {pengiriman.toko?.kabupaten}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Sales</p>
                  <p className="text-base font-semibold text-gray-900">{pengiriman.toko?.sales?.nama_sales}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Telepon</p>
                  <p className="text-base font-semibold text-gray-900">{pengiriman.toko?.sales?.nomor_telepon || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detail Produk */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Detail Produk</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Produk</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Harga Satuan</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Jumlah</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {pengiriman.detail_pengiriman?.map((detail: any, index: number) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{detail.produk.nama_produk}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="text-gray-900">Rp {detail.produk.harga_satuan.toLocaleString('id-ID')}</p>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Badge variant="secondary">{detail.jumlah_kirim} pcs</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="font-medium text-gray-900">
                        Rp {(detail.jumlah_kirim * detail.produk.harga_satuan).toLocaleString('id-ID')}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="py-4 px-4 font-semibold text-gray-900" colSpan={2}>Total</td>
                  <td className="py-4 px-4 text-right">
                    <Badge className="bg-blue-100 text-blue-800 text-sm px-3 py-1">{totalQuantity} pcs</Badge>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <p className="font-bold text-xl text-gray-900">
                      Rp {totalValue.toLocaleString('id-ID')}
                    </p>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
    </div>
  )
}