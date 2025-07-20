'use client'

import React, { useState, useMemo, useCallback } from 'react'
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
import { useVirtualizer } from '@tanstack/react-virtual'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useDebounce } from '@/lib/hooks/use-debounce'
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
  MoreHorizontal,
  Loader2
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
  isLoading?: boolean
}

interface ServerPaginationConfig {
  currentPage: number
  totalPages: number
  total: number
  hasNextPage: boolean
  hasPrevPage: boolean
  onPageChange: (page: number) => void
  onNextPage: () => void
  onPrevPage: () => void
  pageSize: number
}

interface ActionButton {
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: (row: any) => void
  variant?: 'view' | 'edit' | 'delete' | 'custom'
  className?: string
  show?: (row: any) => boolean
}

interface OptimizedDataTableProps<T> {
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
  customActions?: React.ReactNode[]
  showAddButton?: boolean
  
  // Server-side pagination
  serverPagination?: ServerPaginationConfig
  
  // Search handling
  searchValue?: string
  onSearchChange?: (value: string) => void
  customSearchComponent?: React.ReactNode
  
  // Filter handling
  onFilterChange?: (key: string, value: string) => void
  filterValues?: Record<string, string>
  enhancedFilters?: React.ReactNode
  hideDefaultFilters?: boolean
  
  // Virtualization
  enableVirtualization?: boolean
  rowHeight?: number
  
  // Performance settings
  debounceDelay?: number
  enableSorting?: boolean
  enableGlobalFilter?: boolean
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

function OptimizedDataTableComponent<T>({
  data = [],
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
  customActions = [],
  showAddButton = true,
  serverPagination,
  searchValue,
  onSearchChange,
  customSearchComponent,
  onFilterChange,
  filterValues = {},
  enhancedFilters,
  hideDefaultFilters = false,
  enableVirtualization = false,
  rowHeight = 60,
  debounceDelay = 300,
  enableSorting = true,
  enableGlobalFilter = true
}: OptimizedDataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  const [internalGlobalFilter, setInternalGlobalFilter] = useState('')
  
  // Debounced search
  const debouncedSearch = useDebounce(searchValue || internalGlobalFilter, debounceDelay)
  
  // Use external search value if provided, otherwise use internal
  const globalFilter = debouncedSearch
  const setGlobalFilter = useCallback((value: string) => {
    if (onSearchChange) {
      onSearchChange(value)
    } else {
      setInternalGlobalFilter(value)
    }
  }, [onSearchChange])

  // Enhanced columns with actions
  const enhancedColumns = useMemo(() => {
    if (actions.length === 0) return columns
    
    const actionsColumn: ColumnDef<T> = {
      id: 'actions',
      header: 'Aksi',
      size: 120,
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
    getFilteredRowModel: serverPagination ? undefined : getFilteredRowModel(),
    getPaginationRowModel: serverPagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    onSortingChange: enableSorting ? setSorting : undefined,
    onColumnFiltersChange: onFilterChange ? undefined : setColumnFilters,
    onPaginationChange: serverPagination ? undefined : setInternalPagination,
    onGlobalFilterChange: onSearchChange ? undefined : setGlobalFilter,
    globalFilterFn: 'includesString',
    manualPagination: !!serverPagination,
    manualFiltering: !!onFilterChange,
    manualSorting: false, // Keep client-side sorting for now
    pageCount: serverPagination ? serverPagination.totalPages : undefined,
    state: {
      sorting: enableSorting ? sorting : [],
      columnFilters: onFilterChange ? [] : columnFilters,
      pagination: serverPagination 
        ? { pageIndex: serverPagination.currentPage - 1, pageSize: serverPagination.pageSize } 
        : internalPagination,
      globalFilter: enableGlobalFilter ? globalFilter : undefined,
    },
  })

  // Virtualization setup
  const tableContainerRef = React.useRef<HTMLDivElement>(null)
  const { rows } = table.getRowModel()
  
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
    enabled: enableVirtualization && rows.length > 50,
  })

  const getFilterValue = useCallback((filterKey: string) => {
    if (onFilterChange && filterValues) {
      return filterValues[filterKey] || 'all'
    } else {
      const filter = table.getColumn(filterKey)?.getFilterValue()
      return filter || 'all'
    }
  }, [onFilterChange, filterValues, table])

  const setFilterValue = useCallback((filterKey: string, value: string) => {
    if (onFilterChange) {
      onFilterChange(filterKey, value)
    } else {
      const column = table.getColumn(filterKey)
      if (column) {
        column.setFilterValue(value === 'all' ? undefined : value)
      }
    }
  }, [onFilterChange, table])

  const clearFilters = useCallback(() => {
    setGlobalFilter('')
    if (!onFilterChange) {
      setColumnFilters([])
    } else {
      // Reset all filter values to 'all'
      filters.forEach(filter => {
        onFilterChange(filter.key, 'all')
      })
    }
  }, [setGlobalFilter, onFilterChange, setColumnFilters, filters])

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
              {Array.from({ length: 8 }).map((_, i) => (
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
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {title}
              {enableVirtualization && rows.length > 50 && (
                <Badge variant="outline" className="text-xs">
                  Virtual
                </Badge>
              )}
            </CardTitle>
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
                disabled={loading}
                className="border-gray-200 hover:border-gray-300 text-gray-600"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </Button>
            )}
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                disabled={loading || data.length === 0}
                className="border-gray-200 hover:border-gray-300 text-gray-600"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
            {onAdd && showAddButton && (
              <Button
                onClick={onAdd}
                disabled={loading}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                {addButtonLabel}
              </Button>
            )}
            {customActions.map((action, index) => (
              <React.Fragment key={index}>
                {action}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="space-y-4 mt-4">
          {/* Custom Search Component or Default Search */}
          {customSearchComponent ? (
            customSearchComponent
          ) : enableGlobalFilter && (
            <div className="flex items-center gap-4">
              <div className="flex-1 relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchValue !== undefined ? searchValue : internalGlobalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 min-w-[200px]"
                  disabled={loading}
                />
              </div>
              
              {/* Filter clear button */}
              {((enableGlobalFilter && globalFilter) || columnFilters.length > 0 || Object.values(filterValues).some(v => v && v !== 'all')) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  disabled={loading}
                  className="border-gray-200 hover:border-gray-300 text-gray-600"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          )}
          
          {/* Enhanced Filters */}
          {enhancedFilters && (
            <div>
              {enhancedFilters}
            </div>
          )}
          
          {/* Default Filters */}
          {!hideDefaultFilters && filters.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3">
              {filters.map((filter) => {
                if (filter.type === 'select') {
                  return (
                    <div key={filter.key} className="relative">
                      <select
                        value={getFilterValue(filter.key) as string}
                        onChange={(e) => setFilterValue(filter.key, e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 text-sm bg-white min-w-[140px] disabled:opacity-50"
                        disabled={loading || filter.isLoading}
                      >
                        <option value="all">{filter.label}</option>
                        {filter.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                            {option.count !== undefined && ` (${option.count})`}
                          </option>
                        ))}
                      </select>
                      {filter.isLoading && (
                        <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                      )}
                    </div>
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
                        disabled={loading}
                      />
                    </div>
                  )
                }
                
                return null
              })}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Table */}
        <div 
          ref={tableContainerRef}
          className="rounded-md border border-gray-200 relative"
          style={{
            height: enableVirtualization && rows.length > 50 ? '600px' : 'auto',
            overflow: enableVirtualization && rows.length > 50 ? 'auto' : 'visible'
          }}
        >
          <table className="w-full">
            <thead className="sticky top-0 bg-white z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b bg-gray-50">
                  {headerGroup.headers.map((header) => (
                    <th 
                      key={header.id} 
                      className="px-4 py-3 text-left font-medium text-gray-900"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={
                            header.column.getCanSort()
                              ? 'cursor-pointer select-none flex items-center hover:bg-gray-100 rounded px-2 py-1 -mx-2 -my-1'
                              : ''
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <span className="ml-2">
                              {header.column.getIsSorted() === 'asc' ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : header.column.getIsSorted() === 'desc' ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronsUpDown className="w-4 h-4 opacity-50" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {enableVirtualization && rows.length > 50 ? (
                <>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = rows[virtualRow.index]
                    return (
                      <tr
                        key={row.id}
                        style={{
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors absolute w-full"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td 
                            key={cell.id} 
                            className="px-4 py-4"
                            style={{ width: cell.column.getSize() }}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                  <tr style={{ height: `${rowVirtualizer.getTotalSize()}px` }} />
                </>
              ) : rows?.length ? (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td 
                        key={cell.id} 
                        className="px-4 py-4"
                        style={{ width: cell.column.getSize() }}
                      >
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
            {serverPagination ? (
              `Menampilkan ${(serverPagination.currentPage - 1) * serverPagination.pageSize + 1} hingga ${Math.min(serverPagination.currentPage * serverPagination.pageSize, serverPagination.total)} dari ${serverPagination.total} hasil`
            ) : (
              `Menampilkan ${table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} hingga ${Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )} dari ${table.getFilteredRowModel().rows.length} hasil`
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => serverPagination ? serverPagination.onPageChange(1) : table.setPageIndex(0)}
              disabled={serverPagination ? !serverPagination.hasPrevPage : !table.getCanPreviousPage()}
              className="border-gray-200 hover:border-gray-300"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => serverPagination ? serverPagination.onPrevPage() : table.previousPage()}
              disabled={serverPagination ? !serverPagination.hasPrevPage : !table.getCanPreviousPage()}
              className="border-gray-200 hover:border-gray-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {serverPagination && (
              <div className="flex items-center space-x-1">
                <span className="text-sm text-gray-500">Halaman</span>
                <span className="font-medium">{serverPagination.currentPage}</span>
                <span className="text-sm text-gray-500">dari</span>
                <span className="font-medium">{serverPagination.totalPages}</span>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => serverPagination ? serverPagination.onNextPage() : table.nextPage()}
              disabled={serverPagination ? !serverPagination.hasNextPage : !table.getCanNextPage()}
              className="border-gray-200 hover:border-gray-300"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => serverPagination ? serverPagination.onPageChange(serverPagination.totalPages) : table.setPageIndex(table.getPageCount() - 1)}
              disabled={serverPagination ? !serverPagination.hasNextPage : !table.getCanNextPage()}
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

OptimizedDataTableComponent.displayName = 'OptimizedDataTable'

export const OptimizedDataTable = OptimizedDataTableComponent

// Helper function to create sortable header
export function createSortableHeader(title: string) {
  const SortableHeader = ({ column }: { column: any }) => (
    <div className="flex items-center">
      {title}
    </div>
  )
  
  SortableHeader.displayName = `SortableHeader_${title}`
  
  return SortableHeader
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
  if (amount === 0) {
    return '-'
  }
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