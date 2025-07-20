'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from '@tanstack/react-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Save, Banknote, ArrowLeft, DollarSign, User } from 'lucide-react'
import { z } from 'zod'
import { apiClient } from '@/lib/api-client'
import { useNavigation } from '@/lib/hooks/use-navigation'

interface SetoranFormData {
  total_setoran: number
  penerima_setoran: string
}

const initialData: SetoranFormData = {
  total_setoran: 0,
  penerima_setoran: ''
}

export default function AddSetoranPage() {
  const router = useRouter()
  const { navigate } = useNavigation()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [totalSetoran, setTotalSetoran] = useState<number>(0)
  const [penerimaSetoran, setPenerimaSetoran] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!totalSetoran || totalSetoran <= 0 || !penerimaSetoran.trim()) {
      toast({
        title: 'Error',
        description: 'Harap lengkapi semua field dengan benar',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.createDeposit({
        total_setoran: totalSetoran,
        penerima_setoran: penerimaSetoran.trim()
      })

      toast({
        title: 'Berhasil',
        description: 'Data setoran berhasil disimpan'
      })

      navigate('/dashboard/setoran')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full bg-white min-h-screen">
      <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Tambah Setoran Cash</h1>
            <p className="text-gray-600 text-sm sm:text-base">Catat setoran uang cash dari ketua sales ke accounting</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/dashboard/setoran')}
            className="shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Informasi Setoran */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Jumlah Setoran */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Jumlah Setoran</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="total_setoran" className="text-sm font-medium text-gray-700">Total Setoran (Rp)</Label>
                  <Input
                    id="total_setoran"
                    type="number"
                    min="1"
                    step="1000"
                    value={totalSetoran || ''}
                    onChange={(e) => setTotalSetoran(parseInt(e.target.value) || 0)}
                    placeholder="Masukkan jumlah setoran"
                    required
                    className="mt-1 text-lg h-12"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Total uang cash yang disetor ke accounting
                  </p>
                </div>
                {totalSetoran > 0 && (
                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-1">Jumlah dalam format rupiah:</p>
                    <p className="text-xl font-bold text-green-600">
                      Rp {totalSetoran.toLocaleString('id-ID')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Penerima Setoran */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Penerima Setoran</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="penerima_setoran" className="text-sm font-medium text-gray-700">Nama Staff Accounting</Label>
                  <Input
                    id="penerima_setoran"
                    type="text"
                    value={penerimaSetoran}
                    onChange={(e) => setPenerimaSetoran(e.target.value)}
                    placeholder="Nama staff yang menerima setoran"
                    maxLength={100}
                    required
                    className="mt-1 h-12"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Nama staff accounting yang menerima setoran cash
                  </p>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Banknote className="w-4 h-4 text-gray-500" />
                    <span>Waktu pencatatan akan otomatis tersimpan</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Informasi Tambahan */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <Banknote className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Catatan Penting</h3>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0 mt-2"></span>
                    Form ini hanya untuk mencatat setoran cash yang sudah terkumpul dari ketua sales
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0 mt-2"></span>
                    Pastikan jumlah setoran sudah benar sebelum menyimpan data
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0 mt-2"></span>
                    Tanggal dan waktu pencatatan akan otomatis tersimpan di sistem
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard/setoran')}
              className="w-full sm:w-auto"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !totalSetoran || totalSetoran <= 0 || !penerimaSetoran.trim()}
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Menyimpan...' : 'Simpan Setoran'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}