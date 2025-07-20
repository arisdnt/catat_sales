'use client'

import React, { useMemo, useCallback } from 'react'
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
  DollarSign
} from 'lucide-react'

import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigation } from '@/lib/hooks/use-navigation'

import { DataTableAdvanced as DataTableToko } from '@/components/data-tables'
import { SearchFilterAdvanced as SearchFilterToko } from '@/components/search'
import {
  useOptimizedPenagihanState
} from '@/lib/queries/penagihan-optimized'
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

// Helper function to create status badge
function createStatusBadge(status: string) {
  const config = statusConfig[status as keyof typeof statusConfig]
  if (!config) return null
  
  const Icon = config.icon
  
  return (
    <Badge variant="outline" className={`flex items-center gap-1 ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
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

// Helper function to format date
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Data table component (identical structure to toko)
function PenagihanDataTable({ 
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
  onDelete: (penagihan: any) => void
  onView: (penagihan: any) => void
  onEdit: (penagihan: any) => void
}) {
  // Define responsive columns with balanced sizing and left alignment
  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'id_penagihan',
      header: 'ID Penagihan',
      cell: ({ row }) => {
        const penagihan = row.original
        return (
          <div className="text-left">
            <div className="font-mono text-sm font-medium text-gray-900">#{penagihan.id_penagihan}</div>
            <div className="text-xs text-gray-500">
              {new Date(penagihan.dibuat_pada).toLocaleDateString('id-ID', { 
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
      accessorKey: 'toko_info',
      header: 'Nama Toko & Lokasi',
      cell: ({ row }) => {
        const penagihan = row.original
        const toko = penagihan.toko
        return (
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900 truncate">
              {toko?.nama_toko || '-'}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {toko?.kecamatan && toko?.kabupaten 
                ? `${toko.kecamatan}, ${toko.kabupaten}`
                : toko?.kabupaten || 'Lokasi tidak tersedia'
              }
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
      accessorKey: 'sales_info',
      header: 'Sales',
      cell: ({ row }) => {
        const penagihan = row.original
        const toko = penagihan.toko
        
        return (
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900 truncate">
              {toko?.sales?.nama_sales || 'Sales tidak tersedia'}
            </div>
            <div className="text-xs text-gray-500">
              ID: {toko?.sales?.id_sales || '-'}
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
      accessorKey: 'total_uang_diterima',
      header: 'Total Pembayaran',
      cell: ({ row }) => {
        const penagihan = row.original
        const potongan = penagihan.potongan_penagihan?.[0]
        return (
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">
              {formatCurrency(penagihan.total_uang_diterima)}
            </div>
            {penagihan.ada_potongan && (
              <div className="text-xs text-amber-600">
                Potongan: {formatCurrency(potongan?.jumlah_potongan || 0)}
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
        const details = penagihan.detail_penagihan || []
        const totalQuantity = details.reduce((sum: number, detail: any) => sum + detail.jumlah_terjual, 0)
        
        return (
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">
              {formatNumber(totalQuantity)} item terjual
            </div>
            <div className="text-xs text-gray-500">
              {details.length} jenis produk
            </div>
          </div>
        )
      },
      size: 180,
      minSize: 160,
      maxSize: 220,
      meta: { priority: 'low', columnType: 'stats', hideOnMobile: true },
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
  } = useOptimizedPenagihanState({
    page: 1,
    limit: 20,
    search: '',
    sortBy: 'dibuat_pada',
    sortOrder: 'desc'
  })

  // Handle search (identical to toko)
  const handleSearchChange = useCallback((value: string) => {
    updateParams({ search: value, page: 1 })
  }, [updateParams])

  // Handle search suggestion selection (adapted for penagihan)
  const handleSuggestionSelect = useCallback((suggestion: any) => {
    if (suggestion.type === 'penagihan') {
      updateParams({ search: suggestion.value, page: 1 })
    } else if (suggestion.type === 'toko') {
      updateParams({ search: suggestion.value, page: 1 })
    } else if (suggestion.type === 'kabupaten') {
      updateParams({ kabupaten: suggestion.value, search: '', page: 1 })
    } else if (suggestion.type === 'kecamatan') {
      updateParams({ kecamatan: suggestion.value, search: '', page: 1 })
    } else if (suggestion.type === 'sales') {
      updateParams({ 
        sales: suggestion.metadata?.id_sales?.toString(), 
        search: '', 
        page: 1 
      })
    }
  }, [updateParams])

  // Handle filter changes (adapted for penagihan)
  const handleFilterChange = useCallback((filters: Record<string, string>) => {
    if (Object.keys(filters).length === 0) {
      updateParams({
        sales: '',
        kabupaten: '',
        kecamatan: '',
        metode_pembayaran: '',
        ada_potongan: '',
        search: '',
        page: 1
      })
    } else {
      updateParams({ ...filters, page: 1 })
    }
  }, [updateParams])

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

  // Current filters for display (adapted for penagihan)
  const currentFilters = useMemo(() => {
    const filters: Record<string, string> = {}
    if (params.sales) filters.sales = params.sales
    if (params.kabupaten) filters.kabupaten = params.kabupaten
    if (params.kecamatan) filters.kecamatan = params.kecamatan
    if (params.metode_pembayaran) filters.metode_pembayaran = params.metode_pembayaran
    if (params.ada_potongan) filters.ada_potongan = params.ada_potongan
    return filters
  }, [params])

  // Summary statistics with safe defaults (adapted for penagihan)
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
          <h1 className="text-3xl font-bold text-gray-900">Daftar Penagihan</h1>
          <p className="text-gray-600 mt-2">
            {summary ? 
              `${formatNumber(summary.total_billings)} penagihan dengan total revenue ${formatCurrency(summary.total_revenue)}` :
              "Memuat data penagihan..."
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleExport} variant="outline" size="lg">
            Export Excel
          </Button>
          <Button onClick={handleAdd} size="lg">
            Buat Penagihan
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
            placeholder="Cari penagihan, toko, sales..."
            onSuggestionSelect={handleSuggestionSelect}
          />
        </div>

        {/* Data Table Section (identical structure to toko) */}
        <div className="w-full">
          <PenagihanDataTable
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