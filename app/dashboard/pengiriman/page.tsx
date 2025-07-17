'use client'

import { useState, useEffect, useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  Edit, 
  Eye,
  Package,
  MapPin
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api-client'

import { DataTable, createSortableHeader, formatDate } from '@/components/shared/data-table'

interface Pengiriman {
  id_pengiriman: number
  tanggal_kirim: string
  toko: {
    nama_toko: string
    alamat: string
    kabupaten: string
    sales: {
      nama_sales: string
    }
  }
  detail_pengiriman: Array<{
    jumlah_kirim: number
    produk: {
      nama_produk: string
    }
  }>
  total_barang?: number
}

export default function ShippingPage() {
  const [shipments, setShipments] = useState<Pengiriman[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const columns = useMemo<ColumnDef<Pengiriman>[]>(() => [
    {
      accessorKey: 'id_pengiriman',
      header: createSortableHeader('No. Pengiriman'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">PGR-{String(row.getValue('id_pengiriman')).padStart(3, '0')}</div>
            <div className="text-sm text-gray-500">{formatDate(row.original.tanggal_kirim)}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'toko_nama',
      accessorFn: (row) => row.toko?.nama_toko,
      header: createSortableHeader('Toko Tujuan'),
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-gray-900">{row.original.toko?.nama_toko || 'N/A'}</div>
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {row.original.toko?.alamat || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      id: 'sales_nama',
      accessorFn: (row) => row.toko?.sales?.nama_sales,
      header: createSortableHeader('Sales Pengirim'),
      cell: ({ row }) => (
        <div className="font-medium text-gray-900">{row.original.toko?.sales?.nama_sales || 'N/A'}</div>
      ),
    },
    {
      id: 'toko_kabupaten',
      accessorFn: (row) => row.toko?.kabupaten,
      header: createSortableHeader('Kabupaten'),
      cell: ({ row }) => (
        <div className="font-medium text-gray-900">{row.original.toko?.kabupaten || 'N/A'}</div>
      ),
    },
    {
      accessorKey: 'total_barang',
      header: createSortableHeader('Total Barang'),
      cell: ({ row }) => {
        const details = row.original.detail_pengiriman || []
        
        if (details.length === 0) {
          return (
            <div className="text-center">
              <span className="font-medium text-gray-900">{row.original.total_barang || 0}</span>
              <span className="text-sm text-gray-500 ml-1">item</span>
            </div>
          )
        }
        
        const tooltipContent = details.map((detail: any) => {
          const productName = detail.produk?.nama_produk || 'Produk'
          const quantity = detail.jumlah_kirim || 0
          return `${productName} : ${quantity}`
        }).join('\n')
        
        return (
          <div className="text-center">
            <div 
              className="relative inline-block cursor-help border-b border-dotted border-gray-400 hover:border-gray-600 group"
              title={tooltipContent}
            >
              <span className="font-medium text-gray-900">{row.original.total_barang || 0}</span>
              <span className="text-sm text-gray-500 ml-1">item</span>
              
              {/* Custom tooltip with better visibility */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-pre-line z-50 min-w-max">
                {tooltipContent || 'Tidak ada detail produk'}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
              </div>
            </div>
          </div>
        )
      },
    }
  ], [])



  useEffect(() => {
    fetchShipments()
  }, [])

  const fetchShipments = async () => {
    try {
      const result = await apiClient.getShipments(true)
      
      // Handle different response structures
      let dataArray: any[]
      if (Array.isArray(result)) {
        // Direct array response
        dataArray = result
      } else if (result && Array.isArray(result.data)) {
        // Wrapped in data property
        dataArray = result.data
      } else {
        console.warn('Invalid API response structure:', result)
        setShipments([])
        return
      }
      

      
      const shipmentsData = dataArray.map((item: any) => ({
        ...item,
        total_barang: item.detail_pengiriman?.reduce((sum: number, detail: any) => sum + detail.jumlah_kirim, 0) || 0
      }))
      
      setShipments(shipmentsData)
    } catch (error) {
      console.error('Error fetching shipments:', error)
      toast({
        title: 'Error',
        description: 'Gagal memuat data pengiriman',
        variant: 'destructive'
      })
      setShipments([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    total: shipments.length,
    totalBarang: shipments.reduce((sum, s) => sum + (s.total_barang || 0), 0),
    uniqueSales: new Set(shipments.map(s => s.toko?.sales?.nama_sales)).size,
    uniqueKabupaten: new Set(shipments.map(s => s.toko?.kabupaten)).size
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  const uniqueSalesOptions = Array.from(new Set(shipments.map(s => s.toko?.sales?.nama_sales).filter(Boolean)))
    .map(sales => ({ value: sales, label: sales }))
  
  const uniqueKabupatenOptions = Array.from(new Set(shipments.map(s => s.toko?.kabupaten).filter(Boolean)))
    .map(kabupaten => ({ value: kabupaten, label: kabupaten }))

  const filters = [
    {
      key: 'sales_nama',
      label: 'Filter Sales',
      type: 'select' as const,
      options: Array.from(new Set(shipments.map(s => s.toko?.sales?.nama_sales).filter(Boolean))).map(nama => ({
        label: nama,
        value: nama
      }))
    },
    {
      key: 'toko_kabupaten',
      label: 'Filter Kabupaten',
      type: 'select' as const,
      options: Array.from(new Set(shipments.map(s => s.toko?.kabupaten).filter(Boolean))).map(kabupaten => ({
        label: kabupaten,
        value: kabupaten
      }))
    }
  ]

  const actions = [
    {
      label: 'Lihat Detail',
      icon: Eye,
      onClick: (row: Pengiriman) => window.location.href = `/dashboard/pengiriman/${row.id_pengiriman}`,
      variant: 'view' as const
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (row: Pengiriman) => window.location.href = `/dashboard/pengiriman/${row.id_pengiriman}/edit`,
      variant: 'edit' as const
    }
  ]

  return (
    <div className="p-8">
        <DataTable
          data={shipments}
          columns={columns}
          title="Daftar Pengiriman"
          description={`Terdapat total ${stats.total} pengiriman dengan ${stats.totalBarang} barang dari ${stats.uniqueSales} sales di ${stats.uniqueKabupaten} kabupaten`}
          searchPlaceholder="Cari pengiriman..."
          filters={filters}
          actions={actions}
          onAdd={() => window.location.href = '/dashboard/pengiriman/add'}
          onExport={() => console.log('Export pengiriman')}
          onRefresh={fetchShipments}
          addButtonLabel="Buat Pengiriman"
          loading={loading}
          emptyStateMessage="Tidak ada pengiriman yang ditemukan"
          emptyStateIcon={Package}
        />
    </div>
  )
}