'use client'

import React, { useMemo, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Eye,
  Edit,
  Trash2,
  Receipt,
  DollarSign,
  Calendar,
  FileText,
  Search,
  Filter,
  X,
  RefreshCw,
  Plus,
  Image as ImageIcon
} from 'lucide-react'
import { INDONESIA_TIMEZONE } from '@/lib/utils'

import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { useNavigation } from '@/lib/hooks/use-navigation'

import { DataTableAdvanced as DataTablePengeluaran } from '@/components/data-tables'
import { useDeletePengeluaran, formatCurrency, formatDate } from '@/lib/queries/pengeluaran'
import { useDashboardPengeluaranQuery } from '@/lib/queries/dashboard'
import { Database } from '@/types/database'

type PengeluaranOperasional = Database['public']['Tables']['pengeluaran_operasional']['Row']

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

// Helper function to format date
function formatDateDisplay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Helper function to get date range display text
function getDateRangeDisplay(dateRange: string): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (dateRange) {
    case 'today':
      return 'Hari ini'
    case 'week':
      return '7 hari terakhir'
    case 'month':
      return '30 hari terakhir'
    case 'current_month':
      return 'Bulan ini'
    case 'last_month':
      return 'Bulan lalu'
    case 'all':
    default:
      return 'Semua waktu'
  }
}

// Filter types
interface PengeluaranFilters {
  search: string
  date_range: 'today' | 'week' | 'month' | 'current_month' | 'last_month' | 'all'
}

// Filter component
function PengeluaranFilterPanel({ 
  filters, 
  onFiltersChange,
  onClearFilters,
  isLoading
}: {
  filters: PengeluaranFilters
  onFiltersChange: (filters: Partial<PengeluaranFilters>) => void
  onClearFilters: () => void
  isLoading: boolean
}) {
  const hasActiveFilters = Boolean(
    filters.search || 
    (filters.date_range && filters.date_range !== 'all')
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
                placeholder="Cari keterangan, jumlah..."
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
              onValueChange={(value: any) => onFiltersChange({ date_range: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{getDateRangeDisplay(filters.date_range)}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua waktu</SelectItem>
                <SelectItem value="today">Hari ini</SelectItem>
                <SelectItem value="week">7 hari terakhir</SelectItem>
                <SelectItem value="month">30 hari terakhir</SelectItem>
                <SelectItem value="current_month">Bulan ini</SelectItem>
                <SelectItem value="last_month">Bulan lalu</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="flex items-center gap-2"
              disabled={isLoading}
            >
              <X className="w-4 h-4" />
              Hapus Filter
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Data table component
function PengeluaranDataTable({ 
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
  onDelete: (pengeluaran: any) => void
  onView: (pengeluaran: any) => void
  onEdit: (pengeluaran: any) => void
  onPageChange: (page: number) => void
  onNextPage: () => void
  onPrevPage: () => void
}) {
  // Define responsive columns with balanced sizing and left alignment
  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'id_pengeluaran',
      header: 'No. Pengeluaran',
      cell: ({ row }) => {
        const pengeluaran = row.original
        return (
          <div className="text-left">
            <div className="font-mono text-sm font-medium text-gray-900">#{pengeluaran.id_pengeluaran}</div>
            <div className="text-xs text-gray-500">
              {formatDateDisplay(pengeluaran.tanggal_pengeluaran)}
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
      accessorKey: 'keterangan',
      header: 'Keterangan',
      cell: ({ row }) => {
        const pengeluaran = row.original
        return (
          <div className="text-left">
            <div className="font-medium text-gray-900 line-clamp-2">
              {pengeluaran.keterangan}
            </div>
          </div>
        )
      },
      size: 250,
      minSize: 200,
      maxSize: 300,
      meta: { priority: 'high', columnType: 'text' },
    },
    {
      accessorKey: 'jumlah',
      header: 'Jumlah',
      cell: ({ row }) => {
        const pengeluaran = row.original
        return (
          <div className="text-left">
            <div className="font-semibold text-red-600">
              {formatCurrency(pengeluaran.jumlah)}
            </div>
          </div>
        )
      },
      size: 120,
      minSize: 100,
      maxSize: 140,
      meta: { priority: 'high', columnType: 'currency' },
    },
    {
      accessorKey: 'url_bukti_foto',
      header: 'Bukti',
      cell: ({ row }) => {
        const pengeluaran = row.original
        const [showPreview, setShowPreview] = useState(false)
        
        return (
          <div className="text-left relative">
            {pengeluaran.url_bukti_foto ? (
              <div 
                className="relative inline-block"
                onMouseEnter={() => setShowPreview(true)}
                onMouseLeave={() => setShowPreview(false)}
              >
                <Badge variant="secondary" className="bg-green-100 text-green-800 cursor-pointer">
                  <ImageIcon className="w-3 h-3 mr-1" />
                  Ada
                </Badge>
                {showPreview && (
                    <div className="fixed z-[9999] pointer-events-none" style={{
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}>
                      <div className="bg-white border rounded-lg shadow-2xl p-4 max-w-lg">
                        <img
                          src={pengeluaran.url_bukti_foto}
                          alt="Preview bukti"
                          className="w-full h-80 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                        <p className="text-sm text-gray-600 mt-3 text-center font-medium">Preview Bukti Foto</p>
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                Tidak ada
              </Badge>
            )}
          </div>
        )
      },
      size: 100,
      minSize: 80,
      maxSize: 120,
      meta: { priority: 'medium', columnType: 'badge' },
    },
  ], [])

  // Table actions
  const actions = useMemo(() => [
    {
      label: 'Lihat',
      icon: Eye,
      onClick: onView,
      variant: 'view' as const
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: onEdit,
      variant: 'edit' as const
    },
    {
      label: 'Hapus',
      icon: Trash2,
      onClick: onDelete,
      variant: 'delete' as const
    }
  ], [onView, onEdit, onDelete])

  // Pagination info
  const paginationInfo = data?.pagination ? {
    currentPage: data?.pagination?.page || 1,
    totalPages: data?.pagination?.totalPages || 1,
    total: data?.pagination?.total || 0,
    hasNextPage: (data?.pagination?.page || 1) < (data?.pagination?.totalPages || 1),
    hasPrevPage: (data?.pagination?.page || 1) > 1,
    onPageChange,
    onNextPage,
    onPrevPage,
    pageSize: data?.pagination?.limit || 10
  } : undefined

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error: {error.message}</p>
            <Button onClick={refetch} className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Coba Lagi
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <DataTablePengeluaran
      data={data?.data || []}
      columns={columns}
      actions={actions}
      loading={isLoading}
      pagination={paginationInfo}
      emptyStateMessage="Tidak ada data pengeluaran"
      emptyStateIcon={Receipt}
      enableColumnVisibility={false}
    />
  )
}

export default function PengeluaranPage() {
  const { navigate } = useNavigation()
  const { toast } = useToast()
  const deleteMutation = useDeletePengeluaran()

  // Filter and pagination state
  const [filters, setFilters] = useState<PengeluaranFilters>({
    search: '',
    date_range: 'current_month'
  })
  
  const [page, setPage] = useState(1)
  const limit = 30

  // Use new dashboard query with server-side filtering and pagination
  const { data: dashboardData, isLoading, error, refetch } = useDashboardPengeluaranQuery({
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
  const handleFiltersChange = useCallback((newFilters: Partial<PengeluaranFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPage(1) // Reset to first page when filters change
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      date_range: 'current_month'
    })
    setPage(1) // Reset to first page when clearing filters
  }, [])

  // Handle delete
  const handleDelete = useCallback((pengeluaran: any) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus pengeluaran #${pengeluaran.id_pengeluaran}?`)) {
      deleteMutation.mutate(pengeluaran.id_pengeluaran, {
        onSuccess: () => {
          toast({
            title: "Berhasil",
            description: `Pengeluaran #${pengeluaran.id_pengeluaran} berhasil dihapus`,
          })
          refetch()
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error?.message || "Gagal menghapus pengeluaran",
            variant: "destructive",
          })
        }
      })
    }
  }, [deleteMutation, toast, refetch])

  // Handle view
  const handleView = useCallback((pengeluaran: any) => {
    navigate(`/dashboard/pengeluaran/${pengeluaran.id_pengeluaran}`)
  }, [navigate])

  // Handle edit
  const handleEdit = useCallback((pengeluaran: any) => {
    navigate(`/dashboard/pengeluaran/edit/${pengeluaran.id_pengeluaran}`)
  }, [navigate])

  // Handle add new
  const handleAdd = useCallback(() => {
    navigate('/dashboard/pengeluaran/create')
  }, [navigate])

  // Pagination handlers
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const handleNextPage = useCallback(() => {
    if (data?.pagination && data.pagination.page < data.pagination.totalPages) {
      setPage(prev => prev + 1)
    }
  }, [data?.pagination?.page, data?.pagination?.totalPages])

  const handlePrevPage = useCallback(() => {
    if (data?.pagination && data.pagination.page > 1) {
      setPage(prev => prev - 1)
    }
  }, [data?.pagination?.page])

  // Summary statistics for header display
  const summary = {
    total_pengeluaran: data?.pagination?.total || 0,
    current_page_count: data?.data?.length || 0,
    total_pages: data?.pagination?.totalPages || 1,
    total_amount: data?.data?.reduce((sum: number, item: any) => sum + (item.jumlah || 0), 0) || 0
  }

  // Handle export
  const handleExport = useCallback(() => {
    if (!data?.data) return
    
    // Simple CSV export for now
    const csvContent = [
      ['Tanggal', 'Kategori', 'Deskripsi', 'Jumlah'],
      ...(data?.data || []).map((item: any) => [
        formatDateDisplay(item.tanggal),
        item.kategori || '-',
        item.deskripsi || '-',
        item.jumlah || 0
      ])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pengeluaran-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast({
      title: "Export Berhasil",
      description: "Data pengeluaran berhasil diexport",
    })
  }, [data?.data, toast])

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
            <h1 className="text-3xl font-bold text-gray-900">Daftar Pengeluaran</h1>
            <p className="text-gray-600 mt-2">
              Menampilkan {summary.current_page_count} dari {formatNumber(summary.total_pengeluaran)} pengeluaran 
              (Halaman {data?.pagination?.page || 1} dari {summary.total_pages}) dengan total pengeluaran {formatCurrency(summary.total_amount)}
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
              Tambah Pengeluaran
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Filter Panel */}
      <motion.div variants={cardVariants}>
        <PengeluaranFilterPanel
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
          <PengeluaranDataTable
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