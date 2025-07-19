'use client'

import React, { useMemo, useCallback } from 'react'
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
} from 'lucide-react'

import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigation } from '@/lib/hooks/use-navigation'

import { HighPerformanceDataTable as DataTablePengiriman } from '@/components/shared/data-table-toko'
import { SearchFilterToko } from '@/components/shared/search-filter-toko'
import {
  useOptimizedPengirimanState,
  useInvalidateOptimizedPengiriman,
  type PengirimanWithDetails
} from '@/lib/queries/pengiriman-optimized'
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
  onEdit 
}: {
  data: any
  isLoading: boolean
  error: any
  refetch: () => void
  params: any
  updateParams: (params: any) => void
  onDelete: (pengiriman: PengirimanWithDetails) => void
  onView: (pengiriman: PengirimanWithDetails) => void
  onEdit: (pengiriman: PengirimanWithDetails) => void
}) {
  // Define table columns
  const columns = useMemo<ColumnDef<PengirimanWithDetails>[]>(() => [
    {
      accessorKey: 'id_pengiriman',
      header: 'No. Pengiriman',
      cell: ({ row }) => {
        const pengiriman = row.original
        return (
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Package className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900">#{pengiriman.id_pengiriman}</div>
              <div className="text-sm text-gray-500">
                {formatDate(pengiriman.tanggal_kirim)}
              </div>
            </div>
          </motion.div>
        )
      },
    },
    {
      accessorKey: 'nama_toko',
      header: 'Toko',
      cell: ({ row }) => {
        const pengiriman = row.original
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <MapPin className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 truncate">{pengiriman.nama_toko}</div>
              {pengiriman.link_gmaps ? (
                <a 
                  href={pengiriman.link_gmaps} 
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
          </div>
        )
      },
    },
    {
      accessorKey: 'lokasi',
      header: 'Lokasi',
      cell: ({ row }) => {
        const pengiriman = row.original
        return (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900">
                {pengiriman.kecamatan || '-'}
              </div>
              <div className="text-xs text-gray-500">
                {pengiriman.kabupaten || '-'}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'nama_sales',
      header: 'Sales',
      cell: ({ row }) => {
        const pengiriman = row.original
        
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-gray-900 truncate">
                {pengiriman.nama_sales || 'Sales Tidak Ditemukan'}
              </div>
              <div className="text-xs text-gray-500">ID: {pengiriman.id_sales}</div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'tanggal_kirim',
      header: 'Tanggal Kirim',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900">{formatDate(row.getValue('tanggal_kirim'))}</span>
        </div>
      ),
    },
    {
      id: 'total_quantity',
      header: 'Total Quantity',
      cell: ({ row }) => {
        const pengiriman = row.original
        const totalQty = pengiriman.total_quantity || 0
        const details = pengiriman.detail_pengiriman || []
        
        return (
          <div className="relative group">
            <div className="flex items-center gap-2 cursor-help">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-900">{formatNumber(totalQty)}</span>
            </div>
            
            {/* Tooltip */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
              <div className="font-semibold mb-1">Detail Barang:</div>
              {details.length > 0 ? (
                details.map((detail, index) => (
                  <div key={index} className="flex justify-between gap-2">
                    <span>{detail.nama_produk}:</span>
                    <span>{detail.jumlah_kirim} pcs</span>
                  </div>
                ))
              ) : (
                <div>Tidak ada detail barang</div>
              )}
              {/* Arrow */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-800"></div>
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
    <DataTablePengiriman
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
  const invalidate = useInvalidateOptimizedPengiriman()

  // Initialize state management using optimized hooks
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
  } = useOptimizedPengirimanState({
    page: 1,
    limit: 20,
    search: '',
    sortBy: 'tanggal_kirim',
    sortOrder: 'desc'
  })

  // Handle search
  const handleSearchChange = useCallback((value: string) => {
    updateParams({ search: value, page: 1 })
  }, [updateParams])

  // Handle search suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: any) => {
    if (suggestion.type === 'pengiriman') {
      updateParams({ search: suggestion.value, page: 1 })
    } else if (suggestion.type === 'toko') {
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
    } else if (suggestion.type === 'tanggal') {
      const date = suggestion.metadata?.tanggal_kirim
      updateParams({ 
        date_from: date,
        date_to: date,
        search: '', 
        page: 1 
      })
    }
  }, [updateParams])

  // Handle filter changes
  const handleFilterChange = useCallback((filters: Record<string, string>) => {
    if (Object.keys(filters).length === 0) {
      updateParams({
        id_sales: '',
        kabupaten: '',
        kecamatan: '',
        date_from: '',
        date_to: '',
        search: '',
        page: 1
      })
    } else {
      updateParams({ ...filters, page: 1 })
    }
  }, [updateParams])

  // Handle delete
  const handleDelete = useCallback((pengiriman: PengirimanWithDetails) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus pengiriman #${pengiriman.id_pengiriman}?`)) {
      deleteShipment.mutate(pengiriman.id_pengiriman, {
        onSuccess: () => {
          toast({
            title: "Berhasil",
            description: `Pengiriman #${pengiriman.id_pengiriman} berhasil dihapus`,
          })
          invalidate.invalidateLists()
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
  }, [deleteShipment, toast, invalidate])

  // Handle view
  const handleView = useCallback((pengiriman: PengirimanWithDetails) => {
    navigate(`/dashboard/pengiriman/${pengiriman.id_pengiriman}`)
  }, [navigate])

  // Handle edit
  const handleEdit = useCallback((pengiriman: PengirimanWithDetails) => {
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

  // Current filters for display
  const currentFilters = useMemo(() => {
    const filters: Record<string, string> = {}
    if (params.id_sales) filters.id_sales = params.id_sales
    if (params.kabupaten) filters.kabupaten = params.kabupaten
    if (params.kecamatan) filters.kecamatan = params.kecamatan
    if (params.date_from) filters.date_from = params.date_from
    if (params.date_to) filters.date_to = params.date_to
    return filters
  }, [params])

  // Summary statistics with safe defaults
  const summary = filterOptions?.summary

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
          <h1 className="text-3xl font-bold text-gray-900">Daftar Pengiriman</h1>
          <p className="text-gray-600 mt-2">
            {summary ? 
              `${formatNumber(summary.total_shipments)} pengiriman total, ${formatNumber(summary.today_shipments)} hari ini, ${formatNumber(summary.this_week_shipments)} minggu ini` :
              "Memuat data pengiriman..."
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleExport} variant="outline" size="lg">
            Export Excel
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
            placeholder="Cari pengiriman, toko, sales, lokasi..."
            onSuggestionSelect={handleSuggestionSelect}
          />
        </div>

        {/* Data Table Section */}
        <div className="flex flex-col">
          <PengirimanDataTable
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