import { type ColumnDef } from '@tanstack/react-table'
import React from 'react'

// Standard column width configurations
export const COLUMN_SIZES = {
  xs: 60,    // ID, Status dots, Icons
  sm: 80,    // Short codes, Priority numbers
  md: 100,   // Dates, Small numbers
  lg: 120,   // Prices, Phone numbers
  xl: 140,   // Names (short), Methods
  '2xl': 160, // Names (medium)
  '3xl': 180, // Names (long), Addresses
  '4xl': 200, // Complex names, Full addresses
  flex: undefined, // Auto-sizing columns
} as const

// Responsive column configurations for different screen sizes
export const RESPONSIVE_COLUMNS = {
  mobile: {
    hiddenColumns: ['dibuat_pada', 'diperbarui_pada', 'keterangan'],
    compactColumns: ['status', 'metode', 'priority'],
  },
  tablet: {
    hiddenColumns: ['diperbarui_pada'],
    compactColumns: [],
  },
  desktop: {
    hiddenColumns: [],
    compactColumns: [],
  },
} as const

// Helper function to create optimized column definitions
export function createOptimizedColumn<T>(
  accessorKey: keyof T,
  header: string,
  options: {
    size?: keyof typeof COLUMN_SIZES | number
    cell?: (props: { row: { original: T }; getValue: (key: keyof T) => any }) => React.ReactNode
    enableSorting?: boolean
    enableHiding?: boolean
    hideOnMobile?: boolean
    hideOnTablet?: boolean
    meta?: {
      align?: 'left' | 'center' | 'right'
      priority?: 'high' | 'medium' | 'low'
    }
  } = {}
): ColumnDef<T> {
  const {
    size = 'flex',
    cell,
    enableSorting = true,
    enableHiding = true,
    hideOnMobile = false,
    hideOnTablet = false,
    meta = {},
  } = options

  const columnSize = typeof size === 'string' ? COLUMN_SIZES[size] : size

  return {
    accessorKey: accessorKey as string,
    header,
    size: columnSize,
    cell,
    enableSorting,
    enableHiding,
    meta: {
      ...meta,
      hideOnMobile,
      hideOnTablet,
    },
  }
}

// Standard cell renderers for common data types
export const cellRenderers = {
  // ID renderer with proper formatting
  id: (value: number | string, prefix: string = '#') => (
    <div className="text-center">
      <div className="font-mono text-sm font-medium text-gray-900">
        {prefix}{value}
      </div>
    </div>
  ),

  // Name renderer with truncation
  name: (value: string, subtitle?: string) => (
    <div className="min-w-0">
      <div className="font-medium text-gray-900 truncate">{value}</div>
      {subtitle && (
        <div className="text-xs text-gray-500 truncate">{subtitle}</div>
      )}
    </div>
  ),

  // Status badge renderer
  status: (active: boolean, activeLabel: string = 'AKTIF', inactiveLabel: string = 'NON') => (
    <div className="text-center">
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
        active 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        {active ? activeLabel : inactiveLabel}
      </span>
    </div>
  ),

  // Currency renderer
  currency: (amount: number, alignment: 'left' | 'right' | 'center' = 'right') => (
    <div className={`text-${alignment}`}>
      <div className="text-sm font-medium text-gray-900">
        {new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0
        }).format(amount)}
      </div>
    </div>
  ),

  // Number renderer
  number: (value: number, suffix?: string, alignment: 'left' | 'right' | 'center' = 'center') => (
    <div className={`text-${alignment}`}>
      <div className="text-sm font-medium text-gray-900">
        {new Intl.NumberFormat("id-ID").format(value)}{suffix ? ` ${suffix}` : ""}
      </div>
    </div>
  ),

  // Date renderer
  date: (dateString: string, format: 'short' | 'long' = 'short') => {
    const date = new Date(dateString)
    const options = format === 'short' 
      ? { day: '2-digit', month: '2-digit', year: '2-digit' } as const
      : { day: '2-digit', month: 'short', year: 'numeric' } as const

    return (
      <div className="text-center">
        <div className="text-sm font-medium text-gray-900">
          {date.toLocaleDateString("id-ID", options)}
        </div>
        {format === 'long' && (
          <div className="text-xs text-gray-500">
            {date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>
    )
  },

  // Link renderer
  link: (text: string, href: string, external: boolean = true) => (
    <a
      href={href}
      target={external ? '_blank' : '_self'}
      rel={external ? 'noopener noreferrer' : undefined}
      onClick={(e) => e.stopPropagation()}
      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 w-fit"
    >
      {external && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      )}
      {text}
    </a>
  ),

  // Multi-value renderer for statistics
  multiValue: (values: Array<{ label: string; value: string | number; color?: string }>) => (
    <div className="text-center space-y-1">
      {values.map((item, index) => (
        <div key={index} className="flex justify-between text-xs">
          <span className="text-gray-600">{item.label}:</span>
          <span className={`font-medium ${item.color || "text-gray-900"}`}>
            {typeof item.value === 'number' 
              ? new Intl.NumberFormat("id-ID").format(item.value)
              : item.value
            }
          </span>
        </div>
      ))}
    </div>
  ),

  // Badge renderer for categories/methods
  badge: (value: string, variant: 'default' | 'success' | 'warning' | 'error' = 'default') => {
    const variants = {
      default: 'border-gray-200 text-gray-700 bg-gray-50',
      success: 'border-green-200 text-green-700 bg-green-50',
      warning: 'border-yellow-200 text-yellow-700 bg-yellow-50',
      error: 'border-red-200 text-red-700 bg-red-50',
    }

    return (
      <div className="text-center">
        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${variants[variant]}`}>
          {value}
        </span>
      </div>
    )
  },
}

// Table configuration presets for different page types
export const tablePresets = {
  // Master data tables (sales, products, stores)
  masterData: {
    enableSorting: true,
    enableColumnVisibility: true,
    enableRowSelection: false,
    enablePagination: true,
    defaultPageSize: 25,
    stickyHeader: true,
  },

  // Transaction tables (shipments, billing, deposits)
  transactions: {
    enableSorting: true,
    enableColumnVisibility: true,
    enableRowSelection: true,
    enablePagination: true,
    defaultPageSize: 20,
    stickyHeader: true,
  },

  // Report tables
  reports: {
    enableSorting: true,
    enableColumnVisibility: true,
    enableRowSelection: false,
    enablePagination: true,
    defaultPageSize: 50,
    stickyHeader: false,
  },
}

// Utility function to get responsive classes
export function getResponsiveClasses(
  hideOnMobile: boolean = false,
  hideOnTablet: boolean = false,
  priority: 'high' | 'medium' | 'low' = 'medium'
): string {
  const classes = []

  if (hideOnMobile) classes.push('hidden md:table-cell')
  if (hideOnTablet) classes.push('hidden lg:table-cell')
  
  // Priority-based hiding for very small screens
  if (priority === 'low') classes.push('hidden sm:table-cell')
  if (priority === 'medium') classes.push('hidden xs:table-cell')

  return classes.join(' ')
}

// Calculate optimal column widths based on content
export function calculateColumnWidths<T>(
  data: T[],
  columns: ColumnDef<T>[],
  containerWidth: number
): Record<string, number> {
  const baseWidths: Record<string, number> = {}
  const totalFixedWidth = columns.reduce((sum, col) => {
    if (col.size && typeof col.size === 'number') {
      return sum + col.size
    }
    return sum
  }, 0)

  const flexColumns = columns.filter(col => !col.size || col.size === undefined)
  const remainingWidth = containerWidth - totalFixedWidth
  const flexColumnWidth = Math.max(120, remainingWidth / flexColumns.length)

  columns.forEach(col => {
    const key = (col as any).accessorKey as string
    if (key && col.size && typeof col.size === 'number') {
      baseWidths[key] = col.size
    } else if (key) {
      baseWidths[key] = flexColumnWidth
    }
  })

  return baseWidths
}