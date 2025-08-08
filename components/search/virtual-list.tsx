'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, ReactElement } from 'react'
import { cn } from '@/lib/utils'

interface VirtualListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => ReactElement
  estimateSize?: number
  className?: string
  containerClassName?: string
  height?: number | string
  width?: number | string
  overscan?: number
  isLoading?: boolean
  loadingComponent?: ReactElement
  emptyComponent?: ReactElement
}

export function VirtualList<T>({
  items,
  renderItem,
  estimateSize = 60,
  className,
  containerClassName,
  height = 400,
  width = '100%',
  overscan = 5,
  isLoading = false,
  loadingComponent,
  emptyComponent,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  })

  if (isLoading && loadingComponent) {
    return loadingComponent
  }

  if (!isLoading && items.length === 0 && emptyComponent) {
    return emptyComponent
  }

  return (
    <div
      ref={parentRef}
      className={cn(
        'overflow-auto',
        containerClassName
      )}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: typeof width === 'number' ? `${width}px` : width,
      }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${virtualizer.getVirtualItems()[0]?.start ?? 0}px)`,
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className={className}
            >
              {renderItem(items[virtualItem.index], virtualItem.index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Specialized virtual list for form dropdowns
interface VirtualSelectListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => ReactElement
  onSelect: (item: T) => void
  selectedItem?: T
  className?: string
  maxHeight?: number
  isLoading?: boolean
}

export function VirtualSelectList<T>({
  items,
  renderItem,
  onSelect,
  selectedItem: _,
  className,
  maxHeight = 300,
  isLoading = false,
}: VirtualSelectListProps<T>) {
  const loadingComponent = (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
    </div>
  )

  const emptyComponent = (
    <div className="flex items-center justify-center p-4">
      <span className="text-sm text-muted-foreground">No items found</span>
    </div>
  )

  return (
    <VirtualList
      items={items}
      renderItem={(item, index) => (
        <div
          key={index}
          onClick={() => onSelect(item)}
          className={cn(
            'cursor-pointer hover:bg-accent hover:text-accent-foreground px-3 py-2 transition-colors',
            className
          )}
        >
          {renderItem(item, index)}
        </div>
      )}
      height={Math.min(maxHeight, items.length * 50)}
      containerClassName="border rounded-md bg-background shadow-md"
      estimateSize={50}
      isLoading={isLoading}
      loadingComponent={loadingComponent}
      emptyComponent={emptyComponent}
    />
  )
}

// Virtual list for data tables
interface VirtualTableListProps<T> {
  items: T[]
  renderRow: (item: T, index: number) => ReactElement
  headerComponent?: ReactElement
  className?: string
  rowHeight?: number
  maxHeight?: number
  isLoading?: boolean
  onLoadMore?: () => void
  hasNextPage?: boolean
}

export function VirtualTableList<T>({
  items,
  renderRow,
  headerComponent,
  className,
  rowHeight = 60,
  maxHeight = 600,
  isLoading: _ = false,
  onLoadMore,
  hasNextPage = false,
}: VirtualTableListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: hasNextPage ? items.length + 1 : items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  })

  // Load more items when scrolling near the end
  const lastItem = virtualizer.getVirtualItems()?.slice(-1)?.[0]
  if (lastItem && lastItem.index >= items.length - 1 && hasNextPage && onLoadMore) {
    onLoadMore()
  }

  return (
    <div className="w-full">
      {headerComponent}
      <div
        ref={parentRef}
        className={cn('overflow-auto', className)}
        style={{ height: `${maxHeight}px` }}
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualizer.getVirtualItems()[0]?.start ?? 0}px)`,
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const isLoaderRow = virtualItem.index > items.length - 1

              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{ height: `${rowHeight}px` }}
                  className="flex items-center"
                >
                  {isLoaderRow ? (
                    hasNextPage ? (
                      <div className="flex items-center justify-center w-full">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                        <span className="ml-2 text-sm text-muted-foreground">Loading more...</span>
                      </div>
                    ) : null
                  ) : (
                    renderRow(items[virtualItem.index], virtualItem.index)
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}