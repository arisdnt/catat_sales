'use client'

import React, { useMemo, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Eye,
  Edit,
  Trash2,
  Banknote,
  Clock,
  Building,
  User,
  TrendingUp,
  CheckCircle,
  XCircle,
  DollarSign,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  CreditCard,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertCircle,
  TrendingDown
} from 'lucide-react'

import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useNavigation } from '@/lib/hooks/use-navigation'

import { DataTableAdvanced as DataTableToko } from '@/components/data-tables'
import { useDashboardSetoranQuery } from '@/lib/queries/dashboard'
import { useDeleteSetoranMutation } from '@/lib/queries/setoran'
import { exportDepositData } from '@/lib/excel-export'

// Page animations (identical to toko)
const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1
    }
  }
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4 }
  },
  hover: {
    scale: 1.02,
    transition: { duration: 0.2 }
  }
}

// Helper function to format numbers (identical to toko)
function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num)
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

// Filter types
interface SetoranFilters {
  search: string
  status_setoran: string
  date_range: 'today' | 'week' | 'month' | 'all'
  event_type: 'all' | 'PEMBAYARAN_CASH' | 'PEMBAYARAN_TRANSFER' | 'SETORAN'
}

// Cash Flow Summary Component - FIXED to show proper setoran count
function CashFlowSummary({ summary, recordCount, currentFilter }: { 
  summary: any, 
  recordCount: number,
  currentFilter: string 
}) {
  const stats = useMemo(() => {
    if (!summary) {
      return {
        totalCash: 0,
        totalTransfer: 0,
        totalSetoran: 0,
        cashBalance: 0,
        totalTransactionsCash: 0,
        totalTransactionsTransfer: 0,
        totalSetoranTransactions: 0,
        totalRecords: recordCount || 0
      }
    }

    // Use the accurate summary data from database function
    return {
      totalCash: summary.total_cash_in || 0,
      totalTransfer: summary.total_transfer_in || 0,
      totalSetoran: summary.total_setoran || 0,
      cashBalance: summary.net_cash_flow || 0, // This is already calculated correctly as cash_in - setoran
      totalTransactionsCash: summary.total_cash_transactions || 0,
      totalTransactionsTransfer: summary.total_transfer_transactions || 0,
      totalSetoranTransactions: summary.total_setoran_transactions || 0,
      totalRecords: recordCount || 0
    }
  }, [summary, recordCount])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Cash Payments Card */}
      <motion.div variants={cardVariants} whileHover="hover">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Total Pembayaran Cash</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(stats.totalCash)}</p>
                <p className="text-xs text-green-600 mt-1">
                  {stats.totalTransactionsCash} transaksi
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <Wallet className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Transfer Payments Card */}
      <motion.div variants={cardVariants} whileHover="hover">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Pembayaran Transfer</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(stats.totalTransfer)}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {stats.totalTransactionsTransfer} transaksi
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <CreditCard className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Setoran Card */}
      <motion.div variants={cardVariants} whileHover="hover">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Total Setoran</p>
                <p className="text-2xl font-bold text-purple-900">{formatCurrency(stats.totalSetoran)}</p>
                <p className="text-xs text-purple-600 mt-1">
                  {stats.totalSetoranTransactions} setoran
                </p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <ArrowUpCircle className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Cash Balance Card */}
      <motion.div variants={cardVariants} whileHover="hover">
        <Card className={`bg-gradient-to-br ${
          stats.cashBalance > 0 
            ? 'from-orange-50 to-orange-100 border-orange-200' 
            : stats.cashBalance < 0
            ? 'from-red-50 to-red-100 border-red-200'
            : 'from-gray-50 to-gray-100 border-gray-200'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  stats.cashBalance > 0 ? 'text-orange-700' : 
                  stats.cashBalance < 0 ? 'text-red-700' : 'text-gray-700'
                }`}>
                  Cash di Tangan Sales
                </p>
                <p className={`text-2xl font-bold ${
                  stats.cashBalance > 0 ? 'text-orange-900' : 
                  stats.cashBalance < 0 ? 'text-red-900' : 'text-gray-900'
                }`}>
                  {formatCurrency(Math.abs(stats.cashBalance))}
                </p>
                <p className={`text-xs mt-1 ${
                  stats.cashBalance > 0 ? 'text-orange-600' : 
                  stats.cashBalance < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {stats.cashBalance > 0 ? 'Belum disetor' : 
                   stats.cashBalance < 0 ? 'Lebih setor' : 'Seimbang'}
                </p>
              </div>
              <div className={`p-3 rounded-full ${
                stats.cashBalance > 0 ? 'bg-orange-200' : 
                stats.cashBalance < 0 ? 'bg-red-200' : 'bg-gray-200'
              }`}>
                {stats.cashBalance > 0 ? (
                  <AlertCircle className="w-6 h-6 text-orange-700" />
                ) : stats.cashBalance < 0 ? (
                  <TrendingDown className="w-6 h-6 text-red-700" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-gray-700" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// Filter component
function SetoranFilterPanel({ 
  filters, 
  onFiltersChange,
  onClearFilters,
  isLoading
}: {
  filters: SetoranFilters
  onFiltersChange: (filters: Partial<SetoranFilters>) => void
  onClearFilters: () => void
  isLoading: boolean
}) {
  const hasActiveFilters = Boolean(
    filters.search || 
    (filters.date_range && filters.date_range !== 'all') ||
    (filters.status_setoran && filters.status_setoran !== 'all') ||
    (filters.event_type && filters.event_type !== 'all')  // 'all' is now the default, so only show as active if different
  )

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-end gap-4">
          {/* Search Input */}
          <div className="flex-1 min-w-[300px]">
            <label className="text-sm font-medium">Pencarian</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Cari penerima, ID setoran..."
                value={filters.search}
                onChange={(e) => onFiltersChange({ search: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="min-w-[160px]">
            <label className="text-sm font-medium">Periode Waktu</label>
            <Select
              value={filters.date_range}
              onValueChange={(value) => onFiltersChange({ date_range: value as any })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Pilih periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="week">7 Hari Terakhir</SelectItem>
                <SelectItem value="month">30 Hari Terakhir</SelectItem>
                <SelectItem value="all">Semua Data</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Event Type Filter */}
          <div className="min-w-[160px]">
            <label className="text-sm font-medium">Jenis Transaksi</label>
            <Select
              value={filters.event_type}
              onValueChange={(value) => onFiltersChange({ event_type: value as any })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Setoran saja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Transaksi</SelectItem>
                <SelectItem value="PEMBAYARAN_CASH">💰 Cash Masuk</SelectItem>
                <SelectItem value="PEMBAYARAN_TRANSFER">💳 Transfer Masuk</SelectItem>
                <SelectItem value="SETORAN">📤 Setoran</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="min-w-[160px]">
            <label className="text-sm font-medium">Status Balance</label>
            <Select
              value={filters.status_setoran}
              onValueChange={(value) => onFiltersChange({ status_setoran: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Semua status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="SESUAI">Sesuai</SelectItem>
                <SelectItem value="KURANG_SETOR">Kurang Setor</SelectItem>
                <SelectItem value="LEBIH_SETOR">Lebih Setor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              disabled={!hasActiveFilters || isLoading}
              className="px-3 py-2"
              title="Clear Filters"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-500">Active filters:</span>
              {filters.search && (
                <Badge variant="secondary">Search: {filters.search}</Badge>
              )}
              {filters.date_range && filters.date_range !== 'all' && (
                <Badge variant="secondary">
                  Period: {filters.date_range === 'today' ? 'Today' : 
                          filters.date_range === 'week' ? '7 Days' : '30 Days'}
                </Badge>
              )}
              {filters.event_type && filters.event_type !== 'all' && (
                <Badge variant="secondary">
                  Jenis: {filters.event_type === 'PEMBAYARAN_CASH' ? 'Cash Masuk' : 
                         filters.event_type === 'PEMBAYARAN_TRANSFER' ? 'Transfer Masuk' : 'Setoran'}
                </Badge>
              )}
              {filters.status_setoran && filters.status_setoran !== 'all' && (
                <Badge variant="secondary">Status: {filters.status_setoran}</Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Data table component
function SetoranDataTable({ 
  data, 
  isLoading, 
  error, 
  refetch, 
  params, 
  updateParams, 
  onDelete, 
  onView, 
  onEdit,
  onPageChange,
  onNextPage,
  onPrevPage
}: {
  data: any
  isLoading: boolean
  error: any
  refetch: () => void
  params: any
  updateParams: (params: any) => void
  onDelete: (setoran: any) => void
  onView: (setoran: any) => void
  onEdit: (setoran: any) => void
  onPageChange: (page: number) => void
  onNextPage: () => void
  onPrevPage: () => void
}) {
  // Define responsive columns with balanced sizing and left alignment
  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'id_setoran',
      header: 'ID & Jenis Transaksi',
      cell: ({ row }) => {
        const setoran = row.original
        const eventType = setoran.event_type
        const getEventDisplay = (type: string) => {
          switch (type) {
            case 'PEMBAYARAN_CASH': return { icon: '💰', text: 'Cash Masuk', color: 'text-green-600' }
            case 'PEMBAYARAN_TRANSFER': return { icon: '💳', text: 'Transfer Masuk', color: 'text-blue-600' }
            case 'SETORAN': return { icon: '📤', text: 'Setoran', color: 'text-purple-600' }
            default: return { icon: '📊', text: 'Transaksi', color: 'text-gray-600' }
          }
        }
        const display = getEventDisplay(eventType)
        return (
          <div className="text-left">
            <div className="font-mono text-sm font-medium text-gray-900">
              #{setoran.id_setoran}
            </div>
            <div className="text-xs text-gray-500">{setoran.tanggal_setoran}</div>
            <div className={`text-xs font-medium mt-1 ${display.color}`}>
              {display.icon} {display.text}
            </div>
          </div>
        )
      },
      size: 140,
      minSize: 120,
      maxSize: 160,
      meta: { priority: 'high', columnType: 'id' },
    },
    {
      accessorKey: 'total_setoran',
      header: 'Jumlah & Deskripsi',
      cell: ({ row }) => {
        const setoran = row.original
        const eventType = setoran.event_type
        const getAmountColor = (type: string) => {
          switch (type) {
            case 'PEMBAYARAN_CASH': return 'text-green-900'
            case 'PEMBAYARAN_TRANSFER': return 'text-blue-900'
            case 'SETORAN': return 'text-purple-900'
            default: return 'text-gray-900'
          }
        }
        return (
          <div className="text-left">
            <div className={`text-sm font-medium ${getAmountColor(eventType)}`}>
              {formatCurrency(setoran.total_setoran)}
            </div>
            <div className="text-xs text-gray-600 mt-1 max-w-[180px] truncate" title={setoran.description}>
              {setoran.description}
            </div>
            {setoran.nama_toko && setoran.nama_toko !== 'N/A' && (
              <div className="text-xs text-gray-500 mt-1">
                {setoran.nama_toko}
              </div>
            )}
          </div>
        )
      },
      size: 200,
      minSize: 180,
      maxSize: 220,
      meta: { priority: 'high', columnType: 'currency' },
    },
    {
      accessorKey: 'penerima_setoran',
      header: 'Penerima & Running Balance',
      cell: ({ row }) => {
        const setoran = row.original
        const runningBalance = setoran.cash_balance_kumulatif || 0
        return (
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900 truncate">
              {setoran.penerima_setoran || 'Sistem'}
            </div>
            <div className={`text-xs font-medium ${
              runningBalance > 1000000 ? 'text-orange-600' : 
              runningBalance < 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              Cash On Hand: {formatCurrency(Math.abs(runningBalance))}
            </div>
            <div className={`text-xs ${
              runningBalance > 1000000 ? 'text-orange-500' : 
              runningBalance < 0 ? 'text-red-500' : 'text-green-500'
            }`}>
              {runningBalance > 1000000 ? '⚠️ Cash Tinggi' : 
               runningBalance < 0 ? '❌ Cash Negatif' : '✅ Normal'}
            </div>
          </div>
        )
      },
      size: 180,
      minSize: 160,
      maxSize: 200,
      meta: { priority: 'medium', columnType: 'name' },
    },
    {
      accessorKey: 'waktu_setoran',
      header: 'Waktu Transaksi',
      cell: ({ row }) => {
        const setoran = row.original
        const date = new Date(setoran.waktu_setoran)
        return (
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">
              {date.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </div>
            <div className="text-xs text-gray-500">
              {date.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
              })} WIB
            </div>
          </div>
        )
      },
      size: 130,
      minSize: 110,
      maxSize: 150,
      meta: { priority: 'medium', columnType: 'date' },
    },
    {
      accessorKey: 'status_setoran',
      header: 'Status & Kategori',
      cell: ({ row }) => {
        const setoran = row.original
        const eventType = setoran.event_type
        const getEventTypeColor = (type: string) => {
          switch (type) {
            case 'PEMBAYARAN_CASH': return 'bg-green-100 text-green-800'
            case 'PEMBAYARAN_TRANSFER': return 'bg-blue-100 text-blue-800'
            case 'SETORAN': return 'bg-purple-100 text-purple-800'
            default: return 'bg-gray-100 text-gray-800'
          }
        }
        const getEventTypeLabel = (type: string) => {
          switch (type) {
            case 'PEMBAYARAN_CASH': return 'Cash In'
            case 'PEMBAYARAN_TRANSFER': return 'Transfer In'
            case 'SETORAN': return 'Cash Out'
            default: return 'Unknown'
          }
        }
        return (
          <div className="text-left">
            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getEventTypeColor(eventType)}`}>
              {getEventTypeLabel(eventType)}
            </span>
            <div className="text-xs text-gray-500 mt-1">
              {setoran.transaction_category}
            </div>
            {setoran.kecamatan && setoran.kecamatan !== 'N/A' && (
              <div className="text-xs text-gray-400 mt-1 truncate">
                {setoran.kecamatan}
              </div>
            )}
          </div>
        )
      },
      size: 150,
      minSize: 130,
      maxSize: 170,
      meta: { priority: 'low', columnType: 'status', hideOnMobile: true },
    },
  ], [])

  // Handle pagination (identical to toko)
  const handleNextPage = useCallback(() => {
    if (data?.pagination?.hasNextPage) {
      updateParams({ page: (params.page || 1) + 1 })
    }
  }, [data?.pagination?.hasNextPage, params.page, updateParams])

  const handlePrevPage = useCallback(() => {
    if (data?.pagination?.hasPrevPage) {
      updateParams({ page: (params.page || 1) - 1 })
    }
  }, [data?.pagination?.hasPrevPage, params.page, updateParams])

  const handlePageChange = useCallback((page: number) => {
    updateParams({ page })
  }, [updateParams])

  // Table actions (identical to toko)
  const tableActions = useMemo(() => [
    {
      label: 'Lihat Detail',
      icon: Eye,
      onClick: onView,
      variant: 'view' as const,
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: onEdit,
      variant: 'edit' as const,
    },
    {
      label: 'Hapus',
      icon: Trash2,
      onClick: onDelete,
      variant: 'delete' as const,
    },
  ], [onView, onEdit, onDelete])

  return (
    <DataTableToko
      data={data?.data || []}
      columns={columns}
      loading={isLoading}
      error={error?.message}
      onRefresh={refetch}
      actions={tableActions}
      pagination={data?.pagination ? {
        currentPage: data.pagination.currentPage,
        totalPages: data.pagination.totalPages,
        total: data.pagination.total,
        hasNextPage: data.pagination.hasNextPage,
        hasPrevPage: data.pagination.hasPrevPage,
        onPageChange: onPageChange,
        onNextPage: onNextPage,
        onPrevPage: onPrevPage,
        pageSize: data.pagination.pageSize,
      } : undefined}
      enableVirtualization={false}
      enableRowSelection={false}
      enableColumnVisibility={false}
      enableSorting={true}
      maxHeight="none"
      emptyStateMessage="Tidak ada data setoran ditemukan"
      title={undefined}
      description={undefined}
      searchComponent={undefined}
      className="border-none shadow-none"
    />
  )
}

export default function DepositsPage() {
  const { navigate } = useNavigation()
  const { toast } = useToast()
  const deleteSetoranMutation = useDeleteSetoranMutation()

  // Filter and pagination state - DEFAULT to show all transactions
  const [filters, setFilters] = useState<SetoranFilters>({
    search: '',
    status_setoran: 'all',
    date_range: 'all',
    event_type: 'all'
  })
  
  const [page, setPage] = useState(1)
  const limit = 30

  // Use new dashboard query with pagination
  const { data: dashboardData, isLoading, error, refetch } = useDashboardSetoranQuery({
    page,
    limit,
    ...filters
  })

  // Custom pagination handlers for this component
  const handlePageChange = useCallback((newPage: number) => {
    console.log('Page change requested:', { newPage, currentPage: page })
    setPage(newPage)
  }, [page])

  const handleNextPage = useCallback(() => {
    console.log('Next page clicked:', { 
      currentPage: page, 
      hasNextPage: dashboardData?.data?.pagination?.has_next,
      totalPages: dashboardData?.data?.pagination?.total_pages 
    })
    if (dashboardData?.data?.pagination?.has_next) {
      setPage(prev => prev + 1)
    }
  }, [dashboardData?.data?.pagination?.has_next, page])

  const handlePrevPage = useCallback(() => {
    console.log('Previous page clicked:', { 
      currentPage: page, 
      hasPrevPage: dashboardData?.data?.pagination?.has_prev 
    })
    if (dashboardData?.data?.pagination?.has_prev) {
      setPage(prev => prev - 1)
    }
  }, [dashboardData?.data?.pagination?.has_prev, page])
  
  // Transform data for compatibility with existing table component
  const data = {
    data: dashboardData?.data?.data || [],
    pagination: dashboardData?.data?.pagination ? {
      hasNextPage: dashboardData.data.pagination.has_next,
      hasPrevPage: dashboardData.data.pagination.has_prev,
      totalPages: dashboardData.data.pagination.total_pages,
      currentPage: dashboardData.data.pagination.page,
      pageSize: dashboardData.data.pagination.limit,
      total: dashboardData.data.pagination.total,
      totalItems: dashboardData.data.pagination.total,
      totalRecords: dashboardData.data.pagination.total,
      limit: dashboardData.data.pagination.limit,
      page: dashboardData.data.pagination.page,
      from: ((dashboardData.data.pagination.page - 1) * dashboardData.data.pagination.limit) + 1,
      to: Math.min(dashboardData.data.pagination.page * dashboardData.data.pagination.limit, dashboardData.data.pagination.total)
    } : {
      hasNextPage: false,
      hasPrevPage: false,
      totalPages: 1,
      currentPage: 1,
      pageSize: 30,
      total: 0,
      totalItems: 0,
      totalRecords: 0,
      limit: 30,
      page: 1,
      from: 0,
      to: 0
    }
  }

  // Filter handlers
  const handleFiltersChange = useCallback((newFilters: Partial<SetoranFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPage(1) // Reset to first page when filters change
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      status_setoran: 'all',
      date_range: 'all',
      event_type: 'all'  // Reset to show all transactions when clearing
    })
    setPage(1) // Reset to first page when clearing filters
  }, [])

  // Handle delete (adapted for setoran)
  const handleDelete = useCallback((setoran: any) => {
    // Only allow delete for SETORAN type transactions
    if (setoran.event_type !== 'SETORAN') {
      toast({
        title: "Error",
        description: "Hanya transaksi setoran yang dapat dihapus",
        variant: "destructive",
      })
      return
    }
    
    if (window.confirm(`Apakah Anda yakin ingin menghapus setoran #${setoran.id_setoran}?`)) {
      deleteSetoranMutation.mutate(setoran.id_setoran, {
        onSuccess: () => {
          toast({
            title: "Berhasil",
            description: `Setoran #${setoran.id_setoran} berhasil dihapus`,
          })
          refetch()
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error.message || "Gagal menghapus setoran",
            variant: "destructive",
          })
        }
      })
    }
  }, [deleteSetoranMutation, toast, refetch])

  // Handle view
  const handleView = useCallback((setoran: any) => {
    // Only allow view for SETORAN type transactions
    if (setoran.event_type !== 'SETORAN') {
      toast({
        title: "Info",
        description: "Detail view hanya tersedia untuk transaksi setoran",
        variant: "default",
      })
      return
    }
    navigate(`/dashboard/setoran/${setoran.id_setoran}`)
  }, [navigate, toast])

  // Handle edit
  const handleEdit = useCallback((setoran: any) => {
    // Only allow edit for SETORAN type transactions
    if (setoran.event_type !== 'SETORAN') {
      toast({
        title: "Info",
        description: "Edit hanya tersedia untuk transaksi setoran",
        variant: "default",
      })
      return
    }
    navigate(`/dashboard/setoran/${setoran.id_setoran}/edit`)
  }, [navigate, toast])

  // Handle export
  const handleExport = useCallback(() => {
    if (!data?.data) return
    
    const result = exportDepositData(data.data)
    if (result.success) {
      toast({
        title: "Export Berhasil",
        description: `Data berhasil diexport ke ${result.filename}`,
      })
    } else {
      toast({
        title: "Export Gagal",
        description: result.error || "Terjadi kesalahan saat export",
        variant: "destructive",
      })
    }
  }, [data?.data, toast])

  // Handle add new
  const handleAdd = useCallback(() => {
    navigate('/dashboard/setoran/add')
  }, [navigate])

  // Summary statistics for header display
  const summary = {
    total_deposits: data.pagination.total || 0,
    current_page_count: data.data.length,
    total_pages: data.pagination.totalPages
  }

  return (
    <motion.div 
      variants={pageVariants}
      initial="hidden"
      animate="visible" 
      className="p-6 space-y-6 w-full max-w-full overflow-hidden"
    >
      {/* Page Header */}
      <motion.div variants={cardVariants} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">
            {filters.event_type === 'SETORAN' ? 'Data Setoran' : 'Ledger Arus Kas Harian'}
          </h1>
          <p className="text-gray-600 mt-2">
            {filters.event_type === 'SETORAN' 
              ? `Daftar setoran yang dilakukan sales ke kantor pusat. Menampilkan ${summary.current_page_count} dari ${formatNumber(summary.total_deposits)} setoran (Halaman ${data.pagination.currentPage} dari ${summary.total_pages})`
              : `Monitoring transaksi-level arus kas dengan running balance. Setiap pembayaran cash dan setoran ditampilkan secara kronologis dengan saldo berjalan real-time. Menampilkan ${summary.current_page_count} dari ${formatNumber(summary.total_deposits)} transaksi (Halaman ${data.pagination.currentPage} dari ${summary.total_pages})`
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleExport} variant="outline" size="lg">
            Export Excel
          </Button>
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="lg"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleAdd} size="lg">
            Tambah Setoran
          </Button>
        </div>
      </motion.div>

      {/* Filter Panel */}
      <motion.div variants={cardVariants}>
        <SetoranFilterPanel
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
          isLoading={isLoading}
        />
      </motion.div>

      {/* Cash Flow Summary */}
      <motion.div variants={cardVariants}>
        <CashFlowSummary 
          summary={dashboardData?.data?.summary} 
          recordCount={data?.data?.length || 0}
          currentFilter={filters.event_type}
        />
      </motion.div>

      {/* Integrated Data Table Card */}
      <motion.div 
        variants={cardVariants} 
        className="bg-white rounded-lg border shadow-sm w-full max-w-full overflow-hidden"
      >
        {/* Data Table Section with pagination */}
        <div className="w-full">
          <SetoranDataTable
            data={data}
            isLoading={isLoading}
            error={error}
            refetch={refetch}
            params={{ page }}
            updateParams={() => {}} // Not used anymore since we have custom pagination handlers
            onDelete={handleDelete}
            onView={handleView}
            onEdit={handleEdit}
            onPageChange={handlePageChange}
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
          />
        </div>
      </motion.div>
    </motion.div>
  )
}