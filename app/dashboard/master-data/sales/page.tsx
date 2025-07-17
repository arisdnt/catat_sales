'use client'

import { useState, useEffect, useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Phone,
  MapPin,
  Eye,
  Target,
  Star,
  Download,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

import { DataTable, createSortableHeader, createStatusBadge, formatCurrency } from '@/components/shared/data-table'

interface Sales {
  id: string
  nama_sales: string
  alamat: string
  telepon: string
  email: string
  status: 'aktif' | 'nonaktif'
  target_bulanan: number
  komisi_persen: number
  created_at: string
  updated_at: string
}

const statusConfig = {
  aktif: { label: 'Aktif', color: 'bg-green-100 text-green-800 border-green-200' },
  nonaktif: { label: 'Non-aktif', color: 'bg-red-100 text-red-800 border-red-200' }
}

export default function SalesPage() {
  const [salesData, setSalesData] = useState<Sales[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchSales()
  }, [])

  const fetchSales = async () => {
    try {
      // Mock data for demo - generating 50 records
      const mockData: Sales[] = Array.from({ length: 50 }, (_, i) => ({
        id: (i + 1).toString(),
        nama_sales: `Sales ${i + 1}`,
        alamat: `Jl. ${['Merdeka', 'Sudirman', 'Thamrin', 'Gatot Subroto', 'Kuningan'][i % 5]} No. ${Math.floor(Math.random() * 999) + 1}`,
        telepon: `081${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
        email: `sales${i + 1}@example.com`,
        status: Math.random() > 0.3 ? 'aktif' : 'nonaktif',
        target_bulanan: (Math.floor(Math.random() * 50) + 20) * 1000000,
        komisi_persen: Math.floor(Math.random() * 8) + 3,
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }))
      setSalesData(mockData)
    } catch (error) {
      console.error('Error fetching sales:', error)
      toast({
        title: 'Error',
        description: 'Gagal memuat data sales',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus sales ini?')) {
      try {
        setSalesData(salesData.filter(s => s.id !== id))
        toast({
          title: 'Berhasil',
          description: 'Sales berhasil dihapus'
        })
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Gagal menghapus sales',
          variant: 'destructive'
        })
      }
    }
  }

  const columns = useMemo<ColumnDef<Sales>[]>(() => [
    {
      accessorKey: 'nama_sales',
      header: createSortableHeader('Nama Sales'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-50 rounded-lg">
            <Users className="w-4 h-4 text-cyan-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.original.nama_sales}</div>
            <div className="text-sm text-gray-500">{row.original.email}</div>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'telepon',
      header: 'Telepon',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900">{row.original.telepon}</span>
        </div>
      )
    },
    {
      accessorKey: 'alamat',
      header: 'Alamat',
      cell: ({ row }) => (
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <span className="text-gray-600 text-sm">{row.original.alamat}</span>
        </div>
      )
    },
    {
      accessorKey: 'target_bulanan',
      header: createSortableHeader('Target Bulanan'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-900">{formatCurrency(row.original.target_bulanan)}</span>
        </div>
      )
    },
    {
      accessorKey: 'komisi_persen',
      header: createSortableHeader('Komisi'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900">{row.original.komisi_persen}%</span>
        </div>
      )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => createStatusBadge(row.getValue('status'), statusConfig),
      filterFn: (row, id, value) => {
        return value === 'all' || row.getValue(id) === value
      }
    },
  ], [])

  const stats = {
    totalSales: salesData.length,
    activeSales: salesData.filter(s => s.status === 'aktif').length,
    inactiveSales: salesData.filter(s => s.status === 'nonaktif').length,
    avgTarget: salesData.length > 0 ? salesData.reduce((sum, s) => sum + s.target_bulanan, 0) / salesData.length : 0
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

  return (
    <div className="p-8 space-y-8">
        <DataTable 
          data={salesData}
          columns={columns}
          title="Daftar Sales"
          description={`Terdapat total ${stats.totalSales} sales, ${stats.activeSales} aktif, ${stats.inactiveSales} nonaktif, dengan rata-rata target ${formatCurrency(stats.avgTarget)}`}
          searchPlaceholder="Cari sales..."
          onAdd={() => window.location.href = '/dashboard/master-data/sales/add'}
          onExport={() => {
            toast({
              title: "Export Data",
              description: "Data sales berhasil diexport",
            })
          }}
          onRefresh={() => {
            setLoading(true)
            // Simulate refresh
            setTimeout(() => setLoading(false), 1000)
          }}
          addButtonLabel="Tambah Sales"
          loading={loading}
          emptyStateMessage="Belum ada data sales"
          emptyStateIcon={Users}
          filters={[
            {
              key: 'status',
              label: 'Status',
              type: 'select',
              options: [
                { label: 'Aktif', value: 'aktif' },
                { label: 'Non-aktif', value: 'nonaktif' }
              ]
            }
          ]}
          actions={[
            {
              label: 'Lihat Detail',
              icon: Eye,
              onClick: (row: Sales) => window.location.href = `/dashboard/master-data/sales/${row.id}`,
              variant: 'view'
            },
            {
              label: 'Edit',
              icon: Edit,
              onClick: (row: Sales) => window.location.href = `/dashboard/master-data/sales/${row.id}/edit`,
              variant: 'edit'
            },
            {
              label: 'Hapus',
              icon: Trash2,
              onClick: (row: Sales) => handleDelete(row.id),
              variant: 'delete'
            }
          ]}
        />
    </div>
  )
}