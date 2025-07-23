'use client'

import React, { useMemo, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Eye,
  Edit,
  Trash2,
  Star,
  Package,
  DollarSign,
  TrendingUp,
  Activity,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react'

import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useNavigation } from '@/lib/hooks/use-navigation'

import { DataTableAdvanced as DataTableToko } from '@/components/data-tables'
import { useMasterProdukQuery, type MasterProduk } from '@/lib/queries/dashboard'
import { formatCurrency } from '@/lib/form-utils'

// Page animations (identical to penagihan)
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

// Helper function to format numbers
function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num)
}

// Filter types
interface ProdukFilters {
  search: string
  status_produk: string
  is_priority: string
}

// Filter component
function ProdukFilterPanel({ 
  filters, 
  onFiltersChange,
  onClearFilters,
  isLoading
}: {
  filters: ProdukFilters
  onFiltersChange: (filters: Partial<ProdukFilters>) => void
  onClearFilters: () => void
  isLoading: boolean
}) {
  const hasActiveFilters = Object.values(filters).some(value => value && value !== 'all')

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search Input */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Cari produk..."
                value={filters.search}
                onChange={(e) => onFiltersChange({ search: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="min-w-[150px]">
            <Select
              value={filters.status_produk}
              onValueChange={(value) => onFiltersChange({ status_produk: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="true">Aktif</SelectItem>
                <SelectItem value="false">Tidak Aktif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority Filter */}
          <div className="min-w-[150px]">
            <Select
              value={filters.is_priority}
              onValueChange={(value) => onFiltersChange({ is_priority: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="true">Priority</SelectItem>
                <SelectItem value="false">Non-Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            disabled={!hasActiveFilters || isLoading}
            className="p-2"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Data table component
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
  onDelete: (produk: MasterProduk) => void
  onView: (produk: MasterProduk) => void
  onEdit: (produk: MasterProduk) => void
}) {
  // Define responsive columns with balanced sizing and left alignment
  const columns = useMemo<ColumnDef<MasterProduk>[]>(() => [
    {
      accessorKey: 'nama_produk',
      header: 'Nama Produk',
      cell: ({ row }) => {
        const produk = row.original
        return (
          <div className="text-left">
            <div className="flex items-center gap-2">
              {produk.is_priority && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              )}
              <div className="font-medium text-gray-900 truncate">
                {produk.nama_produk || 'Unknown Product'}
              </div>
            </div>
            <div className="text-xs text-gray-500">
              ID: {produk.id_produk || 'N/A'}
            </div>
          </div>
        )
      },
      size: 200,
      minSize: 180,
      maxSize: 250,
      meta: { priority: 'high', columnType: 'name' },
    },
    {
      accessorKey: 'harga_satuan',
      header: 'Harga Satuan',
      cell: ({ row }) => {
        const produk = row.original
        return (
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">
              {formatCurrency(produk.harga_satuan || 0)}
            </div>
          </div>
        )
      },
      size: 140,
      minSize: 120,
      maxSize: 160,
      meta: { priority: 'high', columnType: 'currency' },
    },
    {
      accessorKey: 'status_produk',
      header: 'Status',
      cell: ({ row }) => {
        const produk = row.original
        return (
          <div className="text-left">
            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
              produk.status_produk 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {produk.status_produk ? 'Aktif' : 'Tidak Aktif'}
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
      accessorKey: 'total_dikirim',
      header: 'Total Dikirim',
      cell: ({ row }) => {
        const produk = row.original
        return (
          <div className="text-left flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-500" />
            <div>
              <div className="text-sm font-medium text-blue-600">
                {formatNumber(produk.total_dikirim || 0)}
              </div>
              <div className="text-xs text-gray-500">
                Nilai: {formatCurrency(produk.nilai_total_dikirim || (produk.total_dikirim || 0) * (produk.harga_satuan || 0))}
              </div>
            </div>
          </div>
        )
      },
      size: 140,
      minSize: 120,
      maxSize: 160,
      meta: { priority: 'medium', columnType: 'stats' },
    },
    {
      accessorKey: 'total_terjual',
      header: 'Total Terjual',
      cell: ({ row }) => {
        const produk = row.original
        return (
          <div className="text-left flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <div>
              <div className="text-sm font-medium text-green-600">
                {formatNumber(produk.total_terjual || 0)}
              </div>
              <div className="text-xs text-gray-500">
                Nilai: {formatCurrency(produk.nilai_total_terjual || (produk.total_terjual || 0) * (produk.harga_satuan || 0))}
              </div>
            </div>
          </div>
        )
      },
      size: 140,
      minSize: 120,
      maxSize: 160,
      meta: { priority: 'medium', columnType: 'stats' },
    },
    {
      accessorKey: 'stok_di_toko',
      header: 'Sisa Stok',
      cell: ({ row }) => {
        const produk = row.original
        return (
          <div className="text-left flex items-center gap-2">
            <Activity className={`h-4 w-4 ${
              (produk.stok_di_toko || 0) < 0 ? 'text-red-500' : 
              (produk.stok_di_toko || 0) === 0 ? 'text-yellow-500' :
              'text-green-500'
            }`} />
            <div>
              <div className={`text-sm font-medium ${
                (produk.stok_di_toko || 0) < 0 ? 'text-red-600' : 
                (produk.stok_di_toko || 0) === 0 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {formatNumber(produk.stok_di_toko || 0)}
              </div>
              <div className="text-xs text-gray-500">
                Return: {formatNumber(produk.total_dikembalikan || 0)}
              </div>
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
      accessorKey: 'total_dibayar',
      header: 'Total Dibayar',
      cell: ({ row }) => {
        const produk = row.original
        return (
          <div className="text-left flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-purple-500" />
            <div>
              <div className="text-sm font-medium text-purple-600">
                {formatCurrency(produk.total_dibayar || 0)}
              </div>
              <div className="text-xs text-gray-500">
                Cash: {formatCurrency(produk.total_dibayar_cash || produk.total_dibayar || 0)}
              </div>
            </div>
          </div>
        )
      },
      size: 150,
      minSize: 130,
      maxSize: 170,
      meta: { priority: 'medium', columnType: 'stats' },
    },
  ], [])

  // Handle pagination (identical to penagihan)
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

  // Table actions (identical to penagihan)
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

  // Filter and pagination state
  const [filters, setFilters] = useState<ProdukFilters>({
    search: '',
    status_produk: 'all',
    is_priority: 'all'
  })
  
  const [page, setPage] = useState(1)
  const limit = 30

  // Use dashboard query with server-side filtering and pagination
  const { data: masterData, isLoading, error, refetch } = useMasterProdukQuery({
    page,
    limit,
    ...filters
  })
  
  // Transform data for compatibility with existing table component
  const data = {
    data: masterData?.data?.data || [],
    pagination: masterData?.data?.pagination ? {
      hasNextPage: masterData.data.pagination.has_next,
      hasPrevPage: masterData.data.pagination.has_prev,
      totalPages: masterData.data.pagination.total_pages,
      currentPage: masterData.data.pagination.page,
      pageSize: masterData.data.pagination.limit,
      total: masterData.data.pagination.total,
      totalItems: masterData.data.pagination.total,
      totalRecords: masterData.data.pagination.total,
      limit: masterData.data.pagination.limit,
      page: masterData.data.pagination.page,
      from: ((masterData.data.pagination.page - 1) * masterData.data.pagination.limit) + 1,
      to: Math.min(masterData.data.pagination.page * masterData.data.pagination.limit, masterData.data.pagination.total)
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
  const handleFiltersChange = useCallback((newFilters: Partial<ProdukFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPage(1) // Reset to first page when filters change
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      status_produk: 'all',
      is_priority: 'all'
    })
    setPage(1) // Reset to first page when clearing filters
  }, [])

  // Handle delete
  const handleDelete = useCallback((produk: MasterProduk) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus produk "${produk.nama_produk}"?`)) {
      // Note: We would need to implement delete mutation for produk
      console.log('Delete produk:', produk.id_produk)
      toast({
        title: "Info",
        description: "Fitur hapus produk belum diimplementasi",
        variant: "destructive",
      })
    }
  }, [toast])

  // Handle view
  const handleView = useCallback((produk: MasterProduk) => {
    navigate(`/dashboard/master-data/produk/${produk.id_produk}`)
  }, [navigate])

  // Handle edit
  const handleEdit = useCallback((produk: MasterProduk) => {
    navigate(`/dashboard/master-data/produk/${produk.id_produk}/edit`)
  }, [navigate])

  // Handle export
  const handleExport = useCallback(() => {
    if (!data?.data) return
    
    // Note: We would need to implement export for produk
    console.log('Export produk data:', data.data)
    toast({
      title: "Info",
      description: "Fitur export produk belum diimplementasi",
    })
  }, [data?.data, toast])

  // Handle add new
  const handleAdd = useCallback(() => {
    navigate('/dashboard/master-data/produk/add')
  }, [navigate])

  // Summary statistics for header display only
  const summary = {
    total_produk: data.pagination.total || 0,
    current_page_count: data.data.length,
    total_pages: data.pagination.totalPages,
    produk_aktif: data.data.filter(p => p.status_produk).length || 0,
    produk_priority: data.data.filter(p => p.is_priority).length || 0,
    total_dikirim: data.data.reduce((sum, p) => sum + (p.total_dikirim || 0), 0) || 0,
    total_terjual: data.data.reduce((sum, p) => sum + (p.total_terjual || 0), 0) || 0,
    sisa_stok_total: data.data.reduce((sum, p) => sum + (p.stok_di_toko || 0), 0) || 0
  }

  // Show error state if data fetch fails
  if (error && !isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h2>
          <p className="text-red-700 mb-4">{error.message || 'Failed to load product data'}</p>
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      variants={pageVariants}
      initial="hidden"
      animate="visible" 
      className="p-6 space-y-6 w-full max-w-full overflow-hidden"
    >
      {/* Page Header with Enhanced Statistics */}
      <motion.div variants={cardVariants} className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Daftar Produk</h1>
            <p className="text-gray-600 mt-2">
              Menampilkan {summary.current_page_count} dari {formatNumber(summary.total_produk)} produk 
              (Halaman {data.pagination.currentPage} dari {summary.total_pages}) dengan {formatNumber(summary.produk_aktif)} aktif, {formatNumber(summary.produk_priority)} priority, {formatNumber(summary.total_dikirim)} dikirim, {formatNumber(summary.total_terjual)} terjual, dan sisa stok {formatNumber(summary.sisa_stok_total)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleExport} variant="outline" size="lg">
              Export Excel
            </Button>
            <Button 
              onClick={refetch} 
              variant="outline" 
              size="lg"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleAdd} size="lg">
              Tambah Produk
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Filter Panel */}
      <motion.div variants={cardVariants}>
        <ProdukFilterPanel
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
          isLoading={isLoading}
        />
      </motion.div>

      {/* Integrated Data Table Card */}
      <motion.div 
        variants={cardVariants} 
        className="bg-white rounded-lg border shadow-sm w-full max-w-full overflow-hidden"
      >
        {/* Data Table Section with filtering */}
        <div className="w-full">
          <ProdukDataTable
            data={data}
            isLoading={isLoading}
            error={error}
            refetch={refetch}
            params={{ page }}
            updateParams={(newParams: any) => {
              if (newParams.page) {
                setPage(newParams.page)
              }
            }}
            onDelete={handleDelete}
            onView={handleView}
            onEdit={handleEdit}
          />
        </div>
      </motion.div>
    </motion.div>
  )
}