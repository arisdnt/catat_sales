'use client'

import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Phone,
  MapPin,
  Eye,
  Target,
  Star,
  Download,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useSalesQuery, useDeleteSalesMutation, useSalesStatsQuery, type SalesStats } from '@/lib/queries/sales'
import { useNavigation } from '@/lib/hooks/use-navigation'

import { DataTable, createSortableHeader, createStatusBadge, formatCurrency } from '@/components/shared/data-table'
import { exportSalesData } from '@/lib/excel-export'

interface Sales {
  id_sales: number
  nama_sales: string
  nomor_telepon: string | null
  status_aktif: boolean
  dibuat_pada: string
  diperbarui_pada: string
}

const statusConfig = {
  true: { label: 'Aktif', color: 'bg-green-100 text-green-800 border-green-200' },
  false: { label: 'Non-aktif', color: 'bg-red-100 text-red-800 border-red-200' }
}

export default function SalesPage() {
  const { data: response, isLoading, error, refetch } = useSalesQuery()
  const salesData: any[] = (response as any)?.data || []
  const { data: statsResponse } = useSalesStatsQuery()
  const salesStats: SalesStats[] = (statsResponse as any)?.data || []
  const deleteSales = useDeleteSalesMutation()
  const { navigate } = useNavigation()
  const { toast } = useToast()

  const handleDelete = async (id: number) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus sales ini?')) {
      deleteSales.mutate(id)
    }
  }

  const columns = useMemo<ColumnDef<Sales>[]>(() => [
    {
      accessorKey: 'nama_sales',
      header: createSortableHeader('Nama Sales'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-50 rounded-lg">
            <Users className="w-4 h-4 text-cyan-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.original.nama_sales}</div>
            <div className="text-sm text-gray-500">ID: {row.original.id_sales}</div>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'nomor_telepon',
      header: 'Telepon',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900">{row.original.nomor_telepon || '-'}</span>
        </div>
      )
    },
    {
      accessorKey: 'statistics',
      header: 'Statistik',
      cell: ({ row }) => {
        const stats = salesStats.find(s => s.id_sales === row.original.id_sales)
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Target className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{stats?.total_stores || 0} Toko</div>
              <div className="flex items-center gap-3 text-sm mt-1">
                <span className="text-red-600">Terkirim: {stats?.total_shipped_items || 0}</span>
                <span className="text-green-600">Pendapatan: {formatCurrency(stats?.total_revenue || 0)}</span>
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'status_aktif',
      header: 'Status',
      cell: ({ row }) => createStatusBadge(row.getValue('status_aktif'), statusConfig),
      filterFn: (row, id, value) => {
        return value === 'all' || row.getValue(id) === (value === 'true')
      }
    },
    {
      accessorKey: 'dibuat_pada',
      header: createSortableHeader('Dibuat Pada'),
      cell: ({ row }) => (
        <div className="text-sm text-gray-600">
          {new Date(row.original.dibuat_pada).toLocaleDateString('id-ID')}
        </div>
      )
    },
  ], [salesStats])

  const stats = {
    totalSales: salesData.length,
    activeSales: salesData.filter(s => s.status_aktif).length,
    inactiveSales: salesData.filter(s => !s.status_aktif).length,
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="text-red-600 mb-4">Error loading sales data</div>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
        <DataTable 
          data={salesData}
          columns={columns}
          title="Daftar Sales"
          description={`Terdapat total ${stats.totalSales} sales, ${stats.activeSales} aktif, ${stats.inactiveSales} nonaktif`}
          searchPlaceholder="Cari sales..."
          onAdd={() => navigate('/dashboard/master-data/sales/add')}
          onExport={() => {
            const result = exportSalesData(salesData)
            if (result.success) {
              toast({
                title: "Export Data",
                description: `Data sales berhasil diexport ke ${result.filename}`,
              })
            } else {
              toast({
                title: "Export Error",
                description: result.error || "Terjadi kesalahan saat export",
                variant: "destructive",
              })
            }
          }}
          onRefresh={() => refetch()}
          addButtonLabel="Tambah Sales"
          loading={isLoading}
          emptyStateMessage="Belum ada data sales"
          emptyStateIcon={Users}
          filters={[
            {
              key: 'status_aktif',
              label: 'Status',
              type: 'select',
              options: [
                { label: 'Aktif', value: 'true' },
                { label: 'Non-aktif', value: 'false' }
              ]
            }
          ]}
          actions={[
            {
              label: 'Lihat Detail',
              icon: Eye,
              onClick: (row: Sales) => navigate(`/dashboard/master-data/sales/${row.id_sales}`),
              variant: 'view'
            },
            {
              label: 'Edit',
              icon: Edit,
              onClick: (row: Sales) => navigate(`/dashboard/master-data/sales/${row.id_sales}/edit`),
              variant: 'edit'
            },
            {
              label: 'Hapus',
              icon: Trash2,
              onClick: (row: Sales) => handleDelete(row.id_sales),
              variant: 'delete'
            }
          ]}
        />
    </div>
  )
}