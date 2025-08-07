'use client'

import React, { useMemo, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Eye,
  Edit,
  Trash2,
  MapPin,
  Package,
  Truck,
  Calendar,
  User,
  ExternalLink,
  PackageOpen,
  Search,
  Filter,
  X,
  RefreshCw
} from 'lucide-react'

import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useNavigation } from '@/lib/hooks/use-navigation'

import { DataTableAdvanced as DataTablePengiriman } from '@/components/data-tables'
import { SearchFilterAdvanced as SearchFilterToko } from '@/components/search'
import { 
  useDashboardPengirimanQuery,
  useSalesOptionsQuery,
  useKabupatenOptionsQuery,
  useKecamatanOptionsQuery,
  useTokoOptionsQuery
} from '@/lib/queries/dashboard'
import { useDeletePengirimanMutation } from '@/lib/queries/pengiriman'
import { exportShipmentData } from '@/lib/excel-export'

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

// Helper function to format numbers
function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num)
}

// Helper function to format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

// Helper function to get date range display text
function getDateRangeDisplay(dateRange: string): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (dateRange) {
    case 'today':
      return `Today (${today.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })})`
    
    case 'week': {
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 6)
      return `${weekAgo.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })} - ${today.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
    }
    
    case 'month': {
      const monthAgo = new Date(today)
      monthAgo.setDate(monthAgo.getDate() - 29)
      return `${monthAgo.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })} - ${today.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
    }
    
    case 'current_month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      return `${firstDay.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })} - ${today.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
    }
    
    case 'last_month': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      return `${lastMonth.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })} - ${lastDayOfLastMonth.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
    }
    
    default:
      return dateRange
  }
}

// Filter types
interface PengirimanFilters {
  search: string
  is_autorestock: string
  sales_id: string
  kabupaten: string
  kecamatan: string
  date_range: 'today' | 'week' | 'month' | 'current_month' | 'last_month' | 'all'
}

// Filter component
function PengirimanFilterPanel({ 
  filters, 
  onFiltersChange,
  onClearFilters,
  isLoading
}: {
  filters: PengirimanFilters
  onFiltersChange: (filters: Partial<PengirimanFilters>) => void
  onClearFilters: () => void
  isLoading: boolean
}) {
  const { data: salesOptions } = useSalesOptionsQuery()
  const { data: kabupatenOptions } = useKabupatenOptionsQuery()
  const { data: kecamatanOptions } = useKecamatanOptionsQuery(filters.kabupaten)
  
  const hasActiveFilters = Boolean(
    filters.search || 
    (filters.date_range && filters.date_range !== 'all') ||
    (filters.sales_id && filters.sales_id !== 'all') ||
    (filters.kabupaten && filters.kabupaten !== 'all') ||
    (filters.kecamatan && filters.kecamatan !== 'all')
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
                placeholder="Cari toko, sales, ID..."
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
                <SelectItem value="current_month">Bulan Ini</SelectItem>
                <SelectItem value="last_month">Bulan Lalu</SelectItem>
                <SelectItem value="all">Semua Data</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sales Filter */}
          <div className="min-w-[160px]">
            <label className="text-sm font-medium">Sales</label>
            <Select
              value={filters.sales_id}
              onValueChange={(value) => onFiltersChange({ sales_id: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Semua sales" />
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
          <div className="min-w-[160px]">
            <label className="text-sm font-medium">Kabupaten</label>
            <Select
              value={filters.kabupaten}
              onValueChange={(value) => onFiltersChange({ kabupaten: value, kecamatan: 'all' })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Semua kabupaten" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kabupaten</SelectItem>
                {kabupatenOptions?.data?.map((kab: any) => (
                  <SelectItem key={kab.kabupaten} value={kab.kabupaten}>
                    {kab.kabupaten}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Kecamatan Filter */}
          <div className="min-w-[160px]">
            <label className="text-sm font-medium">Kecamatan</label>
            <Select
              value={filters.kecamatan}
              onValueChange={(value) => onFiltersChange({ kecamatan: value })}
              disabled={!filters.kabupaten || filters.kabupaten === 'all'}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Semua kecamatan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kecamatan</SelectItem>
                {kecamatanOptions?.data?.map((kec: any) => (
                  <SelectItem key={kec.kecamatan} value={kec.kecamatan}>
                    {kec.kecamatan}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button - Only Trash Icon */}
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              disabled={!hasActiveFilters || isLoading}
              className="px-3 py-2"
              title="Clear Filters"
            >
              <Trash2 className="w-4 h-4" />
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
                  Period: {getDateRangeDisplay(filters.date_range)}
                </Badge>
              )}
              {filters.sales_id && filters.sales_id !== 'all' && (
                <Badge variant="secondary">
                  Sales: {salesOptions?.data?.find((s: any) => s.id_sales.toString() === filters.sales_id)?.nama_sales || filters.sales_id}
                </Badge>
              )}
              {filters.kabupaten && filters.kabupaten !== 'all' && (
                <Badge variant="secondary">Region: {filters.kabupaten}</Badge>
              )}
              {filters.kecamatan && filters.kecamatan !== 'all' && (
                <Badge variant="secondary">District: {filters.kecamatan}</Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Data table component
function PengirimanDataTable({ 
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
  onDelete: (pengiriman: any) => void
  onView: (pengiriman: any) => void
  onEdit: (pengiriman: any) => void
  onPageChange: (page: number) => void
  onNextPage: () => void
  onPrevPage: () => void
}) {
  // Define responsive columns with balanced sizing and left alignment
  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'id_pengiriman',
      header: 'No. Pengiriman',
      cell: ({ row }) => {
        const pengiriman = row.original
        return (
          <div className="text-left">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm font-medium text-gray-900">#{pengiriman.id_pengiriman}</div>
              {pengiriman.is_autorestock && (
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                  Auto-restock
                </Badge>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {new Date(pengiriman.tanggal_kirim).toLocaleDateString('id-ID', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              })}
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
      accessorKey: 'nama_toko',
      header: 'Nama Toko',
      cell: ({ row }) => {
        const pengiriman = row.original
        return (
          <div className="text-left">
            <div className="font-medium text-gray-900 truncate">{pengiriman.nama_toko}</div>
            {pengiriman.link_gmaps && (
              <a 
                href={pengiriman.link_gmaps} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 mt-1"
              >
                <MapPin className="w-3 h-3" />
                Lihat Lokasi
              </a>
            )}
          </div>
        )
      },
      size: 160,
      minSize: 140,
      maxSize: 200,
      meta: { priority: 'high', columnType: 'description' },
    },
    {
      accessorKey: 'nama_sales',
      header: 'Sales Pengirim',
      cell: ({ row }) => {
        const pengiriman = row.original
        
        return (
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900 truncate">
              {pengiriman.nama_sales || 'Sales tidak tersedia'}
            </div>
            <div className="text-xs text-gray-500">
              ID Sales: {pengiriman.id_sales}
            </div>
          </div>
        )
      },
      size: 150,
      minSize: 130,
      maxSize: 180,
      meta: { priority: 'medium', columnType: 'name' },
    },
    {
      accessorKey: 'kabupaten',
      header: 'Kabupaten',
      cell: ({ row }) => {
        const pengiriman = row.original
        return (
          <div className="text-left">
            <span className="text-sm text-gray-900">
              {pengiriman.kabupaten || '-'}
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
        const pengiriman = row.original
        return (
          <div className="text-left">
            <span className="text-sm text-gray-900">
              {pengiriman.kecamatan || '-'}
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
      accessorKey: 'tanggal_kirim',
      header: 'Tanggal Kirim',
      cell: ({ row }) => (
        <div className="text-left">
          <div className="text-sm font-medium text-gray-900">
            {formatDate(row.getValue('tanggal_kirim'))}
          </div>
          <div className="text-xs text-gray-500">
            {new Date(row.getValue('tanggal_kirim')).toLocaleDateString('id-ID', { weekday: 'short' })}
          </div>
        </div>
      ),
      size: 130,
      minSize: 110,
      maxSize: 150,
      meta: { priority: 'medium', columnType: 'date' },
    },
    {
      id: 'detail_pengiriman',
      header: 'Detail Pengiriman',
      cell: ({ row }) => {
        const pengiriman = row.original
        const totalQty = pengiriman.total_quantity || 0
        const detailProduk = pengiriman.detail_pengiriman || ''
        
        // Count unique products from detail string
        const jumlahJenisProduk = detailProduk ? detailProduk.split(', ').length : 0
        
        // Parse detail_pengiriman string into individual items
        // Format from database: "Produk A [200], Produk B [300]"
        const parseDetailProduk = (detailString: string) => {
          if (!detailString || detailString === 'Tidak ada detail') return []
          
          // Split by comma and parse each item
          return detailString.split(', ').map(item => {
            // Match format: "Product Name [quantity]" (exact format from database)
            const match = item.trim().match(/^(.+?)\s*\[(\d+)\]$/)
            if (match) {
              return {
                nama_produk: match[1].trim(),
                jumlah_kirim: parseInt(match[2])
              }
            }
            // If no match, return item as is with 0 quantity
            return {
              nama_produk: item.trim(),
              jumlah_kirim: 0
            }
          }).filter(item => item.nama_produk !== '' && item.nama_produk !== 'Tidak ada detail')
        }
        
        const parsedDetails = parseDetailProduk(detailProduk)
        
        // Calculate total from parsed details as backup/verification
        const calculatedTotal = parsedDetails.reduce((sum, detail) => sum + detail.jumlah_kirim, 0)
        
        // Use database total as primary source (already calculated correctly in view)
        const displayTotal = totalQty
        
        const tooltipContent = (() => {
          if (!parsedDetails || parsedDetails.length === 0) {
            return <p className="text-sm text-gray-500">Tidak ada detail pengiriman</p>
          }
          return (
            <div className="space-y-2">
              <div className="border-b pb-2">
                <div className="text-xs text-gray-500 mb-1">Informasi Pengiriman</div>
                <div className="text-sm">
                  <div><span className="font-medium">Tanggal:</span> {formatDate(pengiriman.tanggal_kirim)}</div>
                  <div><span className="font-medium">Toko:</span> {pengiriman.nama_toko}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Detail Produk</div>
                {parsedDetails.map((detail: any, index: number) => (
                  <div key={`${pengiriman.id_pengiriman}-detail-${index}`} className="flex justify-between text-sm">
                    <span className="text-gray-700">{detail.nama_produk}</span>
                    <span className="font-medium">{formatNumber(detail.jumlah_kirim)} pcs</span>
                  </div>
                ))}
                <div className="border-t pt-1 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total Item:</span>
                    <span>{formatNumber(displayTotal)} pcs</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })()
        
        return (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <div className="text-left flex items-center gap-2 cursor-help">
                <PackageOpen className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-sm font-medium text-blue-600">
                    {formatNumber(displayTotal)} pcs
                  </div>
                  <div className="text-xs text-gray-500">
                    {jumlahJenisProduk} jenis produk
                  </div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-sm">
                <div className="mb-2">
                  <p className="font-semibold text-sm">Detail Pengiriman #{pengiriman.id_pengiriman}</p>
                  <p className="text-xs text-gray-500">Tanggal: {formatDate(pengiriman.tanggal_kirim)}</p>
                  <p className="text-xs text-gray-500">Toko: {pengiriman.nama_toko}</p>
                </div>
                <div className="border-t pt-2">
                  {tooltipContent}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )
      },
      size: 160,
      minSize: 140,
      maxSize: 200,
      meta: { priority: 'low', columnType: 'stats', hideOnMobile: true },
    },
  ], [])


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
    <DataTablePengiriman
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
      emptyStateMessage="Tidak ada data pengiriman ditemukan"
      emptyStateIcon={Truck}
      title={undefined}
      description={undefined}
      searchComponent={undefined}
      className="border-none shadow-none"
    />
  )
}

export default function ShippingPage() {
  const { navigate } = useNavigation()
  const { toast } = useToast()
  const deleteShipment = useDeletePengirimanMutation()

  // Filter and pagination state
  const [filters, setFilters] = useState<PengirimanFilters>({
    search: '',
    is_autorestock: 'all',
    sales_id: 'all',
    kabupaten: 'all',
    kecamatan: 'all',
    date_range: 'current_month'
  })
  
  const [page, setPage] = useState(1)
  const limit = 30

  // Use new dashboard query with pagination
  const { data: dashboardData, isLoading, error, refetch } = useDashboardPengirimanQuery({
    page,
    limit,
    ...filters
  })

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
  const handleFiltersChange = useCallback((newFilters: Partial<PengirimanFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPage(1) // Reset to first page when filters change
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      is_autorestock: 'all',
      sales_id: 'all',
      kabupaten: 'all',
      kecamatan: 'all',
      date_range: 'current_month'
    })
    setPage(1) // Reset to first page when clearing filters
  }, [])

  // Handle delete
  const handleDelete = useCallback((pengiriman: any) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus pengiriman #${pengiriman.id_pengiriman}?`)) {
      deleteShipment.mutate(pengiriman.id_pengiriman, {
        onSuccess: () => {
          toast({
            title: "Berhasil",
            description: `Pengiriman #${pengiriman.id_pengiriman} berhasil dihapus`,
          })
          refetch()
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error.message || "Gagal menghapus pengiriman",
            variant: "destructive",
          })
        }
      })
    }
  }, [deleteShipment, toast, refetch])

  // Handle view
  const handleView = useCallback((pengiriman: any) => {
    navigate(`/dashboard/pengiriman/${pengiriman.id_pengiriman}`)
  }, [navigate])

  // Handle edit
  const handleEdit = useCallback((pengiriman: any) => {
    navigate(`/dashboard/pengiriman/${pengiriman.id_pengiriman}/edit`)
  }, [navigate])

  // Handle export
  const handleExport = useCallback(() => {
    if (!data?.data) return
    
    const result = exportShipmentData(data.data)
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

  // Custom pagination handlers for this component
  const handlePageChange = useCallback((newPage: number) => {
    console.log('Page change requested:', { newPage, currentPage: page })
    setPage(newPage)
  }, [page])

  const handleNextPage = useCallback(() => {
    console.log('Next page clicked:', { 
      currentPage: page, 
      hasNextPage: data?.pagination?.hasNextPage,
      totalPages: data?.pagination?.totalPages 
    })
    if (data?.pagination?.hasNextPage) {
      setPage(prev => prev + 1)
    }
  }, [data?.pagination?.hasNextPage, data?.pagination?.totalPages, page])

  const handlePrevPage = useCallback(() => {
    console.log('Previous page clicked:', { 
      currentPage: page, 
      hasPrevPage: data?.pagination?.hasPrevPage 
    })
    if (data?.pagination?.hasPrevPage) {
      setPage(prev => prev - 1)
    }
  }, [data?.pagination?.hasPrevPage, page])

  // Summary statistics for header display
  const summary = {
    total_shipments: data.pagination.total || 0,
    current_page_count: data.data.length,
    total_pages: data.pagination.totalPages
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Daftar Pengiriman</h1>
          <p className="text-gray-600 mt-2">
            Menampilkan {summary.current_page_count} dari {formatNumber(summary.total_shipments)} pengiriman 
            (Halaman {data.pagination.currentPage} dari {summary.total_pages})
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
        </div>
      </motion.div>

      {/* Filter Panel */}
      <motion.div variants={cardVariants}>
        <PengirimanFilterPanel
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
        {/* Data Table Section with pagination */}
        <div className="w-full">
          <PengirimanDataTable
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
    </TooltipProvider>
  )
}