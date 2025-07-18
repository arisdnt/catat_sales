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
import { useCashBalanceQuery, type CashBalance } from '@/lib/queries/setoran'
import { useNavigation } from '@/lib/hooks/use-navigation'

import { DataTable, createSortableHeader, createStatusBadge, formatCurrency, formatDate } from '@/components/shared/data-table'
import { exportDepositData } from '@/lib/excel-export'

export default function DepositsPage() {
  const { data: response, isLoading, error, refetch } = useCashBalanceQuery()
  const deposits = (response as any)?.data || []
  const { navigate } = useNavigation()
  const { toast } = useToast()



  const columns = useMemo<ColumnDef<CashBalance>[]>(() => [
    {
      accessorKey: 'id_penagihan',
      header: 'ID Transaksi',
      cell: ({ row }) => (
        <div className="font-medium">
          #{row.getValue('id_penagihan')}
        </div>
      ),
    },
    {
      accessorKey: 'dibuat_pada',
      header: 'Tanggal',
      cell: ({ row }) => (
        <div>
          {formatDate(row.getValue('dibuat_pada'))}
        </div>
      ),
    },
    {
      accessorKey: 'nama_toko',
      header: 'Toko',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue('nama_toko')}</div>
          <div className="text-xs text-gray-500">
            {row.original.kecamatan}, {row.original.kabupaten}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'nama_sales',
      header: 'Sales',
      cell: ({ row }) => (
        <div className="font-medium">
          {row.getValue('nama_sales')}
        </div>
      ),
    },
    {
      id: 'cash_amount',
      accessorKey: 'total_uang_diterima',
      header: () => (
        <div className="flex items-center gap-2">
          <Banknote className="w-4 h-4 text-green-600" />
          <span className="text-green-700 font-semibold">Jumlah Cash</span>
        </div>
      ),
      cell: ({ row }) => {
        const method = row.original.metode_pembayaran
        const amount = parseFloat(row.original.total_uang_diterima)
        return (
          <div className="font-medium">
            {method === 'Cash' ? (
              <div className="bg-green-50 px-3 py-1 rounded-lg border border-green-200">
                <span className="text-green-700 font-semibold">{formatCurrency(amount)}</span>
              </div>
            ) : (
              <span className="text-gray-300">-</span>
            )}
          </div>
        )
      },
    },
    {
      id: 'transfer_amount',
      accessorKey: 'total_uang_diterima',
      header: () => (
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-blue-600" />
          <span className="text-blue-700 font-semibold">Jumlah Transfer</span>
        </div>
      ),
      cell: ({ row }) => {
        const method = row.original.metode_pembayaran
        const amount = parseFloat(row.original.total_uang_diterima)
        return (
          <div className="font-medium">
            {method === 'Transfer' ? (
              <div className="bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                <span className="text-blue-700 font-semibold">{formatCurrency(amount)}</span>
              </div>
            ) : (
              <span className="text-gray-300">-</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'setoran_on_date',
      header: () => (
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-purple-600" />
          <span className="text-purple-700 font-semibold">Setoran Hari Ini</span>
        </div>
      ),
      cell: ({ row }) => {
        const setoranAmount = row.original.setoran_on_date || 0
        const setoranDetails = row.original.setoran_details || []
        
        return (
          <div className="font-medium">
            {setoranAmount > 0 ? (
              <div className="space-y-1">
                <div className="bg-purple-50 px-3 py-1 rounded-lg border border-purple-200">
                  <span className="text-purple-700 font-semibold">{formatCurrency(setoranAmount)}</span>
                </div>
                {setoranDetails.length > 0 && (
                  <div className="text-xs text-gray-500">
                    {setoranDetails.map((detail, index) => (
                      <div key={detail.id_setoran} className="truncate">
                        {detail.penerima_setoran} - {formatCurrency(detail.total_setoran)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-gray-300">-</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'running_balance',
      header: 'Status Cash',
      cell: ({ row }) => {
        const method = row.original.metode_pembayaran
        const runningBalance = row.original.running_balance || 0
        const previousBalance = row.original.previous_balance || 0
        const dailyCashTotal = row.original.daily_cash_total || 0
        const dailySetoranTotal = row.original.daily_setoran_total || 0
        
        if (method === 'Transfer') {
          return null
        }
        
        const isExact = Math.abs(runningBalance) < 0.01
        return (
          <div className="space-y-2">
            <div className="font-medium">
              {isExact ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Sesuai
                </Badge>
              ) : runningBalance > 0 ? (
                <Badge className="bg-red-100 text-red-800">
                  <XCircle className="w-3 h-3 mr-1" />
                  Sisa {formatCurrency(Math.abs(runningBalance))}
                </Badge>
              ) : null}
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Cash Sebelumnya:</span>
                <span className="font-medium text-gray-800">{formatCurrency(previousBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cash Hari Ini:</span>
                <span className="font-medium text-green-600">{formatCurrency(dailyCashTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Setoran Hari Ini:</span>
                <span className="font-medium text-blue-600">{formatCurrency(dailySetoranTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Sisa Belum Disetor:</span>
                <span className="font-bold text-red-600">{formatCurrency(Math.abs(runningBalance))}</span>
              </div>
            </div>
          </div>
        )
      },
    },
  ], [])

  // Calculate statistics
  const totalCash = (deposits as any[]).reduce((sum: number, deposit: any) => 
    sum + (deposit.metode_pembayaran === 'Cash' ? parseFloat(deposit.total_uang_diterima) : 0), 0)
  const totalTransfer = (deposits as any[]).reduce((sum: number, deposit: any) => 
    sum + (deposit.metode_pembayaran === 'Transfer' ? parseFloat(deposit.total_uang_diterima) : 0), 0)
  const totalAmount = totalCash + totalTransfer
  const totalCount = (deposits as any[]).length
  const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0

  // Calculate setoran statistics
  const totalSetoran = (deposits as any[]).reduce((sum: number, deposit: any) => 
    sum + (deposit.setoran_on_date || 0), 0)
  const transactionsWithSetoran = (deposits as any[]).filter((d: any) => (d.setoran_on_date || 0) > 0).length

  // Calculate cash vs transfer counts
  const cashTransactions = (deposits as any[]).filter((d: any) => d.metode_pembayaran === 'Cash').length
  const transferTransactions = (deposits as any[]).filter((d: any) => d.metode_pembayaran === 'Transfer').length

  // Calculate discrepancy statistics for cash transactions only
  const cashWithSelisih = (deposits as any[]).filter((d: any) => d.metode_pembayaran === 'Cash' && Math.abs(d.running_balance || 0) >= 0.01).length
  const exactCashMatches = (deposits as any[]).filter((d: any) => d.metode_pembayaran === 'Cash' && Math.abs(d.running_balance || 0) < 0.01).length
  const totalDiscrepancy = (deposits as any[]).reduce((sum: number, deposit: any) => sum + Math.abs(deposit.running_balance || 0), 0)

  const stats = {
    totalTransactions: totalCount,
    totalAmount: totalAmount,
    totalCash: totalCash,
    totalTransfer: totalTransfer,
    totalSetoran: totalSetoran,
    cashTransactions: cashTransactions,
    transferTransactions: transferTransactions,
    transactionsWithSetoran: transactionsWithSetoran,
    todayTransactions: (deposits as any[]).filter((d: any) =>
      new Date(d.dibuat_pada).toDateString() === new Date().toDateString()
    ).length,
    avgTransaction: averageAmount,
    exactCashMatches: exactCashMatches,
    cashWithSelisih: cashWithSelisih,
    totalDiscrepancy: totalDiscrepancy,
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
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Transaksi</p>
              <p className="text-2xl font-bold">{stats.totalTransactions}</p>
              <p className="text-xs text-gray-500">Semua transaksi pembayaran</p>
            </div>
            <Receipt className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Transaksi Cash</p>
              <p className="text-2xl font-bold text-green-600">{stats.cashTransactions}</p>
              <p className="text-xs text-gray-500">{formatCurrency(stats.totalCash)}</p>
            </div>
            <Banknote className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Transaksi Transfer</p>
              <p className="text-2xl font-bold text-blue-600">{stats.transferTransactions}</p>
              <p className="text-xs text-gray-500">{formatCurrency(stats.totalTransfer)}</p>
            </div>
            <CreditCard className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Setoran</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalSetoran)}</p>
              <p className="text-xs text-gray-500">{stats.transactionsWithSetoran} transaksi</p>
            </div>
            <Building className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cash Sesuai</p>
              <p className="text-2xl font-bold text-green-600">{stats.exactCashMatches}</p>
              <p className="text-xs text-gray-500">Dari {stats.cashTransactions} transaksi cash</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cash Selisih</p>
              <p className="text-2xl font-bold text-red-600">{stats.cashWithSelisih}</p>
              <p className="text-xs text-gray-500">{formatCurrency(stats.totalDiscrepancy)}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>
      <DataTable
        data={deposits}
        columns={columns}
        title="Daftar Transaksi Pembayaran"
        description={`Terdapat total ${stats.totalTransactions} transaksi, ${stats.todayTransactions} hari ini, total ${formatCurrency(stats.totalAmount)}`}
        searchPlaceholder="Cari transaksi..."
        onAdd={() => navigate('/dashboard/penagihan/create')}
        onExport={() => {
          const result = exportDepositData(deposits)
          if (result.success) {
            toast({
              title: "Export Data",
              description: `Data transaksi berhasil diexport ke ${result.filename}`,
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
        addButtonLabel="Tambah Pembayaran"
        loading={isLoading}
        emptyStateMessage="Tidak ada transaksi ditemukan."
        emptyStateIcon={Receipt}
        actions={[
          {
            label: 'Lihat Detail',
            icon: Eye,
            onClick: (row: CashBalance) => navigate(`/dashboard/penagihan/${row.id_penagihan}`),
            variant: 'view'
          }
        ]}
      />
    </div>
  )
}