'use client'

import { useState, useEffect, useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Eye,
  CheckCircle,
  AlertTriangle,
  Users,
  Building,
  FileText,
  BarChart3
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { DataTable, createSortableHeader, createStatusBadge, formatCurrency, formatDate } from '@/components/shared/data-table'


interface RekonsiliasiData {
  periode: string
  toko_id: string
  toko_nama: string
  sales_nama: string
  total_pengiriman: number
  total_penjualan: number
  total_penagihan: number
  total_setoran: number
  selisih: number
  status: 'sesuai' | 'selisih' | 'pending'
  last_updated: string
}

interface Summary {
  totalToko: number
  totalSesuai: number
  totalSelisih: number
  totalPending: number
  totalNilaiPenjualan: number
  totalNilaiSetoran: number
  totalSelisihNilai: number
}

const statusConfig = {
  sesuai: {
    label: 'Sesuai',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  selisih: {
    label: 'Ada Selisih',
    color: 'bg-red-100 text-red-800',
    icon: AlertTriangle
  },
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800',
    icon: AlertTriangle
  }
}

export default function ReconciliationPage() {
  const [data, setData] = useState<RekonsiliasiData[]>([])
  const [summary, setSummary] = useState<Summary>({
    totalToko: 0,
    totalSesuai: 0,
    totalSelisih: 0,
    totalPending: 0,
    totalNilaiPenjualan: 0,
    totalNilaiSetoran: 0,
    totalSelisihNilai: 0
  })
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('2024-01')
  const { toast } = useToast()

  const columns = useMemo<ColumnDef<RekonsiliasiData>[]>(() => [
    {
      accessorKey: 'toko_nama',
      header: createSortableHeader('Toko'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Building className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.getValue('toko_nama')}</div>
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {row.original.sales_nama}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'total_pengiriman',
      header: createSortableHeader('Pengiriman'),
      cell: ({ row }) => (
        <div className="text-right">
          <span className="font-medium text-gray-900">{formatCurrency(row.getValue('total_pengiriman'))}</span>
        </div>
      ),
    },
    {
      accessorKey: 'total_penjualan',
      header: createSortableHeader('Penjualan'),
      cell: ({ row }) => (
        <div className="text-right">
          <span className="font-medium text-gray-900">{formatCurrency(row.getValue('total_penjualan'))}</span>
        </div>
      ),
    },
    {
      accessorKey: 'total_setoran',
      header: createSortableHeader('Setoran'),
      cell: ({ row }) => (
        <div className="text-right">
          <span className="font-medium text-gray-900">{formatCurrency(row.getValue('total_setoran'))}</span>
        </div>
      ),
    },
    {
      accessorKey: 'selisih',
      header: createSortableHeader('Selisih'),
      cell: ({ row }) => {
        const selisih = row.getValue('selisih') as number
        return (
          <div className="text-right">
            <span className={`font-medium ${
              selisih === 0 ? 'text-green-600' : 
              selisih > 0 ? 'text-blue-600' : 'text-red-600'
            }`}>
              {selisih === 0 ? '-' : formatCurrency(Math.abs(selisih))}
              {selisih > 0 && ' (+)'}
              {selisih < 0 && ' (-)'}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: createSortableHeader('Status'),
      cell: ({ row }) => createStatusBadge(row.getValue('status'), statusConfig),
    },
  ], [])

  useEffect(() => {
    fetchReconciliationData()
  }, [selectedPeriod])

  const fetchReconciliationData = async () => {
    try {
      // Mock data for demo - expanded dataset
      const mockData: RekonsiliasiData[] = Array.from({ length: 25 }, (_, i) => ({
        periode: selectedPeriod,
        toko_id: `${i + 1}`,
        toko_nama: `Toko ${['Berkah', 'Maju Jaya', 'Sejahtera', 'Mandiri', 'Sukses'][i % 5]} ${Math.floor(i / 5) + 1}`,
        sales_nama: ['John Doe', 'Jane Smith', 'Bob Wilson', 'Alice Brown', 'Charlie Davis'][i % 5],
        total_pengiriman: Math.floor(Math.random() * 20000000) + 5000000,
        total_penjualan: Math.floor(Math.random() * 18000000) + 4500000,
        total_penagihan: Math.floor(Math.random() * 17000000) + 4200000,
        total_setoran: Math.floor(Math.random() * 16000000) + 4000000,
        selisih: Math.floor(Math.random() * 2000000) - 1000000,
        status: ['sesuai', 'selisih', 'pending'][Math.floor(Math.random() * 3)] as 'sesuai' | 'selisih' | 'pending',
        last_updated: new Date().toISOString()
      }))
      
      const mockSummary: Summary = {
        totalToko: mockData.length,
        totalSesuai: mockData.filter(d => d.status === 'sesuai').length,
        totalSelisih: mockData.filter(d => d.status === 'selisih').length,
        totalPending: mockData.filter(d => d.status === 'pending').length,
        totalNilaiPenjualan: mockData.reduce((sum, d) => sum + d.total_penjualan, 0),
        totalNilaiSetoran: mockData.reduce((sum, d) => sum + d.total_setoran, 0),
        totalSelisihNilai: mockData.reduce((sum, d) => sum + d.selisih, 0)
      }
      
      setData(mockData)
      setSummary(mockSummary)
    } catch (error) {
      console.error('Error fetching reconciliation data:', error)
      toast({
        title: 'Error',
        description: 'Gagal memuat data rekonsiliasi',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    total: summary.totalToko,
    sesuai: summary.totalSesuai,
    selisih: summary.totalSelisih,
    pending: summary.totalPending
  }

  const filters = [
    {
      key: 'status',
      label: 'Semua Status',
      type: 'select' as const,
      options: [
        { value: 'sesuai', label: 'Sesuai', count: stats.sesuai },
        { value: 'selisih', label: 'Ada Selisih', count: stats.selisih },
        { value: 'pending', label: 'Pending', count: stats.pending }
      ]
    },
    {
      key: 'toko_nama',
      label: 'Cari toko...',
      type: 'search' as const,
      placeholder: 'Nama toko atau sales'
    }
  ]

  const actions = [
    {
      label: 'Lihat Detail',
      icon: Eye,
      onClick: (row: RekonsiliasiData) => console.log('View detail:', row),
      variant: 'view' as const
    },
    {
      label: 'Laporan',
      icon: FileText,
      onClick: (row: RekonsiliasiData) => console.log('Generate report:', row),
      variant: 'custom' as const,
      className: 'text-gray-600 hover:text-gray-700 hover:bg-gray-50'
    }
  ]

  return (
    <div className="p-8">
      <DataTable
        data={data}
        columns={columns}
        title="Data Rekonsiliasi"
        description={`Periode ${selectedPeriod} - Terdapat total ${stats.total} toko, ${stats.sesuai} sesuai, ${stats.selisih} ada selisih, dan ${stats.pending} pending`}
        searchPlaceholder="Cari toko atau sales..."
        filters={filters}
        actions={actions}
        onExport={() => console.log('Export rekonsiliasi')}
        onRefresh={fetchReconciliationData}
        loading={loading}
        emptyStateMessage="Tidak ada data rekonsiliasi yang ditemukan"
        emptyStateIcon={BarChart3}
      />
    </div>
  )
}