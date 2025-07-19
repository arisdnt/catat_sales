'use client'

import React, { useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Eye,
  Edit,
  Trash2,
  Package,
  Barcode,
  DollarSign,
  TrendingUp,
  Star,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'

import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigation } from '@/lib/hooks/use-navigation'

import { HighPerformanceDataTable as DataTableToko } from '@/components/shared/data-table-toko'
import { SearchFilterToko } from '@/components/shared/search-filter-toko'
import {
  useOptimizedProdukState,
  useInvalidateOptimizedProduk,
  type ProdukWithStats
} from '@/lib/queries/produk-optimized'
import { useDeleteProdukMutation } from '@/lib/queries/produk'
import { exportProductData } from '@/lib/excel-export'

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

// Priority configuration
const priorityConfig = {
  true: { 
    label: 'Prioritas', 
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: Star
  },
  false: { 
    label: 'Standar', 
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Package
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

// Helper function to create priority badge
function createPriorityBadge(isPriority: boolean, priorityOrder?: number) {
  const config = priorityConfig[isPriority.toString() as keyof typeof priorityConfig]
  const Icon = config.icon
  
  return (
    <div className="flex flex-col gap-1">
      <Badge variant="outline" className={`flex items-center gap-1 ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
      {isPriority && priorityOrder && priorityOrder > 0 && (
        <span className="text-xs text-gray-500">
          Order: {priorityOrder}
        </span>
      )}
    </div>
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
function ProdukDataTable({ 
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
  onDelete: (produk: ProdukWithStats) => void
  onView: (produk: ProdukWithStats) => void
  onEdit: (produk: ProdukWithStats) => void
}) {
  // Define table columns (similar structure to toko columns)
  const columns = useMemo<ColumnDef<ProdukWithStats>[]>(() => [
    {
      accessorKey: 'nama_produk',
      header: 'Nama Produk',
      cell: ({ row }) => {
        const produk = row.original
        return (
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-2 bg-purple-50 rounded-lg">
              <Package className="w-4 h-4 text-purple-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 truncate">{produk.nama_produk}</div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Barcode className="w-3 h-3" />
                <span className="font-mono">#{produk.id_produk}</span>
              </div>
            </div>
          </motion.div>
        )
      },
    },
    {
      accessorKey: 'harga_satuan',
      header: 'Harga',
      cell: ({ row }) => {
        const produk = row.original
        return (
          <div className="flex items-start gap-2">
            <DollarSign className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900">
                {formatCurrency(produk.harga_satuan)}
              </div>
              <div className="text-xs text-gray-500">
                Per unit
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'priority_info',
      header: 'Prioritas',
      cell: ({ row }) => {
        const produk = row.original
        return createPriorityBadge(produk.is_priority, produk.priority_order)
      },
    },
    {
      accessorKey: 'status_produk',
      header: 'Status',
      cell: ({ row }) => createStatusBadge(row.original.status_produk),
    },
    {
      accessorKey: 'stats',
      header: 'Statistik',
      cell: ({ row }) => {
        const produk = row.original
        const stats = produk.stats || {
          total_terkirim: 0,
          total_terbayar: 0,
          sisa_stok: 0
        }
        
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs">
              <TrendingUp className="w-3 h-3 text-blue-500" />
              <span className="text-gray-600">Terkirim:</span>
              <span className="font-medium text-blue-600">{formatNumber(stats.total_terkirim)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span className="text-gray-600">Terbayar:</span>
              <span className="font-medium text-green-600">{formatNumber(stats.total_terbayar)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Package className="w-3 h-3 text-orange-500" />
              <span className="text-gray-600">Sisa Stok:</span>
              <span className="font-medium text-orange-600">{formatNumber(stats.sisa_stok)}</span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'dibuat_pada',
      header: 'Dibuat',
      cell: ({ row }) => {
        const produk = row.original
        return (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="text-sm text-gray-900">
              {new Date(produk.dibuat_pada).toLocaleDateString('id-ID')}
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
      emptyStateMessage="Tidak ada data produk ditemukan"
      title={undefined}
      description={undefined}
      searchComponent={undefined}
      className="border-none shadow-none"
    />
  )
}

export default function ProdukPage() {
  const { navigate } = useNavigation()
  const { toast } = useToast()
  const deleteProdukMutation = useDeleteProdukMutation()
  const invalidate = useInvalidateOptimizedProduk()

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
  } = useOptimizedProdukState({
    page: 1,
    limit: 20,
    search: '',
    sortBy: 'nama_produk',
    sortOrder: 'asc'
  })

  // Handle search (identical to toko)
  const handleSearchChange = useCallback((value: string) => {
    updateParams({ search: value, page: 1 })
  }, [updateParams])

  // Handle search suggestion selection (adapted for produk)
  const handleSuggestionSelect = useCallback((suggestion: any) => {
    if (suggestion.type === 'produk') {
      updateParams({ search: suggestion.value, page: 1 })
    } else if (suggestion.type === 'harga') {
      updateParams({ price_from: suggestion.value, search: '', page: 1 })
    } else if (suggestion.type === 'priority') {
      updateParams({ is_priority: suggestion.value, search: '', page: 1 })
    }
  }, [updateParams])

  // Handle filter changes (adapted for produk)
  const handleFilterChange = useCallback((filters: Record<string, string>) => {
    if (Object.keys(filters).length === 0) {
      updateParams({
        status_produk: '',
        is_priority: '',
        price_from: '',
        price_to: '',
        search: '',
        page: 1
      })
    } else {
      updateParams({ ...filters, page: 1 })
    }
  }, [updateParams])

  // Handle delete (adapted for produk)
  const handleDelete = useCallback((produk: ProdukWithStats) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus produk "${produk.nama_produk}"?`)) {
      deleteProdukMutation.mutate(produk.id_produk, {
        onSuccess: () => {
          toast({
            title: "Berhasil",
            description: `Produk "${produk.nama_produk}" berhasil dihapus`,
          })
          invalidate.invalidateLists()
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error.message || "Gagal menghapus produk",
            variant: "destructive",
          })
        }
      })
    }
  }, [deleteProdukMutation, toast, invalidate])

  // Handle view
  const handleView = useCallback((produk: ProdukWithStats) => {
    navigate(`/dashboard/master-data/produk/${produk.id_produk}`)
  }, [navigate])

  // Handle edit
  const handleEdit = useCallback((produk: ProdukWithStats) => {
    navigate(`/dashboard/master-data/produk/${produk.id_produk}/edit`)
  }, [navigate])

  // Handle export
  const handleExport = useCallback(() => {
    if (!data?.data) return
    
    const result = exportProductData(data.data)
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
    navigate('/dashboard/master-data/produk/add')
  }, [navigate])

  // Current filters for display (adapted for produk)
  const currentFilters = useMemo(() => {
    const filters: Record<string, string> = {}
    if (params.status_produk) filters.status_produk = params.status_produk
    if (params.is_priority) filters.is_priority = params.is_priority
    if (params.price_from) filters.price_from = params.price_from
    if (params.price_to) filters.price_to = params.price_to
    return filters
  }, [params])

  // Summary statistics with safe defaults (adapted for produk)
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
          <h1 className="text-3xl font-bold text-gray-900">Daftar Produk</h1>
          <p className="text-gray-600 mt-2">
            {summary ? 
              `${formatNumber(summary.total_products)} produk dengan total value ${formatCurrency(summary.total_value)}` :
              "Memuat data produk..."
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleExport} variant="outline" size="lg">
            Export Excel
          </Button>
          <Button onClick={handleAdd} size="lg">
            Tambah Produk
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
            placeholder="Cari produk, harga, prioritas..."
            onSuggestionSelect={handleSuggestionSelect}
          />
        </div>

        {/* Data Table Section (identical structure to toko) */}
        <div className="flex flex-col">
          <ProdukDataTable
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