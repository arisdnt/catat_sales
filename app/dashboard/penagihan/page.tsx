'use client'

import React, { useMemo, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Eye,
  Edit,
  Trash2,
  Receipt,
  CreditCard,
  CheckCircle,
  MapPin,
  Users,
  Package,
  Minus,
  DollarSign,
  Search,
  Filter,
  X,
  Calendar,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { INDONESIA_TIMEZONE } from '@/lib/utils'

import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { useNavigation } from '@/lib/hooks/use-navigation'

import { DataTableAdvanced as DataTableToko } from '@/components/data-tables'
import { 
  useDashboardPenagihanQuery,
  useSalesOptionsQuery,
  useKabupatenOptionsQuery,
  useKecamatanOptionsQuery
} from '@/lib/queries/dashboard'
import { useDeletePenagihanMutation } from '@/lib/queries/penagihan'
import { exportBillingData } from '@/lib/excel-export'

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

// Status configuration for payment methods
const statusConfig = {
  'Cash': {
    label: 'Cash',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle
  },
  'Transfer': {
    label: 'Transfer',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: CreditCard
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

// Helper function to format date
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    timeZone: INDONESIA_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
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
interface PenagihanFilters {
  search: string
  metode_pembayaran: string
  ada_potongan: string
  sales_id: string
  kabupaten: string
  kecamatan: string
  date_range: 'today' | 'week' | 'month' | 'current_month' | 'last_month' | 'all'
}

// Filter component
function PenagihanFilterPanel({ 
  filters, 
  onFiltersChange,
  onClearFilters,
  isLoading
}: {
  filters: PenagihanFilters
  onFiltersChange: (filters: Partial<PenagihanFilters>) => void
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
    (filters.kecamatan && filters.kecamatan !== 'all') ||
    (filters.metode_pembayaran && filters.metode_pembayaran !== 'all') ||
    (filters.ada_potongan && filters.ada_potongan !== 'all')
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
              {filters.metode_pembayaran && filters.metode_pembayaran !== 'all' && (
                <Badge variant="secondary">Payment: {filters.metode_pembayaran}</Badge>
              )}
              {filters.ada_potongan && filters.ada_potongan !== 'all' && (
                <Badge variant="secondary">Discount: {filters.ada_potongan === 'true' ? 'Yes' : 'No'}</Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Data table component (simplified - no pagination handlers here)
function PenagihanDataTable({ 
  data, 
  isLoading, 
  error, 
  refetch, 
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
  onDelete: (penagihan: any) => void
  onView: (penagihan: any) => void
  onEdit: (penagihan: any) => void
  onPageChange: (page: number) => void
  onNextPage: () => void
  onPrevPage: () => void
}) {
  // Define responsive columns with balanced sizing and left alignment
  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'id_penagihan',
      header: 'No. Penagihan',
      cell: ({ row }) => {
        const penagihan = row.original
        return (
          <div className="text-left">
            <div className="font-mono text-sm font-medium text-gray-900">#{penagihan.id_penagihan}</div>
            <div className="text-xs text-gray-500">
              {new Date(penagihan.tanggal_penagihan).toLocaleDateString('id-ID', { 
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
        const penagihan = row.original
        return (
          <div className="text-left">
            <div className="font-medium text-gray-900 truncate">{penagihan.nama_toko}</div>
            {penagihan.link_gmaps && (
              <a 
                href={penagihan.link_gmaps} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1"
              >
                <MapPin className="w-3 h-3" />
                 Lihat Lokasi
                 <ExternalLink className="w-3 h-3" />
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
      header: 'Sales Penagih',
      cell: ({ row }) => {
        const penagihan = row.original
        
        return (
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900 truncate">
              {penagihan.nama_sales || 'Sales tidak tersedia'}
            </div>
            <div className="text-xs text-gray-500">
              ID Sales: {penagihan.id_sales}
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
        const penagihan = row.original
        return (
          <div className="text-left">
            <span className="text-sm text-gray-900">
              {penagihan.kabupaten || '-'}
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
        const penagihan = row.original
        return (
          <div className="text-left">
            <span className="text-sm text-gray-900">
              {penagihan.kecamatan || '-'}
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
      accessorKey: 'tanggal_penagihan',
      header: 'Tanggal Penagihan',
      cell: ({ row }) => (
        <div className="text-left">
          <div className="text-sm font-medium text-gray-900">
            {formatDate(row.getValue('tanggal_penagihan'))}
          </div>
          <div className="text-xs text-gray-500">
            {new Date(row.getValue('tanggal_penagihan')).toLocaleDateString('id-ID', { weekday: 'short' })}
          </div>
        </div>
      ),
      size: 130,
      minSize: 110,
      maxSize: 150,
      meta: { priority: 'medium', columnType: 'date' },
    },
    {
      accessorKey: 'total_uang_diterima',
      header: 'Total Pembayaran',
      cell: ({ row }) => {
        const penagihan = row.original
        return (
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">
              {formatCurrency(penagihan.total_uang_diterima)}
            </div>
            {penagihan.ada_potongan && (
              <div className="text-xs text-amber-600">
                Potongan: {formatCurrency(penagihan.total_potongan || 0)}
              </div>
            )}
          </div>
        )
      },
      size: 160,
      minSize: 140,
      maxSize: 180,
      meta: { priority: 'high', columnType: 'currency' },
    },
    {
      accessorKey: 'metode_pembayaran',
      header: 'Metode Bayar',
      cell: ({ row }) => {
        const method = row.getValue('metode_pembayaran') as string
        return (
          <div className="text-left">
            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
              method === 'Cash' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {method === 'Cash' ? 'Tunai' : 'Transfer'}
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
      accessorKey: 'detail_info',
      header: 'Detail Produk',
      cell: ({ row }) => {
        const penagihan = row.original
        
        // Use detail_produk and total_quantity_terjual from API response
        const detailProduk = penagihan.detail_produk || 'Tidak ada produk terjual'
        const totalQuantity = penagihan.total_quantity_terjual || 0
        
        // Parse detail_terjual untuk mendapatkan array produk
        const products = detailProduk !== 'Tidak ada produk terjual' 
          ? detailProduk.split(', ').map((item: string) => {
            const match = item.match(/^(.+) \[(\d+)\]$/)
            return match ? {
              nama_produk: match[1],
              quantity: parseInt(match[2])
            } : null
          }).filter(Boolean)
        : []
        
        return (
          <div className="text-left relative">
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <Package className="w-4 h-4 text-gray-400 mr-1" />
                <span className="text-sm font-medium text-gray-900">
                  {products.length} items
                </span>
              </div>
              <div className="text-xs text-gray-600">
                ({formatNumber(totalQuantity)} pcs)
              </div>
            </div>
            {products.length > 0 && (
              <div className="text-xs text-gray-500 mt-1 truncate" title={detailProduk}>
                {detailProduk}
              </div>
            )}
          </div>
        )
      },
      size: 160,
      minSize: 140,
      maxSize: 180,
      meta: { priority: 'medium', columnType: 'stats' },
    },

  ], [onView, onEdit, onDelete])

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
      emptyStateMessage="Tidak ada data penagihan ditemukan"
      title={undefined}
      description={undefined}
      searchComponent={undefined}
      className="border-none shadow-none"
    />
  )
}

export default function PenagihanPage() {
  const { navigate } = useNavigation()
  const { toast } = useToast()
  const deletePenagihanMutation = useDeletePenagihanMutation()

  // Filter and pagination state
  const [filters, setFilters] = useState<PenagihanFilters>({
    search: '',
    metode_pembayaran: 'all',
    ada_potongan: 'all',
    sales_id: 'all',
    kabupaten: 'all',
    kecamatan: 'all',
    date_range: 'current_month'
  })
  
  const [page, setPage] = useState(1)
  const limit = 30

  // Use new dashboard query with server-side filtering and pagination
  const { data: dashboardData, isLoading, error, refetch } = useDashboardPenagihanQuery({
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
  const handleFiltersChange = useCallback((newFilters: Partial<PenagihanFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPage(1) // Reset to first page when filters change
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      metode_pembayaran: 'all',
      ada_potongan: 'all',
      sales_id: 'all',
      kabupaten: 'all',
      kecamatan: 'all',
      date_range: 'current_month'
    })
    setPage(1) // Reset to first page when clearing filters
  }, [])

  // Handle delete (adapted for penagihan)
  const handleDelete = useCallback((penagihan: any) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus penagihan #${penagihan.id_penagihan}?`)) {
      deletePenagihanMutation.mutate(penagihan.id_penagihan, {
        onSuccess: () => {
          toast({
            title: "Berhasil",
            description: `Penagihan #${penagihan.id_penagihan} berhasil dihapus`,
          })
          refetch()
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error.message || "Gagal menghapus penagihan",
            variant: "destructive",
          })
        }
      })
    }
  }, [deletePenagihanMutation, toast, refetch])

  // Handle view (adapted for penagihan)
  const handleView = useCallback((penagihan: any) => {
    navigate(`/dashboard/penagihan/${penagihan.id_penagihan}`)
  }, [navigate])

  // Handle edit (adapted for penagihan)
  const handleEdit = useCallback((penagihan: any) => {
    navigate(`/dashboard/penagihan/${penagihan.id_penagihan}/edit`)
  }, [navigate])

  // Handle export (adapted for penagihan)
  const handleExport = useCallback(() => {
    if (!data?.data) return
    
    const result = exportBillingData(data.data)
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

  // Handle add new (adapted for penagihan)
  const handleAdd = useCallback(() => {
    navigate('/dashboard/penagihan/create')
  }, [navigate])

  // Pagination handlers - these directly update the main page state
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const handleNextPage = useCallback(() => {
    if (data?.pagination?.hasNextPage) {
      setPage(prevPage => prevPage + 1)
    }
  }, [data?.pagination?.hasNextPage])

  const handlePrevPage = useCallback(() => {
    if (data?.pagination?.hasPrevPage) {
      setPage(prevPage => Math.max(1, prevPage - 1))
    }
  }, [data?.pagination?.hasPrevPage])

  // Summary statistics for header display only
  const summary = {
    total_billings: data.pagination.total || 0,
    current_page_count: data.data.length,
    total_pages: data.pagination.totalPages,
    total_revenue: dashboardData?.data?.metadata?.totalRevenue || 0
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
            <h1 className="text-3xl font-bold text-gray-900">Daftar Penagihan</h1>
            <p className="text-gray-600 mt-2">
              Menampilkan {summary.current_page_count} dari {formatNumber(summary.total_billings)} penagihan 
              (Halaman {data.pagination.currentPage} dari {summary.total_pages}) dengan total revenue {formatCurrency(summary.total_revenue)}
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
              Buat Penagihan
            </Button>
          </div>
        </div>

      </motion.div>

      {/* Filter Panel */}
      <motion.div variants={cardVariants}>
        <PenagihanFilterPanel
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
          <PenagihanDataTable
            data={data}
            isLoading={isLoading}
            error={error}
            refetch={refetch}
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