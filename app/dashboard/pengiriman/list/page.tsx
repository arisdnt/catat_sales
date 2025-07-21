'use client'

import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  Edit, 
  Eye,
  Package,
  MapPin,
  Truck,
  Calendar,
  User,
  Trash2
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { usePengirimanQuery, useDeletePengirimanMutation, type Pengiriman } from '@/lib/queries/pengiriman'
import { useNavigation } from '@/lib/hooks/use-navigation'

import { DataTableBasic as DataTable, createSortableHeader, formatDate } from '@/components/data-tables'
import { exportShipmentData } from '@/lib/excel-export'

export default function ShippingPage() {
  const { data: shipmentsResponse, isLoading, error, refetch } = usePengirimanQuery(true)
  const shipments = (shipmentsResponse as any)?.data || []
  const deleteShipment = useDeletePengirimanMutation()
  const { navigate } = useNavigation()
  const { toast } = useToast()

  const handleDelete = (id: number) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus pengiriman ini?')) {
      deleteShipment.mutate(id)
    }
  }

  const columns = useMemo<ColumnDef<Pengiriman>[]>(() => [
    {
      accessorKey: 'id_pengiriman',
      header: createSortableHeader('No. Pengiriman'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">#{row.getValue("id_pengiriman")}</div>
            <div className="text-sm text-gray-500">
              {formatDate(row.original.tanggal_kirim)}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'toko.nama_toko',
      header: createSortableHeader('Toko'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900">{row.original.toko.nama_toko}</div>
            <div className="text-sm text-gray-500">ID: {row.original.toko.id_toko}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'toko.sales.nama_sales',
      header: createSortableHeader('Sales'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900">{row.original.toko.sales.nama_sales}</div>
            <div className="text-sm text-gray-500">Sales</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'tanggal_kirim',
      header: createSortableHeader('Tanggal Kirim'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900">{formatDate(row.getValue("tanggal_kirim"))}</span>
        </div>
      ),
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
    totalShipments: (shipments as any[]).length,
    todayShipments: (shipments as any[]).filter((s: any) =>
      new Date(s.tanggal_kirim).toDateString() === new Date().toDateString()
    ).length,
    thisWeekShipments: (shipments as any[]).filter((s: any) => {
      const shipDate = new Date(s.tanggal_kirim)
      const today = new Date()
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      return shipDate >= weekAgo && shipDate <= today
    }).length,
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
          <div className="text-red-600 mb-4">Error loading shipments data</div>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <DataTable
        data={shipments}
        columns={columns}
        title="Daftar Pengiriman"
        description={`Terdapat total ${stats.totalShipments} pengiriman, ${stats.todayShipments} hari ini, ${stats.thisWeekShipments} minggu ini`}
        searchPlaceholder="Cari pengiriman..."
        onAdd={() => navigate('/dashboard/pengiriman/add')}
        onExport={() => {
          const result = exportShipmentData(shipments)
          if (result.success) {
            toast({
              title: "Export Data",
              description: `Data pengiriman berhasil diexport ke ${result.filename}`,
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
        addButtonLabel="Tambah Pengiriman"
        loading={isLoading}
        emptyStateMessage="Belum ada data pengiriman"
        emptyStateIcon={Truck}
        customActions={[
          <Button
            key="batch-add"
            onClick={() => navigate('/dashboard/pengiriman/batch')}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
          >
            <Truck className="w-4 h-4 mr-2" />
            Input Batch
          </Button>
        ]}
        actions={[
          {
            label: 'Lihat Detail',
            icon: Eye,
            onClick: (row: Pengiriman) => navigate(`/dashboard/pengiriman/${row.id_pengiriman}`),
            variant: 'view'
          },
          {
            label: 'Edit',
            icon: Edit,
            onClick: (row: Pengiriman) => navigate(`/dashboard/pengiriman/${row.id_pengiriman}/edit`),
            variant: 'edit'
          },
          {
            label: 'Hapus',
            icon: Trash2,
            onClick: (row: Pengiriman) => handleDelete(row.id_pengiriman),
            variant: 'delete'
          }
        ]}
      />
    </div>
  )
}