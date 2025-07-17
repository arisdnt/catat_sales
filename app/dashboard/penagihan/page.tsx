'use client'

import { useState, useEffect, useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  Edit, 
  Eye,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Download,
  Receipt
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

import { DataTable, createSortableHeader, createStatusBadge, formatCurrency, formatDate } from '@/components/shared/data-table'

interface Penagihan {
  id: string
  nomor_tagihan: string
  tanggal_tagihan: string
  tanggal_jatuh_tempo: string
  toko_nama: string
  total_tagihan: number
  total_dibayar: number
  sisa_tagihan: number
  status: 'pending' | 'partial' | 'lunas' | 'overdue'
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
  partial: {
    label: 'Sebagian',
    color: 'bg-orange-100 text-orange-800',
    icon: AlertCircle
  },
  lunas: {
    label: 'Lunas',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  overdue: {
    label: 'Terlambat',
    color: 'bg-red-100 text-red-800',
    icon: XCircle
  }
}

export default function BillingPage() {
  const [bills, setBills] = useState<Penagihan[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString()
  }

  const columns = useMemo<ColumnDef<Penagihan>[]>(() => [
    {
      accessorKey: 'nomor_tagihan',
      header: createSortableHeader('No. Tagihan'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-50 rounded-lg">
            <Receipt className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.getValue('nomor_tagihan')}</div>
            <div className="text-sm text-gray-500">{formatDate(row.original.tanggal_tagihan)}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'toko_nama',
      header: createSortableHeader('Toko'),
      cell: ({ row }) => (
        <div className="font-medium text-gray-900">{row.getValue('toko_nama')}</div>
      ),
    },
    {
      accessorKey: 'total_tagihan',
      header: createSortableHeader('Total Tagihan'),
      cell: ({ row }) => (
        <div className="text-right">
          <div className="font-medium text-gray-900">{formatCurrency(row.getValue('total_tagihan'))}</div>
          <div className="text-sm text-green-600">Dibayar: {formatCurrency(row.original.total_dibayar)}</div>
          <div className="text-sm text-red-600">Sisa: {formatCurrency(row.original.sisa_tagihan)}</div>
        </div>
      ),
    },
    {
      accessorKey: 'tanggal_jatuh_tempo',
      header: createSortableHeader('Jatuh Tempo'),
      cell: ({ row }) => {
        const isLate = isOverdue(row.getValue('tanggal_jatuh_tempo')) && row.original.status !== 'lunas'
        return (
          <div className={`text-center ${isLate ? 'text-red-600' : 'text-gray-900'}`}>
            <div className="font-medium">{formatDate(row.getValue('tanggal_jatuh_tempo'))}</div>
            {isLate && (
              <Badge className="bg-red-100 text-red-800 text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Terlambat
              </Badge>
            )}
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
    fetchBills()
  }, [])

  const fetchBills = async () => {
    try {
      // Simulate API call
      const mockData: Penagihan[] = Array.from({ length: 50 }, (_, i) => {
        const totalTagihan = Math.floor(Math.random() * 10000000) + 1000000
        const totalDibayar = Math.floor(Math.random() * totalTagihan)
        const sisaTagihan = totalTagihan - totalDibayar
        
        return {
          id: `TGH-${String(i + 1).padStart(3, '0')}`,
          nomor_tagihan: `TGH-${String(i + 1).padStart(3, '0')}`,
          tanggal_tagihan: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          tanggal_jatuh_tempo: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          toko_nama: `Toko ${['Maju Jaya', 'Berkah', 'Sejahtera', 'Mandiri', 'Sukses'][i % 5]}`,
          total_tagihan: totalTagihan,
          total_dibayar: totalDibayar,
          sisa_tagihan: sisaTagihan,
          status: ['pending', 'partial', 'lunas', 'overdue'][Math.floor(Math.random() * 4)] as 'pending' | 'partial' | 'lunas' | 'overdue',
          catatan: 'Tagihan rutin bulanan',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      })
      setBills(mockData)
    } catch (error) {
      console.error('Error fetching bills:', error)
      toast({
        title: 'Error',
        description: 'Gagal memuat data penagihan',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      setBills(prev => prev.map(bill => 
        bill.id === id ? { ...bill, status: newStatus as any } : bill
      ))
      toast({
        title: 'Berhasil',
        description: 'Status penagihan berhasil diperbarui'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal memperbarui status',
        variant: 'destructive'
      })
    }
  }

  const filters = [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'Semua Status' },
        { value: 'pending', label: 'Pending' },
        { value: 'partial', label: 'Sebagian' },
        { value: 'lunas', label: 'Lunas' },
        { value: 'overdue', label: 'Terlambat' }
      ]
    },
    {
      key: 'toko_nama',
      label: 'Toko',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'Semua Toko' },
        ...Array.from(new Set(bills.map(bill => bill.toko_nama))).map(toko => ({
          value: toko,
          label: toko
        }))
      ]
    }
  ]

  const actions = [
    {
      label: 'Lihat',
      icon: Eye,
      onClick: (row: Penagihan) => window.location.href = `/dashboard/penagihan/${row.id}`,
      className: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (row: Penagihan) => window.location.href = `/dashboard/penagihan/${row.id}/edit`,
      className: 'text-gray-600 hover:text-gray-700 hover:bg-gray-50'
    },
    {
      label: 'Tandai Lunas',
      icon: CheckCircle,
      onClick: (row: Penagihan) => updateStatus(row.id, 'lunas'),
      className: 'text-green-600 hover:text-green-700 hover:bg-green-50',
      condition: (row: Penagihan) => row.status === 'pending' || row.status === 'partial'
    }
  ]

  const billStats = {
    total: bills.length,
    pending: bills.filter(b => b.status === 'pending').length,
    partial: bills.filter(b => b.status === 'partial').length,
    paid: bills.filter(b => b.status === 'lunas').length,
    overdue: bills.filter(b => b.status === 'overdue').length,
    totalAmount: bills.reduce((sum, b) => sum + b.total_tagihan, 0),
    paidAmount: bills.reduce((sum, b) => sum + b.total_dibayar, 0),
    pendingAmount: bills.reduce((sum, b) => sum + b.sisa_tagihan, 0)
  }

  return (
    <div className="p-8">
      <DataTable
        data={bills}
        columns={columns}
        title="Daftar Tagihan"
        description={loading ? "Loading..." : `Terdapat total ${billStats.total} tagihan, ${billStats.pending} pending, ${billStats.partial} sebagian, ${billStats.paid} lunas, dan ${billStats.overdue} terlambat`}
        searchPlaceholder="Cari tagihan..."
        filters={filters}
        actions={actions}
        onAdd={() => window.location.href = '/dashboard/penagihan/create'}
        onExport={() => {}}
        onRefresh={() => window.location.reload()}
        addButtonLabel="Buat Tagihan"
        loading={loading}
        emptyStateMessage="Tidak ada tagihan ditemukan."
        emptyStateIcon={Receipt}
      />
    </div>
  )
}