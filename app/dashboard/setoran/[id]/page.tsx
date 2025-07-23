'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
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
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Banknote, 
  User, 
  Calendar, 
  Clock,
  DollarSign,
  Receipt,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Store,
  ShoppingCart,
  Activity,
  TrendingUp,
  ExternalLink
} from 'lucide-react'
import { useSetoranDetailQuery, useDeleteSetoranMutation, type SetoranDetail } from '@/lib/queries/setoran'
import { formatCurrency } from '@/lib/form-utils'

export default function SetoranDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  const [setoranId, setSetoranId] = useState<number | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Initialize setoran ID from params
  useState(() => {
    params.then(({ id }) => {
      setSetoranId(parseInt(id))
    })
  })

  const { data: response, isLoading, error, refetch } = useSetoranDetailQuery(setoranId!)
  const deleteSetoranMutation = useDeleteSetoranMutation()
  
  const setoran = (response as any)?.data as SetoranDetail

  const handleDelete = () => {
    if (!setoran) return
    
    deleteSetoranMutation.mutate(setoran.id_setoran, {
      onSuccess: () => {
        router.push('/dashboard/setoran')
      }
    })
    setShowDeleteDialog(false)
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 bg-white min-h-screen">
        <div className="w-full max-w-6xl mx-auto animate-pulse">
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

  if (error || !setoran) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 bg-white min-h-screen">
        <div className="w-full max-w-6xl mx-auto text-center">
          <div className="text-red-600 mb-4">
            {error ? 'Error loading setoran data' : 'Data setoran tidak ditemukan'}
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

  const isExactMatch = Math.abs(setoran.selisih) < 0.01
  const statusColor = isExactMatch ? 'green' : setoran.selisih > 0 ? 'red' : 'orange'

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-white min-h-screen">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Detail Setoran #{setoran.id_setoran}
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Tanggal: {setoran.tanggal_setoran}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-700 hover:text-gray-900 transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/setoran/${setoranId}/edit`)}
              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700 hover:text-blue-900 transition-all duration-200"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Button>
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Hapus
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus Setoran</AlertDialogTitle>
                  <AlertDialogDescription>
                    Apakah Anda yakin ingin menghapus setoran #{setoran.id_setoran}? 
                    Tindakan ini tidak dapat dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={deleteSetoranMutation.isPending}
                  >
                    {deleteSetoranMutation.isPending ? 'Menghapus...' : 'Hapus'}
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
                  <Banknote className="w-5 h-5" />
                  Informasi Setoran
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">ID Setoran</label>
                      <p className="text-gray-900 font-mono text-lg">#{setoran.id_setoran}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Tanggal Setoran</label>
                      <p className="text-gray-900 font-medium text-lg">{setoran.tanggal_setoran}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Penerima Setoran
                      </label>
                      <p className="text-gray-900 font-medium text-lg">{setoran.penerima_setoran}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Total Setoran
                      </label>
                      <p className="text-gray-900 font-bold text-2xl">{formatCurrency(setoran.total_setoran)}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status Rekonsiliasi</label>
                      <div className="mt-1">
                        <Badge className={`bg-${statusColor}-100 text-${statusColor}-800`}>
                          {isExactMatch ? (
                            <><CheckCircle className="w-3 h-3 mr-1" /> Sesuai</>
                          ) : setoran.selisih > 0 ? (
                            <><XCircle className="w-3 h-3 mr-1" /> Kurang {formatCurrency(setoran.selisih)}</>
                          ) : (
                            <><AlertCircle className="w-3 h-3 mr-1" /> Lebih {formatCurrency(Math.abs(setoran.selisih))}</>
                          )}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Receipt className="w-4 h-4" />
                  Ringkasan Pembayaran
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded-lg mx-auto mb-2">
                      <CreditCard className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-xl font-bold text-green-600 mb-1">
                      {formatCurrency(setoran.total_cash_diterima)}
                    </div>
                    <div className="text-xs font-medium text-green-700">Pembayaran Cash</div>
                  </div>
                  
                  <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-lg mx-auto mb-2">
                      <CreditCard className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-xl font-bold text-blue-600 mb-1">
                      {formatCurrency(setoran.total_transfer_diterima)}
                    </div>
                    <div className="text-xs font-medium text-blue-700">Pembayaran Transfer</div>
                  </div>
                  
                  <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-center w-8 h-8 bg-purple-500 rounded-lg mx-auto mb-2">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-xl font-bold text-purple-600 mb-1">
                      {formatCurrency(setoran.total_payments)}
                    </div>
                    <div className="text-xs font-medium text-purple-700">Total Pembayaran</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Related Payments */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Transaksi Terkait ({setoran.related_payments?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {setoran.related_payments && setoran.related_payments.length > 0 ? (
                  <div className="space-y-3">
                    {setoran.related_payments.map((payment: any) => (
                      <div 
                        key={payment.id_penagihan} 
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors duration-200 group"
                        onClick={() => router.push(`/dashboard/penagihan/${payment.id_penagihan}`)}
                      >
                        <div className={`p-2 rounded-full ${
                          payment.metode_pembayaran === 'Cash' 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                              {payment.toko.nama_toko}
                            </div>
                            <div className="text-sm text-gray-500">
                              {payment.metode_pembayaran}
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            {payment.toko.sales.nama_sales} • {payment.toko.kecamatan}, {payment.toko.kabupaten}
                          </div>
                          <div className="text-sm font-medium text-gray-900 mt-1">
                            {formatCurrency(payment.total_uang_diterima)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${
                            payment.metode_pembayaran === 'Cash' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {payment.metode_pembayaran}
                          </Badge>
                          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <div className="text-gray-500 font-medium">Tidak ada transaksi terkait</div>
                    <div className="text-sm text-gray-400 mt-1">Transaksi pada tanggal ini akan muncul di sini</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Reconciliation Status */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Status Rekonsiliasi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Cash Diterima:</span>
                    <span className="font-medium text-green-600">{formatCurrency(setoran.total_cash_diterima)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Transfer Diterima:</span>
                    <span className="font-medium text-blue-600">{formatCurrency(setoran.total_transfer_diterima)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Diterima:</span>
                    <span className="font-medium text-purple-600">{formatCurrency(setoran.total_payments)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Setoran Dicatat:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(setoran.total_setoran)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Selisih:</span>
                    <span className={`font-bold ${
                      isExactMatch ? 'text-green-600' : 
                      setoran.selisih > 0 ? 'text-red-600' : 'text-orange-600'
                    }`}>
                      {isExactMatch ? 'Sesuai' : formatCurrency(Math.abs(setoran.selisih))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Informasi Sistem
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Dibuat Pada</label>
                  <p className="text-gray-900 text-sm">
                    {new Date(setoran.dibuat_pada).toLocaleDateString('id-ID', {
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
                    {new Date(setoran.diperbarui_pada).toLocaleDateString('id-ID', {
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