'use client'

import React, { useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Eye,
  Edit,
  Trash2,
  Banknote,
  Clock,
  Building,
  User,
  TrendingUp,
  CheckCircle,
  XCircle,
  DollarSign
} from 'lucide-react'

import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigation } from '@/lib/hooks/use-navigation'

import { DataTableAdvanced as DataTableToko } from '@/components/data-tables'
import { SearchFilterAdvanced as SearchFilterToko } from '@/components/search'
import {
  useOptimizedSetoranState,
  useInvalidateOptimizedSetoran,
  type SetoranWithStats
} from '@/lib/queries/setoran-optimized'
import { useDeleteSetoranMutation } from '@/lib/queries/setoran'
import { exportDepositData } from '@/lib/excel-export'

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
function SetoranDataTable({ 
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
  onDelete: (setoran: SetoranWithStats) => void
  onView: (setoran: SetoranWithStats) => void
  onEdit: (setoran: SetoranWithStats) => void
}) {
  // Define responsive columns with balanced sizing and left alignment
  const columns = useMemo<ColumnDef<SetoranWithStats>[]>(() => [
    {
      accessorKey: 'id_setoran',
      header: 'ID Setoran',
      cell: ({ row }) => {
        const setoran = row.original
        return (
          <div className="text-left">
            <div className="font-mono text-sm font-medium text-gray-900">#{setoran.id_setoran}</div>
            <div className="text-xs text-gray-500">Transaksi Setoran</div>
          </div>
        )
      },
      size: 140,
      minSize: 120,
      maxSize: 160,
      meta: { priority: 'high', columnType: 'id' },
    },
    {
      accessorKey: 'total_setoran',
      header: 'Jumlah Setoran',
      cell: ({ row }) => {
        const setoran = row.original
        return (
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">
              {formatCurrency(setoran.total_setoran)}
            </div>
            <div className="text-xs text-gray-500">
              Total uang yang disetor
            </div>
          </div>
        )
      },
      size: 160,
      minSize: 140,
      maxSize: 180,
      meta: { priority: 'high', columnType: 'currency' },
    },
    {
      accessorKey: 'penerima_setoran',
      header: 'Penerima Setoran',
      cell: ({ row }) => {
        const setoran = row.original
        return (
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900 truncate">
              {setoran.penerima_setoran || 'Belum ada penerima'}
            </div>
            <div className="text-xs text-gray-500">
              {setoran.penerima_setoran ? 'Petugas yang menerima' : 'Perlu diisi'}
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
      accessorKey: 'dibuat_pada',
      header: 'Waktu Setoran',
      cell: ({ row }) => {
        const setoran = row.original
        const date = new Date(setoran.dibuat_pada)
        return (
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">
              {date.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </div>
            <div className="text-xs text-gray-500">
              {date.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
              })} WIB
            </div>
          </div>
        )
      },
      size: 130,
      minSize: 110,
      maxSize: 150,
      meta: { priority: 'medium', columnType: 'date' },
    },
    {
      accessorKey: 'status_setoran',
      header: 'Status & Keterangan',
      cell: ({ row }) => {
        const setoran = row.original
        // This is a placeholder for additional status information if available
        return (
          <div className="text-left">
            <div className="text-sm font-medium text-green-700">
              Setor Berhasil
            </div>
            <div className="text-xs text-gray-500">
              Uang telah diterima
            </div>
          </div>
        )
      },
      size: 150,
      minSize: 130,
      maxSize: 170,
      meta: { priority: 'low', columnType: 'status', hideOnMobile: true },
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
      emptyStateMessage="Tidak ada data setoran ditemukan"
      title={undefined}
      description={undefined}
      searchComponent={undefined}
      className="border-none shadow-none"
    />
  )
}

export default function DepositsPage() {
  const { navigate } = useNavigation()
  const { toast } = useToast()
  const deleteSetoranMutation = useDeleteSetoranMutation()
  const invalidate = useInvalidateOptimizedSetoran()

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
  } = useOptimizedSetoranState({
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

  // Handle search suggestion selection (adapted for setoran)
  const handleSuggestionSelect = useCallback((suggestion: any) => {
    if (suggestion.type === 'penerima') {
      updateParams({ search: suggestion.value, page: 1 })
    } else if (suggestion.type === 'amount_from') {
      updateParams({ amount_from: suggestion.value, search: '', page: 1 })
    } else if (suggestion.type === 'amount_to') {
      updateParams({ amount_to: suggestion.value, search: '', page: 1 })
    } else if (suggestion.type === 'date_from') {
      updateParams({ date_from: suggestion.value, search: '', page: 1 })
    }
  }, [updateParams])

  // Handle filter changes (adapted for setoran)
  const handleFilterChange = useCallback((filters: Record<string, string>) => {
    if (Object.keys(filters).length === 0) {
      updateParams({
        penerima: '',
        amount_from: '',
        amount_to: '',
        date_from: '',
        date_to: '',
        search: '',
        page: 1
      })
    } else {
      updateParams({ ...filters, page: 1 })
    }
  }, [updateParams])

  // Handle delete (adapted for setoran)
  const handleDelete = useCallback((setoran: SetoranWithStats) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus setoran "${setoran.id_setoran}"?`)) {
      deleteSetoranMutation.mutate(setoran.id_setoran, {
        onSuccess: () => {
          toast({
            title: "Berhasil",
            description: `Setoran "${setoran.id_setoran}" berhasil dihapus`,
          })
          invalidate.invalidateLists()
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error.message || "Gagal menghapus setoran",
            variant: "destructive",
          })
        }
      })
    }
  }, [deleteSetoranMutation, toast, invalidate])

  // Handle view
  const handleView = useCallback((setoran: SetoranWithStats) => {
    navigate(`/dashboard/setoran/${setoran.id_setoran}`)
  }, [navigate])

  // Handle edit
  const handleEdit = useCallback((setoran: SetoranWithStats) => {
    navigate(`/dashboard/setoran/${setoran.id_setoran}/edit`)
  }, [navigate])

  // Handle export
  const handleExport = useCallback(() => {
    if (!data?.data) return
    
    const result = exportDepositData(data.data)
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
    navigate('/dashboard/setoran/add')
  }, [navigate])

  // Current filters for display (adapted for setoran)
  const currentFilters = useMemo(() => {
    const filters: Record<string, string> = {}
    if (params.penerima) filters.penerima = params.penerima
    if (params.amount_from) filters.amount_from = params.amount_from
    if (params.amount_to) filters.amount_to = params.amount_to
    if (params.date_from) filters.date_from = params.date_from
    if (params.date_to) filters.date_to = params.date_to
    return filters
  }, [params])

  // Summary statistics with safe defaults (adapted for setoran)
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
          <h1 className="text-3xl font-bold text-gray-900">Daftar Setoran</h1>
          <p className="text-gray-600 mt-2">
            {summary ? 
              `${formatNumber(summary.total_setoran)} setoran dengan total ${formatCurrency(summary.total_amount)}` :
              "Memuat data setoran..."
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleExport} variant="outline" size="lg">
            Export Excel
          </Button>
          <Button onClick={handleAdd} size="lg">
            Tambah Setoran
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
            placeholder="Cari penerima, jumlah, tanggal..."
            onSuggestionSelect={handleSuggestionSelect}
          />
        </div>

        {/* Data Table Section (identical structure to toko) */}
        <div className="w-full">
          <SetoranDataTable
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