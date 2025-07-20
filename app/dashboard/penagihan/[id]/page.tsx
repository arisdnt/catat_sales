'use client'

import { useMemo, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Edit,
  Receipt,
  User,
  MapPin,
  Phone,
  CreditCard,
  DollarSign,
  AlertTriangle
} from 'lucide-react'
import { usePenagihanDetailQuery } from '@/lib/queries/penagihan'
import { useNavigation } from '@/lib/hooks/use-navigation'
import { formatCurrency, formatDate } from '@/components/data-tables'

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

  // Add print styles
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @media print {
        body { -webkit-print-color-adjust: exact; color-adjust: exact; }
        .print\\:hidden { display: none !important; }
        .print\\:shadow-none { box-shadow: none !important; }
        .print\\:rounded-none { border-radius: 0 !important; }
        .print\\:border-0 { border: none !important; }
        .print\\:p-0 { padding: 0 !important; }
        .print\\:m-0 { margin: 0 !important; }
        .print\\:w-full { width: 100% !important; }
        .print\\:max-w-none { max-width: none !important; }
        @page { margin: 0.5in; size: A4; }
        .print-container { padding: 0 !important; margin: 0 !important; }
        .invoice-only { display: block !important; }
        body * { visibility: hidden; }
        .invoice-content, .invoice-content * { visibility: visible; }
        .invoice-content { position: absolute; left: 0; top: 0; width: 100%; }
      }
    `
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [])

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
      <div className="w-full bg-white min-h-screen">
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-6">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
              <div className="h-32 bg-gray-200 rounded-lg"></div>
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !penagihan) {
    return (
      <div className="w-full bg-white min-h-screen">
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center py-12">
            <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Penagihan Tidak Ditemukan</h2>
            <p className="text-gray-600 mb-6">Penagihan dengan ID {id} tidak dapat ditemukan.</p>
            <Button onClick={() => navigate('/dashboard/penagihan')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Daftar Penagihan
            </Button>
          </div>
        </div>
      </div>
    )
  }

  

  return (
    <div className="w-full bg-white min-h-screen">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 print:px-0 print:py-0 print-container">
        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-4 print:hidden">
          <div></div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate(`/dashboard/penagihan/${id}/edit`)}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="flex items-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              Print
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/dashboard/penagihan')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </Button>
          </div>
        </div>

        {/* Invoice Container */}
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden print:border-0 print:rounded-none invoice-content">

          {/* Invoice Header */}
          <div className="border-b border-gray-200 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Company Info */}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">INVOICE</h1>
                <p className="text-sm text-gray-600">Sistem Penjualan Titip Bayar</p>
              </div>
              
              {/* Invoice Details */}
              <div className="flex-shrink-0">
                <div className="bg-white border border-gray-200 rounded p-3 space-y-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-xs text-gray-500">Invoice No:</span>
                    <span className="text-sm font-bold text-gray-900">#{penagihan.id_penagihan.toString().padStart(6, '0')}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-xs text-gray-500">Date:</span>
                    <span className="text-sm text-gray-900">{formatDate(penagihan.dibuat_pada)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-xs text-gray-500">Payment:</span>
                    <Badge className={`text-xs ${statusConfig[penagihan.metode_pembayaran as keyof typeof statusConfig]?.color}`}>
                      {statusConfig[penagihan.metode_pembayaran as keyof typeof statusConfig]?.label}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bill To & Sales Info */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bill To */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Bill To</h3>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-gray-900">{penagihan.toko.nama_toko}</p>
                  <p className="text-sm text-gray-600">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    {penagihan.toko.kecamatan}, {penagihan.toko.kabupaten}
                  </p>
                </div>
              </div>
              
              {/* Sales Representative */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sales Representative</h3>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">
                    <User className="w-3 h-3 inline mr-1" />
                    {penagihan.toko.sales.nama_sales}
                  </p>
                  {penagihan.toko.sales.nomor_telepon && (
                    <p className="text-sm text-gray-600">
                      <Phone className="w-3 h-3 inline mr-1" />
                      {penagihan.toko.sales.nomor_telepon}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Items Table */}
          <div className="p-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Items</h3>
            
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">Description</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-700">Unit Price</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-700">Qty Sold</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-700">Qty Return</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-700">Net Qty</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-700">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {penagihan.detail_penagihan.map((detail: any, index: number) => (
                    <tr key={detail.id_detail_tagih} className="border-b border-gray-100">
                      <td className="py-3 px-3">
                        <div className="text-sm font-medium text-gray-900">{detail.produk.nama_produk}</div>
                      </td>
                      <td className="py-3 px-3 text-center text-sm text-gray-700">
                        {formatCurrency(detail.produk.harga_satuan)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          {detail.jumlah_terjual}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
                          {detail.jumlah_kembali}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {detail.jumlah_terjual - detail.jumlah_kembali}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(detail.jumlah_terjual * detail.produk.harga_satuan)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoice Totals */}
          <div className="border-t border-gray-200 p-6">
            <div className="flex flex-col md:flex-row md:justify-between gap-6">
              {/* Left side - Notes and Discount Details */}
              <div className="flex-1">
                {penagihan.ada_potongan && penagihan.potongan_penagihan?.[0] && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Discount Details</h4>
                    <div className="bg-white border border-orange-200 rounded p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-3 h-3 text-orange-600" />
                        <span className="text-xs font-medium text-orange-800">Discount Applied</span>
                      </div>
                      <p className="text-sm font-semibold text-red-600 mb-1">
                        -{formatCurrency(penagihan.potongan_penagihan[0].jumlah_potongan)}
                      </p>
                      {penagihan.potongan_penagihan[0].alasan && (
                        <p className="text-xs text-gray-600">Reason: {penagihan.potongan_penagihan[0].alasan}</p>
                      )}
                    </div>
                  </div>
                )}
                
              </div>
              
              {/* Right side - Totals */}
              <div className="w-full md:w-64">
                <div className="bg-white border border-gray-200 rounded p-4">
                  {calculations && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">{formatCurrency(calculations.subtotal)}</span>
                      </div>
                      
                      {penagihan.ada_potongan && calculations.discount > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Discount:</span>
                          <span className="font-medium">-{formatCurrency(calculations.discount)}</span>
                        </div>
                      )}
                      
                      <Separator className="my-2" />
                      
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total Amount:</span>
                        <span className="text-green-600">{formatCurrency(penagihan.total_uang_diterima)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Footer */}
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex flex-col md:flex-row md:justify-between gap-3 text-xs text-gray-600">
              <div className="space-y-1">
                <p><strong>Created:</strong> {formatDate(penagihan.dibuat_pada)}</p>
                <p><strong>Last Updated:</strong> {formatDate(penagihan.diperbarui_pada)}</p>
              </div>
              <div className="text-center md:text-right">
                <p className="font-medium text-sm">Thank you for your business!</p>
                <p className="text-xs text-gray-500">Invoice #{penagihan.id_penagihan.toString().padStart(6, '0')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}