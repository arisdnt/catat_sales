import { supabase } from './supabase'

class ApiClient {
  private async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('No authenticated session found')
    }
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = await this.getAuthHeaders()
    
    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      }
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Request failed')
    }
    
    return response.json()
  }

  // Sales API
  async getSales() {
    return this.request('/sales')
  }

  async getSalesById(id: number) {
    return this.request(`/sales/${id}`)
  }

  async createSales(data: { nama_sales: string; nomor_telepon?: string }) {
    return this.request('/sales', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateSales(id: number, data: { nama_sales: string; nomor_telepon?: string; status_aktif?: boolean }) {
    return this.request(`/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteSales(id: number) {
    return this.request(`/sales/${id}`, {
      method: 'DELETE'
    })
  }

  // Products API
  async getProducts(status?: 'active') {
    const params = status ? `?status=${status}` : ''
    return this.request(`/produk${params}`)
  }

  async getProductById(id: number) {
    return this.request(`/produk/${id}`)
  }

  async getProductStats() {
    return this.request('/produk/stats')
  }

  async getSalesStats() {
    return this.request('/sales/stats')
  }

  async createProduct(data: { nama_produk: string; harga_satuan: number; is_priority?: boolean; priority_order?: number }) {
    return this.request('/produk', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateProduct(id: number, data: { nama_produk: string; harga_satuan: number; status_produk?: boolean }) {
    return this.request(`/produk/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteProduct(id: number) {
    return this.request(`/produk/${id}`, {
      method: 'DELETE'
    })
  }

  // Stores API
  async getStores(
    status?: 'active', 
    includeSales?: boolean, 
    page?: number, 
    limit?: number,
    search?: string,
    filters?: Record<string, string>
  ) {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (includeSales) params.append('include_sales', 'true')
    if (page) params.append('page', page.toString())
    if (limit) params.append('limit', limit.toString())
    if (search) params.append('search', search)
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
    }
    const queryString = params.toString()
    return this.request(`/toko${queryString ? `?${queryString}` : ''}`)
  }

  // Generic get method for direct API calls
  async get(url: string, options?: RequestInit) {
    return this.request(url, options)
  }

  async getStoreById(id: number) {
    return this.request(`/toko/${id}`)
  }

  async createStore(data: {
    nama_toko: string
    id_sales: number
    alamat?: string
    desa?: string
    kecamatan?: string
    kabupaten?: string
    no_telepon?: string
    link_gmaps?: string
  }) {
    return this.request('/toko', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateStore(id: number, data: {
    nama_toko: string
    id_sales: number
    alamat?: string
    desa?: string
    kecamatan?: string
    kabupaten?: string
    no_telepon?: string
    link_gmaps?: string
    status_toko?: boolean
  }) {
    return this.request(`/toko/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteStore(id: number) {
    return this.request(`/toko/${id}`, {
      method: 'DELETE'
    })
  }

  async importStores(data: any[]) {
    return this.request('/toko/import', {
      method: 'POST',
      body: JSON.stringify({ data })
    })
  }

  // Shipments API
  async getShipments(includeDetails?: boolean, page?: number, limit?: number) {
    const params = new URLSearchParams()
    if (includeDetails) params.append('include_details', 'true')
    if (page) params.append('page', page.toString())
    if (limit) params.append('limit', limit.toString())
    const queryString = params.toString()
    return this.request(`/pengiriman${queryString ? `?${queryString}` : ''}`)
  }

  async getShipmentById(id: number) {
    return this.request(`/pengiriman/${id}`)
  }

  async createShipment(data: {
    id_toko: number
    tanggal_kirim: string
    details: Array<{
      id_produk: number
      jumlah_kirim: number
    }>
  }) {
    return this.request('/pengiriman', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateShipment(id: number, data: {
    tanggal_kirim: string
    details: Array<{
      id_produk: number
      jumlah_kirim: number
    }>
  }) {
    return this.request(`/pengiriman/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteShipment(id: number) {
    return this.request(`/pengiriman/${id}`, {
      method: 'DELETE'
    })
  }

  // Batch Shipment API (replaces bulk shipment)
  async createBatchShipment(data: {
    id_sales: number
    tanggal_kirim: string
    stores: Array<{
      id_toko: number
      details: Array<{
        id_produk: number
        jumlah_kirim: number
      }>
    }>
    keterangan?: string
  }) {
    return this.request('/pengiriman/batch', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async getBatchShipments(id_sales?: number, tanggal_kirim?: string, limit?: number) {
    const params = new URLSearchParams()
    if (id_sales) params.append('id_sales', id_sales.toString())
    if (tanggal_kirim) params.append('tanggal_kirim', tanggal_kirim)
    if (limit) params.append('limit', limit.toString())
    const queryString = params.toString()
    return this.request(`/pengiriman/batch${queryString ? `?${queryString}` : ''}`)
  }

  // Priority Products API
  async getPriorityProducts() {
    return this.request('/produk/priority')
  }

  async updateProductPriority(id_produk: number, data: {
    is_priority: boolean
    priority_order?: number
  }) {
    return this.request('/produk/priority', {
      method: 'PUT',
      body: JSON.stringify({ id_produk, ...data })
    })
  }

  async getNonPriorityProducts() {
    return this.request('/produk/non-priority')
  }

  // Stores by Sales API
  async getStoresBySales(id_sales: number) {
    return this.request(`/toko/by-sales?id_sales=${id_sales}`)
  }

  // Billing API
  async getBillings(includeDetails?: boolean) {
    const params = includeDetails ? '?include_details=true' : ''
    return this.request(`/penagihan${params}`)
  }

  async getBillingById(id: number) {
    return this.request(`/penagihan/${id}`)
  }

  async createBilling(data: {
    id_toko: number
    total_uang_diterima: number
    metode_pembayaran: 'Cash' | 'Transfer'
    details: Array<{
      id_produk: number
      jumlah_terjual: number
      jumlah_kembali: number
    }>
    potongan?: {
      jumlah_potongan: number
      alasan?: string
    }
    auto_restock?: boolean
    additional_shipment?: {
      enabled: boolean
      details: Array<{
        id_produk: number
        jumlah_kirim: number
      }>
    }
  }) {
    return this.request('/penagihan', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateBilling(id: number, data: {
    total_uang_diterima: number
    metode_pembayaran: 'Cash' | 'Transfer'
    details: Array<{
      id_produk: number
      jumlah_terjual: number
      jumlah_kembali: number
    }>
    potongan?: {
      jumlah_potongan: number
      alasan?: string
    }
  }) {
    return this.request(`/penagihan/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteBilling(id: number) {
    return this.request(`/penagihan/${id}`, {
      method: 'DELETE'
    })
  }

  // Deposit API
  async getDeposits() {
    return this.request('/setoran')
  }

  async getCashBalance() {
    return this.request('/setoran/cash-balance')
  }

  async getDepositById(id: number) {
    return this.request(`/setoran/${id}`)
  }

  async createDeposit(data: {
    total_setoran: number
    penerima_setoran: string
  }) {
    return this.request('/setoran', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateDeposit(id: number, data: {
    total_setoran: number
    penerima_setoran: string
  }) {
    return this.request(`/setoran/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteDeposit(id: number) {
    return this.request(`/setoran/${id}`, {
      method: 'DELETE'
    })
  }

  // Reports API
  async getReport(type: 'pengiriman' | 'penagihan' | 'rekonsiliasi' | 'dashboard-stats' | 'product-movement', startDate?: string, endDate?: string, productId?: string) {
    const params = new URLSearchParams({ type })
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    if (productId) params.append('product_id', productId)
    return this.request(`/laporan?${params.toString()}`)
  }

  async getDashboardStats(timeFilter?: string) {
    const params = new URLSearchParams({ type: 'dashboard-stats' })
    if (timeFilter) params.append('time_filter', timeFilter)
    return this.request(`/laporan?${params.toString()}`)
  }

  // Direct Query API (previously materialized views)
  async getDirectQuery(entity: 'sales' | 'produk' | 'toko' | 'penagihan' | 'pengiriman', params?: string) {
    const queryString = params ? `?${params}` : ''
    return this.request(`/mv/${entity}${queryString}`)
  }

  async getDirectQueryById(entity: 'sales' | 'produk' | 'toko' | 'penagihan' | 'pengiriman', id: number, extraParams?: string) {
    const params = new URLSearchParams({ id: id.toString() })
    if (extraParams) {
      const extraParamsObj = new URLSearchParams(extraParams)
      extraParamsObj.forEach((value, key) => params.append(key, value))
    }
    return this.request(`/mv/${entity}?${params.toString()}`)
  }
  
  // Legacy aliases for backward compatibility
  async getMaterializedView(entity: 'sales' | 'produk' | 'toko' | 'penagihan' | 'pengiriman', params?: string) {
    return this.getDirectQuery(entity, params)
  }

  async getMaterializedViewById(entity: 'sales' | 'produk' | 'toko' | 'penagihan' | 'pengiriman', id: number, extraParams?: string) {
    return this.getDirectQueryById(entity, id, extraParams)
  }

  // Optimized search methods
  async searchStores(searchTerm: string, filters?: {
    id_sales?: number
    kabupaten?: string
    kecamatan?: string
  }) {
    const params = new URLSearchParams()
    if (searchTerm) params.append('search', searchTerm)
    if (filters?.id_sales) params.append('id_sales', filters.id_sales.toString())
    if (filters?.kabupaten) params.append('kabupaten', filters.kabupaten)
    if (filters?.kecamatan) params.append('kecamatan', filters.kecamatan)
    
    return this.request(`/mv/toko?${params.toString()}`)
  }

  async searchProducts(searchTerm: string, withStats: boolean = true, priorityOnly: boolean = false) {
    const params = new URLSearchParams()
    if (searchTerm) params.append('search', searchTerm)
    if (withStats) params.append('withStats', 'true')
    if (priorityOnly) params.append('priority_only', 'true')
    
    return this.request(`/mv/produk?${params.toString()}`)
  }

  async searchSales(searchTerm: string) {
    const params = new URLSearchParams()
    if (searchTerm) {
      params.append('search', searchTerm)
    }
    return this.request(`/mv/sales?${params.toString()}`)
  }

  // Dashboard Views API
  async getDashboardPenagihan(params?: {
    page?: number
    limit?: number
    search?: string
    metode_pembayaran?: string
    ada_potongan?: string
    id_sales?: string
    kabupaten?: string
    kecamatan?: string
    date_range?: string
  }) {
    const searchParams = new URLSearchParams()
    
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.metode_pembayaran && params.metode_pembayaran !== 'all') {
      searchParams.set('metode_pembayaran', params.metode_pembayaran)
    }
    if (params?.ada_potongan && params.ada_potongan !== 'all') {
      searchParams.set('ada_potongan', params.ada_potongan)
    }
    if (params?.id_sales && params.id_sales !== 'all') {
      searchParams.set('id_sales', params.id_sales)
    }
    if (params?.kabupaten && params.kabupaten !== 'all') {
      searchParams.set('kabupaten', params.kabupaten)
    }
    if (params?.kecamatan && params.kecamatan !== 'all') {
      searchParams.set('kecamatan', params.kecamatan)
    }
    if (params?.date_range && params.date_range !== 'all') {
      searchParams.set('date_range', params.date_range)
    }

    const queryString = searchParams.toString()
    const endpoint = queryString ? `/dashboard/penagihan?${queryString}` : '/dashboard/penagihan'
    
    return this.request(endpoint)
  }

  async getDashboardPengiriman(params?: {
    page?: number
    limit?: number
    search?: string
    is_autorestock?: string
    id_sales?: string
    kabupaten?: string
    kecamatan?: string
    date_range?: string
  }) {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.is_autorestock && params.is_autorestock !== 'all') {
      queryParams.append('is_autorestock', params.is_autorestock)
    }
    if (params?.id_sales && params.id_sales !== 'all') {
      queryParams.append('id_sales', params.id_sales)
    }
    if (params?.kabupaten && params.kabupaten !== 'all') {
      queryParams.append('kabupaten', params.kabupaten)
    }
    if (params?.kecamatan && params.kecamatan !== 'all') {
      queryParams.append('kecamatan', params.kecamatan)
    }
    if (params?.date_range && params.date_range !== 'all') {
      queryParams.append('date_range', params.date_range)
    }
    
    const queryString = queryParams.toString()
    return this.request(`/dashboard/pengiriman${queryString ? `?${queryString}` : ''}`)
  }

  async getDashboardSetoran(params?: {
    page?: number
    limit?: number
    search?: string
    status_setoran?: string
    date_range?: string
  }) {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.status_setoran && params.status_setoran !== 'all') {
      queryParams.append('status_setoran', params.status_setoran)
    }
    if (params?.date_range && params.date_range !== 'all') {
      queryParams.append('date_range', params.date_range)
    }
    
    const queryString = queryParams.toString()
    return this.request(`/dashboard/setoran${queryString ? `?${queryString}` : ''}`)
  }

  async getDashboardOverview() {
    return this.request('/dashboard/overview')
  }

  async getMasterProduk(params?: {
    page?: number
    limit?: number
    search?: string
    status_produk?: string
    is_priority?: string
  }) {
    const searchParams = new URLSearchParams()
    
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.status_produk && params.status_produk !== 'all') {
      searchParams.set('status_produk', params.status_produk)
    }
    if (params?.is_priority && params.is_priority !== 'all') {
      searchParams.set('is_priority', params.is_priority)
    }

    const queryString = searchParams.toString()
    const endpoint = queryString ? `/dashboard/master/produk?${queryString}` : '/dashboard/master/produk'
    
    return this.request(endpoint)
  }

  async getMasterToko(params?: {
    page?: number
    limit?: number
    search?: string
    kabupaten?: string
    kecamatan?: string
    status_toko?: string
    id_sales?: string
  }) {
    const searchParams = new URLSearchParams()
    
    // Always set page and limit
    searchParams.set('page', (params?.page || 1).toString())
    searchParams.set('limit', (params?.limit || 25).toString())
    
    if (params?.search) searchParams.set('search', params.search)
    if (params?.kabupaten && params.kabupaten !== 'all') {
      searchParams.set('kabupaten', params.kabupaten)
    }
    if (params?.kecamatan && params.kecamatan !== 'all') {
      searchParams.set('kecamatan', params.kecamatan)
    }
    if (params?.status_toko && params.status_toko !== 'all') {
      searchParams.set('status_toko', params.status_toko)
    }
    if (params?.id_sales && params.id_sales !== 'all') {
      searchParams.set('id_sales', params.id_sales)
    }

    const queryString = searchParams.toString()
    const endpoint = `/dashboard/master/toko?${queryString}`
    
    return this.request(endpoint)
  }

  async getMasterSales() {
    return this.request('/dashboard/master/sales')
  }

  // Filter Options API
  async getFilterOptions() {
    return this.request('/dashboard/filters')
  }

  async getSalesOptions() {
    return this.request('/dashboard/filters/sales')
  }

  async getKabupatenOptions() {
    return this.request('/dashboard/filters/kabupaten')
  }

  async getKecamatanOptions(kabupaten?: string) {
    const params = kabupaten ? `?kabupaten=${encodeURIComponent(kabupaten)}` : ''
    return this.request(`/dashboard/filters/kecamatan${params}`)
  }

  async getTokoOptions(filters?: { sales_id?: number; kabupaten?: string; kecamatan?: string }) {
    const params = new URLSearchParams()
    if (filters?.sales_id) params.append('sales_id', filters.sales_id.toString())
    if (filters?.kabupaten) params.append('kabupaten', filters.kabupaten)
    if (filters?.kecamatan) params.append('kecamatan', filters.kecamatan)
    const queryString = params.toString()
    return this.request(`/dashboard/filters/toko${queryString ? `?${queryString}` : ''}`)
  }

  async getProdukOptions() {
    return this.request('/dashboard/filters/produk')
  }
}

export const apiClient = new ApiClient()