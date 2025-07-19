'use client'

import React, { useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Eye,
  Edit,
  Trash2,
  MapPin,
  Store,
  Users,
  ExternalLink,
  Package,
  CreditCard,
  Archive,
  Phone,
  CheckCircle,
  XCircle
} from 'lucide-react'

import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigation } from '@/lib/hooks/use-navigation'

import { HighPerformanceDataTable as DataTableToko } from '@/components/shared/data-table-toko'
import { SearchFilterToko } from '@/components/shared/search-filter-toko'
import {
  useOptimizedTokoState,
  useInvalidateOptimizedToko,
  type TokoWithStats
} from '@/lib/queries/toko-optimized'
import { useDeleteTokoMutation } from '@/lib/queries/toko'
import { exportStoreData } from '@/lib/excel-export'

// Page animations
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

// Helper function to format numbers
function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num)
}

// Data table component
function TokoDataTable({ 
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
  onDelete: (toko: TokoWithStats) => void
  onView: (toko: TokoWithStats) => void
  onEdit: (toko: TokoWithStats) => void
}) {
  // Define table columns
  const columns = useMemo<ColumnDef<TokoWithStats>[]>(() => [
    {
      accessorKey: 'nama_toko',
      header: 'Nama Toko',
      cell: ({ row }) => {
        const toko = row.original
        return (
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Store className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 truncate">{toko.nama_toko}</div>
              {toko.link_gmaps ? (
                <a 
                  href={toko.link_gmaps} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 w-fit"
                >
                  <ExternalLink className="w-3 h-3" />
                  Google Maps
                </a>
              ) : (
                <div className="text-sm text-gray-500">
                  Tanpa lokasi
                </div>
              )}
            </div>
          </motion.div>
        )
      },
    },
    {
      accessorKey: 'lokasi',
      header: 'Lokasi',
      cell: ({ row }) => {
        const toko = row.original
        return (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900">
                {toko.kecamatan || '-'}
              </div>
              <div className="text-xs text-gray-500">
                {toko.kabupaten || '-'}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'kontak',
      header: 'Kontak',
      cell: ({ row }) => {
        const toko = row.original
        return (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="text-sm text-gray-900">
              {toko.no_telepon || '-'}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'sales',
      header: 'Sales',
      cell: ({ row }) => {
        const toko = row.original
        
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-gray-900 truncate">
                {(toko as any).nama_sales || 'Sales Tidak Ditemukan'}
              </div>
              <div className="text-xs text-gray-500">ID: {toko.id_sales}</div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'status_toko',
      header: 'Status',
      cell: ({ row }) => createStatusBadge(row.original.status_toko),
    },
    {
      accessorKey: 'barang_terkirim',
      header: 'Terkirim',
      cell: ({ row }) => {
        const toko = row.original
        return (
          <div 
            className="group relative cursor-pointer"
            title="Hover untuk detail produk"
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-blue-600">{formatNumber(toko.barang_terkirim)}</span>
            </div>
            
            {/* Tooltip dengan detail produk */}
            <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-64 -top-2 left-full ml-2">
              <div className="text-sm font-medium text-gray-900 mb-2">Detail Barang Terkirim</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Produk:</span>
                  <span className="font-medium">{toko.detail_terkirim?.total_produk || 0} jenis</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Quantity:</span>
                  <span className="font-medium">{formatNumber(toko.barang_terkirim)} pcs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rata-rata per Produk:</span>
                  <span className="font-medium">{toko.detail_terkirim?.total_produk ? Math.round(toko.barang_terkirim / toko.detail_terkirim.total_produk) : 0} pcs</span>
                </div>
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'barang_terbayar',
      header: 'Terbayar',
      cell: ({ row }) => {
        const toko = row.original
        return (
          <div 
            className="group relative cursor-pointer"
            title="Hover untuk detail produk"
          >
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-green-500" />
              <span className="font-medium text-green-600">{formatNumber(toko.barang_terbayar)}</span>
            </div>
            
            {/* Tooltip dengan detail produk */}
            <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-64 -top-2 left-full ml-2">
              <div className="text-sm font-medium text-gray-900 mb-2">Detail Barang Terbayar</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Produk:</span>
                  <span className="font-medium">{toko.detail_terbayar?.total_produk || 0} jenis</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Quantity:</span>
                  <span className="font-medium">{formatNumber(toko.barang_terbayar)} pcs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rata-rata per Produk:</span>
                  <span className="font-medium">{toko.detail_terbayar?.total_produk ? Math.round(toko.barang_terbayar / toko.detail_terbayar.total_produk) : 0} pcs</span>
                </div>
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'sisa_stok',
      header: 'Sisa Stok',
      cell: ({ row }) => {
        const toko = row.original
        return (
          <div 
            className="group relative cursor-pointer"
            title="Hover untuk detail produk"
          >
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-orange-500" />
              <span className="font-medium text-orange-600">{formatNumber(toko.sisa_stok)}</span>
            </div>
            
            {/* Tooltip dengan detail produk */}
            <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-64 -top-2 left-full ml-2">
              <div className="text-sm font-medium text-gray-900 mb-2">Detail Sisa Stok</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Produk:</span>
                  <span className="font-medium">{toko.detail_sisa?.total_produk || 0} jenis</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Quantity:</span>
                  <span className="font-medium">{formatNumber(toko.sisa_stok)} pcs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rata-rata per Produk:</span>
                  <span className="font-medium">{toko.detail_sisa?.total_produk ? Math.round(toko.sisa_stok / toko.detail_sisa.total_produk) : 0} pcs</span>
                </div>
              </div>
            </div>
          </div>
        )
      },
    },
  ], [])

  // Handle pagination
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

  // Table actions
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
        totalPages: data.pagination.totalPages,
        total: data.pagination.total,
        hasNextPage: data.pagination.hasNextPage,
        hasPrevPage: data.pagination.hasPrevPage,
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
      emptyStateMessage="Tidak ada data toko ditemukan"
      title={undefined}
      description={undefined}
      searchComponent={undefined}
      className="border-none shadow-none"
    />
  )
}

export default function TokoPage() {
  const { navigate } = useNavigation()
  const { toast } = useToast()
  const deleteTokoMutation = useDeleteTokoMutation()
  const invalidate = useInvalidateOptimizedToko()

  // Initialize state management
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
  } = useOptimizedTokoState({
    page: 1,
    limit: 20,
    search: '',
    sortBy: 'nama_toko',
    sortOrder: 'asc'
  })

  // Handle search
  const handleSearchChange = useCallback((value: string) => {
    updateParams({ search: value, page: 1 })
  }, [updateParams])

  // Handle search suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: any) => {
    if (suggestion.type === 'toko') {
      updateParams({ search: suggestion.value, page: 1 })
    } else if (suggestion.type === 'kabupaten') {
      updateParams({ kabupaten: suggestion.value, search: '', page: 1 })
    } else if (suggestion.type === 'kecamatan') {
      updateParams({ kecamatan: suggestion.value, search: '', page: 1 })
    } else if (suggestion.type === 'sales') {
      updateParams({ 
        id_sales: suggestion.metadata?.id_sales?.toString(), 
        search: '', 
        page: 1 
      })
    }
  }, [updateParams])

  // Handle filter changes
  const handleFilterChange = useCallback((filters: Record<string, string>) => {
    if (Object.keys(filters).length === 0) {
      updateParams({
        status: '',
        id_sales: '',
        kabupaten: '',
        kecamatan: '',
        search: '',
        page: 1
      })
    } else {
      updateParams({ ...filters, page: 1 })
    }
  }, [updateParams])

  // Handle delete
  const handleDelete = useCallback((toko: TokoWithStats) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus toko "${toko.nama_toko}"?`)) {
      deleteTokoMutation.mutate(toko.id_toko, {
        onSuccess: () => {
          toast({
            title: "Berhasil",
            description: `Toko "${toko.nama_toko}" berhasil dihapus`,
          })
          invalidate.invalidateLists()
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error.message || "Gagal menghapus toko",
            variant: "destructive",
          })
        }
      })
    }
  }, [deleteTokoMutation, toast, invalidate])

  // Handle view
  const handleView = useCallback((toko: TokoWithStats) => {
    navigate(`/dashboard/master-data/toko/${toko.id_toko}`)
  }, [navigate])

  // Handle edit
  const handleEdit = useCallback((toko: TokoWithStats) => {
    navigate(`/dashboard/master-data/toko/${toko.id_toko}/edit`)
  }, [navigate])

  // Handle export
  const handleExport = useCallback(() => {
    if (!data?.data) return
    
    const result = exportStoreData(data.data)
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
    navigate('/dashboard/master-data/toko/add')
  }, [navigate])

  // Current filters for display
  const currentFilters = useMemo(() => {
    const filters: Record<string, string> = {}
    if (params.status) filters.status_toko = params.status
    if (params.id_sales) filters.id_sales = params.id_sales
    if (params.kabupaten) filters.kabupaten = params.kabupaten
    if (params.kecamatan) filters.kecamatan = params.kecamatan
    return filters
  }, [params])

  // Summary statistics with safe defaults
  const summary = data?.summary

  return (
    <motion.div 
      variants={pageVariants}
      initial="hidden"
      animate="visible" 
      className="p-6 space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={cardVariants} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Daftar Toko</h1>
          <p className="text-gray-600 mt-2">
            {summary ? 
              `${formatNumber(summary.total_stores)} toko tersebar di ${formatNumber(summary.unique_kabupaten)} kabupaten dan ${formatNumber(summary.unique_kecamatan)} kecamatan` :
              "Memuat data toko..."
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleExport} variant="outline" size="lg">
            Export Excel
          </Button>
          <Button onClick={handleAdd} size="lg">
            Tambah Toko
          </Button>
        </div>
      </motion.div>

      {/* Integrated Data Table Card */}
      <motion.div 
        variants={cardVariants} 
        className="bg-white rounded-lg border shadow-sm overflow-hidden"
      >
        {/* Search and Filter Section */}
        <div className="p-6 border-b bg-gray-50">
          <SearchFilterToko
            value={params.search || ''}
            onChange={handleSearchChange}
            onFilterChange={handleFilterChange}
            suggestions={suggestions}
            suggestionsLoading={suggestionsLoading}
            filterOptions={filterOptions}
            activeFilters={currentFilters}
            placeholder="Cari toko, lokasi, sales, nomor telepon..."
            onSuggestionSelect={handleSuggestionSelect}
          />
        </div>

        {/* Data Table Section */}
        <div className="flex flex-col">
          <TokoDataTable
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