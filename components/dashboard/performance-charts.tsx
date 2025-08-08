'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { 
  useDashboardSalesPerformanceQuery,
  useDashboardTokoPerformanceQuery,
  useDashboardProdukPerformanceQuery,
  useDashboardRegionalPerformanceQuery
} from '@/lib/queries/dashboard'
import { Users, Store, Package, MapPin, Loader2 } from 'lucide-react'

interface PerformanceChartsProps {
  startDate: string
  endDate: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300']

export function PerformanceCharts({ startDate, endDate }: PerformanceChartsProps) {
  const { data: salesData, isLoading: salesLoading } = useDashboardSalesPerformanceQuery(startDate, endDate)
  const { data: tokoData, isLoading: tokoLoading } = useDashboardTokoPerformanceQuery(startDate, endDate)
  const { data: produkData, isLoading: produkLoading } = useDashboardProdukPerformanceQuery(startDate, endDate)
  const { data: regionalData, isLoading: regionalLoading } = useDashboardRegionalPerformanceQuery(startDate, endDate)

  // Format currency for charts
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Loading state component
  const ChartLoading = ({ title, icon: Icon }: { title: string, icon: any }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Memuat data...</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
      {/* Sales Performance Chart */}
      {salesLoading ? (
        <ChartLoading title="Performa Sales" icon={Users} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Performa Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData?.data?.slice(0, 10) || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="nama_sales" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    fontSize={12}
                  />
                  <YAxis tickFormatter={formatCurrency} fontSize={12} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Pendapatan']}
                    labelStyle={{ color: '#000' }}
                  />
                  <Bar dataKey="total_pendapatan" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Performance Chart */}
      {produkLoading ? (
        <ChartLoading title="Performa Produk" icon={Package} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Top 10 Produk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={produkData?.data?.slice(0, 10) || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="nama_produk" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    formatter={(value: number) => [value.toLocaleString('id-ID'), 'Quantity Terjual']}
                    labelStyle={{ color: '#000' }}
                  />
                  <Bar dataKey="total_terjual" fill="#FFBB28" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Store Performance Chart */}
      {tokoLoading ? (
        <ChartLoading title="Performa Toko" icon={Store} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Top 10 Toko
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tokoData?.data?.slice(0, 10) || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="nama_toko" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    fontSize={12}
                  />
                  <YAxis tickFormatter={formatCurrency} fontSize={12} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Pendapatan']}
                    labelStyle={{ color: '#000' }}
                  />
                  <Bar dataKey="total_pendapatan" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regional Performance Chart */}
      {regionalLoading ? (
        <ChartLoading title="Performa Regional" icon={MapPin} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Performa Regional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionalData?.data?.slice(0, 20) || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="kabupaten" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    fontSize={10}
                    interval={0}
                  />
                  <YAxis tickFormatter={formatCurrency} fontSize={12} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Pendapatan']}
                    labelStyle={{ color: '#000' }}
                  />
                  <Bar dataKey="total_pendapatan" fill="#FF8042" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}