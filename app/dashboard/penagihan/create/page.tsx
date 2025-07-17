'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { ArrowLeft, Save, X } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/lib/api-client'

export default function CreatePenagihanPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    id_toko: '',
    tanggal_tagih: '',
    jumlah_tagihan: '',
    status_bayar: 'belum_bayar',
    catatan: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.id_toko || !formData.tanggal_tagih || !formData.jumlah_tagihan) {
        toast({
          title: 'Error',
          description: 'Mohon lengkapi semua field yang wajib diisi',
          variant: 'destructive'
        })
        return
      }

      // Create penagihan data
      const penagihanData = {
        ...formData,
        jumlah_tagihan: parseFloat(formData.jumlah_tagihan)
      }

      await apiClient.createPenagihan(penagihanData)
      
      toast({
        title: 'Berhasil',
        description: 'Data penagihan berhasil dibuat'
      })
      
      router.push('/dashboard/penagihan')
    } catch (error) {
      console.error('Error creating penagihan:', error)
      toast({
        title: 'Error',
        description: 'Gagal membuat data penagihan',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="border-gray-200 hover:border-gray-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Buat Penagihan Baru</h1>
            <p className="text-gray-600">Tambahkan data penagihan untuk toko</p>
          </div>
        </div>

        {/* Form */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Informasi Penagihan</CardTitle>
            <CardDescription>
              Lengkapi informasi penagihan di bawah ini
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ID Toko */}
              <div className="space-y-2">
                <Label htmlFor="id_toko">ID Toko *</Label>
                <Input
                  id="id_toko"
                  type="text"
                  value={formData.id_toko}
                  onChange={(e) => handleInputChange('id_toko', e.target.value)}
                  placeholder="Masukkan ID toko"
                  required
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Tanggal Tagih */}
              <div className="space-y-2">
                <Label htmlFor="tanggal_tagih">Tanggal Tagih *</Label>
                <Input
                  id="tanggal_tagih"
                  type="date"
                  value={formData.tanggal_tagih}
                  onChange={(e) => handleInputChange('tanggal_tagih', e.target.value)}
                  required
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Jumlah Tagihan */}
              <div className="space-y-2">
                <Label htmlFor="jumlah_tagihan">Jumlah Tagihan *</Label>
                <Input
                  id="jumlah_tagihan"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.jumlah_tagihan}
                  onChange={(e) => handleInputChange('jumlah_tagihan', e.target.value)}
                  placeholder="0.00"
                  required
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Status Bayar */}
              <div className="space-y-2">
                <Label htmlFor="status_bayar">Status Pembayaran</Label>
                <select
                  id="status_bayar"
                  value={formData.status_bayar}
                  onChange={(e) => handleInputChange('status_bayar', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 bg-white"
                >
                  <option value="belum_bayar">Belum Bayar</option>
                  <option value="sudah_bayar">Sudah Bayar</option>
                  <option value="sebagian">Sebagian</option>
                </select>
              </div>

              {/* Catatan */}
              <div className="space-y-2">
                <Label htmlFor="catatan">Catatan</Label>
                <Textarea
                  id="catatan"
                  value={formData.catatan}
                  onChange={(e) => handleInputChange('catatan', e.target.value)}
                  placeholder="Tambahkan catatan (opsional)"
                  rows={3}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Menyimpan...' : 'Simpan Penagihan'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="border-gray-200 hover:border-gray-300 text-gray-600"
                >
                  <X className="w-4 h-4 mr-2" />
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}