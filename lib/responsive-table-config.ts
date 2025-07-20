import { type ColumnDef } from '@tanstack/react-table'
import React from 'react'

// Responsive column sizing system with balanced widths
export interface ResponsiveColumnConfig {
  minWidth?: number
  maxWidth?: number
  flexGrow?: number
  flexShrink?: number
  flexBasis?: string | number
  hideOnMobile?: boolean
  hideOnTablet?: boolean
  priority?: 'high' | 'medium' | 'low'
  contentType?: 'text' | 'number' | 'currency' | 'date' | 'status' | 'action'
}

export interface TableLayoutConfig {
  containerPadding: number
  minColumnWidth: number
  actionColumnWidth: number
  gapBetweenColumns: number
}

// Standard layout configurations
export const LAYOUT_CONFIG: TableLayoutConfig = {
  containerPadding: 24, // px
  minColumnWidth: 80,   // px
  actionColumnWidth: 120, // px
  gapBetweenColumns: 16,  // px
}

// Column type configurations with balanced sizing
export const COLUMN_CONFIGS: Record<string, ResponsiveColumnConfig> = {
  // ID columns - short and compact
  id: {
    minWidth: 60,
    maxWidth: 80,
    flexGrow: 0,
    flexShrink: 0,
    contentType: 'text',
    priority: 'high',
  },
  
  // Name columns - flexible for long content
  name: {
    minWidth: 150,
    maxWidth: 300,
    flexGrow: 2,
    flexShrink: 1,
    contentType: 'text',
    priority: 'high',
  },
  
  // Description/Address columns - very flexible
  description: {
    minWidth: 200,
    maxWidth: 400,
    flexGrow: 3,
    flexShrink: 2,
    contentType: 'text',
    priority: 'medium',
  },
  
  // Status columns - compact
  status: {
    minWidth: 80,
    maxWidth: 100,
    flexGrow: 0,
    flexShrink: 0,
    contentType: 'status',
    priority: 'high',
  },
  
  // Number columns - medium width
  number: {
    minWidth: 80,
    maxWidth: 120,
    flexGrow: 1,
    flexShrink: 0,
    contentType: 'number',
    priority: 'medium',
  },
  
  // Currency columns - wider for formatting
  currency: {
    minWidth: 100,
    maxWidth: 150,
    flexGrow: 1,
    flexShrink: 0,
    contentType: 'currency',
    priority: 'high',
  },
  
  // Date columns - medium width
  date: {
    minWidth: 90,
    maxWidth: 120,
    flexGrow: 0,
    flexShrink: 0,
    contentType: 'date',
    priority: 'low',
    hideOnMobile: true,
  },
  
  // Phone columns - medium width
  phone: {
    minWidth: 120,
    maxWidth: 160,
    flexGrow: 1,
    flexShrink: 1,
    contentType: 'text',
    priority: 'medium',
  },
  
  // Stats/multi-value columns
  stats: {
    minWidth: 140,
    maxWidth: 200,
    flexGrow: 1,
    flexShrink: 1,
    contentType: 'text',
    priority: 'medium',
    hideOnMobile: true,
  },
}

// Calculate responsive column widths based on container size
export function calculateResponsiveWidths(
  columns: Array<{ key: string; config: ResponsiveColumnConfig }>,
  containerWidth: number,
  isMobile: boolean = false,
  isTablet: boolean = false
): Record<string, number> {
  // Filter out hidden columns based on screen size
  const visibleColumns = columns.filter(col => {
    if (isMobile && col.config.hideOnMobile) return false
    if (isTablet && col.config.hideOnTablet) return false
    return true
  })

  // Calculate available width
  const totalPadding = LAYOUT_CONFIG.containerPadding * 2
  const totalGaps = (visibleColumns.length - 1) * LAYOUT_CONFIG.gapBetweenColumns
  const actionWidth = LAYOUT_CONFIG.actionColumnWidth
  const availableWidth = containerWidth - totalPadding - totalGaps - actionWidth

  // Calculate minimum required width
  const minRequiredWidth = visibleColumns.reduce((sum, col) => 
    sum + (col.config.minWidth || LAYOUT_CONFIG.minColumnWidth), 0
  )

  // If not enough space, use minimum widths
  if (availableWidth < minRequiredWidth) {
    const widths: Record<string, number> = {}
    visibleColumns.forEach(col => {
      widths[col.key] = col.config.minWidth || LAYOUT_CONFIG.minColumnWidth
    })
    return widths
  }

  // Calculate flex-based widths
  const totalFlexGrow = visibleColumns.reduce((sum, col) => 
    sum + (col.config.flexGrow || 1), 0
  )

  const extraWidth = availableWidth - minRequiredWidth
  const widths: Record<string, number> = {}

  visibleColumns.forEach(col => {
    const minWidth = col.config.minWidth || LAYOUT_CONFIG.minColumnWidth
    const maxWidth = col.config.maxWidth || availableWidth
    const flexGrow = col.config.flexGrow || 1
    
    // Calculate flex-based additional width
    const additionalWidth = (extraWidth * flexGrow) / totalFlexGrow
    const calculatedWidth = minWidth + additionalWidth
    
    // Apply max width constraint
    widths[col.key] = Math.min(calculatedWidth, maxWidth)
  })

  return widths
}

// Create column definition with responsive configuration
export function createResponsiveColumn<T>(
  accessorKey: keyof T,
  header: string,
  configType: keyof typeof COLUMN_CONFIGS,
  customConfig?: Partial<ResponsiveColumnConfig>,
  cell?: (props: any) => React.ReactNode
): ColumnDef<T> & { responsiveConfig: ResponsiveColumnConfig } {
  const baseConfig = COLUMN_CONFIGS[configType]
  const config = { ...baseConfig, ...customConfig }

  return {
    accessorKey: accessorKey as string,
    header,
    cell,
    enableSorting: true,
    enableHiding: true,
    meta: {
      align: 'left', // Default to left alignment
      headerAlign: 'left',
    },
    responsiveConfig: config,
  }
}

// Get CSS styles for responsive columns
export function getColumnStyles(
  columnKey: string,
  widths: Record<string, number>,
  config: ResponsiveColumnConfig
): React.CSSProperties {
  const width = widths[columnKey]
  
  return {
    width: `${width}px`,
    minWidth: `${config.minWidth || LAYOUT_CONFIG.minColumnWidth}px`,
    maxWidth: config.maxWidth ? `${config.maxWidth}px` : undefined,
    textAlign: 'left',
    verticalAlign: 'top',
    padding: '12px 8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }
}

// Get header styles
export function getHeaderStyles(
  columnKey: string,
  widths: Record<string, number>,
  config: ResponsiveColumnConfig
): React.CSSProperties {
  return {
    ...getColumnStyles(columnKey, widths, config),
    fontWeight: '600',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  }
}

// Responsive cell content wrapper
export function responsiveCell(
  content: React.ReactNode,
  config: ResponsiveColumnConfig,
  allowWrap: boolean = false
): React.ReactNode {
  const baseClasses = 'text-left align-top'
  const wrapClasses = allowWrap ? 'whitespace-normal' : 'truncate'
  
  return (
    <div className={`${baseClasses} ${wrapClasses}`}>
      {content}
    </div>
  )
}

// Standard cell renderers with left alignment
export const leftAlignedRenderers = {
  id: (value: string | number, subtitle?: string) => responsiveCell(
    <div>
      <div className="font-mono text-sm font-medium text-gray-900">#{value}</div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
    </div>,
    COLUMN_CONFIGS.id
  ),

  name: (name: string, subtitle?: string, allowWrap: boolean = false) => responsiveCell(
    <div>
      <div className="font-medium text-gray-900">{name}</div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
    </div>,
    COLUMN_CONFIGS.name,
    allowWrap
  ),

  status: (active: boolean, activeText: string = 'Aktif', inactiveText: string = 'Tidak Aktif') => responsiveCell(
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
      active 
        ? 'bg-green-100 text-green-800' 
        : 'bg-red-100 text-red-800'
    }`}>
      {active ? activeText : inactiveText}
    </span>,
    COLUMN_CONFIGS.status
  ),

  currency: (amount: number) => responsiveCell(
    <div className="font-medium text-gray-900">
      {new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
      }).format(amount)}
    </div>,
    COLUMN_CONFIGS.currency
  ),

  number: (value: number, suffix?: string) => responsiveCell(
    <div className="font-medium text-gray-900">
      {new Intl.NumberFormat('id-ID').format(value)}{suffix ? ` ${suffix}` : ''}
    </div>,
    COLUMN_CONFIGS.number
  ),

  date: (dateString: string) => responsiveCell(
    <div className="text-sm text-gray-900">
      {new Date(dateString).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })}
    </div>,
    COLUMN_CONFIGS.date
  ),

  multiLine: (items: Array<{ label: string; value: string; color?: string }>) => responsiveCell(
    <div className="space-y-1">
      {items.map((item, index) => (
        <div key={index} className="text-xs">
          <span className="text-gray-600">{item.label}: </span>
          <span className={`font-medium ${item.color || 'text-gray-900'}`}>
            {item.value}
          </span>
        </div>
      ))}
    </div>,
    COLUMN_CONFIGS.stats,
    true
  ),
}

// Hook for responsive table management
export function useResponsiveTable(
  columns: Array<{ key: string; config: ResponsiveColumnConfig }>,
  containerRef: React.RefObject<HTMLElement>
) {
  const [widths, setWidths] = React.useState<Record<string, number>>({})
  const [isMobile, setIsMobile] = React.useState(false)
  const [isTablet, setIsTablet] = React.useState(false)

  React.useEffect(() => {
    function updateWidths() {
      if (!containerRef.current) return

      const containerWidth = containerRef.current.offsetWidth
      const mobile = window.innerWidth < 768
      const tablet = window.innerWidth < 1024

      setIsMobile(mobile)
      setIsTablet(tablet)

      const newWidths = calculateResponsiveWidths(columns, containerWidth, mobile, tablet)
      setWidths(newWidths)
    }

    updateWidths()

    const resizeObserver = new ResizeObserver(updateWidths)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    window.addEventListener('resize', updateWidths)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateWidths)
    }
  }, [columns, containerRef])

  return { widths, isMobile, isTablet }
}