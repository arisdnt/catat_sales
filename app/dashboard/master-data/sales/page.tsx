'use client'

import React, { useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Eye,
  Edit,
  Trash2,
  Users,
  Phone,
  Target,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign
} from 'lucide-react'

import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigation } from '@/lib/hooks/use-navigation'

import { HighPerformanceDataTable as DataTableToko } from '@/components/shared/data-table-toko'
import { SearchFilterToko } from '@/components/shared/search-filter-toko'
import {
  useOptimizedSalesState,
  useInvalidateOptimizedSales,
  type SalesWithStats
} from '@/lib/queries/sales-optimized'
import { useDeleteSalesMutation } from '@/lib/queries/sales'
import { exportSalesData } from '@/lib/excel-export'

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

// Status configuration
const statusConfig = {
  true: { 
    label: 'Aktif', 
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle
  },
  false: { 
    label: 'Non-aktif', 
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle
  }
}

// Helper function to create status badge
function createStatusBadge(status: boolean) {
  const config = statusConfig[status.toString() as keyof typeof statusConfig]
  const Icon = config.icon
  
  return (
    <Badge variant="outline" className={`flex items-center gap-1 ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  )
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

// Data table component (identical structure to toko)
function SalesDataTable({ 
  data, 
  isLoading, 
  error, 
  refetch, 
  params, 
  updateParams, 
  onDelete, 
  onView, 
  onEdit 
}: {
  data: any
  isLoading: boolean
  error: any
  refetch: () => void
  params: any
  updateParams: (params: any) => void
  onDelete: (sales: SalesWithStats) => void
  onView: (sales: SalesWithStats) => void
  onEdit: (sales: SalesWithStats) => void
}) {
  // Define table columns (similar structure to toko columns)
  const columns = useMemo<ColumnDef<SalesWithStats>[]>(() => [
    {
      accessorKey: 'nama_sales',
      header: 'Nama Sales',
      cell: ({ row }) => {
        const sales = row.original
        return (
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-2 bg-cyan-50 rounded-lg">
              <Users className="w-4 h-4 text-cyan-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 truncate">{sales.nama_sales}</div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Target className="w-3 h-3" />
                <span className="font-mono">#{sales.id_sales}</span>
              </div>
            </div>
          </motion.div>
        )
      },
    },
    {
      accessorKey: 'nomor_telepon',
      header: 'Telepon',
      cell: ({ row }) => {
        const sales = row.original
        return (
          <div className="flex items-start gap-2">
            <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900">
                {sales.nomor_telepon || '-'}
              </div>
              <div className="text-xs text-gray-500">
                {sales.nomor_telepon ? 'Terverifikasi' : 'Belum ada'}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'status_aktif',
      header: 'Status',
      cell: ({ row }) => createStatusBadge(row.original.status_aktif),
    },
    {
      accessorKey: 'stats',
      header: 'Statistik',
      cell: ({ row }) => {
        const sales = row.original
        const stats = sales.stats || {
          total_stores: 0,
          total_shipped_items: 0,
          total_revenue: 0
        }
        
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs">
              <Target className="w-3 h-3 text-blue-500" />
              <span className="text-gray-600">Toko:</span>
              <span className="font-medium text-blue-600">{formatNumber(stats.total_stores)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span className="text-gray-600">Kirim:</span>
              <span className="font-medium text-green-600">{formatNumber(stats.total_shipped_items)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <DollarSign className="w-3 h-3 text-purple-500" />
              <span className="text-gray-600">Revenue:</span>
              <span className="font-medium text-purple-600">{formatCurrency(stats.total_revenue)}</span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'dibuat_pada',
      header: 'Dibuat',
      cell: ({ row }) => {
        const sales = row.original
        return (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="text-sm text-gray-900">
              {new Date(sales.dibuat_pada).toLocaleDateString('id-ID')}
            </div>
          </div>
        )
      },
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
        currentPage: data.pagination.page,
        totalPages: data.pagination.total_pages,
        total: data.pagination.total,
        hasNextPage: data.pagination.page < data.pagination.total_pages,
        hasPrevPage: data.pagination.page > 1,
        onPageChange: handlePageChange,
        onNextPage: handleNextPage,
        onPrevPage: handlePrevPage,
        pageSize: data.pagination.limit,
      } : undefined}
      enableVirtualization={false}
      enableRowSelection={false}
      enableColumnVisibility={false}
      enableSorting={true}
      maxHeight="none"
      emptyStateMessage="Tidak ada data sales ditemukan"
      title={undefined}
      description={undefined}
      searchComponent={undefined}
      className="border-none shadow-none"
    />
  )
}

export default function SalesPage() {
  const { navigate } = useNavigation()
  const { toast } = useToast()
  const deleteSalesMutation = useDeleteSalesMutation()
  const invalidate = useInvalidateOptimizedSales()

  // Initialize state management (identical to toko)
  const {
    data,
    isLoading,
    error,
    refetch,
    suggestions,
    suggestionsLoading,
    filterOptions,
    params,
    updateParams
  } = useOptimizedSalesState({
    page: 1,
    limit: 20,
    search: '',
    sortBy: 'nama_sales',
    sortOrder: 'asc'
  })

  // Handle search (identical to toko)
  const handleSearchChange = useCallback((value: string) => {
    updateParams({ search: value, page: 1 })
  }, [updateParams])

  // Handle search suggestion selection (adapted for sales)
  const handleSuggestionSelect = useCallback((suggestion: any) => {
    if (suggestion.type === 'sales') {
      updateParams({ search: suggestion.value, page: 1 })
    } else if (suggestion.type === 'telepon') {
      updateParams({ search: suggestion.value, page: 1 })
    } else if (suggestion.type === 'status') {
      updateParams({ status_aktif: suggestion.value, search: '', page: 1 })
    } else if (suggestion.type === 'telepon_exists') {
      updateParams({ telepon_exists: suggestion.value, search: '', page: 1 })
    } else if (suggestion.type === 'tanggal') {
      updateParams({ date_from: suggestion.value, search: '', page: 1 })
    }
  }, [updateParams])

  // Handle filter changes (adapted for sales)
  const handleFilterChange = useCallback((filters: Record<string, string>) => {
    if (Object.keys(filters).length === 0) {
      updateParams({
        status_aktif: '',
        telepon_exists: '',
        date_from: '',
        date_to: '',
        search: '',
        page: 1
      })
    } else {
      updateParams({ ...filters, page: 1 })
    }
  }, [updateParams])

  // Handle delete (adapted for sales)
  const handleDelete = useCallback((sales: SalesWithStats) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus sales "${sales.nama_sales}"?`)) {
      deleteSalesMutation.mutate(sales.id_sales, {
        onSuccess: () => {
          toast({
            title: "Berhasil",
            description: `Sales "${sales.nama_sales}" berhasil dihapus`,
          })
          invalidate.invalidateLists()
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error.message || "Gagal menghapus sales",
            variant: "destructive",
          })
        }
      })
    }
  }, [deleteSalesMutation, toast, invalidate])

  // Handle view
  const handleView = useCallback((sales: SalesWithStats) => {
    navigate(`/dashboard/master-data/sales/${sales.id_sales}`)
  }, [navigate])

  // Handle edit
  const handleEdit = useCallback((sales: SalesWithStats) => {
    navigate(`/dashboard/master-data/sales/${sales.id_sales}/edit`)
  }, [navigate])

  // Handle export
  const handleExport = useCallback(() => {
    if (!data?.data) return
    
    const result = exportSalesData(data.data)
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
    navigate('/dashboard/master-data/sales/add')
  }, [navigate])

  // Current filters for display (adapted for sales)
  const currentFilters = useMemo(() => {
    const filters: Record<string, string> = {}
    if (params.status_aktif) filters.status_aktif = params.status_aktif
    if (params.telepon_exists) filters.telepon_exists = params.telepon_exists
    if (params.date_from) filters.date_from = params.date_from
    if (params.date_to) filters.date_to = params.date_to
    return filters
  }, [params])

  // Summary statistics with safe defaults (adapted for sales)
  const summary = filterOptions?.summary

  return (
    <motion.div 
      variants={pageVariants}
      initial="hidden"
      animate="visible" 
      className="p-6 space-y-6"
    >
      {/* Page Header (identical structure to toko) */}
      <motion.div variants={cardVariants} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Daftar Sales</h1>
          <p className="text-gray-600 mt-2">
            {summary ? 
              `${formatNumber(summary.total_sales)} sales dengan ${formatNumber(summary.active_sales)} aktif dan total revenue ${formatCurrency(summary.total_revenue)}` :
              "Memuat data sales..."
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleExport} variant="outline" size="lg">
            Export Excel
          </Button>
          <Button onClick={handleAdd} size="lg">
            Tambah Sales
          </Button>
        </div>
      </motion.div>

      {/* Integrated Data Table Card (identical structure to toko) */}
      <motion.div 
        variants={cardVariants} 
        className="bg-white rounded-lg border shadow-sm overflow-hidden"
      >
        {/* Search and Filter Section (identical to toko) */}
        <div className="p-6 border-b bg-gray-50">
          <SearchFilterToko
            value={params.search || ''}
            onChange={handleSearchChange}
            onFilterChange={handleFilterChange}
            suggestions={suggestions}
            suggestionsLoading={suggestionsLoading}
            filterOptions={filterOptions}
            activeFilters={currentFilters}
            placeholder="Cari sales, telepon, status..."
            onSuggestionSelect={handleSuggestionSelect}
          />
        </div>

        {/* Data Table Section (identical structure to toko) */}
        <div className="flex flex-col">
          <SalesDataTable
            data={data}
            isLoading={isLoading}
            error={error}
            refetch={refetch}
            params={params}
            updateParams={updateParams}
            onDelete={handleDelete}
            onView={handleView}
            onEdit={handleEdit}
          />
        </div>
      </motion.div>
    </motion.div>
  )
}