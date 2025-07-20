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
  XCircle,
  Truck,
  DollarSign,
  Warehouse
} from 'lucide-react'

import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
          <div className="text-left">
            <div className="font-medium text-gray-900 truncate">{toko.nama_toko}</div>
            {toko.link_gmaps && (
              <a 
                href={toko.link_gmaps} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 mt-1"
              >
                <ExternalLink className="w-3 h-3" />
                Lihat di Maps
              </a>
            )}
          </div>
        )
      },
      size: 180,
      minSize: 160,
      maxSize: 220,
      meta: { priority: 'high', columnType: 'description' },
    },
    {
      accessorKey: 'kabupaten',
      header: 'Kabupaten',
      cell: ({ row }) => {
        const toko = row.original
        return (
          <div className="text-left">
            <span className="text-sm text-gray-900">
              {toko.kabupaten || '-'}
            </span>
          </div>
        )
      },
      size: 140,
      minSize: 120,
      maxSize: 160,
      meta: { priority: 'medium', columnType: 'location' },
    },
    {
      accessorKey: 'kecamatan',
      header: 'Kecamatan',
      cell: ({ row }) => {
        const toko = row.original
        return (
          <div className="text-left">
            <span className="text-sm text-gray-900">
              {toko.kecamatan || '-'}
            </span>
          </div>
        )
      },
      size: 140,
      minSize: 120,
      maxSize: 160,
      meta: { priority: 'medium', columnType: 'location' },
    },
    {
      accessorKey: 'nomor_telepon',
      header: 'Nomor Telepon',
      cell: ({ row }) => {
        const toko = row.original
        const phoneNumber = toko.nomor_telepon || toko.no_telepon || toko.telepon
        
        return (
          <div className="text-left">
            {phoneNumber ? (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-600" />
                <a 
                  href={`tel:${phoneNumber}`}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {phoneNumber}
                </a>
              </div>
            ) : (
              <span className="text-sm text-gray-400 italic">Tidak tersedia</span>
            )}
          </div>
        )
      },
      size: 150,
      minSize: 130,
      maxSize: 170,
      meta: { priority: 'medium', columnType: 'contact' },
    },
    {
      accessorKey: 'sales_info',
      header: 'Sales Penanggung Jawab',
      cell: ({ row }) => {
        const toko = row.original
        
        return (
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900 truncate">
              {(toko as any).nama_sales || 'Sales tidak tersedia'}
            </div>
            <div className="text-xs text-gray-500">
              ID Sales: {toko.id_sales}
            </div>
          </div>
        )
      },
      size: 170,
      minSize: 150,
      maxSize: 200,
      meta: { priority: 'medium', columnType: 'name' },
    },
    {
      accessorKey: 'status_toko',
      header: 'Status Toko',
      cell: ({ row }) => {
        const toko = row.original
        return (
          <div className="text-left">
            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
              toko.status_toko 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {toko.status_toko ? 'Aktif' : 'Tidak Aktif'}
            </span>
          </div>
        )
      },
      size: 120,
      minSize: 100,
      maxSize: 140,
      meta: { priority: 'medium', columnType: 'status' },
    },
    {
      accessorKey: 'barang_terkirim',
      header: 'Barang Terkirim',
      cell: ({ row }) => {
        const toko = row.original
        const tooltipContent = useMemo(() => {
          if (!toko.detail_barang_terkirim || toko.detail_barang_terkirim.length === 0) {
            return <p className="text-sm text-gray-500">Belum ada barang terkirim</p>
          }
          return (
            <div className="space-y-1">
              {toko.detail_barang_terkirim.map((item: any, index: number) => (
                <div key={`${toko.id_toko}-terkirim-${index}`} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.nama_produk}</span>
                  <span className="font-medium">{formatNumber(item.jumlah)}</span>
                </div>
              ))}
              <div className="border-t pt-1 mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>{formatNumber(toko.barang_terkirim)}</span>
                </div>
              </div>
            </div>
          )
        }, [toko.detail_barang_terkirim, toko.barang_terkirim, toko.id_toko])
        
        return (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <div className="text-left flex items-center gap-2 cursor-help">
                <Truck className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-blue-600">{formatNumber(toko.barang_terkirim)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-xs">
                <p className="font-semibold mb-2">Barang Terkirim ke {toko.nama_toko}</p>
                {tooltipContent}
              </div>
            </TooltipContent>
          </Tooltip>
        )
      },
      size: 140,
      minSize: 120,
      maxSize: 160,
      meta: { priority: 'medium', columnType: 'stats', hideOnMobile: true },
    },
    {
      accessorKey: 'barang_terbayar',
      header: 'Barang Terbayar',
      cell: ({ row }) => {
        const toko = row.original
        const tooltipContent = useMemo(() => {
          if (!toko.detail_barang_terbayar || toko.detail_barang_terbayar.length === 0) {
            return <p className="text-sm text-gray-500">Belum ada barang terbayar</p>
          }
          return (
            <div className="space-y-1">
              {toko.detail_barang_terbayar.map((item: any, index: number) => (
                <div key={`${toko.id_toko}-terbayar-${index}`} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.nama_produk}</span>
                  <span className="font-medium">{formatNumber(item.jumlah)}</span>
                </div>
              ))}
              <div className="border-t pt-1 mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>{formatNumber(toko.barang_terbayar)}</span>
                </div>
              </div>
            </div>
          )
        }, [toko.detail_barang_terbayar, toko.barang_terbayar, toko.id_toko])
        
        return (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <div className="text-left flex items-center gap-2 cursor-help">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="font-medium text-green-600">{formatNumber(toko.barang_terbayar)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-xs">
                <p className="font-semibold mb-2">Barang Terbayar dari {toko.nama_toko}</p>
                {tooltipContent}
              </div>
            </TooltipContent>
          </Tooltip>
        )
      },
      size: 140,
      minSize: 120,
      maxSize: 160,
      meta: { priority: 'medium', columnType: 'stats', hideOnMobile: true },
    },
    {
      accessorKey: 'sisa_stok',
      header: 'Sisa Stok',
      cell: ({ row }) => {
        const toko = row.original
        const tooltipContent = useMemo(() => {
          if (!toko.detail_sisa_stok || toko.detail_sisa_stok.length === 0) {
            return <p className="text-sm text-gray-500">Tidak ada sisa stok</p>
          }
          return (
            <div className="space-y-1">
              {toko.detail_sisa_stok.map((item: any, index: number) => (
                <div key={`${toko.id_toko}-stok-${index}`} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.nama_produk}</span>
                  <span className="font-medium">{formatNumber(item.jumlah)}</span>
                </div>
              ))}
              <div className="border-t pt-1 mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>{formatNumber(toko.sisa_stok)}</span>
                </div>
              </div>
            </div>
          )
        }, [toko.detail_sisa_stok, toko.sisa_stok, toko.id_toko])
        
        return (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <div className="text-left flex items-center gap-2 cursor-help">
                <Warehouse className="h-4 w-4 text-orange-500" />
                <span className="font-medium text-orange-600">{formatNumber(toko.sisa_stok)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-xs">
                <p className="font-semibold mb-2">Sisa Stok di {toko.nama_toko}</p>
                {tooltipContent}
              </div>
            </TooltipContent>
          </Tooltip>
        )
      },
      size: 120,
      minSize: 100,
      maxSize: 140,
      meta: { priority: 'medium', columnType: 'stats', hideOnMobile: true },
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
    <TooltipProvider>
      <motion.div 
        variants={pageVariants}
        initial="hidden"
        animate="visible" 
        className="p-6 space-y-6 w-full max-w-full overflow-hidden"
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
        className="bg-white rounded-lg border shadow-sm w-full max-w-full overflow-hidden"
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
        <div className="w-full">
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
    </TooltipProvider>
  )
}