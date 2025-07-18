'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'

import { formatDate } from '@/lib/form-utils'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Store, 
  MapPin, 
  Phone, 
  User, 
  Calendar, 
  ExternalLink,
  Building,
  Users
} from 'lucide-react'

interface TokoDetail {
  id: string
  nama_toko: string
  kecamatan: string
  kabupaten: string
  no_telepon: string
  link_gmaps: string
  sales_nama: string
  status: 'aktif' | 'nonaktif'
  created_at: string
  updated_at: string
}

export default function TokoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  const [toko, setToko] = useState<TokoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [itemId, setItemId] = useState<string>('')

  useEffect(() => {
    const initializeParams = async () => {
      const { id } = await params
      setItemId(id)
      fetchTokoDetail(id)
    }
    initializeParams()
  }, [])

  const fetchTokoDetail = async (id?: string) => {
    const tokoId = id || itemId
    try {
      // Mock data for demo - replace with actual API call
      const mockToko: TokoDetail = {
        id: tokoId,
        nama_toko: 'Toko Berkah Jaya 1',
        kecamatan: 'Kec. Sukamaju',
        kabupaten: 'Kab. Sukabumi',
        no_telepon: '081234567890',
        link_gmaps: 'https://goo.gl/maps/example1',
        sales_nama: 'Ahmad Susanto',
        status: 'aktif',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      setToko(mockToko)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal memuat data toko',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus toko ini?')) {
      return
    }

    try {
      const response = await fetch(`/api/toko/${itemId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Gagal menghapus toko')
      }

      toast({
        title: 'Berhasil',
        description: 'Toko berhasil dihapus'
      })

      router.push('/dashboard/master-data/toko')
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

  if (!toko) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-500">Data toko tidak ditemukan</p>
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
                <Store className="w-5 h-5" />
                Informasi Umum
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Nama Toko</label>
                    <p className="text-gray-900 font-medium">{toko.nama_toko}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Sales</label>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900">{toko.sales_nama}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <div className="mt-1">
                      <Badge 
                        variant={toko.status === 'aktif' ? 'default' : 'secondary'}
                        className={toko.status === 'aktif' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      >
                        {toko.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Dibuat</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900">{formatDate(toko.created_at)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Diperbarui</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900">{formatDate(toko.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Alamat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Kecamatan</label>
                    <p className="text-gray-900">{toko.kecamatan}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Kabupaten</label>
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900">{toko.kabupaten}</p>
                    </div>
                  </div>
                </div>

                {toko.no_telepon && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">No. Telepon</label>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900">{toko.no_telepon}</p>
                    </div>
                  </div>
                )}

                {toko.link_gmaps && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Google Maps</label>
                    <div className="mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(toko.link_gmaps, '_blank')}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Buka di Google Maps
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>


        </div>
    </div>
  )
}