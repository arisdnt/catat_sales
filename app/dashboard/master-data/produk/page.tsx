'use client'

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Edit, 
  Trash2, 
  Package, 
  Barcode,
  Eye
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useProdukQuery, useDeleteProdukMutation, useProdukStatsQuery, type Produk, type ProdukStats } from '@/lib/queries/produk'
import { useNavigation } from '@/lib/hooks/use-navigation'

import { DataTable } from '@/components/shared/data-table'
import { createSortableHeader, createStatusBadge, formatCurrency } from '@/components/shared/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { exportProductData } from '@/lib/excel-export'

const statusConfig = {
  true: {
    label: 'Aktif',
    color: 'bg-green-100 text-green-800'
  },
  false: {
    label: 'Non-aktif',
    color: 'bg-gray-100 text-gray-800'
  }
}

const priorityConfig = {
  true: {
    label: 'Prioritas',
    color: 'bg-orange-100 text-orange-800'
  },
  false: {
    label: 'Standar',
    color: 'bg-blue-100 text-blue-800'
  }
}

export default function ProductsPage() {
  const { data: response, isLoading, error, refetch } = useProdukQuery()
  const products: Produk[] = (response as { success: boolean; data: Produk[] })?.data || []
  const { data: statsResponse, isLoading: statsLoading, error: statsError } = useProdukStatsQuery()
  const deleteProduct = useDeleteProdukMutation()
  const { navigate } = useNavigation()
  const { toast } = useToast()

  const productStats = useMemo(() => {
    return (statsResponse as { success: boolean; data: ProdukStats[] })?.data || []
  }, [statsResponse])

  // If stats error, continue rendering

  const handleDelete = (id: number) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      deleteProduct.mutate(id)
    }
  }

  const columns = useMemo<ColumnDef<Produk>[]>(() => [
    {
      accessorKey: 'id_produk',
      header: createSortableHeader('ID Produk'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Barcode className="w-4 h-4 text-gray-400" />
          <span className="font-mono text-sm">#{row.getValue('id_produk')}</span>
        </div>
      )
    },
    {
      accessorKey: 'nama_produk',
      header: createSortableHeader('Nama Produk'),
      cell: ({ row }) => {
        const productId = row.original.id_produk
        const stats = productStats.find(s => s.id_produk === productId)
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Package className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{row.getValue('nama_produk')}</div>
              <div className="flex items-center gap-3 text-sm">
                {statsLoading ? (
                  <span className="text-gray-400 text-xs">Loading stats...</span>
                ) : statsError ? (
                  <span className="text-red-400 text-xs">Stats unavailable</span>
                ) : stats ? (
                  <>
                    <span className="text-red-600 font-medium">
                      Terkirim: {stats.total_terkirim || 0}
                    </span>
                    <span className="text-green-600 font-medium">
                      Terbayar: {stats.total_terbayar || 0}
                    </span>
                    <span className="text-orange-600 font-medium">
                      Selisih: {(stats.total_terkirim || 0) - (stats.total_terbayar || 0)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-500 text-xs">
                      Terkirim: 0
                    </span>
                    <span className="text-gray-500 text-xs">
                      Terbayar: 0
                    </span>
                    <span className="text-gray-500 text-xs">
                      Selisih: 0
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      }
    },
    {
      accessorKey: 'harga_satuan',
      header: createSortableHeader('Harga Satuan'),
      cell: ({ row }) => (
        <div className="text-gray-900 font-medium">
          {formatCurrency(row.getValue('harga_satuan'))}
        </div>
      )
    },
    {
      accessorKey: 'status_produk',
      header: 'Status',
      cell: ({ row }) => createStatusBadge(row.getValue('status_produk'), statusConfig),
      filterFn: (row, id, value) => {
        return value === 'all' || row.getValue(id) === (value === 'true')
      }
    },
    {
      accessorKey: 'is_priority',
      header: 'Prioritas',
      cell: ({ row }) => {
        const isPriority = row.getValue('is_priority')
        const priorityOrder = row.original.priority_order
        const config = priorityConfig[isPriority ? 'true' : 'false']
        
        return (
          <div className="flex flex-col gap-1">
            <Badge variant="secondary" className={config.color}>
              {config.label}
            </Badge>
            {isPriority && priorityOrder && priorityOrder > 0 ? (
              <span className="text-xs text-gray-500">
                Order: {priorityOrder}
              </span>
            ) : null}
          </div>
        )
      },
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
  ], [productStats, statsLoading, statsError])

  const stats = {
    totalProducts: products.length,
    activeProducts: products.filter(p => p.status_produk).length,
    inactiveProducts: products.filter(p => !p.status_produk).length,
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
          <div className="text-red-600 mb-4">Error loading products data: {error.message}</div>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <DataTable 
        data={products}
        columns={columns}
        title="Daftar Produk"
        description={`Terdapat total ${stats.totalProducts} produk, ${stats.activeProducts} aktif, ${stats.inactiveProducts} nonaktif`}
        searchPlaceholder="Cari produk..."
        onAdd={() => navigate('/dashboard/master-data/produk/add')}
        onExport={() => {
          const result = exportProductData(products)
          if (result.success) {
            toast({
              title: "Export Data",
              description: `Data produk berhasil diexport ke ${result.filename}`,
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
        addButtonLabel="Tambah Produk"
        loading={isLoading}
        emptyStateMessage="Belum ada data produk"
        emptyStateIcon={Package}
        filters={[
          {
            key: 'status_produk',
            label: 'Status',
            type: 'select',
            options: [
              { label: 'Aktif', value: 'true' },
              { label: 'Non-aktif', value: 'false' }
            ]
          },
          {
            key: 'is_priority',
            label: 'Prioritas',
            type: 'select',
            options: [
              { label: 'Prioritas', value: 'true' },
              { label: 'Standar', value: 'false' }
            ]
          }
        ]}
        actions={[
          {
            label: 'Lihat Detail',
            icon: Eye,
            onClick: (row: Produk) => navigate(`/dashboard/master-data/produk/${row.id_produk}`),
            variant: 'view'
          },
          {
            label: 'Edit',
            icon: Edit,
            onClick: (row: Produk) => navigate(`/dashboard/master-data/produk/${row.id_produk}/edit`),
            variant: 'edit'
          },
          {
            label: 'Hapus',
            icon: Trash2,
            onClick: (row: Produk) => handleDelete(row.id_produk),
            variant: 'delete'
          }
        ]}
      />
    </div>
  )
}