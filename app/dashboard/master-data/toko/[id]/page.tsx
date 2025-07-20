'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/form-utils'
import { useTokoDetailQuery, useDeleteTokoMutation, type Toko } from '@/lib/queries/toko'
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

export default function TokoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  const [tokoId, setTokoId] = useState<number | null>(null)

  // Initialize params
  useState(() => {
    params.then(({ id }) => {
      setTokoId(parseInt(id))
    })
  })

  const { data: tokoResponse, isLoading, error, refetch } = useTokoDetailQuery(tokoId!)
  const deleteToko = useDeleteTokoMutation()

  const toko: Toko | undefined = (tokoResponse as { data: Toko })?.data

  const handleDelete = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus toko ini?')) {
      return
    }

    if (tokoId) {
      deleteToko.mutate(tokoId, {
        onSuccess: () => {
          router.push('/dashboard/master-data/toko')
        }
      })
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error || !toko) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-red-600 mb-4">
            {error ? 'Error loading toko data' : 'Data toko tidak ditemukan'}
          </div>
          <div className="space-x-4">
            <Button onClick={() => refetch()} variant="outline">
              Coba Lagi
            </Button>
            <Button onClick={() => router.back()}>
              Kembali
            </Button>
          </div>
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
                      <p className="text-gray-900">{toko.sales?.nama_sales || "Tidak ada sales"}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <div className="mt-1">
                      <Badge 
                        variant={toko.status_toko ? 'default' : 'secondary'}
                        className={toko.status_toko ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      >
                        {toko.status_toko ? 'Aktif' : 'Non-aktif'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Dibuat</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900">{formatDate(toko.dibuat_pada)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Diperbarui</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900">{formatDate(toko.diperbarui_pada)}</p>
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
                        onClick={() => window.open(toko.link_gmaps!, '_blank')}
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