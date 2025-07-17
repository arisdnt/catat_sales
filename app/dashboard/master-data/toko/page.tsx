'use client'

import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Eye,
  Edit,
  Trash2,
  MapPin,
  Plus,
  Download,
  RefreshCw,
  Store,
  Users,
  Phone,
  ExternalLink
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useTokoQuery, useDeleteTokoMutation, type Toko } from '@/lib/queries/toko'
import { useNavigation } from '@/lib/hooks/use-navigation'

import { DataTable, createSortableHeader, createStatusBadge, formatCurrency } from '@/components/shared/data-table'
import { exportStoreData } from '@/lib/excel-export'

const statusConfig = {
  true: { label: 'Aktif', color: 'bg-green-100 text-green-800 border-green-200' },
  false: { label: 'Non-aktif', color: 'bg-red-100 text-red-800 border-red-200' }
}

export default function TokoTablePage() {
  const { data: response, isLoading, error, refetch } = useTokoQuery('active', true)
  const stores: any[] = (response as any)?.data || []
  const deleteStore = useDeleteTokoMutation()
  const { navigate } = useNavigation()
  const { toast } = useToast()

  const handleDelete = (id: number) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus toko ini?')) {
      deleteStore.mutate(id)
    }
  }

  const columns = useMemo<ColumnDef<Toko>[]>(() => [
    {
      accessorKey: 'nama_toko',
      header: createSortableHeader('Nama Toko'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Store className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.getValue('nama_toko')}</div>
            <div className="text-sm text-gray-500">ID: {row.original.id_toko}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'alamat',
      header: 'Alamat',
      cell: ({ row }) => (
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm text-gray-900">{row.original.alamat || '-'}</div>
            <div className="text-xs text-gray-500">
              {[row.original.desa, row.original.kecamatan, row.original.kabupaten]
                .filter(Boolean)
                .join(', ')}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'id_sales',
      header: 'Sales',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900">Sales ID: {row.original.id_sales}</span>
        </div>
      ),
    },
    {
      accessorKey: 'status_toko',
      header: 'Status',
      cell: ({ row }) => createStatusBadge(row.getValue('status_toko'), statusConfig),
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
  ], [])

  const stats = {
    totalStores: stores.length,
    activeStores: stores.filter(s => s.status_toko).length,
    inactiveStores: stores.filter(s => !s.status_toko).length,
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
          <div className="text-red-600 mb-4">Error loading stores data</div>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <DataTable
        data={stores}
        columns={columns}
        title="Daftar Toko"
        description={`Terdapat total ${stats.totalStores} toko, ${stats.activeStores} aktif, ${stats.inactiveStores} nonaktif`}
        searchPlaceholder="Cari toko..."
        onAdd={() => navigate('/dashboard/master-data/toko/add')}
        onExport={() => {
          const result = exportStoreData(stores)
          if (result.success) {
            toast({
              title: "Export Data",
              description: `Data toko berhasil diexport ke ${result.filename}`,
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
        addButtonLabel="Tambah Toko"
        loading={isLoading}
        emptyStateMessage="Belum ada data toko"
        emptyStateIcon={Store}
        filters={[
          {
            key: 'status_toko',
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
            onClick: (row: Toko) => navigate(`/dashboard/master-data/toko/${row.id_toko}`),
            variant: 'view'
          },
          {
            label: 'Edit',
            icon: Edit,
            onClick: (row: Toko) => navigate(`/dashboard/master-data/toko/${row.id_toko}/edit`),
            variant: 'edit'
          },
          {
            label: 'Hapus',
            icon: Trash2,
            onClick: (row: Toko) => handleDelete(row.id_toko),
            variant: 'delete'
          }
        ]}
      />
    </div>
  )
}