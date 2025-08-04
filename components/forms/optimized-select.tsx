'use client'

import { useState, useEffect } from 'react'
import { Command, CommandEmpty, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Check, ChevronsUpDown, Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VirtualSelectList } from '@/components/search'
import { useDebounceStoreSearch, useDebounceProductSearch, useDebouncesSalesSearch } from '@/lib/hooks/use-debounced-search'

interface OptimizedSelectProps {
  value?: string | number
  onValueChange: (value: string | number) => void
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
  type: 'store' | 'product' | 'sales'
  filters?: Record<string, any>
  displayField?: string
  valueField?: string
  renderItem?: (item: any, index: number) => React.ReactElement
  maxHeight?: number
}

export function OptimizedSelect({
  value,
  onValueChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  disabled = false,
  className,
  type,
  filters = {},
  displayField = 'nama',
  valueField = 'id',
  renderItem,
  maxHeight = 300,
}: OptimizedSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItem, setSelectedItem] = useState<any>(null)

  // Call all hooks unconditionally and use the appropriate one
  const storeSearch = useDebounceStoreSearch(searchTerm, filters)
  const productSearch = useDebounceProductSearch(searchTerm, filters.priorityOnly)
  const salesSearch = useDebouncesSalesSearch(searchTerm, filters.activeOnly)
  
  // Select the appropriate search result based on type
  const { data: searchResults, isLoading } = (() => {
    switch (type) {
      case 'store':
        return storeSearch
      case 'product':
        return productSearch
      case 'sales':
        return salesSearch
      default:
        return { data: [], isLoading: false }
    }
  })()

  // Find selected item when value changes
  useEffect(() => {
    if (value && searchResults) {
      const item = searchResults.find((item: any) => item[valueField] === value)
      setSelectedItem(item)
    }
  }, [value, searchResults, valueField])

  const handleSelect = (item: any) => {
    setSelectedItem(item)
    onValueChange(item[valueField])
    setOpen(false)
    setSearchTerm('')
  }

  const getDisplayText = () => {
    if (selectedItem) {
      return selectedItem[displayField] || selectedItem.nama || selectedItem.name
    }
    return placeholder
  }

  const defaultRenderItem = (item: any, index: number) => {
    const isSelected = selectedItem && selectedItem[valueField] === item[valueField]
    
    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">
            {item[displayField] || item.nama || item.name}
          </div>
          {item.subtitle && (
            <div className="text-sm text-muted-foreground truncate">
              {item.subtitle}
            </div>
          )}
          {type === 'product' && item.harga_satuan && (
            <div className="text-sm text-muted-foreground">
              Rp {item.harga_satuan.toLocaleString("id-ID")}
              {item.sisa_stok !== undefined && ` • Stok: ${item.sisa_stok}`}
            </div>
          )}
          {type === 'store' && (item.kecamatan || item.kabupaten) && (
            <div className="text-sm text-muted-foreground">
              {[item.kecamatan, item.kabupaten].filter(Boolean).join(', ')}
            </div>
          )}
          {type === 'sales' && item.nomor_telepon && (
            <div className="text-sm text-muted-foreground">
              {item.nomor_telepon}
            </div>
          )}
        </div>
        <Check
          className={cn(
            'ml-2 h-4 w-4',
            isSelected ? 'opacity-100' : 'opacity-0'
          )}
        />
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between',
            !selectedItem && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            {isLoading && (
              <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin" />
            )}
          </div>
          <CommandList>
            {searchTerm.length < 2 ? (
              <CommandEmpty>Type at least 2 characters to search</CommandEmpty>
            ) : isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm">Searching...</span>
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <VirtualSelectList
                items={searchResults}
                renderItem={renderItem || defaultRenderItem}
                onSelect={handleSelect}
                selectedItem={selectedItem}
                maxHeight={maxHeight}
              />
            ) : (
              <CommandEmpty>No results found</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Specialized components for different entity types
export function StoreSelect(props: Omit<OptimizedSelectProps, 'type'>) {
  return (
    <OptimizedSelect
      {...props}
      type="store"
      displayField="nama_toko"
      valueField="id_toko"
      searchPlaceholder="Search stores..."
    />
  )
}

export function ProductSelect(props: Omit<OptimizedSelectProps, 'type'>) {
  return (
    <OptimizedSelect
      {...props}
      type="product"
      displayField="nama_produk"
      valueField="id_produk"
      searchPlaceholder="Search products..."
    />
  )
}

export function SalesSelect(props: Omit<OptimizedSelectProps, 'type'>) {
  return (
    <OptimizedSelect
      {...props}
      type="sales"
      displayField="nama_sales"
      valueField="id_sales"
      searchPlaceholder="Search sales..."
    />
  )
}

// Multi-select variant for bulk operations
interface OptimizedMultiSelectProps extends Omit<OptimizedSelectProps, 'value' | 'onValueChange'> {
  values: Array<string | number>
  onValuesChange: (values: Array<string | number>) => void
  maxSelections?: number
}

export function OptimizedMultiSelect({
  values,
  onValuesChange,
  maxSelections,
  ...props
}: OptimizedMultiSelectProps) {
  const [selectedItems, setSelectedItems] = useState<any[]>([])

  const handleSelect = (item: any) => {
    const valueField = props.valueField || 'id'
    const itemValue = item[valueField]
    
    if (values.includes(itemValue)) {
      // Remove from selection
      const newValues = values.filter(v => v !== itemValue)
      const newItems = selectedItems.filter(i => i[valueField] !== itemValue)
      onValuesChange(newValues)
      setSelectedItems(newItems)
    } else if (!maxSelections || values.length < maxSelections) {
      // Add to selection
      const newValues = [...values, itemValue]
      const newItems = [...selectedItems, item]
      onValuesChange(newValues)
      setSelectedItems(newItems)
    }
  }

  const getDisplayText = () => {
    if (selectedItems.length === 0) return props.placeholder
    if (selectedItems.length === 1) {
      const displayField = props.displayField || 'nama'
      return selectedItems[0][displayField]
    }
    return `${selectedItems.length} items selected`
  }

  return (
    <OptimizedSelect
      {...props}
      value={undefined}
      onValueChange={handleSelect}
      placeholder={getDisplayText()}
      renderItem={(item, index) => {
        const valueField = props.valueField || 'id'
        const isSelected = values.includes(item[valueField])
        const displayField = props.displayField || 'nama'
        
        return (
          <div className="flex items-center justify-between w-full">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {item[displayField]}
              </div>
            </div>
            <Check
              className={cn(
                'ml-2 h-4 w-4',
                isSelected ? 'opacity-100' : 'opacity-0'
              )}
            />
          </div>
        )
      }}
    />
  )
}