'use client'

import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  Eye,
  Edit,
  Trash2,
  MapPin,
  RefreshCw,
  Store,
  Users,
  ExternalLink,
  Package,
  CreditCard,
  Archive,
  FileSpreadsheet,
  Upload
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useTokoQuery, useDeleteTokoMutation, type Toko } from '@/lib/queries/toko'
import { useSalesQuery } from '@/lib/queries/sales'
import { useNavigation } from '@/lib/hooks/use-navigation'

import { DataTable, createSortableHeader, createStatusBadge } from '@/components/shared/data-table'
import { exportStoreData } from '@/lib/excel-export'
import ExcelImport from '@/components/shared/excel-import'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

const statusConfig = {
  true: { label: 'Aktif', color: 'bg-green-100 text-green-800 border-green-200' },
  false: { label: 'Non-aktif', color: 'bg-red-100 text-red-800 border-red-200' }
}

export default function TokoTablePage() {
  const { data: response, isLoading, error, refetch } = useTokoQuery('active', true)
  const stores = useMemo(() => (response as { data: Toko[] })?.data || [], [response])
  const { data: salesResponse } = useSalesQuery()
  const salesData = useMemo(() => (salesResponse as { data: { id_sales: number; nama_sales: string }[] })?.data || [], [salesResponse])
  const deleteStore = useDeleteTokoMutation()
  const { navigate } = useNavigation()
  const { toast } = useToast()
  const [showImportDialog, setShowImportDialog] = useState(false)

  const handleDelete = (id: number) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus toko ini?')) {
      deleteStore.mutate(id)
    }
  }

  // Generate unique options for filters
  const salesOptions = useMemo(() => {
    const uniqueSales = salesData.map(sales => ({
      label: sales.nama_sales,
      value: sales.id_sales.toString()
    }))
    return uniqueSales
  }, [salesData])

  const kabupatenOptions = useMemo(() => {
    const uniqueKabupaten = [...new Set(stores.map(store => store.kabupaten).filter(Boolean))]
    return uniqueKabupaten.map(kabupaten => ({
      label: kabupaten,
      value: kabupaten
    }))
  }, [stores])

  const kecamatanOptions = useMemo(() => {
    const uniqueKecamatan = [...new Set(stores.map(store => store.kecamatan).filter(Boolean))]
    return uniqueKecamatan.map(kecamatan => ({
      label: kecamatan,
      value: kecamatan
    }))
  }, [stores])

  const columns = useMemo<ColumnDef<Toko>[]>(() => [
    {
      accessorKey: 'nama_toko',
      header: createSortableHeader('Nama Toko'),
      cell: ({ row }) => {
        const linkGmaps = row.original.link_gmaps
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Store className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{row.getValue('nama_toko')}</div>
              {linkGmaps ? (
                <a 
                  href={linkGmaps} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Google Maps
                </a>
              ) : (
                <div className="text-sm text-red-600">
                  Link Google Maps Tidak tersedia
                </div>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'kecamatan',
      header: 'Lokasi',
      cell: ({ row }) => (
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm text-gray-900">
              {[row.original.kecamatan, row.original.kabupaten]
                .filter(Boolean)
                .join(', ') || '-'}
            </div>
            <div className="text-sm text-red-600 mt-1">
              {row.original.no_telepon || "Nomor telepon belum ada"}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'kabupaten',
      header: 'Kabupaten',
      cell: ({ row }) => (
        <div className="text-sm text-gray-900">
          {row.original.kabupaten || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'id_sales',
      header: 'Sales',
      cell: ({ row }) => {
        const sales = salesData.find(s => s.id_sales === row.original.id_sales)
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{sales?.nama_sales || 'Sales Tidak Ditemukan'}</div>
              <div className="text-sm text-gray-500">ID: {row.original.id_sales}</div>
            </div>
          </div>
        )
      },
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
      accessorKey: 'barang_terkirim',
      header: 'Barang Terkirim',
      cell: ({ row }) => {
        const barangTerkirim = row.original.barang_terkirim || 0
        const detailBarang = row.original.detail_barang_terkirim || []
        
        return (
          <div className="group relative flex items-center gap-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <Package className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{barangTerkirim}</div>
              <div className="text-sm text-gray-500">Items</div>
            </div>
            <div className="absolute z-50 p-3 bg-black text-white text-sm rounded-lg shadow-lg -top-16 left-0 min-w-48 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="font-semibold mb-1">Detail Barang Terkirim:</div>
              {detailBarang.length > 0 ? (
                detailBarang.map((item: { nama_produk: string; jumlah: number }, index: number) => (
                  <div key={index}>• {item.nama_produk}: {item.jumlah} pcs</div>
                ))
              ) : (
                <div>• Belum ada data detail</div>
              )}
              <div className="absolute bottom-[-6px] left-4 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-black"></div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'barang_terbayar',
      header: 'Barang Terbayar',
      cell: ({ row }) => {
        const barangTerbayar = row.original.barang_terbayar || 0
        const detailBarang = row.original.detail_barang_terbayar || []
        
        return (
          <div className="group relative flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <CreditCard className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{barangTerbayar}</div>
              <div className="text-sm text-gray-500">Items</div>
            </div>
            <div className="absolute z-50 p-3 bg-black text-white text-sm rounded-lg shadow-lg -top-16 left-0 min-w-48 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="font-semibold mb-1">Detail Barang Terbayar:</div>
              {detailBarang.length > 0 ? (
                detailBarang.map((item: { nama_produk: string; jumlah: number }, index: number) => (
                  <div key={index}>• {item.nama_produk}: {item.jumlah} pcs</div>
                ))
              ) : (
                <div>• Belum ada data detail</div>
              )}
              <div className="absolute bottom-[-6px] left-4 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-black"></div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'sisa_stok',
      header: 'Sisa Stok',
      cell: ({ row }) => {
        const sisaStok = row.original.sisa_stok || 0
        const detailBarang = row.original.detail_sisa_stok || []
        
        return (
          <div className="group relative flex items-center gap-2">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Archive className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{sisaStok}</div>
              <div className="text-sm text-gray-500">Items</div>
            </div>
            <div className="absolute z-50 p-3 bg-black text-white text-sm rounded-lg shadow-lg -top-16 left-0 min-w-48 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="font-semibold mb-1">Detail Sisa Stok:</div>
              {detailBarang.length > 0 ? (
                detailBarang.map((item: { nama_produk: string; jumlah: number }, index: number) => (
                  <div key={index}>• {item.nama_produk}: {item.jumlah} pcs</div>
                ))
              ) : (
                <div>• Belum ada data detail</div>
              )}
              <div className="absolute bottom-[-6px] left-4 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-black"></div>
            </div>
          </div>
        )
      },
    },
  ], [salesData])

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
        customActions={[
          <Dialog key="import" open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Import Excel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Import Data Toko dari Excel
                </DialogTitle>
              </DialogHeader>
              <ExcelImport 
                onImportComplete={() => {
                  setShowImportDialog(false)
                  refetch()
                }} 
              />
            </DialogContent>
          </Dialog>
        ]}
        filters={[
          {
            key: 'status_toko',
            label: 'Status',
            type: 'select',
            options: [
              { label: 'Aktif', value: 'true' },
              { label: 'Non-aktif', value: 'false' }
            ]
          },
          {
            key: 'id_sales',
            label: 'Sales',
            type: 'select',
            options: salesOptions
          },
          {
            key: 'kabupaten',
            label: 'Kabupaten',
            type: 'select',
            options: kabupatenOptions
          },
          {
            key: 'kecamatan',
            label: 'Kecamatan',
            type: 'select',
            options: kecamatanOptions
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