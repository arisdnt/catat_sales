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
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Download
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

import { DataTable, createSortableHeader, createStatusBadge, formatDate } from '@/components/shared/data-table'

interface Pengiriman {
  id: string
  nomor_pengiriman: string
  tanggal_kirim: string
  toko_nama: string
  alamat_tujuan: string
  total_item: number
  status: 'pending' | 'dikirim' | 'selesai' | 'batal'
  catatan: string
  created_at: string
  updated_at: string
}

const statusConfig = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock
  },
  dikirim: {
    label: 'Dikirim',
    color: 'bg-blue-100 text-blue-800',
    icon: Truck
  },
  selesai: {
    label: 'Selesai',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  batal: {
    label: 'Dibatal',
    color: 'bg-red-100 text-red-800',
    icon: XCircle
  }
}

export default function ShippingPage() {
  const [shipments, setShipments] = useState<Pengiriman[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const columns = useMemo<ColumnDef<Pengiriman>[]>(() => [
    {
      accessorKey: 'nomor_pengiriman',
      header: createSortableHeader('No. Pengiriman'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.getValue('nomor_pengiriman')}</div>
            <div className="text-sm text-gray-500">{formatDate(row.original.tanggal_kirim)}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'toko_nama',
      header: createSortableHeader('Toko Tujuan'),
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-gray-900">{row.getValue('toko_nama')}</div>
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {row.original.alamat_tujuan}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'total_item',
      header: createSortableHeader('Total Item'),
      cell: ({ row }) => (
        <div className="text-center">
          <span className="font-medium text-gray-900">{row.getValue('total_item')}</span>
          <span className="text-sm text-gray-500 ml-1">item</span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: createSortableHeader('Status'),
      cell: ({ row }) => createStatusBadge(row.getValue('status'), statusConfig),
    },

  ], [])



  useEffect(() => {
    fetchShipments()
  }, [])

  const fetchShipments = async () => {
    try {
      // Simulate API call
      const mockData: Pengiriman[] = Array.from({ length: 50 }, (_, i) => ({
        id: `PGR-${String(i + 1).padStart(3, '0')}`,
        nomor_pengiriman: `PGR-${String(i + 1).padStart(3, '0')}`,
        toko_nama: `Toko ${['Maju Jaya', 'Berkah', 'Sejahtera', 'Mandiri', 'Sukses'][i % 5]}`,
        alamat_tujuan: `Jl. ${['Sudirman', 'Thamrin', 'Gatot Subroto', 'Kuningan', 'Senayan'][i % 5]} No. ${i + 1}`,
        tanggal_kirim: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        total_item: Math.floor(Math.random() * 50) + 1,
        status: ['pending', 'dikirim', 'selesai', 'batal'][Math.floor(Math.random() * 4)] as 'pending' | 'dikirim' | 'selesai' | 'batal',
        catatan: 'Pengiriman rutin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
      setShipments(mockData)
    } catch (error) {
      console.error('Error fetching shipments:', error)
      toast({
        title: 'Error',
        description: 'Gagal memuat data pengiriman',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      setShipments(prev => prev.map(item => 
        item.id === id ? { ...item, status: newStatus as any } : item
      ))
      toast({
        title: 'Berhasil',
        description: 'Status pengiriman berhasil diperbarui'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal memperbarui status',
        variant: 'destructive'
      })
    }
  }

  const stats = {
    total: shipments.length,
    pending: shipments.filter(s => s.status === 'pending').length,
    shipped: shipments.filter(s => s.status === 'dikirim').length,
    completed: shipments.filter(s => s.status === 'selesai').length,
    cancelled: shipments.filter(s => s.status === 'batal').length
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

  const filters = [
    {
      key: 'status',
      label: 'Semua Status',
      type: 'select' as const,
      options: [
        { value: 'pending', label: 'Pending', count: stats.pending },
        { value: 'dikirim', label: 'Dikirim', count: stats.shipped },
        { value: 'selesai', label: 'Selesai', count: stats.completed },
        { value: 'batal', label: 'Dibatal', count: stats.cancelled }
      ]
    },
    {
      key: 'toko_nama',
      label: 'Cari toko...',
      type: 'search' as const,
      placeholder: 'Nama toko'
    }
  ]

  const actions = [
    {
      label: 'Lihat Detail',
      icon: Eye,
      onClick: (row: Pengiriman) => window.location.href = `/dashboard/pengiriman/${row.id}`,
      variant: 'view' as const
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (row: Pengiriman) => window.location.href = `/dashboard/pengiriman/${row.id}/edit`,
      variant: 'edit' as const
    },
    {
      label: 'Kirim',
      icon: Truck,
      onClick: (row: Pengiriman) => updateStatus(row.id, 'dikirim'),
      variant: 'custom' as const,
      className: 'text-green-600 hover:text-green-700 hover:bg-green-50',
      show: (row: Pengiriman) => row.status === 'pending'
    }
  ]

  return (
    <div className="p-8">
        <DataTable
          data={shipments}
          columns={columns}
          title="Daftar Pengiriman"
          description={`Terdapat total ${stats.total} pengiriman, ${stats.pending} pending, ${stats.shipped} dikirim, ${stats.completed} selesai, dan ${stats.cancelled} batal`}
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