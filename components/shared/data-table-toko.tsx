'use client'

import React, { useMemo, useState, useCallback } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  MoreHorizontal,
  Plus,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  RefreshCw
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

// Types
interface PaginationInfo {
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

interface TableAction<T> {
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: (row: T) => void
  variant?: 'view' | 'edit' | 'delete' | 'custom'
  className?: string
  disabled?: (row: T) => boolean
}

interface HighPerformanceDataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  title?: string
  description?: string
  searchComponent?: React.ReactNode
  actions?: TableAction<T>[]
  onAdd?: () => void
  onRefresh?: () => void
  onExport?: () => void
  addButtonLabel?: string
  loading?: boolean
  error?: string
  emptyStateMessage?: string
  emptyStateIcon?: React.ComponentType<{ className?: string }>
  pagination?: PaginationInfo
  enableVirtualization?: boolean
  enableRowSelection?: boolean
  enableColumnVisibility?: boolean
  enableSorting?: boolean
  maxHeight?: string
  className?: string
  customActions?: React.ReactNode[]
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string
  cellClassName?: (column: string, row: T) => string
}

// Action button variants
const actionVariants = {
  view: 'text-blue-600 hover:text-blue-800 hover:bg-blue-50',
  edit: 'text-green-600 hover:text-green-800 hover:bg-green-50',
  delete: 'text-red-600 hover:text-red-800 hover:bg-red-50',
  custom: 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
}

// Table animations
const tableVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      staggerChildren: 0.1
    }
  }
}

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3 }
  },
  hover: {
    backgroundColor: '#f8fafc',
    transition: { duration: 0.2 }
  }
}

export function HighPerformanceDataTable<T>({
  data,
  columns,
  title,
  description,
  searchComponent,
  actions = [],
  onAdd,
  onRefresh,
  onExport,
  addButtonLabel = 'Tambah Data',
  loading = false,
  error,
  emptyStateMessage = 'Tidak ada data',
  emptyStateIcon: EmptyIcon,
  pagination,
  enableVirtualization = false,
  enableRowSelection = false,
  enableColumnVisibility = true,
  enableSorting = true,
  maxHeight = '600px',
  className,
  customActions = [],
  onRowClick,
  rowClassName,
  cellClassName
}: HighPerformanceDataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  // Add row selection column if enabled
  const enhancedColumns = useMemo(() => {
    const cols = [...columns]
    
    if (enableRowSelection) {
      cols.unshift({
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 50,
      })
    }

    // Add actions column if actions are provided
    if (actions.length > 0) {
      cols.push({
        id: 'actions',
        header: 'Aksi',
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => {
          const rowData = row.original

          return (
            <div className="flex items-center justify-start gap-1">
              {actions.map((action, index) => {
                const Icon = action.icon
                const isDisabled = action.disabled?.(rowData) || false
                
                return (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isDisabled) {
                        action.onClick(rowData)
                      }
                    }}
                    disabled={isDisabled}
                    className={cn(
                      'p-2 rounded-md transition-colors duration-200',
                      action.variant ? actionVariants[action.variant] : actionVariants.custom,
                      isDisabled && 'opacity-50 cursor-not-allowed',
                      action.className
                    )}
                    title={action.label}
                  >
                    <Icon className="w-4 h-4" />
                  </motion.button>
                )
              })}
            </div>
          )
        },
        size: 120,
        minSize: 100,
        maxSize: 150,
      })
    }

    return cols
  }, [columns, enableRowSelection, actions])

  const table = useReactTable({
    data,
    columns: enhancedColumns,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    manualPagination: !!pagination,
    state: {
      sorting: enableSorting ? sorting : [],
      rowSelection: enableRowSelection ? rowSelection : {},
      columnVisibility,
    },
  })

  // Virtual scrolling setup
  const tableContainerRef = React.useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 60,
    enabled: enableVirtualization && data.length > 50,
  })

  const handleRowClick = useCallback((row: T) => {
    if (onRowClick) {
      onRowClick(row)
    }
  }, [onRowClick])

  // Loading state
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn('bg-white rounded-lg border shadow-sm', className)}
      >
        <div className="p-6">
          {(title || description) && (
            <div className="mb-6">
              {title && <h2 className="text-2xl font-bold text-gray-900">{title}</h2>}
              {description && <p className="text-gray-600 mt-1">{description}</p>}
            </div>
          )}
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-gray-500">Memuat data...</p>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  // Error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn('bg-white rounded-lg border shadow-sm', className)}
      >
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              {onRefresh && (
                <Button onClick={onRefresh} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Coba Lagi
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  const hasHeaderContent = !!title || !!description || !!searchComponent || customActions.length > 0 || !!onExport || enableColumnVisibility || !!onAdd;

  return (
    <motion.div
      variants={tableVariants}
      initial="hidden"
      animate="visible"
      className={cn('bg-white rounded-lg border shadow-sm w-full max-w-full overflow-hidden', className)}
    >
      {/* Header */}
    {hasHeaderContent && (
      <div className="p-6 border-b">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            {title && <h2 className="text-2xl font-bold text-gray-900">{title}</h2>}
            {description && <p className="text-gray-600 mt-1">{description}</p>}
          </div>

          <div className="flex items-center gap-3">
            {/* Custom Actions */}
            {customActions.map((action, index) => (
              <React.Fragment key={index}>{action}</React.Fragment>
            ))}

            {/* Export Button */}
            {onExport && (
              <Button variant="outline" onClick={onExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}



            {/* Column Visibility */}
            {enableColumnVisibility && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Kolom
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Tampilkan Kolom</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        >
                          {column.id}
                        </DropdownMenuCheckboxItem>
                      )
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Add Button */}
            {onAdd && (
              <Button onClick={onAdd}>
                <Plus className="w-4 h-4 mr-2" />
                {addButtonLabel}
              </Button>
            )}
          </div>
        </div>

        {/* Search Component */}
        {searchComponent && (
          <div className="mt-4">
            {searchComponent}
          </div>
        )}
      </div>
    )}

      {/* Table Container */}
      <div 
        ref={tableContainerRef}
        className="w-full max-w-full"
      >
        <Table className="w-full table-fixed">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const isSorted = header.column.getIsSorted()

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'font-semibold text-left px-4 py-3',
                        'border-b border-gray-200',
                        'bg-gray-50/50',
                        canSort && 'cursor-pointer select-none hover:bg-gray-100'
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      style={{
                        width: header.column.columnDef.size ? `${header.column.columnDef.size}px` : 'auto',
                        minWidth: header.column.columnDef.minSize ? `${header.column.columnDef.minSize}px` : 'auto',
                        maxWidth: header.column.columnDef.maxSize ? `${header.column.columnDef.maxSize}px` : 'auto'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        
                        {canSort && (
                          <motion.div
                            animate={{ 
                              rotate: isSorted === 'desc' ? 180 : 0,
                              opacity: isSorted ? 1 : 0.5
                            }}
                            transition={{ duration: 0.2 }}
                          >
                            {isSorted === 'asc' ? (
                              <ArrowUp className="w-4 h-4" />
                            ) : isSorted === 'desc' ? (
                              <ArrowDown className="w-4 h-4" />
                            ) : (
                              <ArrowUpDown className="w-4 h-4" />
                            )}
                          </motion.div>
                        )}
                      </div>
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {/* Empty State */}
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={enhancedColumns.length} className="h-64">
                  <div className="flex flex-col items-center justify-center text-center">
                    {EmptyIcon && <EmptyIcon className="w-12 h-12 text-gray-400 mb-4" />}
                    <p className="text-gray-500 text-lg font-medium">{emptyStateMessage}</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Belum ada data untuk ditampilkan
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : enableVirtualization && data.length > 50 ? (
              // Virtual rows
              <>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const row = table.getRowModel().rows[virtualRow.index]
                  return (
                    <motion.tr
                      key={row.id}
                      variants={rowVariants}
                      whileHover="hover"
                      data-index={virtualRow.index}
                      ref={(node) => virtualizer.measureElement(node)}
                      className={cn(
                        'cursor-pointer transition-colors',
                        rowClassName?.(row.original)
                      )}
                      onClick={() => handleRowClick(row.original)}
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start - (virtualizer.getVirtualItems()[0]?.start || 0)}px)`,
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell 
                          key={cell.id}
                          className={cn(
                            'px-4 py-3 text-left align-top',
                            'border-b border-gray-100',
                            'overflow-hidden text-ellipsis',
                            cellClassName?.(cell.column.id, row.original)
                          )}
                          style={{
                            width: cell.column.columnDef.size ? `${cell.column.columnDef.size}px` : 'auto',
                            minWidth: cell.column.columnDef.minSize ? `${cell.column.columnDef.minSize}px` : 'auto',
                            maxWidth: cell.column.columnDef.maxSize ? `${cell.column.columnDef.maxSize}px` : 'auto'
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </motion.tr>
                  )
                })}
              </>
            ) : (
              // Regular rows
              table.getRowModel().rows.map((row) => (
                <motion.tr
                  key={row.id}
                  variants={rowVariants}
                  whileHover="hover"
                  className={cn(
                    onRowClick && 'cursor-pointer',
                    'transition-colors',
                    rowClassName?.(row.original)
                  )}
                  onClick={() => onRowClick && handleRowClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id}
                      className={cn(
                        'px-4 py-3 text-left align-top',
                        'border-b border-gray-100',
                        'overflow-hidden text-ellipsis',
                        cellClassName?.(cell.column.id, row.original)
                      )}
                      style={{
                        width: cell.column.columnDef.size ? `${cell.column.columnDef.size}px` : 'auto',
                        minWidth: cell.column.columnDef.minSize ? `${cell.column.columnDef.minSize}px` : 'auto',
                        maxWidth: cell.column.columnDef.maxSize ? `${cell.column.columnDef.maxSize}px` : 'auto'
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="p-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Menampilkan {((pagination.currentPage - 1) * pagination.pageSize) + 1} - {Math.min(pagination.currentPage * pagination.pageSize, pagination.total)} dari {pagination.total} data
              {enableRowSelection && Object.keys(rowSelection).length > 0 && (
                <span className="ml-2">({Object.keys(rowSelection).length} dipilih)</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(1)}
                disabled={!pagination.hasPrevPage}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={pagination.onPrevPage}
                disabled={!pagination.hasPrevPage}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <span className="text-sm text-gray-700 px-3 py-1">
                Halaman {pagination.currentPage} dari {pagination.totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={pagination.onNextPage}
                disabled={!pagination.hasNextPage}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.totalPages)}
                disabled={!pagination.hasNextPage}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}