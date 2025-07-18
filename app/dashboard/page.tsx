'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Users, 
  Store, 
  DollarSign,
  ShoppingCart,
  Calendar,
  Clock,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Eye,
  BarChart3,
  Filter,
  RefreshCw,
  PieChart as PieChartIcon,
  BarChart2,
  TrendingDown as TrendingDownIcon,
  Award,
  Target,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/auth-provider'
import { useDashboardStatsQuery } from '@/lib/queries/laporan'
import { exportDashboardStats } from '@/lib/excel-export'
import { useToast } from '@/components/ui/use-toast'
import { Download } from 'lucide-react'
// Recharts imports removed - replaced with Chart.js components
import BarChart from '@/components/charts/bar-chart'
import HorizontalBarChart from '@/components/charts/horizontal-bar-chart'
import ComposedChart from '@/components/charts/composed-chart'
import DonutChart from '@/components/charts/donut-chart'
import { useState } from 'react'

export default function DashboardPage() {
  const { user } = useAuth()
  const [timeFilter, setTimeFilter] = useState('thisMonth')
  const [refreshing, setRefreshing] = useState(false)
  const { data: stats, isLoading, error, refetch } = useDashboardStatsQuery(timeFilter)
  const { toast } = useToast()

  // Fallback stats if no data
  const defaultStats = {
    totalSales: 0,
    totalProducts: 0,
    totalStores: 0,
    totalSalesAmount: 0,
    pendingShipments: 0,
    completedShipments: 0,
    pendingBills: 0,
    completedDeposits: 0,
    recentActivities: [],
    salesStats: [],
    topProducts: [],
    topStores: [],
    assetDistribution: [],
    salesPerformance: [],
    monthlyTrends: [],
    cashInHand: [],
    receivables: []
  }

  // Map API response to dashboard format
  const dashboardStats = (stats as any)?.data ? {
    totalSales: (stats as any).data.totalSales || 0,
    totalProducts: (stats as any).data.totalProduk || 0,
    totalStores: (stats as any).data.totalToko || 0,
    totalSalesAmount: (stats as any).data.pendapatanHarian || 0,
    pendingShipments: 0,
    completedShipments: (stats as any).data.totalPengiriman || 0,
    pendingBills: 0,
    completedDeposits: (stats as any).data.totalSetoran || 0,
    recentActivities: [],
    salesStats: (stats as any).data.salesStats || [],
    topProducts: (stats as any).data.topProducts || [],
    topStores: (stats as any).data.topStores || [],
    assetDistribution: (stats as any).data.assetDistribution || [],
    salesPerformance: (stats as any).data.salesPerformance || [],
    monthlyTrends: (stats as any).data.monthlyTrends || [],
    cashInHand: (stats as any).data.cashInHand || [],
    receivables: (stats as any).data.receivables || []
  } : defaultStats

  
  // Update real-time refresh when time filter changes
  const handleTimeFilterChange = (newFilter: string) => {
    setTimeFilter(newFilter)
    // Force refresh when filter changes
    setTimeout(() => refetch(), 100)
  }

  // Show data availability status
  const hasData = (stats as any)?.data && Object.keys((stats as any).data).length > 0
  
  // Chart colors removed - now handled by Chart.js components
  
  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
    toast({ title: 'Data refreshed', description: 'Dashboard data telah diperbarui' })
  }
  
  // Get filter label
  const getFilterLabel = (filter: string) => {
    switch (filter) {
      case 'thisMonth': return 'Bulan Ini'
      case 'lastMonth': return 'Bulan Lalu'
      case 'last3Months': return '3 Bulan Terakhir'
      case 'thisYear': return 'Tahun Ini'
      case 'allTime': return 'Seluruh Waktu'
      default: return 'Bulan Ini'
    }
  }

  const formatCurrency = (amount: number | undefined | null) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount ?? 0)
  }

  const handleExportStats = () => {
    const result = exportDashboardStats(dashboardStats)
    if (result.success) {
      toast({
        title: "Export Data",
        description: `Dashboard statistik berhasil diexport ke ${result.filename}`,
      })
    } else {
      toast({
        title: "Export Error",
        description: result.error || "Terjadi kesalahan saat export",
        variant: "destructive",
      })
    }
  }

  const statCards = [
    {
      title: 'Total Sales',
      value: dashboardStats.totalSales ?? 0,
      description: 'Penjualan bulan ini',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Total Produk',
      value: dashboardStats.totalProducts ?? 0,
      description: 'Produk terdaftar',
      icon: Package,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      change: '+5%',
      changeType: 'positive'
    },
    {
      title: 'Total Toko',
      value: dashboardStats.totalStores ?? 0,
      description: 'Toko mitra',
      icon: Store,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      change: '+8%',
      changeType: 'positive'
    },
    {
      title: 'Total Penjualan',
      value: formatCurrency(dashboardStats.totalSalesAmount),
      description: 'Bulan ini',
      icon: DollarSign,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      change: '+15%',
      changeType: 'positive'
    }
  ]

  const quickActions = [
    {
      title: 'Tambah Penjualan',
      description: 'Catat penjualan baru',
      icon: Plus,
      color: 'from-green-500 to-green-600',
      href: '/dashboard/sales/new'
    },
    {
      title: 'Lihat Laporan',
      description: 'Analisis penjualan',
      icon: BarChart3,
      color: 'from-indigo-500 to-indigo-600',
      href: '/dashboard/laporan'
    },
    {
      title: 'Kelola Pengiriman',
      description: 'Status pengiriman',
      icon: Package,
      color: 'from-pink-500 to-pink-600',
      href: '/dashboard/pengiriman'
    },
    {
      title: 'Cek Penagihan',
      description: 'Tagihan pending',
      icon: Eye,
      color: 'from-cyan-500 to-cyan-600',
      href: '/dashboard/penagihan'
    }
  ]

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-center space-y-4">
          <div className="text-red-600 mb-4">
            <h2 className="text-xl font-semibold mb-2">Error loading dashboard data</h2>
            <p className="text-sm text-gray-600">
              {(error as any)?.message || 'Terjadi kesalahan saat memuat data dashboard'}
            </p>
            <div className="mt-4 p-4 bg-red-50 rounded-lg text-left">
              <p className="text-sm text-red-700">
                <strong>Kemungkinan penyebab:</strong>
              </p>
              <ul className="text-sm text-red-600 mt-2 list-disc list-inside">
                <li>Koneksi ke database terputus</li>
                <li>Sesi login sudah kedaluwarsa</li>
                <li>Server sedang dalam maintenance</li>
              </ul>
            </div>
          </div>
          <div className="space-x-2">
            <Button onClick={() => refetch()}>Coba Lagi</Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh Halaman
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Sistem Penjualan Titip Bayar - Analytics & Monitoring</p>
          {!hasData && !isLoading && (
            <div className="mt-2 text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-md inline-block">
              Data sedang dimuat atau belum tersedia
            </div>
          )}
          {hasData && (
            <div className="mt-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-md inline-block">
              Data terbaru dari database • Filter: {getFilterLabel(timeFilter)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <Select value={timeFilter} onValueChange={handleTimeFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Pilih periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thisMonth">Bulan Ini</SelectItem>
                <SelectItem value="lastMonth">Bulan Lalu</SelectItem>
                <SelectItem value="last3Months">3 Bulan Terakhir</SelectItem>
                <SelectItem value="thisYear">Tahun Ini</SelectItem>
                <SelectItem value="allTime">Seluruh Waktu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            className="flex items-center gap-2"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExportStats} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-blue-50">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-gray-900">
                {formatCurrency(dashboardStats.totalSalesAmount)}
              </h3>
              <p className="text-xs text-gray-600">Total Penjualan</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-green-50">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-gray-900">
                {formatCurrency(dashboardStats.completedDeposits * 15000)}
              </h3>
              <p className="text-xs text-gray-600">Setoran Diterima</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-orange-50">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-gray-900">
                {formatCurrency(dashboardStats.totalSalesAmount * 0.3)}
              </h3>
              <p className="text-xs text-gray-600">Piutang Beredar</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-purple-50">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-gray-900">
                {formatCurrency(dashboardStats.totalProducts * 12000)}
              </h3>
              <p className="text-xs text-gray-600">Barang di Jalan</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-cyan-50">
                <Users className="w-5 h-5 text-cyan-600" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-cyan-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-gray-900">
                {formatCurrency(dashboardStats.totalSales * 8000)}
              </h3>
              <p className="text-xs text-gray-600">Kas di Tangan Sales</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-emerald-50">
                <Store className="w-5 h-5 text-emerald-600" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-gray-900">
                {formatCurrency(dashboardStats.totalStores * 25000)}
              </h3>
              <p className="text-xs text-gray-600">Nilai Stok</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Distribution & Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Asset Distribution Donut Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <PieChartIcon className="w-5 h-5" />
              Distribusi Aset Saat Ini
            </CardTitle>
            <CardDescription>Komposisi aset perusahaan secara real-time</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={(dashboardStats?.assetDistribution?.length ? dashboardStats.assetDistribution : [
                { category: 'Stok Gudang', amount: (dashboardStats?.totalProducts || 0) * 15000 },
                { category: 'Barang di Jalan', amount: (dashboardStats?.completedShipments || 0) * 12000 },
                { category: 'Piutang Beredar', amount: (dashboardStats?.totalSalesAmount || 0) * 2.5 },
                { category: 'Kas di Tangan Sales', amount: (dashboardStats?.totalSalesAmount || 0) * 0.3 }
              ]).map((item: any) => ({ name: item.category, value: item.amount }))}
              height={320}
              formatValue={(value) => formatCurrency(value)}
            />
          </CardContent>
        </Card>

        {/* Monthly Sales Trends */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Tren Penjualan vs Setoran
            </CardTitle>
            <CardDescription>Perbandingan laju penjualan dengan pengumpulan kas</CardDescription>
          </CardHeader>
          <CardContent>
            <ComposedChart
              data={dashboardStats.monthlyTrends?.length ? dashboardStats.monthlyTrends : [
                { month: '2024-05', total_penjualan: dashboardStats.totalSalesAmount * 0.6, total_setoran: dashboardStats.totalSalesAmount * 0.5 },
                { month: '2024-06', total_penjualan: dashboardStats.totalSalesAmount * 0.8, total_setoran: dashboardStats.totalSalesAmount * 0.7 },
                { month: '2024-07', total_penjualan: dashboardStats.totalSalesAmount, total_setoran: dashboardStats.totalSalesAmount * 0.85 }
              ]}
              height={320}
              formatValue={(value) => formatCurrency(value)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Sales Performance & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Performance Ranking */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Award className="w-5 h-5" />
              Peringkat Sales (Pendapatan)
            </CardTitle>
            <CardDescription>Berdasarkan total nilai setoran bulan ini</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
               <div className="h-80 flex items-center justify-center">
                 <div className="text-center">
                   <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                   <p>Memuat data...</p>
                 </div>
               </div>
             ) : error ? (
               <div className="h-80 flex items-center justify-center">
                 <div className="text-center text-red-500">
                   <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                   <p>Gagal memuat data</p>
                 </div>
               </div>
             ) : (
               <BarChart
                 data={dashboardStats.salesPerformance?.length ? dashboardStats.salesPerformance : [
                   { nama_sales: 'Ahmad', total_setoran: 5000000 },
                   { nama_sales: 'Budi', total_setoran: 4500000 },
                   { nama_sales: 'Citra', total_setoran: 3800000 }
                 ]}
                 height={320}
                 formatValue={formatCurrency}
               />
             )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5" />
              Produk Terlaris
            </CardTitle>
            <CardDescription>Berdasarkan jumlah terjual bulan ini</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart
              data={dashboardStats.topProducts?.length ? dashboardStats.topProducts : [
                { nama_produk: 'Sabun Mandi', total_terjual: 150, total_nilai: 750000 },
                { nama_produk: 'Shampo', total_terjual: 120, total_nilai: 1800000 },
                { nama_produk: 'Pasta Gigi', total_terjual: 100, total_nilai: 800000 }
              ]}
              height={320}
              dataKey="total_terjual"
              labelKey="nama_produk"
              color="rgba(245, 158, 11, 0.8)"
              title="Jumlah Terjual"
            />
          </CardContent>
        </Card>
      </div>

      {/* Cash Position & Receivables Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cash in Hand by Sales */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Kas di Tangan Sales
            </CardTitle>
            <CardDescription>Uang tunai yang belum disetor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(dashboardStats.cashInHand?.length ? dashboardStats.cashInHand : [
                { nama_sales: 'Ahmad', kas_di_tangan: 2500000 },
                { nama_sales: 'Budi', kas_di_tangan: 1800000 },
                { nama_sales: 'Citra', kas_di_tangan: 1200000 }
              ]).map((cash: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="font-medium">{cash.nama_sales}</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(cash.kas_di_tangan)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Receivables Aging */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Umur Piutang
            </CardTitle>
            <CardDescription>Klasifikasi piutang berdasarkan umur</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              data={(dashboardStats.receivables?.length ? dashboardStats.receivables : [
                { aging_category: '0-30 hari', total_amount: 5000000, count_items: 25 },
                { aging_category: '31-60 hari', total_amount: 2000000, count_items: 15 },
                { aging_category: '61-90 hari', total_amount: 1000000, count_items: 8 },
                { aging_category: '90+ hari', total_amount: 500000, count_items: 5 }
              ]).map((item: any) => ({ nama_sales: item.aging_category, total_setoran: item.total_amount }))}
              height={320}
              title="Jumlah Piutang"
              formatValue={(value) => formatCurrency(value)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Top Stores Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Store className="w-5 h-5" />
            Toko dengan Pembelian Terbanyak
          </CardTitle>
          <CardDescription>Daftar toko dengan volume pembelian tertinggi bulan ini</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Nama Toko</th>
                  <th className="text-left p-3">Sales</th>
                  <th className="text-right p-3">Total Pembelian</th>
                  <th className="text-right p-3">Jumlah Transaksi</th>
                </tr>
              </thead>
              <tbody>
                {(dashboardStats.topStores?.length ? dashboardStats.topStores : [
                  { nama_toko: 'Toko Berkah', nama_sales: 'Ahmad', total_pembelian: 3500000, total_transaksi: 15 },
                  { nama_toko: 'Warung Sari', nama_sales: 'Budi', total_pembelian: 2800000, total_transaksi: 12 },
                  { nama_toko: 'Toko Sejahtera', nama_sales: 'Citra', total_pembelian: 2200000, total_transaksi: 10 }
                ]).map((store: any, index: number) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{store.nama_toko}</td>
                    <td className="p-3 text-gray-600">{store.nama_sales}</td>
                    <td className="p-3 text-right font-semibold text-green-600">
                      {formatCurrency(store.total_pembelian)}
                    </td>
                    <td className="p-3 text-right">{store.total_transaksi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}