'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Package, 
  ShoppingCart, 
  Warehouse, 
  DollarSign, 
  TrendingUp,
  Loader2
} from 'lucide-react'
import { useDashboardMainStatsQuery } from '@/lib/queries/dashboard'

interface AnalyticsKPICardsProps {
  startDate: string
  endDate: string
}

export function AnalyticsKPICards({ startDate, endDate }: AnalyticsKPICardsProps) {
  const { data: statsData, isLoading, error } = useDashboardMainStatsQuery(startDate, endDate)

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              </CardTitle>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !statsData?.success) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="col-span-full">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Gagal memuat data statistik</p>
              <p className="text-sm">Silakan coba lagi nanti</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = statsData.data

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value)
  }

  // Format number
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('id-ID').format(value)
  }

  // Check if using fallback data
  const isFallback = (stats as any)?._fallback
  const fallbackMessage = (stats as any)?._message

  return (
    <div className="space-y-4">
      {/* Fallback Message */}
      {isFallback && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <TrendingUp className="h-5 w-5" />
            <p className="font-medium">Setup Diperlukan</p>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            {fallbackMessage}
          </p>
        </div>
      )}
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Total Barang Terkirim */}
        <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Barang Terkirim
          </CardTitle>
          <Package className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(stats.total_barang_terkirim)}</div>
          <p className="text-xs text-muted-foreground">
            Dalam periode ini
          </p>
        </CardContent>
      </Card>

      {/* Total Barang Terjual */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Barang Terjual
          </CardTitle>
          <ShoppingCart className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(stats.total_barang_terjual)}</div>
          <p className="text-xs text-muted-foreground">
            Dalam periode ini
          </p>
        </CardContent>
      </Card>

      {/* Total Stok di Toko */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Stok di Toko
          </CardTitle>
          <Warehouse className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(stats.total_stok_di_toko)}</div>
          <p className="text-xs text-muted-foreground">
            Saat ini (kumulatif)
          </p>
        </CardContent>
      </Card>

      {/* Total Pendapatan */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Pendapatan
          </CardTitle>
          <DollarSign className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.total_pendapatan)}</div>
          <p className="text-xs text-muted-foreground">
            Dalam periode ini
          </p>
        </CardContent>
      </Card>

      {/* Estimasi Aset di Toko */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Aset di Toko
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.estimasi_aset_di_toko)}</div>
          <p className="text-xs text-muted-foreground">
            Estimasi nilai saat ini
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}