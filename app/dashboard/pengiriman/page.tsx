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

import { DataTable, createSortableHeader, formatDate } from '@/components/shared/data-table'
import { exportShipmentData } from '@/lib/excel-export'

export default function ShippingPage() {
  const { data: shipmentsResponse, isLoading, error, refetch } = usePengirimanQuery(true)
  const shipments = (shipmentsResponse as any)?.data || []
  const deleteShipment = useDeletePengirimanMutation()
  const { navigate } = useNavigation()
  const { toast } = useToast()

  // Extract unique values for filters
  const salesOptions = useMemo(() => {
    const uniqueSales = Array.from(new Set(
      shipments.map((s: Pengiriman) => s.toko?.sales?.nama_sales).filter(Boolean)
    )) as string[]
    return uniqueSales.map(sales => ({ value: sales, label: sales }))
  }, [shipments])

  const kabupatenOptions = useMemo(() => {
    const uniqueKabupaten = Array.from(new Set(
      shipments.map((s: Pengiriman) => s.toko?.kabupaten).filter(Boolean)
    )) as string[]
    return uniqueKabupaten.map(kabupaten => ({ value: kabupaten, label: kabupaten }))
  }, [shipments])

  const kecamatanOptions = useMemo(() => {
    const uniqueKecamatan = Array.from(new Set(
      shipments.map((s: Pengiriman) => s.toko?.kecamatan).filter(Boolean)
    )) as string[]
    return uniqueKecamatan.map(kecamatan => ({ value: kecamatan, label: kecamatan }))
  }, [shipments])

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
            <div className="font-medium text-gray-900">#{row.getValue('id_pengiriman')}</div>
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
            {row.original.toko.link_gmaps ? (
              <a 
                href={row.original.toko.link_gmaps} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                Lihat di Google Maps
              </a>
            ) : (
              <div className="text-sm text-red-600">Link Google Maps Tidak tersedia</div>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'sales_name',
      accessorFn: (row) => row.toko?.sales?.nama_sales,
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
      filterFn: 'includesString',
    },
    {
      id: 'kabupaten',
      accessorFn: (row) => row.toko?.kabupaten,
      header: createSortableHeader('Kabupaten'),
      cell: ({ row }) => (
        <div className="text-gray-900">{row.original.toko.kabupaten}</div>
      ),
      filterFn: 'includesString',
    },
    {
      id: 'kecamatan',
      accessorFn: (row) => row.toko?.kecamatan,
      header: createSortableHeader('Kecamatan'),
      cell: ({ row }) => (
        <div className="text-gray-900">{row.original.toko.kecamatan}</div>
      ),
      filterFn: 'includesString',
    },
    {
      accessorKey: 'tanggal_kirim',
      header: createSortableHeader('Tanggal Kirim'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900">{formatDate(row.getValue('tanggal_kirim'))}</span>
        </div>
      ),
    },
    {
      id: 'total_quantity',
      header: createSortableHeader('Total Quantity'),
      cell: ({ row }) => {
        const totalQty = row.original.detail_pengiriman?.reduce((sum, detail) => sum + detail.jumlah_kirim, 0) || 0
        const details = row.original.detail_pengiriman || []
        
        return (
          <div className="relative group">
            <div className="flex items-center gap-2 cursor-help">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-900">{totalQty}</span>
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
              <div className="font-semibold mb-1">Detail Barang:</div>
              {details.length > 0 ? (
                details.map((detail, index) => (
                  <div key={index} className="flex justify-between gap-2">
                    <span>{detail.produk.nama_produk}:</span>
                    <span>{detail.jumlah_kirim} pcs</span>
                  </div>
                ))
              ) : (
                <div>Tidak ada detail barang</div>
              )}
              {/* Arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
            </div>
          </div>
        )
      },
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
        filters={[
          {
            key: 'sales_name',
            label: 'Filter berdasarkan Sales',
            type: 'select',
            options: salesOptions
          },
          {
            key: 'kabupaten',
            label: 'Filter berdasarkan Kabupaten',
            type: 'select',
            options: kabupatenOptions
          },
          {
            key: 'kecamatan',
            label: 'Filter berdasarkan Kecamatan',
            type: 'select',
            options: kecamatanOptions
          }
        ]}
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
        customActions={[]}
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