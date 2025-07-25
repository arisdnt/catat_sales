'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDashboardRecentTransactionsQuery } from '@/lib/queries/dashboard'
import { Clock, Package, CreditCard, Loader2 } from 'lucide-react'

interface RecentTransactionsProps {
  startDate: string
  endDate: string
}

export function RecentTransactions({ startDate, endDate }: RecentTransactionsProps) {
  const { data: transactionsData, isLoading, error } = useDashboardRecentTransactionsQuery(startDate, endDate)

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value)
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Transaksi Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !transactionsData?.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Transaksi Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Gagal memuat data transaksi</p>
            <p className="text-sm">Silakan coba lagi nanti</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const transactions = transactionsData.data || []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Transaksi Terbaru
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Tidak ada transaksi</p>
              <p className="text-sm">dalam periode yang dipilih</p>
            </div>
          ) : (
            transactions.map((transaction) => (
              <div
                key={`${transaction.tipe_transaksi}-${transaction.id_transaksi}`}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {transaction.tipe_transaksi === 'Pengiriman' ? (
                    <Package className="h-5 w-5 text-blue-600" />
                  ) : (
                    <CreditCard className="h-5 w-5 text-green-600" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant={transaction.tipe_transaksi === 'Pengiriman' ? 'secondary' : 'default'}
                        className="text-xs"
                      >
                        {transaction.tipe_transaksi}
                      </Badge>
                      <span className="font-medium text-sm">
                        {transaction.nama_toko}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span>{transaction.nama_sales}</span> • {formatDate(transaction.tanggal)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {transaction.tipe_transaksi === 'Pengiriman' 
                      ? `${new Intl.NumberFormat('id-ID').format(transaction.nilai)} pcs`
                      : formatCurrency(transaction.nilai)
                    }
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {transactions.length > 0 && (
          <div className="text-center text-xs text-muted-foreground mt-4 pt-4 border-t">
            Menampilkan {transactions.length} transaksi terbaru
          </div>
        )}
      </CardContent>
    </Card>
  )
}