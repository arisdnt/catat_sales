'use client'

import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState
} from '@tanstack/react-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Plus,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal
} from 'lucide-react'

interface FilterOption {
  value: string
  label: string
  count?: number
}

interface FilterConfig {
  key: string
  label: string
  type: 'select' | 'date' | 'daterange' | 'search'
  options?: FilterOption[]
  placeholder?: string
}

interface ActionButton {
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: (row: any) => void
  variant?: 'view' | 'edit' | 'delete' | 'custom'
  className?: string
  show?: (row: any) => boolean
}

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  title: string
  description?: string
  searchPlaceholder?: string
  filters?: FilterConfig[]
  actions?: ActionButton[]
  onAdd?: () => void
  onExport?: () => void
  onRefresh?: () => void
  addButtonLabel?: string
  loading?: boolean
  emptyStateMessage?: string
  emptyStateIcon?: React.ComponentType<{ className?: string }>
  pageSize?: number
}

const actionVariants = {
  view: {
    className: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50',
    icon: Eye
  },
  edit: {
    className: 'text-gray-600 hover:text-gray-700 hover:bg-gray-50',
    icon: Edit
  },
  delete: {
    className: 'text-red-600 hover:text-red-700 hover:bg-red-50',
    icon: Trash2
  },
  custom: {
    className: 'text-gray-600 hover:text-gray-700 hover:bg-gray-50',
    icon: MoreHorizontal
  }
}

export function DataTable<T>({
  data,
  columns,
  title,
  description,
  searchPlaceholder = 'Cari data...',
  filters = [],
  actions = [],
  onAdd,
  onExport,
  onRefresh,
  addButtonLabel = 'Tambah Data',
  loading = false,
  emptyStateMessage = 'Tidak ada data yang ditemukan',
  emptyStateIcon: EmptyIcon = Search,
  pageSize = 10
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })
  const [globalFilter, setGlobalFilter] = useState('')

  // Add actions column if actions are provided
  const enhancedColumns = useMemo(() => {
    if (actions.length === 0) return columns
    
    const actionsColumn: ColumnDef<T> = {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {actions.map((action, index) => {
            if (action.show && !action.show(row.original)) return null
            
            const variant = actionVariants[action.variant || 'custom']
            const IconComponent = action.icon || variant.icon
            
            return (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className={action.className || variant.className}
                onClick={() => action.onClick(row.original)}
                title={action.label}
              >
                <IconComponent className="w-4 h-4" />
              </Button>
            )
          })}
        </div>
      ),
      enableSorting: false,
      enableGlobalFilter: false,
    }
    
    return [...columns, actionsColumn]
  }, [columns, actions])

  const table = useReactTable({
    data,
    columns: enhancedColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      pagination,
      globalFilter,
    },
  })

  const getFilterValue = (filterKey: string) => {
    const filter = table.getColumn(filterKey)?.getFilterValue()
    return filter || 'all'
  }

  const setFilterValue = (filterKey: string, value: string) => {
    const column = table.getColumn(filterKey)
    if (column) {
      column.setFilterValue(value === 'all' ? undefined : value)
    }
  }

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="flex gap-4">
              <div className="h-10 bg-gray-200 rounded flex-1"></div>
              <div className="h-10 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">{title}</CardTitle>
            {description && (
              <CardDescription className="text-gray-600">
                {description}
              </CardDescription>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="border-gray-200 hover:border-gray-300 text-gray-600"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            )}
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="border-gray-200 hover:border-gray-300 text-gray-600"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
            {onAdd && (
              <Button
                onClick={onAdd}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                {addButtonLabel}
              </Button>
            )}
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          {/* Global Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 min-w-[200px]"
            />
          </div>
          
          {/* Custom Filters */}
          {filters.map((filter) => {
            if (filter.type === 'select') {
              return (
                <select
                  key={filter.key}
                  value={getFilterValue(filter.key) as string}
                  onChange={(e) => setFilterValue(filter.key, e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 text-sm bg-white min-w-[140px]"
                >
                  <option value="all">{filter.label}</option>
                  {filter.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                      {option.count !== undefined && ` (${option.count})`}
                    </option>
                  ))}
                </select>
              )
            }
            
            if (filter.type === 'search') {
              return (
                <div key={filter.key} className="relative">
                  <Input
                    placeholder={filter.placeholder || filter.label}
                    value={(getFilterValue(filter.key) as string) || ''}
                    onChange={(e) => setFilterValue(filter.key, e.target.value)}
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 min-w-[160px]"
                  />
                </div>
              )
            }
            
            // Add more filter types as needed (date, daterange, etc.)
            return null
          })}
          
          {/* Filter indicator */}
          {(globalFilter || columnFilters.length > 0) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setGlobalFilter('')
                setColumnFilters([])
              }}
              className="border-gray-200 hover:border-gray-300 text-gray-600"
            >
              <Filter className="w-4 h-4 mr-2" />
              Clear ({(globalFilter ? 1 : 0) + columnFilters.length})
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Table */}
        <div className="rounded-md border border-gray-200">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b bg-gray-50">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-4 py-3 text-left font-medium text-gray-900">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-4">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={enhancedColumns.length} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center py-8">
                      <EmptyIcon className="w-12 h-12 text-gray-400 mb-4" />
                      <p className="text-gray-500">{emptyStateMessage}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-gray-500">
            Menampilkan {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} hingga{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            dari {table.getFilteredRowModel().rows.length} hasil
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="border-gray-200 hover:border-gray-300"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="border-gray-200 hover:border-gray-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="border-gray-200 hover:border-gray-300"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="border-gray-200 hover:border-gray-300"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Helper function to create sortable header
export function createSortableHeader(title: string) {
  return ({ column }: { column: any }) => (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      className="h-8 p-0 font-medium hover:bg-gray-100 text-gray-900"
    >
      {title}
      {column.getIsSorted() === 'asc' ? (
        <ChevronUp className="ml-2 h-4 w-4" />
      ) : column.getIsSorted() === 'desc' ? (
        <ChevronDown className="ml-2 h-4 w-4" />
      ) : (
        <ChevronsUpDown className="ml-2 h-4 w-4" />
      )}
    </Button>
  )
}

// Helper function to create status badge
export function createStatusBadge(status: string, config: Record<string, { label: string; color: string; icon?: any }>) {
  const statusInfo = config[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
  const IconComponent = statusInfo.icon
  
  return (
    <Badge className={`${statusInfo.color} flex items-center gap-1`}>
      {IconComponent && <IconComponent className="w-3 h-3" />}
      {statusInfo.label}
    </Badge>
  )
}

// Helper function to format currency
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

// Helper function to format date
export function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options
  })
}