'use client'

import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  Edit, 
  Eye,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Download,
  Receipt,
  Trash2
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { usePenagihanQuery, useDeletePenagihanMutation, type Penagihan } from '@/lib/queries/penagihan'
import { useNavigation } from '@/lib/hooks/use-navigation'

import { DataTable, createSortableHeader, createStatusBadge, formatCurrency, formatDate } from '@/components/shared/data-table'
import { exportBillingData } from '@/lib/excel-export'

const statusConfig = {
  'Cash': {
    label: 'Cash',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  'Transfer': {
    label: 'Transfer',
    color: 'bg-blue-100 text-blue-800',
    icon: CreditCard
  }
}

export default function BillingPage() {
  const { data: response, isLoading, error, refetch } = usePenagihanQuery(true)
  const billings = (response as { data: any[] })?.data || []
  const deleteBilling = useDeletePenagihanMutation()
  const { navigate } = useNavigation()
  const { toast } = useToast()

  // Generate filter options
  const salesOptions = useMemo(() => {
    const uniqueSales = Array.from(new Set(
      billings
        .filter((billing: Penagihan) => billing.toko?.sales?.nama_sales)
        .map((billing: Penagihan) => billing.toko!.sales.nama_sales)
    ))
    return uniqueSales.map(sales => ({ value: sales, label: sales }))
  }, [billings])

  const kabupatenOptions = useMemo(() => {
    const uniqueKabupaten = Array.from(new Set(
      billings
        .filter((billing: Penagihan) => billing.toko?.kabupaten)
        .map((billing: Penagihan) => billing.toko!.kabupaten)
    ))
    return uniqueKabupaten.map(kabupaten => ({ value: kabupaten, label: kabupaten }))
  }, [billings])

  const kecamatanOptions = useMemo(() => {
    const uniqueKecamatan = Array.from(new Set(
      billings
        .filter((billing: Penagihan) => billing.toko?.kecamatan)
        .map((billing: Penagihan) => billing.toko!.kecamatan)
    ))
    return uniqueKecamatan.map(kecamatan => ({ value: kecamatan, label: kecamatan }))
  }, [billings])

  const handleDelete = (id: number) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus penagihan ini?')) {
      deleteBilling.mutate(id)
    }
  }

  const columns = useMemo<ColumnDef<Penagihan>[]>(() => [
    {
      accessorKey: 'id_penagihan',
      header: createSortableHeader('No. Penagihan'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-50 rounded-lg">
            <Receipt className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">#{row.getValue('id_penagihan')}</div>
            <div className="text-sm text-gray-500">
              {formatDate(row.original.dibuat_pada)}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'toko_name',
      accessorFn: (row) => row.toko?.nama_toko,
      header: createSortableHeader('Toko'),
      cell: ({ row }) => {
        const toko = row.original.toko
        return (
          <div>
            <div className="font-medium text-gray-900">{toko?.nama_toko || 'N/A'}</div>
            <div className="text-sm text-gray-500">
              {toko?.link_gmaps ? (
                <a
                  href={toko.link_gmaps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Lihat di Google Maps
                </a>
              ) : (
                <span className="text-red-500">Link Google Maps Tidak tersedia</span>
              )}
            </div>
          </div>
        )
      },
      filterFn: 'includesString',
    },
    {
      accessorKey: 'total_uang_diterima',
      header: createSortableHeader('Total Diterima'),
      cell: ({ row }) => {
        const potongan = row.original.potongan_penagihan?.[0]
        return (
          <div className="text-right">
            <div className="font-medium text-gray-900">
              {formatCurrency(row.getValue('total_uang_diterima'))}
            </div>
            {row.original.ada_potongan && (
              <div className="relative group">
                <div className="text-sm text-yellow-600 cursor-help">Ada potongan</div>
                
                {/* Tooltip */}
                <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
                  <div className="space-y-1">
                    {potongan ? (
                      <>
                        <div className="flex justify-between gap-4">
                          <span>Jumlah Potongan:</span>
                          <span className="font-medium">{formatCurrency(potongan.jumlah_potongan)}</span>
                        </div>
                        {potongan.alasan && (
                          <div className="flex justify-between gap-4">
                            <span>Alasan:</span>
                            <span className="font-medium">{potongan.alasan}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <span>Detail potongan tidak tersedia</span>
                    )}
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full right-4 transform border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            )}
          </div>
        )
      },
    },
    {
      id: 'sales_name',
      accessorFn: (row) => row.toko?.sales?.nama_sales,
      header: createSortableHeader('Sales'),
      cell: ({ row }) => (
        <div className="font-medium text-gray-900">
          {row.original.toko?.sales?.nama_sales || 'N/A'}
        </div>
      ),
      filterFn: 'includesString',
    },
    {
      id: 'kabupaten',
      accessorFn: (row) => row.toko?.kabupaten,
      header: createSortableHeader('Kabupaten'),
      cell: ({ row }) => (
        <div className="text-gray-900">
          {row.original.toko?.kabupaten || 'N/A'}
        </div>
      ),
      filterFn: 'includesString',
    },
    {
      id: 'kecamatan',
      accessorFn: (row) => row.toko?.kecamatan,
      header: createSortableHeader('Kecamatan'),
      cell: ({ row }) => (
        <div className="text-gray-900">
          {row.original.toko?.kecamatan || 'N/A'}
        </div>
      ),
      filterFn: 'includesString',
    },
    {
      id: 'total_quantity',
      accessorFn: (row) => {
        const totalQuantity = row.detail_penagihan?.reduce((sum, detail) => sum + detail.jumlah_terjual, 0) || 0
        return totalQuantity
      },
      header: createSortableHeader('Total Quantity'),
      cell: ({ row }) => {
        const details = row.original.detail_penagihan || []
        const totalQuantity = details.reduce((sum, detail) => sum + detail.jumlah_terjual, 0)
        
        return (
          <div className="relative group">
            <div className="flex items-center gap-2 cursor-help">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <span className="font-medium text-gray-900">{totalQuantity}</span>
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
              <div className="space-y-1">
                {details.length > 0 ? (
                  details.map((detail, index) => (
                    <div key={index} className="flex justify-between gap-4">
                      <span>{detail.produk.nama_produk}</span>
                      <span className="font-medium">{detail.jumlah_terjual}</span>
                    </div>
                  ))
                ) : (
                  <span>Tidak ada detail barang</span>
                )}
              </div>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'metode_pembayaran',
      header: createSortableHeader('Metode Pembayaran'),
      cell: ({ row }) => createStatusBadge(row.getValue('metode_pembayaran'), statusConfig),
    },

  ], [])

  const stats = {
    totalBillings: (billings as any[]).length,
    cashPayments: (billings as any[]).filter((b: any) => b.metode_pembayaran === 'Cash').length,
    transferPayments: (billings as any[]).filter((b: any) => b.metode_pembayaran === 'Transfer').length,
    totalAmount: (billings as any[]).reduce((sum: number, b: any) => sum + b.total_uang_diterima, 0),
    withDeductions: (billings as any[]).filter((b: any) => b.ada_potongan).length,
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
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
          <div className="text-red-600 mb-4">Error loading billings data</div>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <DataTable
        data={billings}
        columns={columns}
        title="Daftar Penagihan"
        description={`Terdapat total ${stats.totalBillings} penagihan, ${stats.cashPayments} cash, ${stats.transferPayments} transfer, total ${formatCurrency(stats.totalAmount)}`}
        searchPlaceholder="Cari penagihan..."
        onAdd={() => navigate('/dashboard/penagihan/create')}
        onExport={() => {
          const result = exportBillingData(billings)
          if (result.success) {
            toast({
              title: "Export Data",
              description: `Data penagihan berhasil diexport ke ${result.filename}`,
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
        addButtonLabel="Buat Penagihan"
        loading={isLoading}
        emptyStateMessage="Tidak ada penagihan ditemukan."
        emptyStateIcon={Receipt}
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
          },
          {
            key: 'metode_pembayaran',
            label: 'Metode Pembayaran',
            type: 'select',
            options: [
              { value: 'Cash', label: 'Cash' },
              { value: 'Transfer', label: 'Transfer' }
            ]
          }
        ]}
        actions={[
          {
            label: 'Lihat Detail',
            icon: Eye,
            onClick: (row: Penagihan) => navigate(`/dashboard/penagihan/${row.id_penagihan}`),
            variant: 'view'
          },
          {
            label: 'Edit',
            icon: Edit,
            onClick: (row: Penagihan) => navigate(`/dashboard/penagihan/${row.id_penagihan}/edit`),
            variant: 'edit'
          },
          {
            label: 'Hapus',
            icon: Trash2,
            onClick: (row: Penagihan) => handleDelete(row.id_penagihan),
            variant: 'delete'
          }
        ]}
      />
    </div>
  )
}