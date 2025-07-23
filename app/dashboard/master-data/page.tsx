'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Users, Package, Store, Plus, Eye, BarChart3 } from 'lucide-react'
import { useNavigation } from '@/lib/hooks/use-navigation'
import { useSalesQuery, Sales } from '@/lib/queries/sales'
import { useProdukQuery, Produk } from '@/lib/queries/produk'
import { useTokoQuery, Toko } from '@/lib/queries/toko'
import { LucideIcon } from 'lucide-react'

interface MasterDataModule {
  title: string
  description: string
  icon: LucideIcon
  href: string
  addHref: string
  stats?: {
    total: number
    active: number
  }
}

export default function MasterDataPage() {
  const { navigate } = useNavigation()
  
  // Get stats for each module
  const { data: salesResponse } = useSalesQuery()
  const { data: produkResponse } = useProdukQuery()
  const { data: tokoResponse } = useTokoQuery('active', true)
  
  const salesData: Sales[] = salesResponse?.data || []
  const produkData: Produk[] = produkResponse?.data?.data || []
  const tokoData: Toko[] = tokoResponse?.data || []

  const modules: MasterDataModule[] = [
    {
      title: 'Sales',
      description: 'Kelola data sales dan tim penjualan',
      icon: Users,
      href: '/dashboard/master-data/sales',
      addHref: '/dashboard/master-data/sales/add',
      stats: {
        total: salesData.length,
        active: salesData.filter(s => s.status_aktif).length
      }
    },
    {
      title: 'Produk',
      description: 'Kelola katalog produk dan harga',
      icon: Package,
      href: '/dashboard/master-data/produk',
      addHref: '/dashboard/master-data/produk/add',
      stats: {
        total: produkData.length,
        active: produkData.filter(p => p.status_produk).length
      }
    },
    {
      title: 'Toko',
      description: 'Kelola data toko dan lokasi',
      icon: Store,
      href: '/dashboard/master-data/toko',
      addHref: '/dashboard/master-data/toko/add',
      stats: {
        total: tokoData.length,
        active: tokoData.filter(t => t.status_toko).length
      }
    }
  ]

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Master Data</h1>
        <p className="text-gray-600">
          Kelola data dasar sistem penjualan titip bayar
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesData.length}</div>
            <p className="text-xs text-muted-foreground">
              {salesData.filter(s => s.status_aktif).length} aktif
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{produkData.length}</div>
            <p className="text-xs text-muted-foreground">
              {produkData.filter(p => p.status_produk).length} aktif
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Toko</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tokoData.length}</div>
            <p className="text-xs text-muted-foreground">
              {tokoData.filter(t => t.status_toko).length} aktif
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => {
          const Icon = module.icon
          return (
            <Card key={module.title} className="group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {module.stats?.total || 0}
                    </div>
                    <div className="text-sm text-gray-500">
                      {module.stats?.active || 0} aktif
                    </div>
                  </div>
                </div>
                <CardTitle className="text-xl">{module.title}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Button 
                    onClick={() => navigate(module.href)}
                    className="flex-1"
                    variant="outline"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Lihat Data
                  </Button>
                  <Button 
                    onClick={() => navigate(module.addHref)}
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <Button 
                  onClick={() => navigate(module.href)}
                  variant="ghost" 
                  className="w-full justify-between group-hover:bg-gray-50"
                >
                  Kelola {module.title}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Aksi cepat untuk mengelola master data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 justify-start"
              onClick={() => navigate('/dashboard/master-data/sales/add')}
            >
              <div className="text-left">
                <div className="font-medium">Tambah Sales Baru</div>
                <div className="text-sm text-gray-500">Daftarkan sales tim baru</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 justify-start"
              onClick={() => navigate('/dashboard/master-data/produk/add')}
            >
              <div className="text-left">
                <div className="font-medium">Tambah Produk Baru</div>
                <div className="text-sm text-gray-500">Input produk ke katalog</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 justify-start"
              onClick={() => navigate('/dashboard/master-data/toko/add')}
            >
              <div className="text-left">
                <div className="font-medium">Tambah Toko Baru</div>
                <div className="text-sm text-gray-500">Daftarkan toko baru</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}