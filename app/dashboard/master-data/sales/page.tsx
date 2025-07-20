'use client'

import React, { useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  DollarSign,
  Store,
  Package
} from 'lucide-react'

import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigation } from '@/lib/hooks/use-navigation'

import { DataTableAdvanced as DataTableToko } from '@/components/data-tables'
import { SearchFilterAdvanced as SearchFilterToko } from '@/components/search'
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
  // Define table columns with optimized compact layout
  const columns = useMemo<ColumnDef<SalesWithStats>[]>(() => [
    {
      accessorKey: 'nama_sales',
      header: 'Sales',
      cell: ({ row }) => {
        const sales = row.original
        return (
          <div className="min-w-0 text-left">
            <div className="font-medium text-gray-900 truncate">{sales.nama_sales}</div>
            <div className="text-xs text-gray-500 font-mono">#{sales.id_sales}</div>
          </div>
        )
      },
      size: 180,
      minSize: 160,
      maxSize: 220,
    },
    {
      accessorKey: 'nomor_telepon',
      header: 'Telepon',
      cell: ({ row }) => {
        const sales = row.original
        return (
          <div className="min-w-0 text-left">
            <div className="text-sm font-medium text-gray-900 truncate">
              {sales.nomor_telepon || '-'}
            </div>
            <div className="text-xs text-gray-500">
              {sales.nomor_telepon ? 'Verified' : 'No phone'}
            </div>
          </div>
        )
      },
      size: 140,
      minSize: 120,
      maxSize: 160,
    },
    {
      accessorKey: 'status_aktif',
      header: 'Status',
      cell: ({ row }) => (
        <div className="text-left">
          <Badge variant="outline" className={`text-xs ${
            row.original.status_aktif 
              ? 'border-green-200 text-green-700 bg-green-50' 
              : 'border-red-200 text-red-700 bg-red-50'
          }`}>
            {row.original.status_aktif ? 'AKTIF' : 'NON'}
          </Badge>
        </div>
      ),
      size: 100,
      minSize: 80,
      maxSize: 120,
    },
    {
      accessorKey: 'total_toko',
      header: 'Total Toko',
      cell: ({ row }) => {
        const sales = row.original
        const stats = sales.stats || { total_stores: 0 }
        
        return (
          <div className="text-left flex items-center gap-2">
            <Store className="h-4 w-4 text-blue-500" />
            <div>
              <div className="text-sm font-medium text-blue-600">
                {formatNumber(stats.total_stores)}
              </div>
              <div className="text-xs text-gray-500">toko</div>
            </div>
          </div>
        )
      },
      size: 120,
      minSize: 100,
      maxSize: 140,
      meta: { priority: 'medium', columnType: 'stats' },
    },
    {
      accessorKey: 'total_items',
      header: 'Total Items',
      cell: ({ row }) => {
        const sales = row.original
        const stats = sales.stats || { total_shipped_items: 0 }
        
        return (
          <div className="text-left flex items-center gap-2">
            <Package className="h-4 w-4 text-green-500" />
            <div>
              <div className="text-sm font-medium text-green-600">
                {formatNumber(stats.total_shipped_items)}
              </div>
              <div className="text-xs text-gray-500">items</div>
            </div>
          </div>
        )
      },
      size: 120,
      minSize: 100,
      maxSize: 140,
      meta: { priority: 'medium', columnType: 'stats' },
    },
    {
      accessorKey: 'total_revenue',
      header: 'Total Revenue',
      cell: ({ row }) => {
        const sales = row.original
        const stats = sales.stats || { total_revenue: 0 }
        
        return (
          <div className="text-left flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-purple-500" />
            <div>
              <div className="text-sm font-medium text-purple-600">
                {formatCurrency(stats.total_revenue)}
              </div>
              <div className="text-xs text-gray-500">revenue</div>
            </div>
          </div>
        )
      },
      size: 150,
      minSize: 130,
      maxSize: 170,
      meta: { priority: 'medium', columnType: 'stats' },
    },
    {
      accessorKey: 'dibuat_pada',
      header: 'Dibuat',
      cell: ({ row }) => {
        const sales = row.original
        return (
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">
              {new Date(sales.dibuat_pada).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit'
              })}
            </div>
          </div>
        )
      },
      size: 110,
      minSize: 90,
      maxSize: 130,
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
      className="p-6 space-y-6 w-full max-w-full overflow-hidden"
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
        className="bg-white rounded-lg border shadow-sm w-full max-w-full overflow-hidden"
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
        <div className="w-full">
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