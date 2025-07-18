'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { 
  ArrowLeft, 
  Save, 
  Banknote, 
  User, 
  DollarSign
} from 'lucide-react'
import { useSetoranDetailQuery, useUpdateSetoranMutation, type SetoranDetail, type UpdateSetoranData } from '@/lib/queries/setoran'
import { formatCurrency } from '@/lib/form-utils'

export default function EditSetoranPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  const [setoranId, setSetoranId] = useState<number | null>(null)
  const [formData, setFormData] = useState<UpdateSetoranData>({
    total_setoran: 0,
    penerima_setoran: ''
  })
  const [errors, setErrors] = useState<Partial<UpdateSetoranData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize setoran ID from params
  useState(() => {
    params.then(({ id }) => {
      setSetoranId(parseInt(id))
    })
  })

  const { data: response, isLoading, error } = useSetoranDetailQuery(setoranId!)
  const updateSetoranMutation = useUpdateSetoranMutation()
  
  const setoran = (response as any)?.data as SetoranDetail

  // Initialize form data when setoran data is loaded
  useState(() => {
    if (setoran && !isLoading) {
      setFormData({
        total_setoran: parseFloat(setoran.total_setoran.toString()),
        penerima_setoran: setoran.penerima_setoran
      })
    }
  })

  const validateForm = (): boolean => {
    const newErrors: Partial<UpdateSetoranData> = {}

    // Validate total_setoran
    if (!formData.total_setoran || formData.total_setoran <= 0) {
      newErrors.total_setoran = 'Total setoran harus lebih dari 0'
    }

    // Validate penerima_setoran
    if (!formData.penerima_setoran.trim()) {
      newErrors.penerima_setoran = 'Penerima setoran harus diisi'
    } else if (formData.penerima_setoran.trim().length < 2) {
      newErrors.penerima_setoran = 'Penerima setoran minimal 2 karakter'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof UpdateSetoranData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !setoranId) {
      return
    }

    setIsSubmitting(true)

    try {
      updateSetoranMutation.mutate({
        id: setoranId,
        data: formData
      }, {
        onSuccess: () => {
          router.push(`/dashboard/setoran/${setoranId}`)
        }
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat memperbarui data',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl mx-auto animate-pulse">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-10 w-10 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error || !setoran) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl mx-auto text-center">
          <div className="text-red-600 mb-4">
            {error ? 'Error loading setoran data' : 'Data setoran tidak ditemukan'}
          </div>
          <Button onClick={() => router.back()}>
            Kembali
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Edit Setoran #{setoran.id_setoran}
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Perbarui informasi setoran
            </p>
          </div>
        </div>

        {/* Form Card */}
        <Card className="w-full border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5" />
              Form Edit Setoran
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Total Setoran */}
                <div className="space-y-2">
                  <Label htmlFor="total_setoran" className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    Total Setoran *
                  </Label>
                  <Input
                    id="total_setoran"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.total_setoran || ''}
                    onChange={(e) => handleInputChange('total_setoran', parseFloat(e.target.value) || 0)}
                    className={`${errors.total_setoran ? 'border-red-500' : ''}`}
                    placeholder="Masukkan total setoran"
                  />
                  {errors.total_setoran && (
                    <p className="text-sm text-red-600">{errors.total_setoran}</p>
                  )}
                  {formData.total_setoran > 0 && (
                    <p className="text-sm text-gray-600">
                      Format: {formatCurrency(formData.total_setoran)}
                    </p>
                  )}
                </div>

                {/* Penerima Setoran */}
                <div className="space-y-2">
                  <Label htmlFor="penerima_setoran" className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Penerima Setoran *
                  </Label>
                  <Input
                    id="penerima_setoran"
                    type="text"
                    value={formData.penerima_setoran}
                    onChange={(e) => handleInputChange('penerima_setoran', e.target.value)}
                    className={`${errors.penerima_setoran ? 'border-red-500' : ''}`}
                    placeholder="Masukkan nama penerima setoran"
                  />
                  {errors.penerima_setoran && (
                    <p className="text-sm text-red-600">{errors.penerima_setoran}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.total_setoran || !formData.penerima_setoran}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Current Data Preview */}
        <Card className="w-full border-0 shadow-lg bg-gradient-to-r from-gray-50 to-slate-50">
          <CardHeader>
            <CardTitle className="text-gray-900">
              Data Saat Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Total Setoran Saat Ini</label>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(setoran.total_setoran)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Penerima Saat Ini</label>
                <p className="text-lg font-semibold text-gray-900">
                  {setoran.penerima_setoran}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Perhatian</p>
              <p>
                Pastikan data yang Anda masukkan sudah benar sebelum menyimpan. 
                Perubahan data setoran akan mempengaruhi laporan rekonsiliasi kas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}