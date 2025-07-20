'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDebounce } from '@/lib/hooks/use-debounce'

// Types
interface SearchSuggestion {
  type: string
  value: string
  label: string
  metadata?: Record<string, any>
}

interface FilterOption {
  label: string
  value: string
  count?: number
}

interface SimpleSearchFilterProps {
  value: string
  onChange: (value: string) => void
  onFilterChange?: (filters: Record<string, string>) => void
  suggestions?: SearchSuggestion[]
  suggestionsLoading?: boolean
  filterOptions?: {
    sales?: FilterOption[]
    kabupaten?: FilterOption[]
    kecamatan?: FilterOption[]
    status_produk?: FilterOption[]
    is_priority?: FilterOption[]
    price_ranges?: FilterOption[]
    status_aktif?: FilterOption[]
    telepon_exists?: FilterOption[]
  }
  activeFilters?: Record<string, string>
  placeholder?: string
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void
}

export function SearchFilterToko({
  value,
  onChange,
  onFilterChange,
  suggestions = [],
  suggestionsLoading = false,
  filterOptions = {},
  activeFilters = {},
  placeholder = 'Cari...',
  onSuggestionSelect
}: SimpleSearchFilterProps) {
  
  const [localValue, setLocalValue] = useState(value || '')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debouncedValue = useDebounce(localValue, 300)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)



  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value || '')
  }, [value])

  // Handle debounced search
  useEffect(() => {
    if (debouncedValue !== value && typeof onChange === 'function') {
      console.log('Search value changed:', { debouncedValue, value })
      onChange(debouncedValue)
    }
  }, [debouncedValue, onChange, value])

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    setShowSuggestions(newValue.length > 0 && suggestions.length > 0)
  }, [suggestions.length])

  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion)
    } else {
      setLocalValue(suggestion.value)
      if (typeof onChange === 'function') onChange(suggestion.value)
    }
    setShowSuggestions(false)
  }, [onSuggestionSelect, onChange])

  const handleFilterSelect = useCallback((filterKey: string, filterValue: string) => {
    if (onFilterChange) {
      const newFilters = { ...activeFilters }
      if (filterValue) {
        newFilters[filterKey] = filterValue
      } else {
        delete newFilters[filterKey]
      }
      onFilterChange(newFilters)
    }
  }, [activeFilters, onFilterChange])

  const handleClearFilters = useCallback(() => {
    setLocalValue('')
    if (typeof onChange === 'function') onChange('')
    if (onFilterChange) onFilterChange({})
    setShowSuggestions(false)
  }, [onChange, onFilterChange])

  const hasActiveFilters = Object.keys(activeFilters).filter(key => activeFilters[key]).length > 0 || (localValue || '').trim().length > 0

  return (
    <div ref={containerRef} className="w-full space-y-4">
      

      {/* Main Search and Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6 gap-4 items-end">
        {/* Search Input Form - Takes 2 columns on larger screens */}
        <div className="relative lg:col-span-2 xl:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pencarian
          </label>
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-gray-400" />
            <Input
              ref={inputRef}
              type="text"
              value={localValue}
              onChange={handleInputChange}
              onFocus={() => setShowSuggestions(localValue.length > 0 && suggestions.length > 0)}
              placeholder={placeholder}
              className="pl-10 pr-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
            {suggestionsLoading && (
              <Loader2 className="absolute right-3 w-4 h-4 text-blue-500 animate-spin" />
            )}
            {localValue && !suggestionsLoading && (
              <button
                onClick={() => {
                  setLocalValue('')
                  if (typeof onChange === 'function') onChange('')
                }}
                className="absolute right-3 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>

          {/* Search Suggestions */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
              >
                {suggestions.slice(0, 8).map((suggestion, index) => (
                  <button
                    key={`${suggestion.type}-${suggestion.value}-${index}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 border-b last:border-b-0"
                  >
                    <span className="text-sm text-gray-500 min-w-[60px] capitalize">
                      {suggestion.type}
                    </span>
                    <span className="font-medium text-gray-900 truncate">
                      {suggestion.label}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sales Filter Dropdown */}
        {filterOptions.sales && filterOptions.sales.length > 0 && (
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sales
            </label>
            <select
              value={activeFilters.id_sales || ''}
              onChange={(e) => handleFilterSelect('id_sales', e.target.value)}
              className="w-full h-11 px-3 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="">Pilih Sales</option>
              {filterOptions.sales.slice(0, 20).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Kabupaten Filter Dropdown */}
        {filterOptions.kabupaten && filterOptions.kabupaten.length > 0 && (
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kabupaten
            </label>
            <select
              value={activeFilters.kabupaten || ''}
              onChange={(e) => handleFilterSelect('kabupaten', e.target.value)}
              className="w-full h-11 px-3 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="">Pilih Kabupaten</option>
              {filterOptions.kabupaten.slice(0, 20).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Kecamatan Filter Dropdown */}
        {filterOptions.kecamatan && filterOptions.kecamatan.length > 0 && (
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kecamatan
            </label>
            <select
              value={activeFilters.kecamatan || ''}
              onChange={(e) => handleFilterSelect('kecamatan', e.target.value)}
              className="w-full h-11 px-3 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="">Pilih Kecamatan</option>
              {filterOptions.kecamatan.slice(0, 20).map((option, index) => (
                <option key={`${option.value}-${index}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status Produk Filter Dropdown */}
        {filterOptions.status_produk && filterOptions.status_produk.length > 0 && (
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status Produk
            </label>
            <select
              value={activeFilters.status_produk || ''}
              onChange={(e) => handleFilterSelect('status_produk', e.target.value)}
              className="w-full h-11 px-3 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="">Pilih Status</option>
              {filterOptions.status_produk.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Priority Filter Dropdown */}
        {filterOptions.is_priority && filterOptions.is_priority.length > 0 && (
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prioritas
            </label>
            <select
              value={activeFilters.is_priority || ''}
              onChange={(e) => handleFilterSelect('is_priority', e.target.value)}
              className="w-full h-11 px-3 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="">Pilih Prioritas</option>
              {filterOptions.is_priority.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Price Range Filter Dropdown */}
        {filterOptions.price_ranges && filterOptions.price_ranges.length > 0 && (
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rentang Harga
            </label>
            <select
              value={activeFilters.price_range || ''}
              onChange={(e) => handleFilterSelect('price_range', e.target.value)}
              className="w-full h-11 px-3 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="">Pilih Rentang Harga</option>
              {filterOptions.price_ranges.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status Aktif Filter Dropdown */}
        {filterOptions.status_aktif && filterOptions.status_aktif.length > 0 && (
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status Sales
            </label>
            <select
              value={activeFilters.status_aktif || ''}
              onChange={(e) => handleFilterSelect('status_aktif', e.target.value)}
              className="w-full h-11 px-3 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="">Pilih Status</option>
              {filterOptions.status_aktif.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Telepon Exists Filter Dropdown */}
        {filterOptions.telepon_exists && filterOptions.telepon_exists.length > 0 && (
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nomor Telepon
            </label>
            <select
              value={activeFilters.telepon_exists || ''}
              onChange={(e) => handleFilterSelect('telepon_exists', e.target.value)}
              className="w-full h-11 px-3 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="">Pilih Status Telepon</option>
              {filterOptions.telepon_exists.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Clear All Button */}
        {hasActiveFilters && (
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2 invisible">
              Action
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="h-11 w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              <X className="w-4 h-4 mr-2" />
              Reset Filter
            </Button>
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap items-center gap-2"
          >
            <span className="text-sm text-gray-500">Filter aktif:</span>
            
            {localValue.trim() && (
              <Badge variant="outline" className="flex items-center gap-1">
                <span>Pencarian: {localValue}</span>
                <button
                  onClick={() => {
                    setLocalValue('')
                    if (typeof onChange === 'function') onChange('')
                  }}
                  className="hover:bg-gray-100 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {Object.entries(activeFilters)
              .filter(([_key, value]) => value)
              .map(([key, value]) => {
                const getLabel = () => {
                  switch (key) {
                    case 'id_sales':
                      const salesOption = filterOptions.sales?.find(s => s.value === value)
                      return `Sales: ${salesOption?.label || value}`
                    case 'kabupaten':
                      return `Kabupaten: ${value}`
                    case 'kecamatan':
                      return `Kecamatan: ${value}`
                    case 'status_produk':
                      const statusOption = filterOptions.status_produk?.find(s => s.value === value)
                      return `Status: ${statusOption?.label || value}`
                    case 'is_priority':
                      const priorityOption = filterOptions.is_priority?.find(s => s.value === value)
                      return `Prioritas: ${priorityOption?.label || value}`
                    case 'price_range':
                      const priceOption = filterOptions.price_ranges?.find(s => s.value === value)
                      return `Harga: ${priceOption?.label || value}`
                    case 'status_aktif':
                      const statusAktifOption = filterOptions.status_aktif?.find(s => s.value === value)
                      return `Status Sales: ${statusAktifOption?.label || value}`
                    case 'telepon_exists':
                      const teleponOption = filterOptions.telepon_exists?.find(s => s.value === value)
                      return `Telepon: ${teleponOption?.label || value}`
                    default:
                      return `${key}: ${value}`
                  }
                }

                return (
                  <Badge key={key} variant="outline" className="flex items-center gap-1">
                    <span>{getLabel()}</span>
                    <button
                      onClick={() => handleFilterSelect(key, '')}
                      className="hover:bg-gray-100 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )
              })
            }
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}