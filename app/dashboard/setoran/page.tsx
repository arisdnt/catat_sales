'use client'

import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  Edit, 
  Eye,
  Banknote,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  Receipt,
  Download,
  FileText,
  Building,
  User,
  Trash2
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useSetoranQuery, useDeleteSetoranMutation, useCashBalanceQuery, type Setoran, CashBalance } from '@/lib/queries/setoran'
import { useNavigation } from '@/lib/hooks/use-navigation'

import { DataTable, createSortableHeader, createStatusBadge, formatCurrency, formatDate } from '@/components/shared/data-table'
import { exportDepositData } from '@/lib/excel-export'

export default function DepositsPage() {
  const { data: response, isLoading, error, refetch } = useCashBalanceQuery()
  const deposits = (response as any)?.data || []
  const deleteDeposit = useDeleteSetoranMutation()
  const { navigate } = useNavigation()
  const { toast } = useToast()

  const handleDelete = (id: number) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus setoran ini?')) {
      deleteDeposit.mutate(id)
    }
  }

  const columns = useMemo<ColumnDef<CashBalance>[]>(() => [
    {
      accessorKey: 'id_setoran',
      header: 'ID',
      cell: ({ row }) => (
        <div className="font-medium">
          #{row.getValue('id_setoran')}
        </div>
      ),
    },
    {
      accessorKey: 'tanggal_setoran',
      header: 'Tanggal',
      cell: ({ row }) => (
        <div>
          {formatDate(row.getValue('tanggal_setoran'))}
        </div>
      ),
    },
    {
      accessorKey: 'penerima_setoran',
      header: 'Penerima',
      cell: ({ row }) => (
        <div className="font-medium">
          {row.getValue('penerima_setoran')}
        </div>
      ),
    },
    {
      accessorKey: 'total_cash_diterima',
      header: 'Pembayaran Cash',
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue('total_cash_diterima'))
        return (
          <div className="font-medium text-green-600">
            {formatCurrency(amount)}
          </div>
        )
      },
    },
    {
      accessorKey: 'total_transfer_diterima',
      header: 'Pembayaran Transfer',
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue('total_transfer_diterima'))
        return (
          <div className="font-medium text-blue-600">
            {formatCurrency(amount)}
          </div>
        )
      },
    },
    {
      accessorKey: 'total_setoran',
      header: 'Total Disetor',
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue('total_setoran'))
        return (
          <div className="font-medium text-purple-600">
            {formatCurrency(amount)}
          </div>
        )
      },
    },
  ], [])

  // Calculate statistics
  const totalCash = (deposits as any[]).reduce((sum: number, deposit: any) => sum + parseFloat(deposit.total_cash_diterima), 0)
  const totalTransfer = (deposits as any[]).reduce((sum: number, deposit: any) => sum + parseFloat(deposit.total_transfer_diterima), 0)
  const totalDeposits = (deposits as any[]).reduce((sum: number, deposit: any) => sum + parseFloat(deposit.total_setoran), 0)
  const totalCount = (deposits as any[]).length
  const averageDeposit = totalCount > 0 ? totalDeposits / totalCount : 0

  const stats = {
    totalDeposits: totalCount,
    totalAmount: totalDeposits,
    totalCash: totalCash,
    totalTransfer: totalTransfer,
    todayDeposits: (deposits as any[]).filter((d: any) =>
      new Date(d.dibuat_pada).toDateString() === new Date().toDateString()
    ).length,
    avgDeposit: averageDeposit,
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
          <div className="text-red-600 mb-4">Error loading deposits data</div>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Setoran</p>
              <p className="text-2xl font-bold">{stats.totalDeposits}</p>
              <p className="text-xs text-gray-500">Total transaksi setoran</p>
            </div>
            <Banknote className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pembayaran Cash</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalCash)}</p>
              <p className="text-xs text-gray-500">Total diterima cash</p>
            </div>
            <CreditCard className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pembayaran Transfer</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalTransfer)}</p>
              <p className="text-xs text-gray-500">Total diterima transfer</p>
            </div>
            <CreditCard className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Disetor</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalAmount)}</p>
              <p className="text-xs text-gray-500">Akumulasi semua setoran</p>
            </div>
            <Banknote className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rata-rata Setoran</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.avgDeposit)}</p>
              <p className="text-xs text-gray-500">Per transaksi</p>
            </div>
            <Receipt className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      </div>
      <DataTable
        data={deposits}
        columns={columns}
        title="Daftar Setoran"
        description={`Terdapat total ${stats.totalDeposits} setoran, ${stats.todayDeposits} hari ini, total ${formatCurrency(stats.totalAmount)}`}
        searchPlaceholder="Cari setoran..."
        onAdd={() => navigate('/dashboard/setoran/create')}
        onExport={() => {
          const result = exportDepositData(deposits)
          if (result.success) {
            toast({
              title: "Export Data",
              description: `Data setoran berhasil diexport ke ${result.filename}`,
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
        addButtonLabel="Tambah Setoran"
        loading={isLoading}
        emptyStateMessage="Tidak ada setoran ditemukan."
        emptyStateIcon={Banknote}
        actions={[
          {
            label: 'Lihat Detail',
            icon: Eye,
            onClick: (row: CashBalance) => navigate(`/dashboard/setoran/${row.id_setoran}`),
            variant: 'view'
          },
          {
            label: 'Edit',
            icon: Edit,
            onClick: (row: CashBalance) => navigate(`/dashboard/setoran/${row.id_setoran}/edit`),
            variant: 'edit'
          },
          {
            label: 'Hapus',
            icon: Trash2,
            onClick: (row: CashBalance) => handleDelete(row.id_setoran),
            variant: 'delete'
          }
        ]}
      />
    </div>
  )
}