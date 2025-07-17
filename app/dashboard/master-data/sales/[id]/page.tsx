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
  Users, 
  Phone,
  Mail,
  MapPin,
  Target,
  Star,
  Calendar,
  TrendingUp,
  DollarSign
} from 'lucide-react'

interface SalesDetail {
  id: string
  nama_sales: string
  nomor_telepon: string
  email: string
  alamat: string
  target_penjualan: number
  komisi_persen: number
  status_sales: boolean
  created_at: string
  updated_at: string
}

export default function SalesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  const [sales, setSales] = useState<SalesDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [itemId, setItemId] = useState<string>('')

  useEffect(() => {
    const initializeParams = async () => {
      const { id } = await params
      setItemId(id)
      fetchSalesDetail(id)
    }
    initializeParams()
  }, [])

  const fetchSalesDetail = async (id?: string) => {
    const salesId = id || itemId
    try {
      // Mock data for demo - replace with actual API call
      const mockSales: SalesDetail = {
        id: salesId,
        nama_sales: 'John Doe',
        nomor_telepon: '081234567890',
        email: 'john@example.com',
        alamat: 'Jl. Merdeka No. 123, Jakarta',
        target_penjualan: 50000000,
        komisi_persen: 5,
        status_sales: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      setSales(mockSales)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal memuat data sales',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus sales ini?')) {
      return
    }

    try {
      const response = await fetch(`/api/sales/${itemId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Gagal menghapus sales')
      }

      toast({
        title: 'Berhasil',
        description: 'Sales berhasil dihapus'
      })

      router.push('/dashboard/master-data/sales')
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

  if (!sales) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-500">Data sales tidak ditemukan</p>
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
                <Users className="w-5 h-5" />
                Informasi Pribadi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Nama Sales</label>
                    <p className="text-gray-900 font-medium">{sales.nama_sales}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Nomor Telepon</label>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900">{sales.nomor_telepon}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900">{sales.email || '-'}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <div className="mt-1">
                      <Badge 
                        variant={sales.status_sales ? 'default' : 'secondary'}
                        className={sales.status_sales ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      >
                        {sales.status_sales ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Dibuat</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900">{formatDate(sales.created_at)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Diperbarui</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900">{formatDate(sales.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Alamat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-900">{sales.alamat}</p>
            </CardContent>
          </Card>

          {/* Sales Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Informasi Penjualan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-600">Target Penjualan</label>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900 font-semibold text-lg">{formatCurrency(sales.target_penjualan)}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Komisi</label>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900 font-semibold text-lg">{sales.komisi_persen}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Statistics */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Statistik Performa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(35000000)}</div>
                  <div className="text-sm text-blue-600">Penjualan Bulan Ini</div>
                  <div className="text-xs text-gray-500 mt-1">70% dari target</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">24</div>
                  <div className="text-sm text-green-600">Toko Aktif</div>
                  <div className="text-xs text-gray-500 mt-1">Wilayah kerja</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{formatCurrency(1750000)}</div>
                  <div className="text-sm text-purple-600">Komisi Bulan Ini</div>
                  <div className="text-xs text-gray-500 mt-1">5% dari penjualan</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  )
}