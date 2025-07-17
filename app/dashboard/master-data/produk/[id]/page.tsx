'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'

import { formatDate, formatCurrency } from '@/lib/form-utils'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Package, 
  DollarSign,
  Calendar,
  Tag,
  FileText,
  TrendingUp
} from 'lucide-react'

interface ProdukDetail {
  id: string
  nama_produk: string
  harga_satuan: number
  kategori: string
  status_produk: boolean
  deskripsi: string
  created_at: string
  updated_at: string
}

export default function ProdukDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  const [produk, setProduk] = useState<ProdukDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [itemId, setItemId] = useState<string>('')

  useEffect(() => {
    const initializeParams = async () => {
      const { id } = await params
      setItemId(id)
      fetchProdukDetail(id)
    }
    initializeParams()
  }, [])

  const fetchProdukDetail = async (id?: string) => {
    const produkId = id || itemId
    try {
      // Mock data for demo - replace with actual API call
      const mockProduk: ProdukDetail = {
        id: produkId,
        nama_produk: 'Sabun Mandi Lifebuoy',
        harga_satuan: 5000,
        kategori: 'Kebersihan',
        status_produk: true,
        deskripsi: 'Sabun mandi dengan formula antibakteri untuk perlindungan maksimal terhadap kuman dan bakteri.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      setProduk(mockProduk)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal memuat data produk',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      return
    }

    try {
      const response = await fetch(`/api/produk/${itemId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Gagal menghapus produk')
      }

      toast({
        title: 'Berhasil',
        description: 'Produk berhasil dihapus'
      })

      router.push('/dashboard/master-data/produk')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (!produk) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-500">Data produk tidak ditemukan</p>
          <Button 
            onClick={() => router.back()}
            className="mt-4"
          >
            Kembali
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Basic Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Informasi Produk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Nama Produk</label>
                    <p className="text-gray-900 font-medium">{produk.nama_produk}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Kategori</label>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900">{produk.kategori}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <div className="mt-1">
                      <Badge 
                        variant={produk.status_produk ? 'default' : 'secondary'}
                        className={produk.status_produk ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      >
                        {produk.status_produk ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Harga Satuan</label>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900 font-semibold text-lg">{formatCurrency(produk.harga_satuan)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Dibuat</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900">{formatDate(produk.created_at)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Diperbarui</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900">{formatDate(produk.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {produk.deskripsi && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Deskripsi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-900 leading-relaxed">{produk.deskripsi}</p>
              </CardContent>
            </Card>
          )}

          {/* Statistics */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Statistik Penjualan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">125</div>
                  <div className="text-sm text-blue-600">Total Terjual</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(625000)}</div>
                  <div className="text-sm text-green-600">Total Pendapatan</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">15</div>
                  <div className="text-sm text-purple-600">Toko Aktif</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  )
}