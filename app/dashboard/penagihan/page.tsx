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
  const billings = response?.data || []
  const deleteBilling = useDeletePenagihanMutation()
  const { navigate } = useNavigation()
  const { toast } = useToast()

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
      accessorKey: 'id_toko',
      header: createSortableHeader('Toko'),
      cell: ({ row }) => (
        <div className="font-medium text-gray-900">Toko ID: {row.getValue('id_toko')}</div>
      ),
    },
    {
      accessorKey: 'total_uang_diterima',
      header: createSortableHeader('Total Diterima'),
      cell: ({ row }) => (
        <div className="text-right">
          <div className="font-medium text-gray-900">
            {formatCurrency(row.getValue('total_uang_diterima'))}
          </div>
          {row.original.ada_potongan && (
            <div className="text-sm text-yellow-600">Ada potongan</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'metode_pembayaran',
      header: createSortableHeader('Metode Pembayaran'),
      cell: ({ row }) => createStatusBadge(row.getValue('metode_pembayaran'), statusConfig),
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
    totalBillings: billings.length,
    cashPayments: billings.filter(b => b.metode_pembayaran === 'Cash').length,
    transferPayments: billings.filter(b => b.metode_pembayaran === 'Transfer').length,
    totalAmount: billings.reduce((sum, b) => sum + b.total_uang_diterima, 0),
    withDeductions: billings.filter(b => b.ada_potongan).length,
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