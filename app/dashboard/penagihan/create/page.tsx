'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Save, Receipt, Plus, X, Search, AlertCircle, DollarSign, User } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiClient } from '@/lib/api-client'
import { useSalesQuery } from '@/lib/queries/sales'
import { useCreatePenagihanMutation, penagihanKeys } from '@/lib/queries/penagihan'
import { penagihanOptimizedKeys } from '@/lib/queries/penagihan-optimized'
import { useQueryClient } from '@tanstack/react-query'

// Types
interface PriorityProduct {
  id_produk: number
  nama_produk: string
  harga_satuan: number
  priority_order: number
}

interface NonPriorityProduct {
  id_produk: number
  nama_produk: string
  harga_satuan: number
}

interface Store {
  id_toko: number
  nama_toko: string
  kecamatan: string
  kabupaten: string
}

interface StoreRow {
  id_toko: number
  nama_toko: string
  kecamatan: string
  kabupaten: string
  // Priority products: hanya terjual (kembali otomatis 0)
  priority_terjual: { [key: number]: number }
  // Non-priority items
  has_non_priority: boolean
  non_priority_items: Array<{
    id_produk: number
    jumlah_terjual: number
  }>
  // Additional shipment per store
  additional_shipment: {
    enabled: boolean
    priority_products: { [key: number]: number } // id_produk -> jumlah_kirim
    has_non_priority: boolean
    non_priority_details: Array<{
      id_produk: number
      jumlah_kirim: number
    }>
  }
  // Billing info per row
  total_uang_diterima: number
  metode_pembayaran: 'Cash' | 'Transfer'
  ada_potongan: boolean
  jumlah_potongan: number
  alasan_potongan: string
  tanggal_pembayaran: string // Format: YYYY-MM-DD
}

interface FormData {
  selectedSales: number | null
  autoRestock: boolean
}

export default function CreatePenagihanPage() {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const createMutation = useCreatePenagihanMutation()
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form data
  const [formData, setFormData] = useState<FormData>({
    selectedSales: null,
    autoRestock: true // Default to active
  })
  
  // Product and store data
  const [stores, setStores] = useState<Store[]>([])
  const [priorityProducts, setPriorityProducts] = useState<PriorityProduct[]>([])
  const [nonPriorityProducts, setNonPriorityProducts] = useState<NonPriorityProduct[]>([])
  const [storeRows, setStoreRows] = useState<StoreRow[]>([])
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredStores, setFilteredStores] = useState<Store[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const { data: salesResponse, isLoading: salesLoading, error: salesError } = useSalesQuery()
  const salesData = (salesResponse as any)?.data || []

  // Load products on mount
  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const [priorityResponse, nonPriorityResponse] = await Promise.all([
          apiClient.getPriorityProducts(),
          apiClient.getNonPriorityProducts()
        ])
        
        if ((priorityResponse as any).success) {
          setPriorityProducts((priorityResponse as any).data)
        } else {
          throw new Error((priorityResponse as any).message || 'Failed to load priority products')
        }
        
        if ((nonPriorityResponse as any).success) {
          setNonPriorityProducts((nonPriorityResponse as any).data)
        } else {
          throw new Error((nonPriorityResponse as any).message || 'Failed to load non-priority products')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load products'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    loadProducts()
  }, [toast])

  // Load stores when sales is selected - optimized without loading state
  useEffect(() => {
    const loadStores = async () => {
      if (!formData.selectedSales) {
        setStores([])
        setStoreRows([])
        setSearchQuery('')
        setFilteredStores([])
        return
      }

      // Don't show loading state to prevent page reload appearance
      setError(null)
      
      try {
        const response = await apiClient.getStoresBySales(formData.selectedSales)
        
        if ((response as any).success) {
          setStores((response as any).data.stores)
          setStoreRows([])
          setSearchQuery('')
          setFilteredStores([])
        } else {
          throw new Error((response as any).message || 'Failed to load stores')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load stores'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        })
      }
      // Removed setIsLoading(false) to prevent loading state
    }

    loadStores()
  }, [formData.selectedSales, toast])

  // Filter stores based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStores([])
      setShowSuggestions(false)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = stores.filter(store => 
      !storeRows.some(row => row.id_toko === store.id_toko) && (
        store.nama_toko.toLowerCase().includes(query) ||
        store.kecamatan.toLowerCase().includes(query) ||
        store.kabupaten.toLowerCase().includes(query)
      )
    )
    setFilteredStores(filtered)
    setShowSuggestions(true)
  }, [searchQuery, stores, storeRows])

  // Ensure all calculations are up to date when storeRows changes
  useEffect(() => {
    // This useEffect helps catch any calculation inconsistencies
    // by ensuring all totals are recalculated when the component re-renders
    storeRows.forEach((row, index) => {
      const calculatedTotal = calculateStoreTotal(row)
      const expectedTotal = calculatedTotal - (row.ada_potongan ? row.jumlah_potongan : 0)
      const actualTotal = row.total_uang_diterima
      
      // Only update if there's a significant difference (avoiding floating point precision issues)
      if (Math.abs(expectedTotal - actualTotal) > 0.01) {
        setStoreRows(prev => {
          const newRows = [...prev]
          newRows[index] = {
            ...newRows[index],
            total_uang_diterima: Math.max(0, expectedTotal)
          }
          return newRows
        })
      }
    })
  }, [storeRows.length, priorityProducts, nonPriorityProducts])

  // Update form data
  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  // Add store to table
  const addStoreToTable = (store: Store) => {
    if (storeRows.some(row => row.id_toko === store.id_toko)) {
      toast({
        title: 'Info',
        description: `Toko ${store.nama_toko} sudah ditambahkan`,
        variant: 'default'
      })
      return
    }

    const newStoreRow = {
      id_toko: store.id_toko,
      nama_toko: store.nama_toko,
      kecamatan: store.kecamatan,
      kabupaten: store.kabupaten,
      priority_terjual: {},
      has_non_priority: false,
      non_priority_items: [],
      additional_shipment: {
        enabled: false,
        priority_products: {},
        has_non_priority: false,
        non_priority_details: []
      },
      total_uang_diterima: 0,
      metode_pembayaran: 'Cash' as const,
      ada_potongan: false,
      jumlah_potongan: 0,
      alasan_potongan: '',
      tanggal_pembayaran: new Date().toISOString().split('T')[0] // Default ke tanggal hari ini
    }

    setStoreRows(prev => [...prev, newStoreRow])
    
    setSearchQuery('')
    setShowSuggestions(false)
    
    toast({
      title: 'Berhasil',
      description: `Toko ${store.nama_toko} berhasil ditambahkan`,
    })
  }

  // Remove store from table
  const removeStoreRow = (index: number) => {
    setStoreRows(prev => prev.filter((_, i) => i !== index))
  }

  // Update priority product quantities (only terjual)
  const updatePriorityQuantity = (storeIndex: number, productId: number, quantity: number) => {
    if (quantity < 0) return
    
    setStoreRows(prev => {
      const newRows = [...prev]
      const updatedRow = {
        ...newRows[storeIndex],
        priority_terjual: {
          ...newRows[storeIndex].priority_terjual,
          [productId]: quantity
        }
      }
      
      // Calculate total immediately with updated data
      const calculatedTotal = calculateStoreTotal(updatedRow)
      const totalAfterDiscount = calculatedTotal - (updatedRow.ada_potongan ? updatedRow.jumlah_potongan : 0)
      
      newRows[storeIndex] = {
        ...updatedRow,
        total_uang_diterima: Math.max(0, totalAfterDiscount)
      }
      
      return newRows
    })
  }

  // Update billing info
  const updateBillingInfo = (storeIndex: number, field: keyof Pick<StoreRow, 'total_uang_diterima' | 'metode_pembayaran' | 'ada_potongan' | 'jumlah_potongan' | 'alasan_potongan' | 'tanggal_pembayaran'>, value: any) => {
    setStoreRows(prev => {
      const newRows = [...prev]
      const updatedRow = {
        ...newRows[storeIndex],
        [field]: value
      }
      
      // Auto-recalculate total when discount changes
      if (field === 'ada_potongan' || field === 'jumlah_potongan') {
        const calculatedTotal = calculateStoreTotal(updatedRow)
        const totalAfterDiscount = calculatedTotal - (updatedRow.ada_potongan ? updatedRow.jumlah_potongan : 0)
        
        updatedRow.total_uang_diterima = Math.max(0, totalAfterDiscount)
      }
      
      newRows[storeIndex] = updatedRow
      return newRows
    })
  }

  // Toggle non-priority items
  const toggleNonPriority = (storeIndex: number, checked: boolean) => {
    setStoreRows(prev => {
      const newRows = [...prev]
      newRows[storeIndex] = {
        ...newRows[storeIndex],
        has_non_priority: checked,
        non_priority_items: checked ? newRows[storeIndex].non_priority_items : []
      }
      return newRows
    })
  }

  // Add non-priority item
  const addNonPriorityItem = (storeIndex: number) => {
    setStoreRows(prev => {
      const newRows = [...prev]
      newRows[storeIndex] = {
        ...newRows[storeIndex],
        non_priority_items: [
          ...newRows[storeIndex].non_priority_items,
          { id_produk: 0, jumlah_terjual: 0 }
        ]
      }
      return newRows
    })
  }

  // Update non-priority item
  const updateNonPriorityItem = (storeIndex: number, itemIndex: number, field: 'id_produk' | 'jumlah_terjual', value: number) => {
    if (field === 'jumlah_terjual' && value < 0) return
    
    setStoreRows(prev => {
      const newRows = [...prev]
      const newItems = [...newRows[storeIndex].non_priority_items]
      newItems[itemIndex] = {
        ...newItems[itemIndex],
        [field]: value
      }
      
      const updatedRow = {
        ...newRows[storeIndex],
        non_priority_items: newItems
      }
      
      // Calculate total immediately with updated data
      const calculatedTotal = calculateStoreTotal(updatedRow)
      const totalAfterDiscount = calculatedTotal - (updatedRow.ada_potongan ? updatedRow.jumlah_potongan : 0)
      
      newRows[storeIndex] = {
        ...updatedRow,
        total_uang_diterima: Math.max(0, totalAfterDiscount)
      }
      
      return newRows
    })
  }

  // Remove non-priority item
  const removeNonPriorityItem = (storeIndex: number, itemIndex: number) => {
    setStoreRows(prev => {
      const newRows = [...prev]
      const updatedRow = {
        ...newRows[storeIndex],
        non_priority_items: newRows[storeIndex].non_priority_items.filter((_, i) => i !== itemIndex)
      }
      
      // Calculate total immediately with updated data
      const calculatedTotal = calculateStoreTotal(updatedRow)
      const totalAfterDiscount = calculatedTotal - (updatedRow.ada_potongan ? updatedRow.jumlah_potongan : 0)
      
      newRows[storeIndex] = {
        ...updatedRow,
        total_uang_diterima: Math.max(0, totalAfterDiscount)
      }
      
      return newRows
    })
  }

  // Calculate total nilai for a store
  const calculateStoreTotal = (row: StoreRow) => {
    let total = 0
    
    // Priority products
    for (const [productId, terjual] of Object.entries(row.priority_terjual)) {
      const product = priorityProducts.find(p => p.id_produk === parseInt(productId))
      if (product && terjual > 0) {
        total += terjual * product.harga_satuan
      }
    }
    
    // Non-priority products
    for (const item of row.non_priority_items) {
      const product = nonPriorityProducts.find(p => p.id_produk === item.id_produk)
      if (product) {
        total += item.jumlah_terjual * product.harga_satuan
      }
    }
    
    return total
  }

  // Auto-update total money received when products change
  const updateStoreTotal = (storeIndex: number, updatedRow?: StoreRow) => {
    setStoreRows(prev => {
      const newRows = [...prev]
      const row = updatedRow || newRows[storeIndex]
      const calculatedTotal = calculateStoreTotal(row)
      // Auto-calculate should consider discount
      const totalAfterDiscount = calculatedTotal - (row.ada_potongan ? row.jumlah_potongan : 0)
      
      newRows[storeIndex] = {
        ...row,
        total_uang_diterima: Math.max(0, totalAfterDiscount) // Ensure non-negative
      }
      return newRows
    })
  }

  // Validate form
  const validateForm = (): string | null => {
    if (!formData.selectedSales) return 'Silakan pilih sales'
    if (storeRows.length === 0) return 'Silakan tambahkan minimal satu toko'
    
    // Check if at least one store has items and payment info
    for (const row of storeRows) {
      const hasPriorityItems = Object.values(row.priority_terjual).some(qty => qty > 0)
      const hasNonPriorityItems = row.non_priority_items.some(item => 
        item.id_produk > 0 && item.jumlah_terjual > 0
      )
      
      if (!hasPriorityItems && !hasNonPriorityItems) {
        return `Toko ${row.nama_toko} harus memiliki minimal satu item`
      }
      
      if (row.total_uang_diterima < 0) {
        return `Total uang diterima untuk toko ${row.nama_toko} tidak boleh negatif`
      }
      
      if (row.ada_potongan && row.jumlah_potongan < 0) {
        return `Jumlah potongan untuk toko ${row.nama_toko} tidak boleh negatif`
      }
      
      // Validate non-priority items
      for (const item of row.non_priority_items) {
        if (item.id_produk === 0 && item.jumlah_terjual > 0) {
          return `Silakan pilih produk untuk toko ${row.nama_toko}`
        }
      }
    }
    
    return null
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      toast({
        title: 'Error',
        description: validationError,
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)
    setError(null)
    
    try {
      // Process each store as separate billing
      for (const row of storeRows) {
        const details = []
        
        // Add priority products (kembali always 0)
        for (const [productId, terjual] of Object.entries(row.priority_terjual)) {
          if (terjual > 0) {
            details.push({
              id_produk: parseInt(productId),
              jumlah_terjual: terjual,
              jumlah_kembali: 0  // Always 0 for penagihan
            })
          }
        }
        
        // Add non-priority products (kembali always 0)
        for (const item of row.non_priority_items) {
          if (item.id_produk > 0 && item.jumlah_terjual > 0) {
            details.push({
              id_produk: item.id_produk,
              jumlah_terjual: item.jumlah_terjual,
              jumlah_kembali: 0  // Always 0 for penagihan
            })
          }
        }
        
        if (details.length === 0) continue
        
        const billingData = {
          id_toko: row.id_toko,
          total_uang_diterima: row.total_uang_diterima,
          metode_pembayaran: row.metode_pembayaran,
          tanggal_pembayaran: row.tanggal_pembayaran,
          details,
          potongan: row.ada_potongan ? {
            jumlah_potongan: row.jumlah_potongan,
            alasan: row.alasan_potongan || undefined
          } : undefined,
          auto_restock: formData.autoRestock,
          additional_shipment: row.additional_shipment.enabled ? {
            enabled: true,
            details: [
              // Priority products
              ...Object.entries(row.additional_shipment.priority_products)
                .filter(([, quantity]) => quantity > 0)
                .map(([productId, quantity]) => ({
                  id_produk: parseInt(productId),
                  jumlah_kirim: quantity
                })),
              // Non-priority products
              ...row.additional_shipment.non_priority_details.filter(detail => 
                detail.id_produk > 0 && detail.jumlah_kirim > 0
              )
            ]
          } : undefined
        }

        const result = await apiClient.createBilling(billingData)
        
        // Display success message with details about what was created
        if (result && (result as any).data) {
          const responseData = (result as any).data
          let successMessage = `Penagihan berhasil disimpan untuk toko ${row.nama_toko}`
          
          if (formData.autoRestock && responseData.auto_restock_shipment) {
            successMessage += ` dengan auto-restock pengiriman`
          }
          
          if (responseData.additional_shipment) {
            successMessage += ` dan pengiriman tambahan`
          }
          
          toast({
            title: 'Berhasil',
            description: successMessage,
          })
        }
      }
      
      toast({
        title: 'Berhasil',
        description: `Penagihan berhasil disimpan untuk ${storeRows.length} toko${formData.autoRestock ? ' dengan auto-restock' : ''}`,
      })

      // Invalidate penagihan queries to refresh data
      queryClient.invalidateQueries({ queryKey: penagihanKeys.lists() })
      queryClient.invalidateQueries({ queryKey: penagihanKeys.all })
      queryClient.invalidateQueries({ queryKey: penagihanOptimizedKeys.lists() })
      queryClient.invalidateQueries({ queryKey: penagihanOptimizedKeys.all })
      // Materialized views removed - using direct queries now
      
      // Reset form after successful submission
      setFormData({ 
        selectedSales: null,
        autoRestock: true
      })
      setStoreRows([])
      setSearchQuery('')
      setFilteredStores([])
      
      // Navigate back to penagihan list page
      router.push('/dashboard/penagihan')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan data'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Additional shipment functions per store
  const toggleStoreAdditionalShipment = (storeIndex: number, enabled: boolean) => {
    setStoreRows(prev => {
      const newRows = [...prev]
      newRows[storeIndex] = {
        ...newRows[storeIndex],
        additional_shipment: {
          ...newRows[storeIndex].additional_shipment,
          enabled,
          priority_products: enabled ? newRows[storeIndex].additional_shipment.priority_products : {},
          has_non_priority: enabled ? newRows[storeIndex].additional_shipment.has_non_priority : false,
          non_priority_details: enabled ? newRows[storeIndex].additional_shipment.non_priority_details : []
        }
      }
      return newRows
    })
  }

  // Update priority product quantity in additional shipment
  const updateStoreAdditionalPriorityProduct = (storeIndex: number, productId: number, quantity: number) => {
    if (quantity < 0) return
    
    setStoreRows(prev => {
      const newRows = [...prev]
      newRows[storeIndex] = {
        ...newRows[storeIndex],
        additional_shipment: {
          ...newRows[storeIndex].additional_shipment,
          priority_products: {
            ...newRows[storeIndex].additional_shipment.priority_products,
            [productId]: quantity
          }
        }
      }
      return newRows
    })
  }
  
  // Toggle non-priority items in additional shipment
  const toggleStoreAdditionalNonPriority = (storeIndex: number, enabled: boolean) => {
    setStoreRows(prev => {
      const newRows = [...prev]
      newRows[storeIndex] = {
        ...newRows[storeIndex],
        additional_shipment: {
          ...newRows[storeIndex].additional_shipment,
          has_non_priority: enabled,
          non_priority_details: enabled ? newRows[storeIndex].additional_shipment.non_priority_details : []
        }
      }
      return newRows
    })
  }
  
  const addStoreAdditionalNonPriorityItem = (storeIndex: number) => {
    setStoreRows(prev => {
      const newRows = [...prev]
      newRows[storeIndex] = {
        ...newRows[storeIndex],
        additional_shipment: {
          ...newRows[storeIndex].additional_shipment,
          non_priority_details: [
            ...newRows[storeIndex].additional_shipment.non_priority_details,
            { id_produk: 0, jumlah_kirim: 0 }
          ]
        }
      }
      return newRows
    })
  }

  const updateStoreAdditionalNonPriorityItem = (storeIndex: number, itemIndex: number, field: 'id_produk' | 'jumlah_kirim', value: number) => {
    if (field === 'jumlah_kirim' && value < 0) return
    
    setStoreRows(prev => {
      const newRows = [...prev]
      const newDetails = [...newRows[storeIndex].additional_shipment.non_priority_details]
      newDetails[itemIndex] = {
        ...newDetails[itemIndex],
        [field]: value
      }
      newRows[storeIndex] = {
        ...newRows[storeIndex],
        additional_shipment: {
          ...newRows[storeIndex].additional_shipment,
          non_priority_details: newDetails
        }
      }
      return newRows
    })
  }

  const removeStoreAdditionalNonPriorityItem = (storeIndex: number, itemIndex: number) => {
    setStoreRows(prev => {
      const newRows = [...prev]
      newRows[storeIndex] = {
        ...newRows[storeIndex],
        additional_shipment: {
          ...newRows[storeIndex].additional_shipment,
          non_priority_details: newRows[storeIndex].additional_shipment.non_priority_details.filter((_, i) => i !== itemIndex)
        }
      }
      return newRows
    })
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const target = e.target as HTMLInputElement
      const nextInput = target.closest('tr')?.nextElementSibling?.querySelector('input[type="number"]') as HTMLInputElement
      if (nextInput) {
        nextInput.focus()
        nextInput.select()
      }
    }
  }

  // Only show loading for sales data, not for stores loading
  if (salesLoading) {
    return (
      <div className="w-full bg-white min-h-screen">
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Memuat data sales...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (salesError) {
    return (
      <div className="w-full bg-white min-h-screen">
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Gagal memuat data sales: {salesError.message}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-white min-h-screen">
      <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Form Pembayaran</h1>
            <p className="text-gray-600 text-sm sm:text-base">Buat penagihan untuk toko-toko yang sudah dikirim barang</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Batal
            </Button>
          </div>
        </div>
        <form id="penagihan-form" onSubmit={handleSubmit} className="space-y-8">
          {/* Sales and Store Selection - No Card Styling */}
          <div className="space-y-2">
            {/* Sales Selection Row */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-600" />
                <Label className="text-sm font-medium text-gray-700">Pilih Sales :</Label>
              </div>
              <div className="flex-1 max-w-sm">
                <Select 
                  value={formData.selectedSales?.toString() || ''} 
                  onValueChange={(value) => updateFormData({ selectedSales: parseInt(value) })}
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="-- Pilih Sales --" />
                  </SelectTrigger>
                  <SelectContent>
                    {(salesData as any[]).map((sales: any) => (
                      <SelectItem key={sales.id_sales} value={sales.id_sales.toString()}>
                        {sales.nama_sales}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Store Selection Row */}
            {formData.selectedSales && stores.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-600" />
                  <Label className="text-sm font-medium text-gray-700">Pilih Toko :</Label>
                </div>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Cari toko: nama, kecamatan, atau kabupaten..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="pl-10 h-10 text-sm"
                  />
                    
                    {/* Search suggestions dropdown */}
                    {showSuggestions && searchQuery && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                        {filteredStores.length > 0 ? (
                          filteredStores.map(store => (
                            <button
                              key={store.id_toko}
                              type="button"
                              onClick={() => addStoreToTable(store)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                            >
                              <div className="font-medium text-gray-900">{store.nama_toko}</div>
                              <div className="text-sm text-gray-500">
                                {store.kecamatan}, {store.kabupaten}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-500">
                            Tidak ada toko yang ditemukan
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {storeRows.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1 rounded-md border border-green-200 ml-4">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium">{storeRows.length} toko</span>
                    </div>
                  )}
                </div>
            )}
          </div>

          {/* Individual Store Sections */}
          {storeRows.length > 0 && (
            <div className="space-y-8">
              {storeRows.map((row, storeIndex) => (
                <div key={`store-section-${row.id_toko}`} className="space-y-6">
                  {/* Form Input Barang Toko */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Receipt className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {row.nama_toko} - <span className="text-sm text-gray-500 font-normal">{row.kecamatan}, {row.kabupaten}</span>
                          </h3>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStoreRow(storeIndex)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Hapus Toko
                      </Button>
                    </div>

                    {/* Products Input Table */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full" style={{tableLayout: 'auto'}}>
                          <thead className="bg-gray-50">
                            <tr>
                              <th 
                                className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-r border-gray-200" 
                                style={{width: '30%', minWidth: '200px'}}
                              >
                                Nama Barang
                              </th>
                              {priorityProducts.map((product, index) => {
                                const productColumnWidth = `${Math.floor(60 / priorityProducts.length)}%`
                                return (
                                  <th 
                                    key={product.id_produk} 
                                    className="px-3 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-200"
                                    style={{width: productColumnWidth, minWidth: '100px'}}
                                  >
                                    <div className="space-y-1">
                                      <div className="font-semibold text-xs leading-tight">{product.nama_produk}</div>
                                      <div className="text-xs text-gray-500">Rp {product.harga_satuan.toLocaleString()}</div>
                                    </div>
                                  </th>
                                )
                              })}
                              <th 
                                className="px-2 py-3 text-center text-sm font-medium text-gray-700"
                                style={{width: '10%', minWidth: '80px'}}
                              >
                                Options
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="hover:bg-gray-50">
                              <td className="px-4 py-3 border-r border-gray-200">
                                <div className="font-medium text-gray-900 text-sm">
                                  {row.nama_toko} - <span className="text-xs text-gray-500 font-normal">{row.kecamatan}, {row.kabupaten}</span>
                                </div>
                              </td>
                              {priorityProducts.map(product => (
                                <td key={product.id_produk} className="px-2 py-3 border-r border-gray-200">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={row.priority_terjual[product.id_produk] || ''}
                                    onChange={(e) => updatePriorityQuantity(storeIndex, product.id_produk, parseInt(e.target.value) || 0)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full text-center text-sm h-9 px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder="0"
                                  />
                                </td>
                              ))}
                              <td className="px-2 py-3 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeStoreRow(storeIndex)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2 text-xs"
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Hapus
                                </Button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>

                  {/* Ringkasan Barang Toko */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Payment Details */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <DollarSign className="w-5 h-5 text-blue-600" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900">Detail Pembayaran</h4>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm">Metode Bayar</Label>
                            <Select
                              value={row.metode_pembayaran}
                              onValueChange={(value: 'Cash' | 'Transfer') => updateBillingInfo(storeIndex, 'metode_pembayaran', value)}
                            >
                              <SelectTrigger className="text-sm h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Transfer">Transfer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-sm">Tanggal Pembayaran</Label>
                            <Input
                              type="date"
                              value={row.tanggal_pembayaran}
                              onChange={(e) => updateBillingInfo(storeIndex, 'tanggal_pembayaran', e.target.value)}
                              className="text-sm h-8"
                            />
                          </div>
                          
                          <div>
                            <Label className="text-sm">Total Diterima</Label>
                            <Input
                              type="text"
                              value={`Rp ${row.total_uang_diterima.toLocaleString()}`}
                              readOnly
                              className="text-center font-bold text-green-600 bg-gray-50 text-sm h-8"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Checkbox
                              checked={row.ada_potongan}
                              onCheckedChange={(checked) => updateBillingInfo(storeIndex, 'ada_potongan', checked as boolean)}
                            />
                            <Label className="text-sm">Ada Potongan</Label>
                          </div>
                          
                          {row.ada_potongan && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-sm">Jumlah Potongan</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={row.jumlah_potongan || ''}
                                  onChange={(e) => updateBillingInfo(storeIndex, 'jumlah_potongan', parseFloat(e.target.value) || 0)}
                                  className="text-sm h-8"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <Label className="text-sm">Alasan Potongan</Label>
                                <Input
                                  type="text"
                                  value={row.alasan_potongan}
                                  onChange={(e) => updateBillingInfo(storeIndex, 'alasan_potongan', e.target.value)}
                                  className="text-sm h-8"
                                  placeholder="Alasan potongan"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Summary */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Receipt className="w-5 h-5 text-green-600" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900">Ringkasan Barang</h4>
                      </div>
                      
                      <div className="space-y-3">
                        {priorityProducts.map(product => {
                          const quantity = row.priority_terjual[product.id_produk] || 0
                          const amount = quantity * product.harga_satuan
                          
                          if (quantity === 0) return null
                          
                          return (
                            <div key={`summary-${row.id_toko}-${product.id_produk}`} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 text-sm">{product.nama_produk}</div>
                                <div className="text-xs text-gray-500">
                                  {quantity} pcs × Rp {product.harga_satuan.toLocaleString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-gray-900 text-sm">
                                  Rp {amount.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        
                        {Object.values(row.priority_terjual).every(qty => qty === 0) && (
                          <div className="text-center text-gray-500 py-4 text-sm">Belum ada barang terjual</div>
                        )}
                        
                        {/* Total Section */}
                        {Object.values(row.priority_terjual).some(qty => qty > 0) && (
                          <div className="pt-3 border-t border-gray-200 mt-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-semibold text-gray-900">Total</div>
                                <div className="text-xs text-gray-500">
                                  {Object.values(row.priority_terjual).reduce((sum, qty) => sum + qty, 0)} item
                                  {row.ada_potongan ? ` • Potongan Rp ${row.jumlah_potongan.toLocaleString()}` : ''}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-bold text-green-600">
                                  Rp {row.total_uang_diterima.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Overall Summary */}
              <div className="bg-white rounded-lg p-6 border border-gray-200 mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">Ringkasan Keseluruhan</h4>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-900">Total Semua Toko</div>
                      <div className="text-sm text-gray-500">
                        {storeRows.length} toko • {storeRows.reduce((total, row) => {
                          return total + Object.values(row.priority_terjual).reduce((sum, qty) => sum + qty, 0)
                        }, 0)} item
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        Rp {storeRows.reduce((total, row) => total + row.total_uang_diterima, 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Auto-restock Setting */}
          {formData.selectedSales && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Receipt className="w-5 h-5 text-green-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Pengaturan Auto-restock</h4>
              </div>
              
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={formData.autoRestock}
                  onCheckedChange={(checked) => updateFormData({ autoRestock: checked as boolean })}
                  id="auto-restock"
                />
                <Label htmlFor="auto-restock" className="text-sm font-medium text-gray-700">
                  Aktifkan auto-restock (otomatis kirim ulang barang yang terjual)
                </Label>
              </div>
              
              {formData.autoRestock && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-700">
                    ✓ Sistem akan otomatis membuat pengiriman baru dengan jumlah sama dengan barang yang terjual
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Status Information & Total Transaction */}
          {storeRows.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Store Status */}
                    <div className="space-y-4">

                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-green-800">Toko siap ditagih:</span>
                          <span className="text-2xl font-bold text-green-900">{storeRows.length}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {formData.autoRestock && (
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                              Auto-restock aktif
                            </span>
                          )}
                          {(() => {
                            const additionalShipmentCount = storeRows.reduce((count, row) => {
                              if (!row.additional_shipment.enabled) return count
                              
                              const priorityCount = Object.values(row.additional_shipment.priority_products)
                                .filter(qty => qty > 0).length
                              const nonPriorityCount = row.additional_shipment.non_priority_details
                                .filter(detail => detail.id_produk > 0 && detail.jumlah_kirim > 0).length
                              
                              return count + priorityCount + nonPriorityCount
                            }, 0)
                            return additionalShipmentCount > 0 && (
                              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                                {additionalShipmentCount} item tambahan
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Total Transaction */}
                    <div className="space-y-4">

                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-amber-800">Total nominal:</span>
                          <span className="text-2xl font-bold text-amber-900">
                            Rp {storeRows.reduce((total, row) => {
                              return total + row.total_uang_diterima
                            }, 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-amber-800">Status:</span>
                          <span className="text-sm">
                            {storeRows.reduce((total, row) => {
                              const subtotal = calculateStoreTotal(row)
                              const discount = row.ada_potongan ? row.jumlah_potongan : 0
                              return total + subtotal - discount
                            }, 0) !== storeRows.reduce((total, row) => total + row.total_uang_diterima, 0) ? (
                              <span className="text-red-600">⚠ Periksa perhitungan</span>
                            ) : (
                              <span className="text-green-600">✓ Perhitungan sesuai</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="w-full sm:w-auto"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.selectedSales || storeRows.length === 0}
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Menyimpan...' : `Simpan Penagihan${formData.autoRestock ? ' + Auto-restock' : ''}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}