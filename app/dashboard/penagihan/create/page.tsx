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
  alamat: string
  desa: string
  kecamatan: string
  kabupaten: string
}

interface StoreRow {
  id_toko: number
  nama_toko: string
  alamat: string
  desa: string
  kecamatan: string
  // Priority products: hanya terjual (kembali otomatis 0)
  priority_terjual: { [key: number]: number }
  // Non-priority items
  has_non_priority: boolean
  non_priority_items: Array<{
    id_produk: number
    jumlah_terjual: number
  }>
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
        store.alamat.toLowerCase().includes(query) ||
        store.desa.toLowerCase().includes(query) ||
        store.kecamatan.toLowerCase().includes(query)
      )
    )
    setFilteredStores(filtered)
    setShowSuggestions(true)
  }, [searchQuery, stores, storeRows])

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

    setStoreRows(prev => [...prev, {
      id_toko: store.id_toko,
      nama_toko: store.nama_toko,
      alamat: store.alamat,
      desa: store.desa,
      kecamatan: store.kecamatan,
      priority_terjual: {},
      has_non_priority: false,
      non_priority_items: [],
      total_uang_diterima: 0,
      metode_pembayaran: 'Cash',
      ada_potongan: false,
      jumlah_potongan: 0,
      alasan_potongan: ''
    }])
    
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
      newRows[storeIndex] = {
        ...newRows[storeIndex],
        priority_terjual: {
          ...newRows[storeIndex].priority_terjual,
          [productId]: quantity
        }
      }
      return newRows
    })
  }

  // Update billing info
  const updateBillingInfo = (storeIndex: number, field: keyof Pick<StoreRow, 'total_uang_diterima' | 'metode_pembayaran' | 'ada_potongan' | 'jumlah_potongan' | 'alasan_potongan'>, value: any) => {
    setStoreRows(prev => {
      const newRows = [...prev]
      newRows[storeIndex] = {
        ...newRows[storeIndex],
        [field]: value
      }
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
      newRows[storeIndex] = {
        ...newRows[storeIndex],
        non_priority_items: newItems
      }
      return newRows
    })
  }

  // Remove non-priority item
  const removeNonPriorityItem = (storeIndex: number, itemIndex: number) => {
    setStoreRows(prev => {
      const newRows = [...prev]
      newRows[storeIndex] = {
        ...newRows[storeIndex],
        non_priority_items: newRows[storeIndex].non_priority_items.filter((_, i) => i !== itemIndex)
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
          } : undefined
        }

        await apiClient.createBilling(billingData)
      }
      
      toast({
        title: 'Berhasil',
        description: `Penagihan berhasil disimpan untuk ${storeRows.length} toko`,
      })

      // Reset form after successful submission
      setFormData({ selectedSales: null })
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
                Form Penagihan Bulk
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
            <form id="penagihan-form" onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
              {/* Header Section */}
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-4 lg:gap-6">
                <div>
                  <Label htmlFor="sales" className="text-sm font-medium">Pilih Sales</Label>
                  <Select 
                    value={formData.selectedSales?.toString() || ''} 
                    onValueChange={(value) => updateFormData({ selectedSales: parseInt(value) })}
                  >
                    <SelectTrigger className="mt-1">
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

              {/* Store Search Section */}
              {formData.selectedSales && stores.length > 0 && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          type="text"
                          placeholder="Ketik nama toko, alamat, atau desa..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onFocus={() => setShowSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                          className="pl-10 bg-white shadow-sm"
                        />
                        
                        {/* Search suggestions dropdown */}
                        {showSuggestions && searchQuery && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
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
                                    {store.alamat}, {store.desa}, {store.kecamatan}
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
                        <div className="text-sm text-green-700 bg-green-100 px-3 py-1 rounded-full whitespace-nowrap">
                          <span className="font-medium">{storeRows.length} toko</span> dipilih
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Stores Table */}
                  {storeRows.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Toko Terpilih</h3>
                        <div className="text-sm text-gray-600 bg-green-100 px-3 py-1 rounded-full">
                          {storeRows.length} toko
                        </div>
                      </div>

                      <div className="border rounded-lg overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse bg-white">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="border-b p-3 text-left font-semibold text-gray-900 min-w-[200px]">Toko</th>
                                {priorityProducts.map(product => (
                                  <th key={product.id_produk} className="border-b p-3 text-center font-semibold text-gray-900 min-w-[120px]">
                                    <div className="text-sm">{product.nama_produk}</div>
                                    <div className="text-xs text-gray-500 font-normal">
                                      Rp {product.harga_satuan.toLocaleString()}
                                    </div>
                                  </th>
                                ))}
                                <th className="border-b p-3 text-center font-semibold text-gray-900 min-w-[130px]">
                                  Uang Diterima
                                </th>
                                <th className="border-b p-3 text-center font-semibold text-gray-900 min-w-[120px]">
                                  Metode Pembayaran
                                </th>
                                <th className="border-b p-3 text-center font-semibold text-gray-900 min-w-[120px]">
                                  Ceklist Barang Non Prioritas
                                </th>
                                <th className="border-b p-3 text-center font-semibold text-gray-900 min-w-[100px]">
                                  Potongan
                                </th>
                                <th className="border-b p-3 text-center font-semibold text-gray-900 min-w-[60px]">
                                  Aksi
                                </th>
                              </tr>
                            </thead>
                          <tbody>
                            {storeRows.map((row, storeIndex) => (
                              <React.Fragment key={row.id_toko}>
                                <tr className="hover:bg-gray-50 transition-colors">
                                  <td className="border-b p-3">
                                    <div className="font-medium text-gray-900">{row.nama_toko}</div>
                                    <div className="text-sm text-gray-500">
                                      {row.alamat}, {row.desa}, {row.kecamatan}
                                    </div>
                                    <div className="text-xs text-green-600 font-medium mt-1">
                                      Total Nilai: Rp {calculateStoreTotal(row).toLocaleString()}
                                    </div>
                                  </td>
                                  {priorityProducts.map(product => (
                                    <td key={product.id_produk} className="border-b p-3 text-center">
                                      <div className="space-y-1">
                                        <div className="text-xs text-gray-500">Terjual</div>
                                        <Input
                                          type="number"
                                          min="0"
                                          value={row.priority_terjual[product.id_produk] || ''}
                                          onChange={(e) => updatePriorityQuantity(storeIndex, product.id_produk, parseInt(e.target.value) || 0)}
                                          onKeyDown={handleKeyDown}
                                          className="w-16 text-center mx-auto text-xs"
                                          placeholder="0"
                                        />
                                      </div>
                                    </td>
                                  ))}
                                  <td className="border-b p-3 text-center">
                                    <div className="relative">
                                      <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={row.total_uang_diterima || ''}
                                        onChange={(e) => updateBillingInfo(storeIndex, 'total_uang_diterima', parseFloat(e.target.value) || 0)}
                                        className="w-24 text-center mx-auto pl-6 text-xs"
                                        placeholder="0"
                                      />
                                    </div>
                                  </td>
                                  <td className="border-b p-3 text-center">
                                    <Select
                                      value={row.metode_pembayaran}
                                      onValueChange={(value: 'Cash' | 'Transfer') => updateBillingInfo(storeIndex, 'metode_pembayaran', value)}
                                    >
                                      <SelectTrigger className="w-20 mx-auto text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Cash">Cash</SelectItem>
                                        <SelectItem value="Transfer">Transfer</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="border-b p-3 text-center">
                                    <Checkbox
                                      checked={row.has_non_priority}
                                      onCheckedChange={(checked) => toggleNonPriority(storeIndex, checked as boolean)}
                                    />
                                  </td>
                                  <td className="border-b p-3 text-center">
                                    <div className="space-y-1">
                                      <Checkbox
                                        checked={row.ada_potongan}
                                        onCheckedChange={(checked) => updateBillingInfo(storeIndex, 'ada_potongan', checked as boolean)}
                                      />
                                      {row.ada_potongan && (
                                        <div className="space-y-1">
                                          <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={row.jumlah_potongan || ''}
                                            onChange={(e) => updateBillingInfo(storeIndex, 'jumlah_potongan', parseFloat(e.target.value) || 0)}
                                            className="w-20 text-center mx-auto text-xs"
                                            placeholder="0"
                                          />
                                          <Input
                                            type="text"
                                            value={row.alasan_potongan}
                                            onChange={(e) => updateBillingInfo(storeIndex, 'alasan_potongan', e.target.value)}
                                            className="w-24 text-center mx-auto text-xs"
                                            placeholder="Alasan"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="border-b p-3 text-center">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeStoreRow(storeIndex)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </td>
                                </tr>
                                
                                {/* Non-priority items row */}
                                {row.has_non_priority && (
                                  <tr>
                                    <td colSpan={priorityProducts.length + 6} className="border-b p-0">
                                      <div className="bg-blue-50 p-4 lg:p-6 border-l-4 border-blue-400">
                                        <div className="flex items-center justify-between mb-4">
                                          <h4 className="font-medium text-blue-900">
                                            Barang Non-Prioritas untuk {row.nama_toko}
                                          </h4>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => addNonPriorityItem(storeIndex)}
                                            className="border-blue-300 text-blue-700 hover:bg-blue-100"
                                          >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Tambah Item
                                          </Button>
                                        </div>
                                        
                                        <div className="space-y-3">
                                          {row.non_priority_items.map((item, itemIndex) => (
                                            <div key={itemIndex} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white p-3 rounded border">
                                              <div className="flex-1 w-full">
                                                <Label className="text-sm font-medium">Produk</Label>
                                                <Select
                                                  value={item.id_produk.toString()}
                                                  onValueChange={(value) => updateNonPriorityItem(storeIndex, itemIndex, 'id_produk', parseInt(value))}
                                                >
                                                  <SelectTrigger className="mt-1">
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
                                                <Label className="text-sm font-medium">Jumlah Terjual</Label>
                                                <Input
                                                  type="number"
                                                  min="0"
                                                  value={item.jumlah_terjual}
                                                  onChange={(e) => updateNonPriorityItem(storeIndex, itemIndex, 'jumlah_terjual', parseInt(e.target.value) || 0)}
                                                  onKeyDown={handleKeyDown}
                                                  className="text-center mt-1"
                                                  placeholder="0"
                                                />
                                              </div>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeNonPriorityItem(storeIndex, itemIndex)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                              >
                                                <X className="w-4 h-4" />
                                              </Button>
                                            </div>
                                          ))}
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

              {/* Status Information */}
              {storeRows.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 text-green-800">
                    <span className="font-medium">{storeRows.length} toko</span> siap ditagih
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