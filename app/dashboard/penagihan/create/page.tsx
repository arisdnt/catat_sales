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
import { ArrowLeft, Save, Receipt, Plus, X, Search, AlertCircle, DollarSign } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiClient } from '@/lib/api-client'
import { useSalesQuery } from '@/lib/queries/sales'

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
}

interface FormData {
  selectedSales: number | null
}

export default function CreatePenagihanPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form data
  const [formData, setFormData] = useState<FormData>({
    selectedSales: null
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

  // Load stores when sales is selected
  useEffect(() => {
    const loadStores = async () => {
      if (!formData.selectedSales) {
        setStores([])
        setStoreRows([])
        setSearchQuery('')
        setFilteredStores([])
        return
      }

      setIsLoading(true)
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
      } finally {
        setIsLoading(false)
      }
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
      alasan_potongan: ''
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
  const updateBillingInfo = (storeIndex: number, field: keyof Pick<StoreRow, 'total_uang_diterima' | 'metode_pembayaran' | 'ada_potongan' | 'jumlah_potongan' | 'alasan_potongan'>, value: any) => {
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
          details,
          potongan: row.ada_potongan ? {
            jumlah_potongan: row.jumlah_potongan,
            alasan: row.alasan_potongan || undefined
          } : undefined,
          auto_restock: true, // Always enabled for bulk penagihan
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
          
          if (responseData.auto_restock_shipment) {
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
        description: `Penagihan berhasil disimpan untuk ${storeRows.length} toko`,
      })

      // Reset form after successful submission
      setFormData({ 
        selectedSales: null
      })
      setStoreRows([])
      setSearchQuery('')
      setFilteredStores([])
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

  if (salesLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Memuat data...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (salesError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
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
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center justify-between text-green-900">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Form Pembayaran
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Batal
                </Button>
                <Button
                  type="submit"
                  form="penagihan-form"
                  disabled={isSubmitting || !formData.selectedSales || storeRows.length === 0}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-6 shadow-lg"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 lg:p-8">
            <form id="penagihan-form" onSubmit={handleSubmit} className="space-y-8">
              {/* Header Section */}
              <div className="max-w-md">
                <Label htmlFor="sales" className="text-sm font-medium text-gray-700">Pilih Sales</Label>
                <Select 
                  value={formData.selectedSales?.toString() || ''} 
                  onValueChange={(value) => updateFormData({ selectedSales: parseInt(value) })}
                >
                  <SelectTrigger className="mt-2 h-12 text-sm border-gray-300 focus:border-green-500 focus:ring-green-500">
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


              {/* Store Search Section */}
              {formData.selectedSales && stores.length > 0 && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        type="text"
                        placeholder="Cari toko: nama, kecamatan, atau kabupaten..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        className="pl-11 h-12 text-sm border-gray-300 focus:border-green-500 focus:ring-green-500"
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
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="font-medium">{storeRows.length} toko</span> dipilih
                        </div>
                      )}
                    </div>

                  {/* Selected Stores Table */}
                  {storeRows.length > 0 && (
                    <div className="space-y-6">

                      <div className="border rounded-lg overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse bg-white table-fixed">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="border-b p-4 text-left font-semibold text-gray-900 w-48">
                                  <div className="break-words">Toko</div>
                                </th>
                                {priorityProducts.map(product => (
                                  <th key={product.id_produk} className="border-b p-4 text-center font-semibold text-gray-900 w-32">
                                    <div className="text-sm break-words leading-tight">{product.nama_produk}</div>
                                    <div className="text-xs text-gray-500 font-normal mt-1">
                                      Rp {product.harga_satuan.toLocaleString()}
                                    </div>
                                  </th>
                                ))}
                                <th className="border-b p-4 text-center font-semibold text-gray-900 w-36">
                                  <div className="break-words">Uang Diterima</div>
                                </th>
                                <th className="border-b p-4 text-center font-semibold text-gray-900 w-32">
                                  <div className="break-words">Metode Bayar</div>
                                </th>
                                <th className="border-b p-4 text-center font-semibold text-gray-900 w-32">
                                  <div className="break-words">Kirim Tambahan</div>
                                </th>
                                <th className="border-b p-4 text-center font-semibold text-gray-900 w-28">
                                  <div className="break-words">Potongan</div>
                                </th>
                                <th className="border-b p-4 text-center font-semibold text-gray-900 w-20">
                                  <div className="break-words">Aksi</div>
                                </th>
                              </tr>
                            </thead>
                          <tbody>
                            {storeRows.map((row, storeIndex) => (
                              <React.Fragment key={row.id_toko}>
                                <tr className={`hover:bg-opacity-80 transition-colors ${
                                  storeIndex % 2 === 0 ? 'bg-white' : 'bg-green-50'
                                }`}>
                                  <td className="border-b p-4">
                                    <div className="font-medium text-gray-900 text-sm break-words">{row.nama_toko}</div>
                                    <div className="text-xs text-gray-500 break-words">
                                      {row.kecamatan}, {row.kabupaten}
                                    </div>
                                    <div className="text-xs text-green-600 font-medium mt-2">
                                      Total: Rp {calculateStoreTotal(row).toLocaleString()}
                                      {row.ada_potongan && row.jumlah_potongan > 0 && (
                                        <div className="text-xs text-red-600">
                                          Setelah Potongan: Rp {(calculateStoreTotal(row) - row.jumlah_potongan).toLocaleString()}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  {priorityProducts.map(product => (
                                    <td key={product.id_produk} className="border-b p-4 text-center">
                                      <Input
                                        type="number"
                                        min="0"
                                        value={row.priority_terjual[product.id_produk] || ''}
                                        onChange={(e) => updatePriorityQuantity(storeIndex, product.id_produk, parseInt(e.target.value) || 0)}
                                        onKeyDown={handleKeyDown}
                                        className={`w-full text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                          storeIndex % 2 === 0 ? 'bg-white' : 'bg-green-50'
                                        }`}
                                        placeholder="0"
                                      />
                                    </td>
                                  ))}
                                  <td className="border-b p-4 text-center">
                                    <Input
                                      type="text"
                                      value={`Rp ${row.total_uang_diterima.toLocaleString()}`}
                                      readOnly
                                      className={`w-full text-center text-lg font-bold text-red-600 cursor-not-allowed ${
                                        storeIndex % 2 === 0 ? 'bg-gray-50' : 'bg-green-100'
                                      }`}
                                      title="Nilai otomatis berdasarkan barang yang diinput (setelah potongan)"
                                    />
                                  </td>
                                  <td className="border-b p-4 text-center">
                                    <Select
                                      value={row.metode_pembayaran}
                                      onValueChange={(value: 'Cash' | 'Transfer') => updateBillingInfo(storeIndex, 'metode_pembayaran', value)}
                                    >
                                      <SelectTrigger className={`w-full text-sm ${
                                        storeIndex % 2 === 0 ? 'bg-white' : 'bg-green-50'
                                      }`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Cash">Cash</SelectItem>
                                        <SelectItem value="Transfer">Transfer</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="border-b p-4 text-center">
                                    <div className="flex justify-center">
                                      <Checkbox
                                        checked={row.additional_shipment.enabled}
                                        onCheckedChange={(checked) => toggleStoreAdditionalShipment(storeIndex, checked as boolean)}
                                      />
                                    </div>
                                  </td>
                                  <td className="border-b p-4 text-center">
                                    <div className="space-y-2">
                                      <div className="flex justify-center">
                                        <Checkbox
                                          checked={row.ada_potongan}
                                          onCheckedChange={(checked) => updateBillingInfo(storeIndex, 'ada_potongan', checked as boolean)}
                                        />
                                      </div>
                                      {row.ada_potongan && (
                                        <div className="space-y-2">
                                          <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={row.jumlah_potongan || ''}
                                            onChange={(e) => updateBillingInfo(storeIndex, 'jumlah_potongan', parseFloat(e.target.value) || 0)}
                                            className={`w-full text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                              storeIndex % 2 === 0 ? 'bg-white' : 'bg-green-50'
                                            }`}
                                            placeholder="0"
                                          />
                                          <Input
                                            type="text"
                                            value={row.alasan_potongan}
                                            onChange={(e) => updateBillingInfo(storeIndex, 'alasan_potongan', e.target.value)}
                                            className={`w-full text-center text-sm ${
                                              storeIndex % 2 === 0 ? 'bg-white' : 'bg-green-50'
                                            }`}
                                            placeholder="Alasan"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="border-b p-4 text-center">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeStoreRow(storeIndex)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </td>
                                </tr>
                                
                                {/* Transaction Detail (Receipt) Row */}
                                <tr>
                                  <td colSpan={priorityProducts.length + 6} className="border-b p-0">
                                    <div className={`p-4 lg:p-6 ${
                                      storeIndex % 2 === 0 ? 'bg-white' : 'bg-green-50'
                                    }`}>
                                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Left Side - Store Info */}
                                        <div className="space-y-2">
                                          <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                            <Receipt className="w-4 h-4" />
                                            Detail Transaksi - {row.nama_toko}
                                          </h4>
                                          <div className="text-sm text-gray-600">
                                            {new Date().toLocaleDateString('id-ID', {
                                              weekday: 'long',
                                              year: 'numeric',
                                              month: 'long',
                                              day: 'numeric'
                                            })}
                                          </div>
                                        </div>
                                        
                                        {/* Right Side - Receipt */}
                                        <div className={`p-4 rounded-lg border shadow-sm ${
                                          storeIndex % 2 === 0 ? 'bg-gray-50' : 'bg-green-100'
                                        }`}>
                                          {/* Items */}
                                          <div className="space-y-2 mb-4">
                                            {/* Priority Products */}
                                            {priorityProducts.map(product => {
                                              const quantity = row.priority_terjual[product.id_produk] || 0;
                                              if (quantity === 0) return null;
                                              const subtotal = quantity * product.harga_satuan;
                                              return (
                                                <div key={product.id_produk} className="flex justify-between items-center text-sm">
                                                  <div className="flex-1">
                                                    <div className="font-medium">{product.nama_produk}</div>
                                                    <div className="text-gray-500">
                                                      {quantity} x Rp {product.harga_satuan.toLocaleString()}
                                                    </div>
                                                  </div>
                                                  <div className="font-medium">
                                                    Rp {subtotal.toLocaleString()}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                            
                                            {/* Non-Priority Products */}
                                            {row.non_priority_items.map((item, itemIndex) => {
                                              if (item.id_produk === 0 || item.jumlah_terjual === 0) return null;
                                              const product = nonPriorityProducts.find(p => p.id_produk === item.id_produk);
                                              if (!product) return null;
                                              const subtotal = item.jumlah_terjual * product.harga_satuan;
                                              return (
                                                <div key={itemIndex} className="flex justify-between items-center text-sm">
                                                  <div className="flex-1">
                                                    <div className="font-medium">{product.nama_produk}</div>
                                                    <div className="text-gray-500">
                                                      {item.jumlah_terjual} x Rp {product.harga_satuan.toLocaleString()}
                                                    </div>
                                                  </div>
                                                  <div className="font-medium">
                                                    Rp {subtotal.toLocaleString()}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                            
                                            {/* Show message if no items */}
                                            {(() => {
                                              const hasPriorityItems = Object.values(row.priority_terjual).some(qty => qty > 0);
                                              const hasNonPriorityItems = row.non_priority_items.some(item => 
                                                item.id_produk > 0 && item.jumlah_terjual > 0
                                              );
                                              if (!hasPriorityItems && !hasNonPriorityItems) {
                                                return (
                                                  <div className="text-center text-gray-500 py-4">
                                                    <div className="text-sm">Belum ada barang yang diinput</div>
                                                  </div>
                                                );
                                              }
                                              return null;
                                            })()}
                                          </div>
                                          
                                          {/* Summary */}
                                          <div className="border-t pt-4">
                                            <div className="flex justify-between items-center mb-2">
                                              <span className="text-sm font-medium">Subtotal:</span>
                                              <span className="text-sm font-medium">
                                                Rp {calculateStoreTotal(row).toLocaleString()}
                                              </span>
                                            </div>
                                            
                                            {row.ada_potongan && row.jumlah_potongan > 0 && (
                                              <div className="flex justify-between items-center mb-2 text-red-600">
                                                <span className="text-sm">
                                                  Potongan {row.alasan_potongan ? `(${row.alasan_potongan})` : ''}:
                                                </span>
                                                <span className="text-sm">
                                                  -Rp {row.jumlah_potongan.toLocaleString()}
                                                </span>
                                              </div>
                                            )}
                                            
                                            <div className="border-t pt-2 mt-2">
                                              <div className="flex justify-between items-center text-lg font-bold">
                                                <span>Total:</span>
                                                <span>
                                                  Rp {(calculateStoreTotal(row) - (row.ada_potongan ? row.jumlah_potongan : 0)).toLocaleString()}
                                                </span>
                                              </div>
                                            </div>
                                            
                                            <div className="mt-3 pt-3 border-t">
                                              <div className="flex justify-between items-center text-sm">
                                                <span>Metode Pembayaran:</span>
                                                <span className="font-medium">{row.metode_pembayaran}</span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                                
                                {/* Additional shipment items row */}
                                {row.additional_shipment.enabled && (
                                  <tr>
                                    <td colSpan={priorityProducts.length + 6} className="border-b p-0">
                                      <div className={`p-4 lg:p-6 border-l-4 border-purple-400 ${
                                        storeIndex % 2 === 0 ? 'bg-white' : 'bg-green-50'
                                      }`}>
                                        <div className="flex items-center justify-between mb-4">
                                          <h4 className="font-medium text-purple-900">
                                            Pengiriman Tambahan untuk {row.nama_toko}
                                          </h4>
                                        </div>
                                        
                                        {/* Priority Products Section */}
                                        <div className="mb-6">
                                          <h5 className="font-medium text-purple-800 mb-3">Produk Prioritas</h5>
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                            {priorityProducts.map(product => (
                                              <div key={product.id_produk} className={`p-3 rounded border ${
                                                storeIndex % 2 === 0 ? 'bg-gray-50' : 'bg-green-100'
                                              }`}>
                                                <div className="text-sm font-medium text-gray-900 mb-1">
                                                  {product.nama_produk}
                                                </div>
                                                <div className="text-xs text-gray-500 mb-2">
                                                  Rp {product.harga_satuan.toLocaleString()}
                                                </div>
                                                <Input
                                                  type="number"
                                                  min="0"
                                                  value={row.additional_shipment.priority_products[product.id_produk] || ''}
                                                  onChange={(e) => updateStoreAdditionalPriorityProduct(storeIndex, product.id_produk, parseInt(e.target.value) || 0)}
                                                  className={`text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                                    storeIndex % 2 === 0 ? 'bg-white' : 'bg-green-50'
                                                  }`}
                                                  placeholder="0"
                                                />
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                        
                                        {/* Non-Priority Products Section */}
                                        <div className="space-y-4">
                                          <div className="border-t border-purple-200 pt-4">
                                            <h5 className="font-medium text-purple-800 mb-3">Barang Non-Prioritas</h5>
                                            
                                            
                                            {/* Non-Priority for Additional Shipment */}
                                            <div>
                                              <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center space-x-3">
                                                  <Checkbox
                                                    checked={row.additional_shipment.has_non_priority}
                                                    onCheckedChange={(checked) => toggleStoreAdditionalNonPriority(storeIndex, checked as boolean)}
                                                  />
                                                  <Label className="font-medium text-gray-700">
                                                    Untuk Pengiriman Tambahan
                                                  </Label>
                                                </div>
                                                {row.additional_shipment.has_non_priority && (
                                                  <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => addStoreAdditionalNonPriorityItem(storeIndex)}
                                                    className="border-purple-300 text-purple-700 hover:bg-purple-100"
                                                  >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Tambah Barang
                                                  </Button>
                                                )}
                                              </div>
                                              
                                              {row.additional_shipment.has_non_priority && (
                                                <div className="space-y-3">
                                                  {row.additional_shipment.non_priority_details.map((item, itemIndex) => (
                                                    <div key={itemIndex} className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded border ${
                                                      storeIndex % 2 === 0 ? 'bg-gray-50' : 'bg-green-100'
                                                    }`}>
                                                      <div className="flex-1 w-full">
                                                        <Label className="text-sm font-medium">Produk</Label>
                                                        <Select
                                                          value={item.id_produk.toString()}
                                                          onValueChange={(value) => updateStoreAdditionalNonPriorityItem(storeIndex, itemIndex, 'id_produk', parseInt(value))}
                                                        >
                                                          <SelectTrigger className={`mt-1 ${
                                                            storeIndex % 2 === 0 ? 'bg-white' : 'bg-green-50'
                                                          }`}>
                                                            <SelectValue placeholder="Pilih produk" />
                                                          </SelectTrigger>
                                                          <SelectContent>
                                                            {nonPriorityProducts.map(product => (
                                                              <SelectItem key={product.id_produk} value={product.id_produk.toString()}>
                                                                {product.nama_produk} - Rp {product.harga_satuan.toLocaleString()}
                                                              </SelectItem>
                                                            ))}
                                                          </SelectContent>
                                                        </Select>
                                                      </div>
                                                      <div className="w-full sm:w-24">
                                                        <Label className="text-sm font-medium">Jumlah Kirim</Label>
                                                        <Input
                                                          type="number"
                                                          min="0"
                                                          value={item.jumlah_kirim}
                                                          onChange={(e) => updateStoreAdditionalNonPriorityItem(storeIndex, itemIndex, 'jumlah_kirim', parseInt(e.target.value) || 0)}
                                                          className={`text-center mt-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                                            storeIndex % 2 === 0 ? 'bg-white' : 'bg-green-50'
                                                          }`}
                                                          placeholder="0"
                                                        />
                                                      </div>
                                                      <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeStoreAdditionalNonPriorityItem(storeIndex, itemIndex)}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                      >
                                                        <X className="w-4 h-4" />
                                                      </Button>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status Information & Total Transaction */}
              {storeRows.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Store Status */}
                    <div className="space-y-4">

                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-green-800">Toko siap ditagih:</span>
                          <span className="text-2xl font-bold text-green-900">{storeRows.length}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                            Auto-restock aktif
                          </span>
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
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}