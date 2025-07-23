'use client'

import React, { useMemo, useCallback, useState } from 'react'
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
  Warehouse,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react'

import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSalesOptionsQuery, useKabupatenOptionsQuery, useKecamatanOptionsQuery } from '@/lib/queries/dashboard'
import { useNavigation } from '@/lib/hooks/use-navigation'

import { DataTableAdvanced as DataTableToko } from '@/components/data-tables'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useMasterTokoQuery, type MasterToko } from '@/lib/queries/dashboard'
import { useDeleteTokoMutation } from '@/lib/queries/toko'
import { exportStoreData } from '@/lib/excel-export'
import { apiClient } from '@/lib/api-client'

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

// Helper function to parse product details
function parseProductDetails(detailString: string): Array<{name: string, quantity: number}> {
  if (!detailString) return []
  
  try {
    // Expected format: "Produk A [200], Produk B [300]"
    const products = detailString.split(', ').map(item => {
      const match = item.match(/^(.+?)\s*\[(\d+)\]$/)
      if (match) {
        return {
          name: match[1].trim(),
          quantity: parseInt(match[2])
        }
      }
      return null
    }).filter(Boolean)
    
    return products as Array<{name: string, quantity: number}>
  } catch (error) {
    return []
  }
}

// Product detail tooltip component
function ProductDetailTooltip({ 
  children, 
  detailString, 
  title 
}: { 
  children: React.ReactNode
  detailString?: string
  title: string
}) {
  const products = parseProductDetails(detailString || '')
  
  if (products.length === 0) {
    return <>{children}</>
  }
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="cursor-help">
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-2">
          <div className="font-semibold text-sm">{title}</div>
          <div className="space-y-1">
            {products.map((product, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="text-gray-700">{product.name}</span>
                <span className="font-medium">{formatNumber(product.quantity)}</span>
              </div>
            ))}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

// Calculate remaining stock details from shipped and sold details
function calculateRemainingStockDetails(detailShipped?: string, detailSold?: string): Array<{name: string, quantity: number}> {
  const shippedProducts = parseProductDetails(detailShipped || '')
  const soldProducts = parseProductDetails(detailSold || '')
  
  // Create a map of product quantities
  const productMap = new Map<string, number>()
  
  // Add shipped quantities
  shippedProducts.forEach(product => {
    productMap.set(product.name, (productMap.get(product.name) || 0) + product.quantity)
  })
  
  // Subtract sold quantities
  soldProducts.forEach(product => {
    productMap.set(product.name, (productMap.get(product.name) || 0) - product.quantity)
  })
  
  // Convert back to array and filter out zero or negative quantities
  const remainingStock = Array.from(productMap.entries())
    .map(([name, quantity]) => ({ name, quantity }))
    .filter(product => product.quantity > 0)
    .sort((a, b) => a.name.localeCompare(b.name))
  
  return remainingStock
}

// Remaining stock tooltip component
function RemainingStockTooltip({ 
  children, 
  detailShipped, 
  detailSold,
  title 
}: { 
  children: React.ReactNode
  detailShipped?: string
  detailSold?: string
  title: string
}) {
  const remainingProducts = calculateRemainingStockDetails(detailShipped, detailSold)
  
  if (remainingProducts.length === 0) {
    return <>{children}</>
  }
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="cursor-help">
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-2">
          <div className="font-semibold text-sm">{title}</div>
          <div className="space-y-1">
            {remainingProducts.map((product, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="text-gray-700">{product.name}</span>
                <span className="font-medium">{formatNumber(product.quantity)}</span>
              </div>
            ))}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

// Filter types
interface TokoFilters {
  search: string
  kabupaten: string
  kecamatan: string
  status_toko: string
  sales_id: string
}

// Filter component
function TokoFilterPanel({ 
  filters, 
  onFiltersChange,
  onClearFilters,
  isLoading
}: {
  filters: TokoFilters
  onFiltersChange: (filters: Partial<TokoFilters>) => void
  onClearFilters: () => void
  isLoading: boolean
}) {
  const { data: kabupatenOptions } = useKabupatenOptionsQuery()
  const { data: kecamatanOptions } = useKecamatanOptionsQuery(filters.kabupaten)
  const { data: salesOptions } = useSalesOptionsQuery()
  
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
                placeholder="Cari toko, sales, lokasi, telepon..."
                value={filters.search}
                onChange={(e) => onFiltersChange({ search: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          {/* Sales Filter */}
          <div className="min-w-[150px]">
            <Select
              value={filters.sales_id}
              onValueChange={(value) => onFiltersChange({ sales_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Sales</SelectItem>
                {salesOptions?.data?.map((sales: any) => (
                  <SelectItem key={sales.id_sales} value={sales.id_sales.toString()}>
                    {sales.nama_sales}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Kabupaten Filter */}
          <div className="min-w-[150px]">
            <Select
              value={filters.kabupaten}
              onValueChange={(value) => onFiltersChange({ kabupaten: value, kecamatan: 'all' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kabupaten" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {kabupatenOptions?.data?.map((kab: any) => (
                  <SelectItem key={kab.kabupaten} value={kab.kabupaten}>
                    {kab.kabupaten}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Kecamatan Filter */}
          <div className="min-w-[150px]">
            <Select
              value={filters.kecamatan}
              onValueChange={(value) => onFiltersChange({ kecamatan: value })}
              disabled={!filters.kabupaten || filters.kabupaten === 'all'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kecamatan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {kecamatanOptions?.data?.map((kec: any) => (
                  <SelectItem key={kec.kecamatan} value={kec.kecamatan}>
                    {kec.kecamatan}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="min-w-[150px]">
            <Select
              value={filters.status_toko}
              onValueChange={(value) => onFiltersChange({ status_toko: value })}
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

          {/* Clear Filters Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            disabled={!hasActiveFilters || isLoading}
            className="p-2"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
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
  onDelete: (toko: MasterToko) => void
  onView: (toko: MasterToko) => void
  onEdit: (toko: MasterToko) => void
}) {
  // Define table columns
  const columns = useMemo<ColumnDef<MasterToko>[]>(() => [
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
      accessorKey: 'no_telepon',
      header: 'Nomor Telepon',
      cell: ({ row }) => {
        const toko = row.original
        const phoneNumber = toko.no_telepon
        
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
              {toko.nama_sales || 'Sales tidak tersedia'}
            </div>
            <div className="text-xs text-gray-500">
              {toko.telepon_sales ? `Tel: ${toko.telepon_sales}` : 'Tidak ada telepon'}
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
      accessorKey: 'quantity_shipped',
      header: 'Barang Dikirim',
      cell: ({ row }) => {
        const toko = row.original
        return (
          <ProductDetailTooltip 
            detailString={toko.detail_shipped} 
            title="Detail Barang Dikirim"
          >
            <div className="text-left flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-sm font-medium text-blue-600">
                  {formatNumber(toko.quantity_shipped || 0)}
                </div>
                <div className="text-xs text-gray-500">
                  total dikirim
                </div>
              </div>
            </div>
          </ProductDetailTooltip>
        )
      },
      size: 140,
      minSize: 120,
      maxSize: 160,
      meta: { priority: 'medium', columnType: 'stats', hideOnMobile: true },
    },
    {
      accessorKey: 'quantity_sold',
      header: 'Barang Terjual',
      cell: ({ row }) => {
        const toko = row.original
        return (
          <ProductDetailTooltip 
            detailString={toko.detail_sold} 
            title="Detail Barang Terjual"
          >
            <div className="text-left flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-sm font-medium text-green-600">
                  {formatNumber(toko.quantity_sold || 0)}
                </div>
                <div className="text-xs text-gray-500">
                  total terjual
                </div>
              </div>
            </div>
          </ProductDetailTooltip>
        )
      },
      size: 140,
      minSize: 120,
      maxSize: 160,
      meta: { priority: 'medium', columnType: 'stats', hideOnMobile: true },
    },
    {
      accessorKey: 'remaining_stock',
      header: 'Sisa Stok',
      cell: ({ row }) => {
        const toko = row.original
        return (
          <RemainingStockTooltip 
            detailShipped={toko.detail_shipped}
            detailSold={toko.detail_sold}
            title="Detail Sisa Stok"
          >
            <div className="text-left flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-sm font-medium text-orange-600">
                  {formatNumber(toko.remaining_stock || 0)}
                </div>
                <div className="text-xs text-gray-500">
                  sisa stok
                </div>
              </div>
            </div>
          </RemainingStockTooltip>
        )
      },
      size: 120,
      minSize: 100,
      maxSize: 140,
      meta: { priority: 'medium', columnType: 'stats', hideOnMobile: true },
    },
    {
      accessorKey: 'total_revenue',
      header: 'Total Pendapatan',
      cell: ({ row }) => {
        const toko = row.original
        return (
          <div className="text-left flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-purple-500" />
            <div>
              <div className="text-sm font-medium text-purple-600">
                Rp {formatNumber(toko.total_revenue || 0)}
              </div>
              <div className="text-xs text-gray-500">
                pendapatan
              </div>
            </div>
          </div>
        )
      },
      size: 150,
      minSize: 130,
      maxSize: 170,
      meta: { priority: 'low', columnType: 'stats', hideOnMobile: true },
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

  // Filter and pagination state
  const [filters, setFilters] = useState({
    search: '',
    kabupaten: 'all',
    kecamatan: 'all',
    status_toko: 'all',
    sales_id: 'all'
  })
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25
  })

  // Query parameters for API
  const queryParams = useMemo(() => {
    const params: any = {
      page: pagination.page,
      limit: pagination.limit
    }
    
    // Only add defined filter values
    if (filters.search.trim()) {
      params.search = filters.search.trim()
    }
    if (filters.kabupaten !== 'all') {
      params.kabupaten = filters.kabupaten
    }
    if (filters.kecamatan !== 'all') {
      params.kecamatan = filters.kecamatan
    }
    if (filters.status_toko !== 'all') {
      params.status_toko = filters.status_toko
    }
    if (filters.sales_id !== 'all') {
      params.sales_id = filters.sales_id
    }
    
    return params
  }, [filters, pagination])

  // Use paginated query
  const { data: masterData, isLoading, error, refetch } = useMasterTokoQuery(queryParams)
  
  // Transform data for compatibility with existing table component
  const data = {
    data: masterData?.data?.data || [],
    pagination: masterData?.data?.pagination ? {
      hasNextPage: masterData.data.pagination.hasNextPage,
      hasPrevPage: masterData.data.pagination.hasPrevPage,
      totalPages: masterData.data.pagination.totalPages,
      currentPage: masterData.data.pagination.page,
      pageSize: masterData.data.pagination.limit,
      total: masterData.data.pagination.total,
      totalItems: masterData.data.pagination.total,
      totalRecords: masterData.data.pagination.total,
      limit: masterData.data.pagination.limit,
      page: masterData.data.pagination.page,
      from: masterData.data.pagination.from,
      to: masterData.data.pagination.to
    } : {
      hasNextPage: false,
      hasPrevPage: false,
      totalPages: 1,
      currentPage: 1,
      pageSize: 25,
      total: 0,
      totalItems: 0,
      totalRecords: 0,
      limit: 25,
      page: 1,
      from: 0,
      to: 0
    }
  }

  // Filter handlers
  const handleFiltersChange = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    // Reset to page 1 when filters change
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      kabupaten: 'all',
      kecamatan: 'all', 
      status_toko: 'all',
      sales_id: 'all'
    })
    // Reset to page 1 when clearing filters
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])
  
  // Pagination handlers
  const updateParams = useCallback((newParams: { page?: number }) => {
    if (newParams.page !== undefined) {
      setPagination(prev => ({ ...prev, page: newParams.page! }))
    }
  }, [])

  // Handle delete
  const handleDelete = useCallback((toko: MasterToko) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus toko "${toko.nama_toko}"?`)) {
      deleteTokoMutation.mutate(toko.id_toko, {
        onSuccess: () => {
          toast({
            title: "Berhasil",
            description: `Toko "${toko.nama_toko}" berhasil dihapus`,
          })
          refetch()
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
  }, [deleteTokoMutation, toast, refetch])

  // Handle view
  const handleView = useCallback((toko: MasterToko) => {
    navigate(`/dashboard/master-data/toko/${toko.id_toko}`)
  }, [navigate])

  // Handle edit
  const handleEdit = useCallback((toko: MasterToko) => {
    navigate(`/dashboard/master-data/toko/${toko.id_toko}/edit`)
  }, [navigate])

  // Handle export - fetch all data for export
  const handleExport = useCallback(async () => {
    try {
      // Fetch all data with current filters but no pagination limit
      const exportParams = {
        ...filters,
        kabupaten: filters.kabupaten === 'all' ? undefined : filters.kabupaten,
        kecamatan: filters.kecamatan === 'all' ? undefined : filters.kecamatan,
        status_toko: filters.status_toko === 'all' ? undefined : filters.status_toko,
        search: filters.search.trim() || undefined,
        limit: 10000, // Large limit to get all data
        page: 1
      }
      
      const exportData = await apiClient.getMasterToko(exportParams) as any
      
      if (exportData?.data?.data) {
        const result = exportStoreData(exportData.data.data)
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
      } else {
        throw new Error('Gagal mengambil data untuk export')
      }
    } catch (error: any) {
      toast({
        title: "Export Gagal",
        description: error.message || "Terjadi kesalahan saat export",
        variant: "destructive",
      })
    }
  }, [filters, toast])

  // Handle add new
  const handleAdd = useCallback(() => {
    navigate('/dashboard/master-data/toko/add')
  }, [navigate])

  // Summary statistics for header display only
  const summary = {
    total_stores: data.pagination.total,
    displayed_stores: data.data.length,
    unique_kabupaten: new Set(data.data.map(t => t.kabupaten)).size,
    unique_kecamatan: new Set(data.data.map(t => t.kecamatan)).size
  }

  return (
    <TooltipProvider>
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
            <h1 className="text-3xl font-bold text-gray-900">Daftar Toko</h1>
            <p className="text-gray-600 mt-2">
              Menampilkan {formatNumber(data.pagination.from)}-{formatNumber(data.pagination.to)} dari {formatNumber(summary.total_stores)} toko
              {data.pagination.totalPages > 1 && ` (halaman ${data.pagination.page} dari ${data.pagination.totalPages})`}
              {summary.displayed_stores > 0 && ` tersebar di ${formatNumber(summary.unique_kabupaten)} kabupaten dan ${formatNumber(summary.unique_kecamatan)} kecamatan`}
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
              Tambah Toko
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Filter Panel */}
      <motion.div variants={cardVariants}>
        <TokoFilterPanel
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
          <TokoDataTable
            data={data}
            isLoading={isLoading}
            error={error}
            refetch={refetch}
            params={pagination}
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