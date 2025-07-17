'use client'

import { useState, useEffect, useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  Edit, 
  Eye,
  Banknote,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  Receipt,
  Download,
  FileText,
  Building,
  User
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

import { DataTable, createSortableHeader, createStatusBadge, formatCurrency, formatDate } from '@/components/shared/data-table'

interface Setoran {
  id: string
  nomor_setoran: string
  tanggal_setoran: string
  sales_nama: string
  toko_nama: string
  jumlah_setoran: number
  metode_pembayaran: 'cash' | 'transfer' | 'cheque'
  status: 'pending' | 'diterima' | 'ditolak'
  keterangan: string
  created_at: string
  updated_at: string
}

const statusConfig = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock
  },
  diterima: {
    label: 'Diterima',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  ditolak: {
    label: 'Ditolak',
    color: 'bg-red-100 text-red-800',
    icon: XCircle
  }
}

const paymentMethodConfig = {
  cash: {
    label: 'Cash',
    color: 'bg-green-100 text-green-800',
    icon: Banknote
  },
  transfer: {
    label: 'Transfer',
    color: 'bg-blue-100 text-blue-800',
    icon: CreditCard
  },
  cheque: {
    label: 'Cheque',
    color: 'bg-purple-100 text-purple-800',
    icon: Receipt
  }
}

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<Setoran[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchDeposits()
  }, [])

  const fetchDeposits = async () => {
    try {
      setLoading(true)
      // Mock data - replace with actual API call
      const mockData: Setoran[] = Array.from({ length: 50 }, (_, i) => ({
        id: `${i + 1}`,
        nomor_setoran: `SET-${String(i + 1).padStart(3, '0')}`,
        sales_nama: ['Ahmad Rizki', 'Siti Nurhaliza', 'Budi Santoso', 'Dewi Sartika', 'Eko Prasetyo'][i % 5],
        toko_nama: ['Toko Berkah', 'Warung Maju', 'Swalayan Sejahtera', 'Minimarket Bahagia', 'Toko Jaya'][i % 5],
        jumlah_setoran: Math.floor(Math.random() * 5000000) + 500000,
        tanggal_setoran: new Date(2024, 0, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0],
        metode_pembayaran: ['cash', 'transfer', 'cheque'][Math.floor(Math.random() * 3)] as 'cash' | 'transfer' | 'cheque',
        status: ['pending', 'diterima', 'ditolak'][Math.floor(Math.random() * 3)] as 'pending' | 'diterima' | 'ditolak',
        keterangan: i % 3 === 0 ? `Setoran rutin periode ${i + 1}` : '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
      
      setDeposits(mockData)
    } catch (error) {
      console.error('Error fetching deposits:', error)
      toast({
        title: 'Error',
        description: 'Gagal memuat data setoran',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = (id: string, newStatus: 'pending' | 'diterima' | 'ditolak') => {
    setDeposits(prev => prev.map(deposit => 
      deposit.id === id ? { ...deposit, status: newStatus } : deposit
    ))
  }

  const columns = useMemo<ColumnDef<Setoran>[]>(() => [
    {
      accessorKey: 'nomor_setoran',
      header: createSortableHeader('Nomor Setoran'),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('nomor_setoran')}</div>
      )
    },
    {
      accessorKey: 'sales_nama',
      header: 'Sales',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <span>{row.getValue('sales_nama')}</span>
        </div>
      )
    },
    {
      accessorKey: 'toko_nama',
      header: 'Toko',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-gray-400" />
          <span>{row.getValue('toko_nama')}</span>
        </div>
      )
    },
    {
      accessorKey: 'jumlah_setoran',
      header: createSortableHeader('Jumlah Setoran'),
      cell: ({ row }) => (
        <div className="font-semibold text-green-600">
          {formatCurrency(row.getValue('jumlah_setoran'))}
        </div>
      )
    },
    {
      accessorKey: 'metode_pembayaran',
      header: 'Metode Pembayaran',
      cell: ({ row }) => {
        const method = row.getValue('metode_pembayaran') as keyof typeof paymentMethodConfig
        const PaymentIcon = paymentMethodConfig[method].icon
        return (
          <Badge className={paymentMethodConfig[method].color}>
            <PaymentIcon className="w-3 h-3 mr-1" />
            {paymentMethodConfig[method].label}
          </Badge>
        )
      }
    },
    {
      accessorKey: 'tanggal_setoran',
      header: createSortableHeader('Tanggal Setoran'),
      cell: ({ row }) => (
        <div>{formatDate(row.getValue('tanggal_setoran'))}</div>
      )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => createStatusBadge(row.getValue('status'), statusConfig)
    },

  ], [])

  const filters = [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'Semua Status' },
        { value: 'pending', label: 'Pending' },
        { value: 'diterima', label: 'Diterima' },
        { value: 'ditolak', label: 'Ditolak' }
      ]
    },
    {
      key: 'metode_pembayaran',
      label: 'Metode Pembayaran',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'Semua Metode' },
        { value: 'cash', label: 'Cash' },
        { value: 'transfer', label: 'Transfer' },
        { value: 'cheque', label: 'Cheque' }
      ]
    },
    {
      key: 'sales_nama',
      label: 'Sales',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'Semua Sales' },
        ...Array.from(new Set(deposits.map(deposit => deposit.sales_nama))).map(sales => ({
          value: sales,
          label: sales
        }))
      ]
    }
  ]

  const actions = [
    {
      label: 'Terima',
      icon: CheckCircle,
      onClick: (row: Setoran) => updateStatus(row.id, 'diterima'),

      className: 'bg-green-500 hover:bg-green-600 text-white',
      condition: (row: Setoran) => row.status === 'pending'
    },
    {
      label: 'Tolak',
      icon: XCircle,
      onClick: (row: Setoran) => updateStatus(row.id, 'ditolak'),

      className: 'border-red-200 text-red-600 hover:bg-red-50',
      condition: (row: Setoran) => row.status === 'pending'
    },
    {
      label: 'Lihat',
      icon: Eye,
      onClick: (row: Setoran) => window.location.href = `/dashboard/setoran/${row.id}`,

      className: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (row: Setoran) => window.location.href = `/dashboard/setoran/${row.id}/edit`,

      className: 'text-gray-600 hover:text-gray-700 hover:bg-gray-50'
    },
    {
      label: 'Cetak',
      icon: FileText,
      onClick: (row: Setoran) => window.open(`/dashboard/setoran/${row.id}/print`, '_blank'),

      className: 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
    }
  ]



  const depositStats = {
    total: deposits.length,
    pending: deposits.filter(d => d.status === 'pending').length,
    accepted: deposits.filter(d => d.status === 'diterima').length,
    rejected: deposits.filter(d => d.status === 'ditolak').length,
    totalAmount: deposits.reduce((sum, d) => sum + d.jumlah_setoran, 0),
    acceptedAmount: deposits.filter(d => d.status === 'diterima').reduce((sum, d) => sum + d.jumlah_setoran, 0),
    pendingAmount: deposits.filter(d => d.status === 'pending').reduce((sum, d) => sum + d.jumlah_setoran, 0)
  }

  return (
    <div className="p-8">
      <DataTable
        data={deposits}
        columns={columns}
        title="Daftar Setoran"
        description={loading ? "Loading..." : `Terdapat total ${depositStats.total} setoran, ${depositStats.pending} pending, ${depositStats.accepted} diterima, dan ${depositStats.rejected} ditolak`}

        searchPlaceholder="Cari setoran..."
        filters={filters}
        actions={actions}
        onAdd={() => window.location.href = '/dashboard/setoran/create'}
        onExport={() => {}}
        onRefresh={() => window.location.reload()}
        addButtonLabel="Catat Setoran"
        loading={loading}
        emptyStateMessage="Tidak ada setoran ditemukan."
        emptyStateIcon={Banknote}
      />
    </div>
  )
}