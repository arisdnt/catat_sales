'use client'

import React, { useMemo, useCallback, useState } from 'react'
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
  Package,
  Search,
  Filter,
  RefreshCw,
  Phone
} from 'lucide-react'

import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigation } from '@/lib/hooks/use-navigation'

import { DataTableAdvanced as DataTableToko } from '@/components/data-tables'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useMasterSalesQuery, type MasterSales } from '@/lib/queries/dashboard'
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

// Filter types
interface SalesFilters {
  search: string
  status_aktif: string
  telepon_exists: string
}

// Filter component
function SalesFilterPanel({ 
  filters, 
  onFiltersChange,
  onClearFilters,
  isLoading
}: {
  filters: SalesFilters
  onFiltersChange: (filters: Partial<SalesFilters>) => void
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
                placeholder="Cari sales, telepon..."
                value={filters.search}
                onChange={(e) => onFiltersChange({ search: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="min-w-[150px]">
            <Select
              value={filters.status_aktif}
              onValueChange={(value) => onFiltersChange({ status_aktif: value })}
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

          {/* Phone Filter */}
          <div className="min-w-[150px]">
            <Select
              value={filters.telepon_exists}
              onValueChange={(value) => onFiltersChange({ telepon_exists: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Telepon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="true">Ada Telepon</SelectItem>
                <SelectItem value="false">Tanpa Telepon</SelectItem>
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
  onDelete: (sales: MasterSales) => void
  onView: (sales: MasterSales) => void
  onEdit: (sales: MasterSales) => void
}) {
  // Define table columns with optimized compact layout
  const columns = useMemo<ColumnDef<MasterSales>[]>(() => [
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
            {sales.nomor_telepon ? (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-600" />
                <a 
                  href={`tel:${sales.nomor_telepon}`}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {sales.nomor_telepon}
                </a>
              </div>
            ) : (
              <span className="text-sm text-gray-400 italic">Tidak tersedia</span>
            )}
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
      accessorKey: 'total_stores',
      header: 'Total Toko',
      cell: ({ row }) => {
        const sales = row.original
        return (
          <div className="text-left flex items-center gap-2">
            <Store className="h-4 w-4 text-blue-500" />
            <div>
              <div className="text-sm font-medium text-blue-600">
                {formatNumber(sales.total_stores)}
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
      accessorKey: 'quantity_shipped',
      header: 'Barang Dikirim',
      cell: ({ row }) => {
        const sales = row.original
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-left flex items-center gap-2 cursor-help">
                  <Package className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="text-sm font-medium text-blue-600">
                      {formatNumber(sales.quantity_shipped)}
                    </div>
                    <div className="text-xs text-gray-500">
                      barang
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="p-2">
                  <p className="font-semibold text-sm mb-2">Detail Barang Dikirim:</p>
                  <p className="text-xs whitespace-pre-line">
                    {'Detail pengiriman tidak tersedia untuk data sales'}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
      size: 130,
      minSize: 110,
      maxSize: 150,
      meta: { priority: 'high', columnType: 'stats' },
    },
    {
      accessorKey: 'quantity_sold',
      header: 'Barang Terjual',
      cell: ({ row }) => {
        const sales = row.original
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-left flex items-center gap-2 cursor-help">
                  <Package className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="text-sm font-medium text-green-600">
                      {formatNumber(sales.quantity_sold)}
                    </div>
                    <div className="text-xs text-gray-500">
                      barang
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="p-2">
                  <p className="font-semibold text-sm mb-2">Detail Barang Terjual:</p>
                  <p className="text-xs whitespace-pre-line">
                    {'Detail penjualan tidak tersedia untuk data sales'}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
      size: 130,
      minSize: 110,
      maxSize: 150,
      meta: { priority: 'high', columnType: 'stats' },
    },
    {
      accessorKey: 'remaining_stock',
      header: 'Sisa Stok',
      cell: ({ row }) => {
        const sales = row.original
        const remainingStock = (sales.quantity_shipped || 0) - (sales.quantity_sold || 0)
        
        // Parse detail untuk menghitung sisa per produk
        const parseDetail = (detail: string) => {
          if (!detail) return {}
          const items: { [key: string]: number } = {}
          const matches = detail.match(/([^[]+)\[(\d+)\]/g)
          if (matches) {
            matches.forEach(match => {
              const [, name, qty] = match.match(/([^[]+)\[(\d+)\]/) || []
              if (name && qty) {
                items[name.trim()] = parseInt(qty)
              }
            })
          }
          return items
        }

        // Sales summary data doesn't include detailed product breakdown
        const remainingDetails = 'Detail stok tidak tersedia untuk data sales'

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-left flex items-center gap-2 cursor-help">
                  <Package className="h-4 w-4 text-orange-500" />
                  <div>
                    <div className="text-sm font-medium text-orange-600">
                      {formatNumber(remainingStock)}
                    </div>
                    <div className="text-xs text-gray-500">
                      sisa stok
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="p-2">
                  <p className="font-semibold text-sm mb-2">Detail Sisa Stok:</p>
                  <p className="text-xs whitespace-pre-line">
                    {remainingDetails || 'Tidak ada detail tersedia'}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
      size: 120,
      minSize: 100,
      maxSize: 140,
      meta: { priority: 'high', columnType: 'stats' },
    },
    {
      accessorKey: 'total_revenue',
      header: 'Total Revenue',
      cell: ({ row }) => {
        const sales = row.original
        return (
          <div className="text-left flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-purple-500" />
            <div>
              <div className="text-sm font-medium text-purple-600">
                {formatCurrency(sales.total_revenue)}
              </div>
              <div className="text-xs text-gray-500">
                revenue
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

  // Use new dashboard query
  const { data: masterData, isLoading, error, refetch } = useMasterSalesQuery()
  
  // Filter state
  const [filters, setFilters] = useState<SalesFilters>({
    search: '',
    status_aktif: 'all',
    telepon_exists: 'all'
  })
  
  // Apply filters to data
  const filteredData = useMemo(() => {
    if (!masterData?.data) return []
    
    let filtered = [...masterData.data]
    
    // Search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim()
      filtered = filtered.filter(item => 
        item.nama_sales?.toLowerCase().includes(searchTerm) ||
        item.nomor_telepon?.includes(searchTerm) ||
        item.id_sales?.toString().includes(searchTerm)
      )
    }
    
    // Status filter
    if (filters.status_aktif !== 'all') {
      const isActive = filters.status_aktif === 'true'
      filtered = filtered.filter(item => item.status_aktif === isActive)
    }
    
    // Phone filter
    if (filters.telepon_exists !== 'all') {
      const hasPhone = filters.telepon_exists === 'true'
      filtered = filtered.filter(item => hasPhone ? !!item.nomor_telepon : !item.nomor_telepon)
    }
    
    return filtered
  }, [masterData?.data, filters])
  
  // Transform data for compatibility with existing table component
  const dataLength = filteredData?.length || 0
  const data = {
    data: filteredData || [],
    pagination: {
      hasNextPage: false,
      hasPrevPage: false,
      totalPages: 1,
      currentPage: 1,
      pageSize: dataLength || 50,
      total: dataLength,
      totalItems: dataLength,
      totalRecords: dataLength,
      limit: dataLength || 50,
      page: 1,
      from: dataLength > 0 ? 1 : 0,
      to: dataLength
    }
  }

  // Filter handlers
  const handleFiltersChange = useCallback((newFilters: Partial<SalesFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      status_aktif: 'all',
      telepon_exists: 'all'
    })
  }, [])

  // Handle delete
  const handleDelete = useCallback((sales: MasterSales) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus sales "${sales.nama_sales}"?`)) {
      deleteSalesMutation.mutate(sales.id_sales, {
        onSuccess: () => {
          toast({
            title: "Berhasil",
            description: `Sales "${sales.nama_sales}" berhasil dihapus`,
          })
          refetch()
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
  }, [deleteSalesMutation, toast, refetch])

  // Handle view
  const handleView = useCallback((sales: MasterSales) => {
    navigate(`/dashboard/master-data/sales/${sales.id_sales}`)
  }, [navigate])

  // Handle edit
  const handleEdit = useCallback((sales: MasterSales) => {
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

  // Summary statistics for header display only
  const summary = {
    total_sales: filteredData.length,
    active_sales: filteredData.filter(s => s.status_aktif).length,
    total_stores: filteredData.reduce((sum, s) => sum + (Number(s.total_stores) || 0), 0),
    total_shipped_items: filteredData.reduce((sum, s) => sum + (Number(s.quantity_shipped) || 0), 0),
    total_items_sold: filteredData.reduce((sum, s) => sum + (Number(s.quantity_sold) || 0), 0),
    total_remaining_stock: filteredData.reduce((sum, s) => sum + ((Number(s.quantity_shipped) || 0) - (Number(s.quantity_sold) || 0)), 0),
    total_revenue: filteredData.reduce((sum, s) => sum + (Number(s.total_revenue) || 0), 0)
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
            <h1 className="text-3xl font-bold text-gray-900">Daftar Sales</h1>
            <p className="text-gray-600 mt-2">
              Menampilkan {formatNumber(summary.total_sales)} sales 
              {masterData?.data && summary.total_sales !== masterData.data.length && 
                ` dari ${formatNumber(masterData.data.length)} total`
              } dengan {formatNumber(summary.active_sales)} aktif, {formatNumber(summary.total_stores)} toko, {formatNumber(summary.total_shipped_items)} barang terkirim, {formatNumber(summary.total_items_sold)} terjual, sisa stok {formatNumber(summary.total_remaining_stock)}, dan total revenue {formatCurrency(summary.total_revenue)}
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
              Tambah Sales
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Filter Panel */}
      <motion.div variants={cardVariants}>
        <SalesFilterPanel
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
          <SalesDataTable
            data={data}
            isLoading={isLoading}
            error={error}
            refetch={refetch}
            params={{}}
            updateParams={() => {}}
            onDelete={handleDelete}
            onView={handleView}
            onEdit={handleEdit}
          />
        </div>
      </motion.div>
    </motion.div>
  )
}