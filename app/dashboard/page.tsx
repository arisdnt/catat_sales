'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  BarChart3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/auth-provider'


interface DashboardStats {
  totalSales: number
  totalProducts: number
  totalStores: number
  totalSalesAmount: number
  pendingShipments: number
  completedShipments: number
  pendingBills: number
  completedDeposits: number
  recentActivities: any[]
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalProducts: 0,
    totalStores: 0,
    totalSalesAmount: 0,
    pendingShipments: 0,
    completedShipments: 0,
    pendingBills: 0,
    completedDeposits: 0,
    recentActivities: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Simulate API calls for demo
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const mockStats: DashboardStats = {
          totalSales: 156,
          totalProducts: 89,
          totalStores: 24,
          totalSalesAmount: 125000000,
          pendingShipments: 12,
          completedShipments: 45,
          pendingBills: 8,
          completedDeposits: 32,
          recentActivities: [
            { id: 1, type: 'sale', description: 'Penjualan baru dari Toko Berkah', time: '2 menit lalu' },
            { id: 2, type: 'shipment', description: 'Pengiriman ke Jakarta Selatan', time: '15 menit lalu' },
            { id: 3, type: 'payment', description: 'Pembayaran dari Toko Sejahtera', time: '1 jam lalu' },
            { id: 4, type: 'product', description: 'Produk baru ditambahkan', time: '2 jam lalu' }
          ]
        }
        setStats(mockStats)
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const statCards = [
    {
      title: 'Total Sales',
      value: stats.totalSales,
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
      value: stats.totalProducts,
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
      value: stats.totalStores,
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
      value: formatCurrency(stats.totalSalesAmount),
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

  if (loading) {
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

  return (
    <div className="p-8 space-y-8">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-xl ${card.bgColor}`}>
                    <Icon className={`w-6 h-6 ${card.iconColor}`} />
                  </div>
                  <div className="flex items-center gap-1">
                    {card.changeType === 'positive' ? (
                      <ArrowUpRight className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {card.change}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {typeof card.value === 'string' ? card.value : card.value.toLocaleString()}
                  </h3>
                  <p className="text-sm text-gray-600">{card.description}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
              <CardDescription>Aksi cepat untuk aktivitas umum</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <Button
                    key={action.title}
                    variant="outline"
                    className="w-full justify-start p-4 h-auto border-gray-200 hover:border-gray-300 transition-all group"
                  >
                    <div className={`p-2 rounded-lg bg-gradient-to-r ${action.color} mr-3 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{action.title}</div>
                      <div className="text-sm text-gray-500">{action.description}</div>
                    </div>
                  </Button>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Aktivitas Terbaru
              </CardTitle>
              <CardDescription>Ringkasan aktivitas sistem</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className={`p-2 rounded-full ${
                      activity.type === 'sale' ? 'bg-blue-100 text-blue-600' :
                      activity.type === 'shipment' ? 'bg-green-100 text-green-600' :
                      activity.type === 'payment' ? 'bg-purple-100 text-purple-600' :
                      'bg-orange-100 text-orange-600'
                    }`}>
                      {activity.type === 'sale' && <ShoppingCart className="w-4 h-4" />}
                      {activity.type === 'shipment' && <Package className="w-4 h-4" />}
                      {activity.type === 'payment' && <DollarSign className="w-4 h-4" />}
                      {activity.type === 'product' && <Package className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Status Pengiriman</CardTitle>
            <CardDescription>Overview pengiriman bulan ini</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Selesai</span>
              <span className="text-sm font-medium">{stats.completedShipments}</span>
            </div>
            <Progress value={78} className="h-2" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending</span>
              <span className="text-sm font-medium">{stats.pendingShipments}</span>
            </div>
            <Progress value={22} className="h-2" />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Status Penagihan</CardTitle>
            <CardDescription>Overview penagihan bulan ini</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Lunas</span>
              <span className="text-sm font-medium">{stats.completedDeposits}</span>
            </div>
            <Progress value={80} className="h-2" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending</span>
              <span className="text-sm font-medium">{stats.pendingBills}</span>
            </div>
            <Progress value={20} className="h-2" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}