'use client'

import { useState, useEffect, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  Barcode,
  Eye,
  AlertCircle,
  Download
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

import { DataTable } from '@/components/shared/data-table'
import { createSortableHeader, createStatusBadge, formatCurrency } from '@/components/shared/data-table'
import type { ColumnDef } from '@tanstack/react-table'

interface Product {
  id: string
  kode_produk: string
  nama_produk: string
  harga_beli: number
  harga_jual: number
  stok: number
  kategori: string
  status: 'aktif' | 'nonaktif'
  created_at: string
  updated_at: string
}

const statusConfig = {
  aktif: {
    label: 'Aktif',
    color: 'bg-green-100 text-green-800'
  },
  nonaktif: {
    label: 'Non-aktif',
    color: 'bg-gray-100 text-gray-800'
  }
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      // Mock data - replace with actual API call
      const categories = ['Kebersihan', 'Makanan', 'Minuman', 'Elektronik', 'Pakaian']
      const productNames = [
        'Sabun Mandi', 'Shampoo', 'Pasta Gigi', 'Deterjen', 'Pembersih Lantai',
        'Mie Instan', 'Beras', 'Gula', 'Minyak Goreng', 'Kopi',
        'Air Mineral', 'Teh', 'Susu', 'Jus', 'Minuman Energi',
        'Charger HP', 'Kabel USB', 'Earphone', 'Power Bank', 'Speaker',
        'Kaos', 'Celana', 'Jaket', 'Sepatu', 'Tas'
      ]
      
      const mockData: Product[] = Array.from({ length: 50 }, (_, i) => {
        const category = categories[i % categories.length]
        const productName = productNames[i % productNames.length]
        const hargaBeli = Math.floor(Math.random() * 50000) + 5000
        const hargaJual = Math.floor(hargaBeli * (1.2 + Math.random() * 0.8))
        
        return {
          id: `${i + 1}`,
          kode_produk: `PRD-${String(i + 1).padStart(3, '0')}`,
          nama_produk: productName,
          harga_beli: hargaBeli,
          harga_jual: hargaJual,
          stok: Math.floor(Math.random() * 100) + 1,
          kategori: category,
          status: Math.random() > 0.1 ? 'aktif' : 'nonaktif',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      })
      
      setProducts(mockData)
    } catch (error) {
      console.error('Error fetching products:', error)
      toast({
        title: 'Error',
        description: 'Gagal memuat data produk',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      setProducts(prev => prev.filter(p => p.id !== id))
      toast({
        title: 'Berhasil',
        description: 'Produk berhasil dihapus'
      })
    }
  }

  const columns = useMemo<ColumnDef<Product>[]>(() => [
    {
      accessorKey: 'kode_produk',
      header: createSortableHeader('Kode Produk'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Barcode className="w-4 h-4 text-gray-400" />
          <span className="font-mono text-sm">{row.getValue('kode_produk')}</span>
        </div>
      )
    },
    {
      accessorKey: 'nama_produk',
      header: createSortableHeader('Nama Produk'),
      cell: ({ row }) => (
        <div className="font-medium text-gray-900">{row.getValue('nama_produk')}</div>
      )
    },
    {
      accessorKey: 'kategori',
      header: 'Kategori',
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-gray-50 text-gray-700">
          {row.getValue('kategori')}
        </Badge>
      )
    },
    {
      accessorKey: 'harga_beli',
      header: createSortableHeader('Harga Beli'),
      cell: ({ row }) => (
        <div className="text-gray-600">
          {formatCurrency(row.getValue('harga_beli'))}
        </div>
      )
    },
    {
      accessorKey: 'harga_jual',
      header: createSortableHeader('Harga Jual'),
      cell: ({ row }) => (
        <div className="text-gray-900 font-medium">
          {formatCurrency(row.getValue('harga_jual'))}
        </div>
      )
    },
    {
      accessorKey: 'stok',
      header: createSortableHeader('Stok'),
      cell: ({ row }) => {
        const stok = row.getValue('stok') as number
        return (
          <div className="flex items-center gap-2">
            <span className={`font-medium ${stok < 10 ? 'text-red-600' : 'text-gray-900'}`}>
              {stok}
            </span>
            {stok < 10 && (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
          </div>
        )
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => createStatusBadge(row.getValue('status'), statusConfig)
    }
  ], [])

  const filters = [
    {
      key: 'kategori',
      label: 'Kategori',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'Semua Kategori' },
        ...Array.from(new Set(products.map(p => p.kategori))).map(kategori => ({
          value: kategori,
          label: kategori
        }))
      ]
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'Semua Status' },
        { value: 'aktif', label: 'Aktif' },
        { value: 'nonaktif', label: 'Non-aktif' }
      ]
    },
    {
      key: 'stok',
      label: 'Stok',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'Semua Stok' },
        { value: 'low', label: 'Stok Rendah (<10)' },
        { value: 'normal', label: 'Stok Normal (≥10)' }
      ]
    }
  ]

  const actions = [
    {
      label: 'Lihat',
      icon: Eye,
      onClick: (row: Product) => window.location.href = `/dashboard/master-data/produk/${row.id}`,
      variant: 'view' as const
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (row: Product) => window.location.href = `/dashboard/master-data/produk/${row.id}/edit`,
      variant: 'edit' as const
    },
    {
      label: 'Hapus',
      icon: Trash2,
      onClick: (row: Product) => handleDelete(row.id),
      variant: 'delete' as const
    }
  ]

  const productStats = {
    totalProducts: products.length,
    activeProducts: products.filter(p => p.status === 'aktif').length,
    lowStock: products.filter(p => p.stok < 10).length,
    totalValue: products.reduce((sum, p) => sum + (p.harga_jual * p.stok), 0)
  }

  return (
    <div className="p-8">
      <DataTable
        data={products}
        columns={columns}
        title="Daftar Produk"
        description={loading ? "Loading..." : `Terdapat total ${productStats.totalProducts} produk, ${productStats.activeProducts} aktif, ${productStats.lowStock} stok rendah, dan total nilai ${formatCurrency(productStats.totalValue)}`}
        searchPlaceholder="Cari produk..."
        filters={filters}
        actions={actions}
        onAdd={() => window.location.href = '/dashboard/master-data/produk/create'}
        onExport={() => {}}
        onRefresh={() => window.location.reload()}
        addButtonLabel="Tambah Produk"
        loading={loading}
        emptyStateMessage="Tidak ada produk ditemukan."
        emptyStateIcon={Package}
      />
    </div>
  )
}