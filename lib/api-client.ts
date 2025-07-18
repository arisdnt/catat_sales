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
  async getStores(status?: 'active', includeSales?: boolean) {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (includeSales) params.append('include_sales', 'true')
    const queryString = params.toString()
    return this.request(`/toko${queryString ? `?${queryString}` : ''}`)
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

  // Shipment API
  async getShipments(includeDetails?: boolean) {
    const params = includeDetails ? '?include_details=true' : ''
    return this.request(`/pengiriman${params}`)
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

  // Bulk Shipment API
  async createBulkShipment(data: {
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
    return this.request('/pengiriman/bulk', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async getBulkShipments(id_sales?: number, limit?: number) {
    const params = new URLSearchParams()
    if (id_sales) params.append('id_sales', id_sales.toString())
    if (limit) params.append('limit', limit.toString())
    const queryString = params.toString()
    return this.request(`/pengiriman/bulk${queryString ? `?${queryString}` : ''}`)
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
}

export const apiClient = new ApiClient()